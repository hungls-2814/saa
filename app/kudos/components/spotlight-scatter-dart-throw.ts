import type { SpotlightNode } from "@/lib/kudos/types";
import {
  boxIntersectsReserved,
  boxesIntersect,
  seededFraction,
  type PxBox,
  type ReservedRect,
} from "./spotlight-scatter-grid";

/**
 * Dart-throwing primitives for the Spotlight Board word-cloud (see
 * `spotlight-scatter-layers.ts` for how these are used to build the single
 * non-overlapping placement layer): the ordered work list each instance is
 * placed in, and the seeded-candidate acceptance test itself. Candidates
 * land anywhere on the canvas rather than snapping to a cell, so labels
 * never line up into visible rows or columns.
 */

/** Smallest/largest font any instance may render at. Most instances land
 * near the low end (small, dense "fog"); only the highest-weight node's
 * first instance can reach the top end. */
export const FONT_MIN_PX = 11;
export const FONT_MAX_PX = 18;

/** Glyph width / line-height as a fraction of font-size, for *estimating*
 * (never rendering) a label's box — calibrated against real
 * `getBoundingClientRect()` measurements of Vietnamese names at
 * `font-bold`, with headroom for cross-browser variance. Matches
 * `spotlight-scatter.test.ts`'s own `boundingBoxOf` exactly, so the test's
 * overlap check and this file's acceptance test agree on what "the box" is. */
const CHAR_WIDTH_FACTOR = 0.7;
const LINE_HEIGHT_FACTOR = 1.6;
/** Extra clearance (px) added around every box before the collision test —
 * a visual breathing gap between adjacent labels, on top of the base
 * no-overlap guarantee. Kept small: at `FONT_MIN_PX` a label's own line
 * height is only ~18px, so a large fixed margin would eat a big fraction of
 * every box and tank packing density for little visible benefit. */
const BOX_MARGIN_PX = 2;

/** Seeded candidate positions tried per font-shrink step before giving up
 * on that step and shrinking further. Generous because late instances on a
 * near-full canvas need many tries to find an open pocket (birthday-paradox
 * effect) — cheap to afford since `MAX_TOTAL_INSTANCES` (spotlight-scatter.ts)
 * caps the total instance count this runs for. */
const MAX_CANDIDATE_ATTEMPTS = 800;
/** Steps from an instance's desired font down to `FONT_MIN_PX` — each a
 * smaller, easier-to-place box, the escape valve for crowded canvases. */
const FONT_SHRINK_STEPS = 6;

// Chrome footprints to keep the word cloud off of, in fractions (0-1) of the
// canvas — matches `spotlight-board.tsx`'s layout (top-left search box,
// centered "N KUDOS" header sharing that row, bottom-left activity ticker).
const SEARCH_BOX_RESERVED: ReservedRect = { left: 0, top: 0, right: 0.22, bottom: 0.15 };
const KUDOS_HEADER_RESERVED: ReservedRect = { left: 0.32, top: 0, right: 0.68, bottom: 0.15 };
const ACTIVITY_TICKER_RESERVED: ReservedRect = { left: 0, top: 0.82, right: 0.52, bottom: 1 };
const RESERVED_RECTS: readonly ReservedRect[] = [
  SEARCH_BOX_RESERVED,
  KUDOS_HEADER_RESERVED,
  ACTIVITY_TICKER_RESERVED,
];

/** One (node, repeat) unit awaiting placement. */
export interface PendingInstance {
  node: SpotlightNode;
  nodeIndex: number;
  repeat: number;
  /** Pure function of node identity + repeat — never `Math.random`/`Date.now` —
   * so every candidate this instance tries is reproducible. */
  instanceSeed: number;
}

/** Result of a successful placement attempt. */
export interface PlacedInstance {
  box: PxBox;
  cx: number;
  cy: number;
  fontSize: number;
}

/** Builds the ordered work list: every node's primary (repeat 0) first,
 * heaviest node first so the most space-hungry labels place while the
 * canvas is emptiest, then each repeat layer across all nodes in turn
 * (repeat 1 for every node, then repeat 2, ...) so density grows evenly
 * across the whole canvas instead of one node's cloud filling in before
 * its neighbors start. */
export function buildPendingInstances(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number,
): PendingInstance[] {
  const byWeightDesc = nodes
    .map((node, nodeIndex) => ({ node, nodeIndex }))
    .sort((a, b) => b.node.weight - a.node.weight);

  const primaries = byWeightDesc.map(({ node, nodeIndex }) => ({
    node,
    nodeIndex,
    repeat: 0,
    instanceSeed: nodeIndex * 733 + 13,
  }));

  const repeatLayers: PendingInstance[] = [];
  for (let repeat = 1; repeat < repeatsPerNode; repeat++) {
    for (const { node, nodeIndex } of byWeightDesc) {
      repeatLayers.push({ node, nodeIndex, repeat, instanceSeed: nodeIndex * 733 + repeat * 41 + 13 });
    }
  }

  return [...primaries, ...repeatLayers];
}

/** Clamps `value` into `[min, max]`, falling back to the range's midpoint
 * when `min > max` (a box wider/taller than the canvas itself). */
function clampOrCenter(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** Estimated box for a label centered at `(cx, cy)` at `fontSize`, clamped
 * so it never crosses the canvas edge. */
function boxAt(
  cx: number,
  cy: number,
  fontSize: number,
  nameLen: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): PxBox {
  const halfW = (nameLen * fontSize * CHAR_WIDTH_FACTOR) / 2 + BOX_MARGIN_PX / 2;
  const halfH = (fontSize * LINE_HEIGHT_FACTOR) / 2 + BOX_MARGIN_PX / 2;
  const clampedCx = clampOrCenter(cx, halfW, canvasWidthPx - halfW);
  const clampedCy = clampOrCenter(cy, halfH, canvasHeightPx - halfH);
  return { left: clampedCx - halfW, right: clampedCx + halfW, top: clampedCy - halfH, bottom: clampedCy + halfH };
}

/**
 * Dart-throws a single instance: tries `MAX_CANDIDATE_ATTEMPTS` deterministic
 * seeded positions at its desired font, then progressively smaller fonts
 * (down to `FONT_MIN_PX`), accepting the first candidate whose box clears
 * every reserved rect and every already-placed box. Returns `null` if no
 * step/attempt combination ever clears — the caller drops that instance
 * rather than let it overlap.
 */
export function placeInstance(
  instance: PendingInstance,
  desiredFont: number,
  nameLen: number,
  placedBoxes: readonly PxBox[],
  canvasWidthPx: number,
  canvasHeightPx: number,
): PlacedInstance | null {
  for (let step = 0; step < FONT_SHRINK_STEPS; step++) {
    const shrinkFraction = step / Math.max(1, FONT_SHRINK_STEPS - 1);
    const fontSize = desiredFont - shrinkFraction * (desiredFont - FONT_MIN_PX);

    for (let attempt = 0; attempt < MAX_CANDIDATE_ATTEMPTS; attempt++) {
      const seed = instance.instanceSeed * 97 + step * 131 + attempt * 7 + 3;
      const cx = seededFraction(seed) * canvasWidthPx;
      const cy = seededFraction(seed + 0.5) * canvasHeightPx;
      const box = boxAt(cx, cy, fontSize, nameLen, canvasWidthPx, canvasHeightPx);

      if (boxIntersectsReserved(box, RESERVED_RECTS, canvasWidthPx, canvasHeightPx)) continue;
      if (placedBoxes.some((placed) => boxesIntersect(box, placed))) continue;

      return { box, cx, cy, fontSize };
    }
  }
  return null;
}
