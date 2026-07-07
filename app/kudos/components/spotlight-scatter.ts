import type { SpotlightNode } from "@/lib/kudos/types";
import { buildFillLayer, buildPrimaryLayer } from "./spotlight-scatter-layers";
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
 * The design's cloud reads as a dense fog: ~10 tiny/faint repeats of each
 * receiver name tiled across the whole canvas, plus one bright, larger
 * instance per receiver standing out on top. This reproduces that as two
 * independent layers, both defined in `spotlight-scatter-layers.ts` and built
 * on the shared grid helpers in `spotlight-scatter-grid.ts`:
 *  - **primary** (layer 1): one collision-free instance per node.
 *  - **fill** (layer 2): the remaining small/faint repeats, tiled densely.
 */

// Re-exported so consumers (`spotlight-board.tsx`, `spotlight-scatter.test.ts`)
// keep importing the whole public surface from `./spotlight-scatter`.
export type { ScatterItem };
export { SPOTLIGHT_CANVAS_WIDTH_PX, SPOTLIGHT_CANVAS_HEIGHT_PX };

/** Total instances per node (primary + fill), before the density cap below. */
const DEFAULT_REPEATS_PER_NODE = 14;
/** Absolute ceiling on total rendered instances (primary + fill, across all
 * nodes) — keeps a large receiver list from blowing up the DOM / the
 * fill-layer's visual density, while comfortably covering the design's
 * ~80-120 instance target for a realistic (~7-20 receiver) node set. */
const MAX_TOTAL_INSTANCES = 140;

/**
 * Expands each receiver into scattered word-cloud instances — every
 * instance still carries its real node's identity, name, and timestamp, no
 * invented data. See the module doc comment above for the two-layer
 * (primary + fill) placement model.
 */
export function buildScatterItems(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number = DEFAULT_REPEATS_PER_NODE,
  canvasWidthPx: number = SPOTLIGHT_CANVAS_WIDTH_PX,
  canvasHeightPx: number = SPOTLIGHT_CANVAS_HEIGHT_PX,
): ScatterItem[] {
  if (nodes.length === 0) return [];
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight));

  // Total instances per node (primary + fill), capped so a large receiver
  // list can't blow past MAX_TOTAL_INSTANCES overall.
  const effectiveRepeats = Math.max(
    1,
    Math.min(repeatsPerNode, Math.floor(MAX_TOTAL_INSTANCES / nodes.length)),
  );

  return [
    ...buildPrimaryLayer(nodes, maxWeight, canvasWidthPx, canvasHeightPx),
    ...buildFillLayer(nodes, effectiveRepeats, canvasWidthPx, canvasHeightPx),
  ];
}
