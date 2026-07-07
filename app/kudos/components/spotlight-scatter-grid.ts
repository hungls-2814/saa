/**
 * Shared foundation for the Spotlight Board word-cloud layout (FR2,
 * `B.7_Spotlight`): the `ScatterItem` shape, the canvas dimensions the layout
 * math assumes, and the deterministic grid helpers both layers build on.
 *
 * Kept free of React/JSX and of `Math.random`/`Date.now` so scatter placement
 * is trivially unit-testable and stable across server/client renders. See
 * `spotlight-scatter.ts` for the two-layer (primary + fill) placement model.
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
  /** True for the one prominent instance per receiver (see module doc
   * above) — used by callers that need one canonical/collision-free element
   * per receiver (e.g. tests, z-index layering). */
  isPrimary: boolean;
}

/** The design's own `B.7_Spotlight` box (1157x548) — exported so
 * `spotlight-board.tsx` can convert `ScatterItem.fontSize` into `cqw`
 * against the panel's *actual* width, one source of truth for the canvas
 * this file's math assumes. */
export const SPOTLIGHT_CANVAS_WIDTH_PX = 1157;
export const SPOTLIGHT_CANVAS_HEIGHT_PX = 548;

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

/** Builds a shuffled cell-index order for a `rows` x `cols` grid, excluding
 * the bottom-left `reservedCols` cells of the last row (kept clear for the
 * activity ticker overlay). Shared by both layers so their reservation
 * logic — and the "don't render on top of the ticker" guarantee — stays
 * identical even though the two grids differ in density. */
export function assignShuffledCells(rows: number, cols: number, reservedCols: number, seedOffset: number): number[] {
  const isReservedCell = (cellIndex: number) =>
    Math.floor(cellIndex / cols) === rows - 1 && cellIndex % cols < reservedCols;
  const availableCells = Array.from({ length: rows * cols }, (_, i) => i).filter((i) => !isReservedCell(i));
  return seededShuffle(availableCells, seedOffset);
}
