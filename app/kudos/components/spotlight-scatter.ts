import type { SpotlightNode } from "@/lib/kudos/types";

/**
 * Pure word-cloud layout helpers for the Spotlight Board (FR2, `B.7_Spotlight`).
 * Kept free of React/JSX so scatter placement is trivially unit-testable and
 * stable across server/client renders (no `Math.random`/`Date.now`).
 */

/** One rendered instance of a receiver name in the scattered word cloud. */
export interface ScatterItem {
  /** Stable React key — unique per node+repeat. */
  key: string;
  receiverId: string;
  name: string;
  lastReceivedAt: string;
  /** Position as a percentage of the canvas, 0-100. */
  leftPct: number;
  topPct: number;
  /** Font size in px, sized against a `SPOTLIGHT_CANVAS_WIDTH_PX`-wide
   * canvas. Callers must render on a `container-type: inline-size` ancestor
   * and convert to `cqw` (see `spotlight-board.tsx`), or labels balloon on
   * narrow viewports and overlap again. */
  fontSize: number;
  opacity: number;
  /** The first (largest/most opaque) instance per node — used by callers
   * that need one canonical element per receiver (e.g. tests). */
  isPrimary: boolean;
}

const DEFAULT_REPEATS_PER_NODE = 4;
/** The design's own `B.7_Spotlight` box (1157x548) — exported so
 * `spotlight-board.tsx` can convert `ScatterItem.fontSize` into `cqw`
 * against the panel's *actual* width, one source of truth for the canvas
 * this file's math assumes. */
export const SPOTLIGHT_CANVAS_WIDTH_PX = 1157;
export const SPOTLIGHT_CANVAS_HEIGHT_PX = 548;
const CANVAS_WIDTH_PX = SPOTLIGHT_CANVAS_WIDTH_PX;
const CANVAS_HEIGHT_PX = SPOTLIGHT_CANVAS_HEIGHT_PX;
/** Non-overlap placement grid — 6 columns suits the board's ~2.1:1 aspect. */
const GRID_COLS = 6;
/** Density cap (rows worth of cells): keeps a large receiver list from
 * shrinking every label into illegibility — "fewer, well-spaced, readable
 * beats dense-colliding." Every receiver still gets ≥1 (primary) instance. */
const MAX_GRID_ROWS = 8;
/** Extra px beyond the strict box estimate, absorbing sub-pixel rounding
 * once canvas-px math converts to `cqw` at an arbitrary real panel width. */
const CELL_GAP_PX = 16;
const MIN_FONT_PX = 10;
const MAX_FONT_PX = 40;
/** Glyph width / line-height as a fraction of font-size, for *estimating*
 * (never rendering) a label's box — calibrated against real
 * `getBoundingClientRect()` measurements of Vietnamese names at
 * `font-bold`, with headroom for cross-browser variance. */
const CHAR_WIDTH_FACTOR = 0.7;
const LINE_HEIGHT_FACTOR = 1.6;
/** Cap on how far a label may drift from its cell center, as a fraction of
 * cell size — further clamped so the box can't cross into another cell. */
const MAX_JITTER_FRACTION = 0.25;
/** Columns (of `GRID_COLS`), bottom row, left empty for the activity ticker
 * (`spotlight-activity-ticker.ts`) — matches its ~49%-wide text box (design
 * node `3004:15995`: 565/1157 ≈ 3/6). */
const TICKER_RESERVED_COLS = 3;

/**
 * Deterministic pseudo-random fraction in [0, 1) derived purely from an
 * integer seed. Never uses `Math.random`/`Date.now` so the same `nodes`
 * input always scatters identically — required for SSR/hydration parity
 * and for unit tests to assert exact positions.
 */
