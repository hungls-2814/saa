import type { SpotlightNode } from "@/lib/kudos/types";
import {
  assignShuffledCells,
  seededFraction,
  type ScatterItem,
} from "./spotlight-scatter-grid";

/**
 * The two placement layers behind `buildScatterItems` (see
 * `spotlight-scatter.ts` for the model overview):
 *  - **primary** (layer 1): exactly one instance per node, sized up from
 *    weight, placed on a coarse grid that structurally guarantees no two
 *    primaries' bounding boxes intersect.
 *  - **fill** (layer 2): the remaining repeats, small and faint, tiled on a
 *    finer independently-shuffled grid with loose jitter so the result reads
 *    organic rather than gridded. Fill instances may lightly overlap each
 *    other -- that's how the hand-authored design fakes density too -- only
 *    the primary layer is collision-free.
 */

// ---- Layer 1: primary instances -------------------------------------------
// One per node, on a coarse grid sized so a box-fit cap can structurally
// guarantee no two primaries' estimated bounding boxes ever intersect.
const GRID_COLS = 6;
const PRIMARY_MIN_FONT_PX = 20;
const PRIMARY_MAX_FONT_PX = 30;
const PRIMARY_OPACITY_MIN = 0.65;
const PRIMARY_OPACITY_MAX = 1;
/** Extra px beyond the strict box estimate, absorbing sub-pixel rounding
 * once canvas-px math converts to `cqw` at an arbitrary real panel width. */
const CELL_GAP_PX = 16;
/** Glyph width / line-height as a fraction of font-size, for *estimating*
 * (never rendering) a label's box — calibrated against real
 * `getBoundingClientRect()` measurements of Vietnamese names at
 * `font-bold`, with headroom for cross-browser variance. */
const CHAR_WIDTH_FACTOR = 0.7;
const LINE_HEIGHT_FACTOR = 1.6;
/** Cap on how far a label may drift from its cell center, as a fraction of
 * cell size — further clamped so the box can't cross into another cell. */
const MAX_JITTER_FRACTION_PRIMARY = 0.25;
/** Columns (of `GRID_COLS`), bottom row, left empty for the activity ticker
 * (`spotlight-activity-ticker.ts`) — matches its ~49%-wide text box (design
 * node `3004:15995`: 565/1157 ≈ 3/6). */
const TICKER_RESERVED_COLS = 3;

// ---- Layer 2: fill instances ------------------------------------------------
// The dense "fog": many small, faint repeats tiled on a finer, independently
// shuffled grid so the pattern doesn't visually align with layer 1's grid.
// Sizing is fixed-small (not box-fit capped) since light overlap here is
// acceptable — that's the trade-off that buys the design's density.
const FILL_GRID_COLS = 12;
const FILL_MIN_FONT_PX = 10;
const FILL_MAX_FONT_PX = 13;
const FILL_FONT_STEP = 0.4;
const FILL_OPACITY_MIN = 0.22;
const FILL_OPACITY_MAX = 0.5;
const FILL_OPACITY_STEP = 0.045;
/** Looser than the primary layer's jitter — organic scatter matters more
 * than avoiding overlap for these small/faint repeats. */
const MAX_JITTER_FRACTION_FILL = 0.42;
const FILL_TICKER_RESERVED_COLS = 6; // out of FILL_GRID_COLS, same ~50% as layer 1

/**
 * Layer 1 — one primary instance per node, non-overlapping by construction.
 * Sizes each label up from its weight then caps it so the estimated box fits
 * inside its coarse-grid cell.
 */
