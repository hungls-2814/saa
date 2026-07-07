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
  fontSize: number;
  opacity: number;
  /** The first (largest/most opaque) instance per node — used by callers
   * that need one canonical element per receiver (e.g. tests). */
  isPrimary: boolean;
}

const DEFAULT_REPEATS_PER_NODE = 4;
// Kept well clear of the panel edges since names render at varying font
// sizes and are centered on their point (translate(-50%,-50%)) — a tight
// margin lets long/large names clip against the rounded panel border.
const MARGIN_PCT = 14;

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

/**
 * Expands each receiver into several scattered word-cloud instances to
 * approximate the design's dense particle-map look, without inventing any
 * new receiver data — every instance still carries its real node's
 * identity, name, and timestamp. The first instance per node is the
 * "primary" (full weight-driven size/opacity); the rest are smaller,
 * fainter filler repeats that thin out via `falloff`.
 */
export function buildScatterItems(
  nodes: readonly SpotlightNode[],
  repeatsPerNode: number = DEFAULT_REPEATS_PER_NODE,
): ScatterItem[] {
  if (nodes.length === 0) return [];
  const maxWeight = Math.max(1, ...nodes.map((n) => n.weight));

  const items: ScatterItem[] = [];
  nodes.forEach((node, nodeIndex) => {
    const baseScale = 0.4 + (node.weight / maxWeight) * 0.6;
    for (let repeat = 0; repeat < repeatsPerNode; repeat++) {
      const seed = nodeIndex * 97 + repeat * 13 + 1;
      const leftPct = MARGIN_PCT + seededFraction(seed) * (100 - 2 * MARGIN_PCT);
      const topPct = MARGIN_PCT + seededFraction(seed + 0.5) * (100 - 2 * MARGIN_PCT);
      const falloff = 1 - repeat * 0.18;
      const scale = Math.max(0.3, baseScale * falloff);
      items.push({
        key: `${node.receiverId}-${repeat}`,
        receiverId: node.receiverId,
        name: node.name,
        lastReceivedAt: node.lastReceivedAt,
        leftPct,
        topPct,
        fontSize: 14 + scale * 24,
        opacity: Math.max(0.25, 0.5 + scale * 0.5 - repeat * 0.12),
        isPrimary: repeat === 0,
      });
    }
  });
  return items;
}
