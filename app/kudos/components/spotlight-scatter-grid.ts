/**
 * Shared foundation for the Spotlight Board word-cloud layout (FR2,
 * `B.7_Spotlight`): the `ScatterItem` shape, the canvas dimensions the layout
 * math assumes, and the deterministic grid helpers the single placement
 * layer builds on.
 *
 * Kept free of React/JSX and of `Math.random`/`Date.now` so scatter placement
 * is trivially unit-testable and stable across server/client renders. See
 * `spotlight-scatter.ts` for the single non-overlapping layer model.
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
  /** True for the first (largest/brightest) instance of each receiver —
   * used by callers that want one canonical element per receiver on top
   * (e.g. z-index layering). Every instance, primary or not, is placed by
   * the same non-overlapping grid; this is a visual-hierarchy flag only. */
  isPrimary: boolean;
  /** True for exactly one instance across the whole board: the single name
   * the design renders in red (its top-weight receiver's first instance). */
  isHighlighted: boolean;
}

/** The design's own `B.7_Spotlight` box (1157x548) — exported so
 * `spotlight-board.tsx` can convert `ScatterItem.fontSize` into `cqw`
 * against the panel's *actual* width, one source of truth for the canvas
 * this file's math assumes. */
export const SPOTLIGHT_CANVAS_WIDTH_PX = 1157;
export const SPOTLIGHT_CANVAS_HEIGHT_PX = 548;

/** A rectangle to exclude from placement, in fractions (0-1) of the canvas —
 * resolution-independent so the same rect works at any grid size. */
export interface ReservedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Deterministic pseudo-random fraction in [0, 1) derived purely from an
 * integer seed. Never uses `Math.random`/`Date.now` so the same `nodes`
 * input always scatters identically — required for SSR/hydration parity
 * and for unit tests to assert exact positions.
 */
export function seededFraction(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
}

/** Deterministic Fisher-Yates shuffle seeded off `seedOffset` — used to
 * scatter which grid cell each instance lands in (so same-name repeats
 * don't cluster), without ever touching `Math.random`. */
export function seededShuffle<T>(items: readonly T[], seedOffset: number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(seededFraction(seedOffset + i * 31 + 7) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Whether a cell centered at fractional `(cx, cy)` (each 0-1) falls inside
 * any of `reservedRects` — used to keep names off the search box, "N KUDOS"
 * header, and activity ticker footprints. */
function isCellReserved(cx: number, cy: number, reservedRects: readonly ReservedRect[]): boolean {
  return reservedRects.some((r) => cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom);
}

/** Count of non-reserved cells in a `rows` x `cols` grid. */
export function countAvailableCells(rows: number, cols: number, reservedRects: readonly ReservedRect[]): number {
  let count = 0;
  for (let cellIndex = 0; cellIndex < rows * cols; cellIndex++) {
    const col = cellIndex % cols;
    const row = Math.floor(cellIndex / cols);
    if (!isCellReserved((col + 0.5) / cols, (row + 0.5) / rows, reservedRects)) count++;
  }
  return count;
}

/** Builds a shuffled cell-index order for a `rows` x `cols` grid, excluding
 * every cell whose center falls inside `reservedRects` (the search box,
 * "N KUDOS" header, and activity-ticker footprints — kept clear so names
 * never render on top of that chrome). */
export function assignShuffledCells(
  rows: number,
  cols: number,
  reservedRects: readonly ReservedRect[],
  seedOffset: number,
): number[] {
  const availableCells = Array.from({ length: rows * cols }, (_, i) => i).filter((cellIndex) => {
    const col = cellIndex % cols;
    const row = Math.floor(cellIndex / cols);
    return !isCellReserved((col + 0.5) / cols, (row + 0.5) / rows, reservedRects);
  });
  return seededShuffle(availableCells, seedOffset);
}
