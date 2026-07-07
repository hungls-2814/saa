import type { SpotlightNode } from "@/lib/kudos/types";
import {
  assignShuffledCells,
  countAvailableCells,
  seededFraction,
  type ReservedRect,
  type ScatterItem,
} from "./spotlight-scatter-grid";

/**
 * The single placement layer behind `buildScatterItems` (see
 * `spotlight-scatter.ts` for the model overview): every rendered instance —
 * one per node per repeat — is placed on ONE fine grid whose cell size is
 * derived from the longest receiver name so that even that name fits at
 * `FONT_MIN_PX` inside a cell. Each instance's desired font (from its
 * node's weight, fading over repeats) is then capped — never floored — to
 * the box the *assigned* cell actually offers, which is what makes "no two
 * instances overlap" a structural guarantee rather than a best effort.
 */

/** Smallest/largest font any instance may render at. Most instances land
 * near the low end (small, dense "fog"); only the highest-weight node's
 * first instance can reach the top end. */
const FONT_MIN_PX = 11;
const FONT_MAX_PX = 18;
/** Px shaved off the desired font per repeat beyond the first, so later
 * repeats of the same name read as fainter/smaller echoes. */
const FONT_DECAY_PER_REPEAT_PX = 0.6;

const OPACITY_MAX = 1;
const OPACITY_FLOOR = 0.4;
const OPACITY_DECAY_PER_REPEAT = 0.06;

/** Extra px beyond the strict box estimate, absorbing sub-pixel rounding
 * once canvas-px math converts to `cqw` at an arbitrary real panel width. */
const CELL_GAP_PX = 10;
/** Glyph width / line-height as a fraction of font-size, for *estimating*
 * (never rendering) a label's box — calibrated against real
 * `getBoundingClientRect()` measurements of Vietnamese names at
 * `font-bold`, with headroom for cross-browser variance. */
const CHAR_WIDTH_FACTOR = 0.7;
const LINE_HEIGHT_FACTOR = 1.6;
/** Cap on how far a label may drift from its cell center, as a fraction of
 * cell size — further clamped so the box can't cross into another cell. */
const MAX_JITTER_FRACTION = 0.3;
/** Ceiling on grid columns even when short names would allow more — keeps
 * the fog from fragmenting into columns so fine that jitter reads gridded. */
const MAX_GRID_COLS = 16;

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

const GRID_SEED = 1;

/** Percentage clamp shared by both axes so jittered positions never render
 * outside the canvas. */
