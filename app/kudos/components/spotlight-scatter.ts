import type { SpotlightNode } from "@/lib/kudos/types";
import { buildScatterLayer } from "./spotlight-scatter-layers";
import {
  SPOTLIGHT_CANVAS_HEIGHT_PX,
  SPOTLIGHT_CANVAS_WIDTH_PX,
  type ScatterItem,
} from "./spotlight-scatter-grid";

/**
 * Pure word-cloud layout for the Spotlight Board (FR2, `B.7_Spotlight`).
 * Kept free of React/JSX so scatter placement is trivially unit-testable and
 * stable across server/client renders (no `Math.random`/`Date.now`).
 *
 * The design's cloud reads as a dense fog: many tiny repeats of each
 * receiver name tiled evenly across the whole canvas, with the one
 * highest-weight receiver's first instance standing out larger and in the
 * design's highlight red. Every instance — not just one per node — is
 * placed by the single non-overlapping grid layer in
 * `spotlight-scatter-layers.ts`, built on the shared grid helpers in
 * `spotlight-scatter-grid.ts`.
 */

// Re-exported so consumers (`spotlight-board.tsx`, `spotlight-scatter.test.ts`)
// keep importing the whole public surface from `./spotlight-scatter`.
export type { ScatterItem };
export { SPOTLIGHT_CANVAS_WIDTH_PX, SPOTLIGHT_CANVAS_HEIGHT_PX };

/** Total instances per node, before the density cap below. */
const DEFAULT_REPEATS_PER_NODE = 14;
/** Absolute ceiling on total rendered instances across all nodes — keeps a
 * large receiver list from blowing up the DOM, while comfortably covering
 * the design's ~80-120 instance target for a realistic (~7-20 receiver)
 * node set. */
const MAX_TOTAL_INSTANCES = 140;

/**
 * Expands each receiver into scattered word-cloud instances — every
 * instance still carries its real node's identity, name, and timestamp, no
 * invented data. See the module doc comment above for the single
 * non-overlapping layer placement model.
 */
export function buildScatterItems(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number = DEFAULT_REPEATS_PER_NODE,
  canvasWidthPx: number = SPOTLIGHT_CANVAS_WIDTH_PX,
  canvasHeightPx: number = SPOTLIGHT_CANVAS_HEIGHT_PX,
): ScatterItem[] {
  if (nodes.length === 0) return [];

  // Total instances per node, capped so a large receiver list can't blow
  // past MAX_TOTAL_INSTANCES overall.
  const effectiveRepeats = Math.max(
    1,
    Math.min(repeatsPerNode, Math.floor(MAX_TOTAL_INSTANCES / nodes.length)),
  );

  return buildScatterLayer(nodes, effectiveRepeats, canvasWidthPx, canvasHeightPx);
}