function seededFraction(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

/** Deterministic Fisher-Yates shuffle seeded off `seedOffset` — used to
 * scatter which grid cell each instance lands in (so same-name repeats
 * don't cluster), without ever touching `Math.random`. */
function seededShuffle<T>(items: readonly T[], seedOffset: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededFraction(seedOffset + i * 31 + 7) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Expands each receiver into scattered word-cloud instances — every
 * instance still carries its real node's identity, name, and timestamp, no
 * invented data.
 *
 * Placement is a **jittered grid**: the canvas is partitioned into
 * `GRID_COLS` x N cells, one instance per cell, nudged by a small
 * deterministic jitter. Font size is capped so the *estimated* box
 * (`name.length * fontSize * CHAR_WIDTH_FACTOR` wide,
 * `fontSize * LINE_HEIGHT_FACTOR` tall) fits inside its cell with a gap,
 * and the jitter itself is clamped to that same box — making "no two
 * labels overlap" a structural guarantee, verified by the bounding-box
 * intersection test in `spotlight-scatter.test.ts`.
 */
export function buildScatterItems(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number = DEFAULT_REPEATS_PER_NODE,
  canvasWidthPx: number = CANVAS_WIDTH_PX,
  canvasHeightPx: number = CANVAS_HEIGHT_PX,
): ScatterItem[] {
  if (nodes.length === 0) return [];
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight));

  // Cap total instance count so cells stay readable regardless of how many
  // receivers/repeats are requested (see MAX_GRID_ROWS doc above).
  const effectiveRepeats = Math.max(
    1,
    Math.min(repeatsPerNode, Math.floor((GRID_COLS * MAX_GRID_ROWS) / nodes.length)),
  );

  const pending: Array<{ node: SpotlightNode; nodeIndex: number; repeat: number }> = [];
  nodes.forEach((node, nodeIndex) => {
    for (let repeat = 0; repeat < effectiveRepeats; repeat++) {
      pending.push({ node, nodeIndex, repeat });
    }
  });

  // Reserve the bottom-left corner (last row, first TICKER_RESERVED_COLS
  // columns) so no scattered label renders on top of the activity ticker
  // occupying that same screen region. Grow by one row if that leaves too
  // few cells.
  let rows = Math.ceil(pending.length / GRID_COLS);
  const reservedCols = Math.min(TICKER_RESERVED_COLS, GRID_COLS);
  if (rows * GRID_COLS - reservedCols < pending.length) rows += 1;

  const cellWidth = canvasWidthPx / GRID_COLS;
  const cellHeight = canvasHeightPx / rows;

  const isTickerReservedCell = (cellIndex: number) =>
    Math.floor(cellIndex / GRID_COLS) === rows - 1 && cellIndex % GRID_COLS < reservedCols;

  // Assign cells out of reading order for an organic scatter look — safe
  // because it's still exactly one instance per cell, so non-overlap holds
  // for any permutation.
  const availableCells = Array.from({ length: rows * GRID_COLS }, (_, i) => i).filter(
    (i) => !isTickerReservedCell(i),
  );
  const cellOrder = seededShuffle(availableCells, 1);

  return pending.map(({ node, nodeIndex, repeat }, i) => {
    const cellIndex = cellOrder[i];
    const col = cellIndex % GRID_COLS;
    const row = Math.floor(cellIndex / GRID_COLS);
    const cellCenterX = (col + 0.5) * cellWidth;
    const cellCenterY = (row + 0.5) * cellHeight;

    const baseScale = 0.4 + (node.weight / maxWeight) * 0.6;
    const falloff = 1 - repeat * 0.18;
    const scale = Math.max(0.3, baseScale * falloff);
    const desiredFontSize = Math.min(MAX_FONT_PX, 14 + scale * 24);

    // Cap the font so the estimated box fits inside the cell (minus a gap).
    const availW = Math.max(0, cellWidth - CELL_GAP_PX);
    const availH = Math.max(0, cellHeight - CELL_GAP_PX);
    const nameLen = Math.max(node.name.length, 1);
    const maxFontByWidth = availW / (nameLen * CHAR_WIDTH_FACTOR);
    const maxFontByHeight = availH / LINE_HEIGHT_FACTOR;
    const fontSize = Math.max(
      MIN_FONT_PX,
      Math.min(desiredFontSize, maxFontByWidth, maxFontByHeight),
    );

    const boxWidth = nameLen * fontSize * CHAR_WIDTH_FACTOR;
    const boxHeight = fontSize * LINE_HEIGHT_FACTOR;

    // Jitter within whatever room remains after reserving the box + gap, so
    // a label can never wander far enough to cross into a neighbouring cell.
    const maxJitterX = Math.max(0, (cellWidth - boxWidth) / 2 - CELL_GAP_PX / 2);
    const maxJitterY = Math.max(0, (cellHeight - boxHeight) / 2 - CELL_GAP_PX / 2);
    const jitterRangeX = Math.min(maxJitterX, MAX_JITTER_FRACTION * cellWidth);
    const jitterRangeY = Math.min(maxJitterY, MAX_JITTER_FRACTION * cellHeight);

    const seed = nodeIndex * 97 + repeat * 13 + 1;
    const offsetX = (seededFraction(seed) - 0.5) * 2 * jitterRangeX;
    const offsetY = (seededFraction(seed + 0.5) - 0.5) * 2 * jitterRangeY;

    const leftPct = ((cellCenterX + offsetX) / canvasWidthPx) * 100;
    const topPct = ((cellCenterY + offsetY) / canvasHeightPx) * 100;

    return {
      key: `${node.receiverId}-${repeat}`,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
      leftPct,
      topPct,
      fontSize,
      opacity: Math.max(0.25, 0.5 + scale * 0.5 - repeat * 0.12),
      isPrimary: repeat === 0,
    };
  });
}