export function buildPrimaryLayer(
  nodes: readonly SpotlightNode[],
  maxWeight: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): ScatterItem[] {
  let primaryRows = Math.ceil(nodes.length / GRID_COLS);
  const primaryReservedCols = Math.min(TICKER_RESERVED_COLS, GRID_COLS);
  if (primaryRows * GRID_COLS - primaryReservedCols < nodes.length) primaryRows += 1;
  const primaryCellWidth = canvasWidthPx / GRID_COLS;
  const primaryCellHeight = canvasHeightPx / primaryRows;
  const primaryCellOrder = assignShuffledCells(primaryRows, GRID_COLS, primaryReservedCols, 1);

  return nodes.map((node, nodeIndex) => {
    const cellIndex = primaryCellOrder[nodeIndex];
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);
    const cellCenterX = (col + 0.5) * primaryCellWidth;
    const cellCenterY = (row + 0.5) * primaryCellHeight;

    const scale = node.weight / maxWeight; // 0..1
    const desiredFontSize = PRIMARY_MIN_FONT_PX + scale * (PRIMARY_MAX_FONT_PX - PRIMARY_MIN_FONT_PX);

    // Cap the font so the estimated box fits inside the cell (minus a gap) —
    // this is what makes "no two primaries overlap" a structural guarantee.
    const availW = Math.max(0, primaryCellWidth - CELL_GAP_PX);
    const availH = Math.max(0, primaryCellHeight - CELL_GAP_PX);
    const nameLen = Math.max(node.name.length, 1);
    const maxFontByWidth = availW / (nameLen * CHAR_WIDTH_FACTOR);
    const maxFontByHeight = availH / LINE_HEIGHT_FACTOR;
    const fontSize = Math.max(
      FILL_MIN_FONT_PX,
      Math.min(desiredFontSize, maxFontByWidth, maxFontByHeight),
    );

    const boxWidth = nameLen * fontSize * CHAR_WIDTH_FACTOR;
    const boxHeight = fontSize * LINE_HEIGHT_FACTOR;
    const maxJitterX = Math.max(0, (primaryCellWidth - boxWidth) / 2 - CELL_GAP_PX / 2);
    const maxJitterY = Math.max(0, (primaryCellHeight - boxHeight) / 2 - CELL_GAP_PX / 2);
    const jitterRangeX = Math.min(maxJitterX, MAX_JITTER_FRACTION_PRIMARY * primaryCellWidth);
    const jitterRangeY = Math.min(maxJitterY, MAX_JITTER_FRACTION_PRIMARY * primaryCellHeight);

    const seed = nodeIndex * 97 + 1;
    const offsetX = (seededFraction(seed) - 0.5) * 2 * jitterRangeX;
    const offsetY = (seededFraction(seed + 0.5) - 0.5) * 2 * jitterRangeY;

    const leftPct = ((cellCenterX + offsetX) / canvasWidthPx) * 100;
    const topPct = ((cellCenterY + offsetY) / canvasHeightPx) * 100;

    return {
      key: `${node.receiverId}-0`,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
      leftPct,
      topPct,
      fontSize,
      opacity: PRIMARY_OPACITY_MIN + scale * (PRIMARY_OPACITY_MAX - PRIMARY_OPACITY_MIN),
      isPrimary: true,
    };
  });
}

/**
 * Layer 2 — the small/faint fill repeats (`repeat` 1..`effectiveRepeats-1`
 * per node), tiled across the whole canvas on a finer, independently
 * shuffled grid. Returns [] when there are no repeats to place.
 */
export function buildFillLayer(
  nodes: readonly SpotlightNode[],
  effectiveRepeats: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): ScatterItem[] {
  const pendingFill: Array<{ node: SpotlightNode; nodeIndex: number; repeat: number }> = [];
  nodes.forEach((node, nodeIndex) => {
    for (let repeat = 1; repeat < effectiveRepeats; repeat++) {
      pendingFill.push({ node, nodeIndex, repeat });
    }
  });
  if (pendingFill.length === 0) return [];

  let fillRows = Math.ceil(pendingFill.length / FILL_GRID_COLS);
  const fillReservedCols = Math.min(FILL_TICKER_RESERVED_COLS, FILL_GRID_COLS);
  if (fillRows * FILL_GRID_COLS - fillReservedCols < pendingFill.length) fillRows += 1;
  const fillCellWidth = canvasWidthPx / FILL_GRID_COLS;
  const fillCellHeight = canvasHeightPx / fillRows;
  // Different seed offset than layer 1 so the two grids' scatter patterns
  // don't visually align into one bigger grid.
  const fillCellOrder = assignShuffledCells(fillRows, FILL_GRID_COLS, fillReservedCols, 2);

  return pendingFill.map(({ node, nodeIndex, repeat }, i) => {
    const cellIndex = fillCellOrder[i % fillCellOrder.length];
    const col = cellIndex % FILL_GRID_COLS;
    const row = Math.floor(cellIndex / FILL_GRID_COLS);
    const cellCenterX = (col + 0.5) * fillCellWidth;
    const cellCenterY = (row + 0.5) * fillCellHeight;

    const fontSize = Math.max(FILL_MIN_FONT_PX, FILL_MAX_FONT_PX - (repeat - 1) * FILL_FONT_STEP);
    const opacity = Math.max(FILL_OPACITY_MIN, FILL_OPACITY_MAX - (repeat - 1) * FILL_OPACITY_STEP);

    const jitterRangeX = MAX_JITTER_FRACTION_FILL * fillCellWidth;
    const jitterRangeY = MAX_JITTER_FRACTION_FILL * fillCellHeight;
    const seed = nodeIndex * 131 + repeat * 17 + 3;
    const offsetX = (seededFraction(seed) - 0.5) * 2 * jitterRangeX;
    const offsetY = (seededFraction(seed + 0.5) - 0.5) * 2 * jitterRangeY;

    const leftPct = Math.min(100, Math.max(0, ((cellCenterX + offsetX) / canvasWidthPx) * 100));
    const topPct = Math.min(100, Math.max(0, ((cellCenterY + offsetY) / canvasHeightPx) * 100));

    return {
      key: `${node.receiverId}-${repeat}`,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
      leftPct,
      topPct,
      fontSize,
      opacity,
      isPrimary: false,
    };
  });
}