function clampPct(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/**
 * The single non-overlapping layer — every (node, repeat) instance placed
 * on one fine grid, evenly covering the whole canvas (search box, header,
 * and ticker footprints excluded). Returns [] when there are no nodes.
 */
export function buildScatterLayer(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): ScatterItem[] {
  if (nodes.length === 0 || repeatsPerNode <= 0) return [];
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight));
  const maxNameLen = Math.max(1, ...nodes.map((n) => n.name.length));

  // Size the grid so even the longest name fits at FONT_MIN_PX width-wise —
  // the structural basis for "no overlap", independent of how fine the grid
  // ends up being for shorter names.
  const minCellWidth = maxNameLen * FONT_MIN_PX * CHAR_WIDTH_FACTOR + CELL_GAP_PX;
  const minCellHeight = FONT_MIN_PX * LINE_HEIGHT_FACTOR + CELL_GAP_PX;
  const cols = Math.max(1, Math.min(MAX_GRID_COLS, Math.floor(canvasWidthPx / minCellWidth)));
  const maxRows = Math.max(1, Math.floor(canvasHeightPx / minCellHeight));

  const instances: Array<{ node: SpotlightNode; nodeIndex: number; repeat: number }> = [];
  nodes.forEach((node, nodeIndex) => {
    for (let repeat = 0; repeat < repeatsPerNode; repeat++) instances.push({ node, nodeIndex, repeat });
  });

  // Grow rows until there's a non-reserved cell for every instance, capped
  // at maxRows (the point past which a row would be too short for
  // FONT_MIN_PX). If capacity still falls short at that cap, trim instances
  // rather than let any two share a cell.
  let rows = Math.min(maxRows, Math.max(1, Math.ceil(instances.length / cols)));
  let availableCells = countAvailableCells(rows, cols, RESERVED_RECTS);
  while (availableCells < instances.length && rows < maxRows) {
    rows += 1;
    availableCells = countAvailableCells(rows, cols, RESERVED_RECTS);
  }
  const placedInstances = instances.slice(0, availableCells);

  const cellOrder = assignShuffledCells(rows, cols, RESERVED_RECTS, GRID_SEED);
  const cellWidth = canvasWidthPx / cols;
  const cellHeight = canvasHeightPx / rows;

  // Deterministic: the single instance rendered in the design's highlight
  // color is the first repeat of the top-weight node (earliest in array
  // order on ties), never a Math.random pick.
  const highlightReceiverId = nodes.reduce((top, n) => (n.weight > top.weight ? n : top), nodes[0]).receiverId;

  return placedInstances.map(({ node, nodeIndex, repeat }, i) => {
    const cellIndex = cellOrder[i];
    const col = cellIndex % cols;
    const row = Math.floor(cellIndex / cols);
    const cellCenterX = (col + 0.5) * cellWidth;
    const cellCenterY = (row + 0.5) * cellHeight;

    const scale = node.weight / maxWeight; // 0..1
    const baseFont = FONT_MIN_PX + scale * (FONT_MAX_PX - FONT_MIN_PX);
    const desiredFont = Math.max(FONT_MIN_PX, baseFont - repeat * FONT_DECAY_PER_REPEAT_PX);

    // Cap (never floor) the font to the box the assigned cell offers — the
    // structural no-overlap guarantee for every instance, not just the
    // first per node.
    const nameLen = Math.max(node.name.length, 1);
    const availW = Math.max(1, cellWidth - CELL_GAP_PX);
    const availH = Math.max(1, cellHeight - CELL_GAP_PX);
    const maxFontByWidth = availW / (nameLen * CHAR_WIDTH_FACTOR);
    const maxFontByHeight = availH / LINE_HEIGHT_FACTOR;
    const fontSize = Math.min(desiredFont, maxFontByWidth, maxFontByHeight);

    const boxWidth = nameLen * fontSize * CHAR_WIDTH_FACTOR;
    const boxHeight = fontSize * LINE_HEIGHT_FACTOR;
    const maxJitterX = Math.max(0, (cellWidth - boxWidth) / 2 - CELL_GAP_PX / 2);
    const maxJitterY = Math.max(0, (cellHeight - boxHeight) / 2 - CELL_GAP_PX / 2);
    const jitterRangeX = Math.min(maxJitterX, MAX_JITTER_FRACTION * cellWidth);
    const jitterRangeY = Math.min(maxJitterY, MAX_JITTER_FRACTION * cellHeight);

    const seed = nodeIndex * 131 + repeat * 17 + 3;
    const offsetX = (seededFraction(seed) - 0.5) * 2 * jitterRangeX;
    const offsetY = (seededFraction(seed + 0.5) - 0.5) * 2 * jitterRangeY;

    const leftPct = clampPct(((cellCenterX + offsetX) / canvasWidthPx) * 100);
    const topPct = clampPct(((cellCenterY + offsetY) / canvasHeightPx) * 100);

    const baseOpacity = OPACITY_FLOOR + scale * (OPACITY_MAX - OPACITY_FLOOR);
    const opacity = Math.max(OPACITY_FLOOR, baseOpacity - repeat * OPACITY_DECAY_PER_REPEAT);

    const isHighlighted = repeat === 0 && node.receiverId === highlightReceiverId;

    return {
      key: `${node.receiverId}-${repeat}`,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
      leftPct,
      topPct,
      fontSize,
      opacity,
      isPrimary: repeat === 0,
      isHighlighted,
    };
  });
}
