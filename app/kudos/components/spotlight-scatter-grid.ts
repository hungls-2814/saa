/**
 * Shared foundation for the Spotlight Board word-cloud layout (FR2,
 * `B.7_Spotlight`): the `ScatterItem` shape, the canvas dimensions the layout
 * math assumes, and the deterministic PRNG + box-collision primitives the
 * dart-throwing placement layer builds on.
 *
 * Kept free of React/JSX and of `Math.random`/`Date.now` so scatter placement
 * is trivially unit-testable and stable across server/client renders. See
 * `spotlight-scatter.ts` for the single non-overlapping layer model and
 * `spotlight-scatter-layers.ts` for the placement algorithm itself.
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
   * (e.g. z-index layering). Every instance, primary or not, goes through
   * the same dart-throwing acceptance test; this is a visual-hierarchy flag
   * only. */
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
 * resolution-independent so the same rect works at any canvas size. */
export interface ReservedRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** An estimated label bounding box, in canvas px — the unit both the
 * dart-throwing acceptance test and `spotlight-scatter.test.ts`'s own
 * `boundingBoxOf` overlap check operate on. */
export interface PxBox {
  left: number;
  right: number;
  top: number;
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

/** Whether two px boxes overlap — the structural no-overlap test, shared by
 * the dart-throwing placement layer (rejecting a candidate against every
 * already-placed box) and mirrored by the test suite's own overlap check. */
export function boxesIntersect(a: PxBox, b: PxBox): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Whether a px box overlaps any of `reservedRects` (given in 0-1 canvas
 * fractions) — keeps names off the search box, "N KUDOS" header, and
 * activity-ticker footprints. */
export function boxIntersectsReserved(
  box: PxBox,
  reservedRects: readonly ReservedRect[],
  canvasWidthPx: number,
  canvasHeightPx: number,
): boolean {
  return reservedRects.some((r) =>
    boxesIntersect(box, {
      left: r.left * canvasWidthPx,
      right: r.right * canvasWidthPx,
      top: r.top * canvasHeightPx,
      bottom: r.bottom * canvasHeightPx,
    }),
  );
}
