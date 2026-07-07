import type { SpotlightNode } from "@/lib/kudos/types";
import { FONT_MAX_PX, FONT_MIN_PX, buildPendingInstances, placeInstance } from "./spotlight-scatter-dart-throw";
import type { PxBox, ScatterItem } from "./spotlight-scatter-grid";

/**
 * The single placement layer behind `buildScatterItems` (see
 * `spotlight-scatter.ts` for the model overview): every rendered instance —
 * one per node per repeat — is placed by **dart-throwing**
 * (`spotlight-scatter-dart-throw.ts`: deterministic seeded candidate
 * positions, accepted only if their estimated box clears every
 * already-placed box and every reserved rect, rejected + retried
 * otherwise). This is what makes the cloud read as a genuinely organic
 * scatter rather than a jittered grid: candidates land anywhere on the
 * canvas, not snapped to a cell, so labels never line up into visible rows
 * or columns.
 *
 * Primaries (each node's first instance) are attempted before any repeat,
 * sorted by weight descending, so the most visually important labels claim
 * space while the canvas is emptiest. If a candidate can't find room even
 * after shrinking toward `FONT_MIN_PX`, the instance is dropped rather than
 * allowed to overlap — the structural guarantee "no overlap" always wins
 * over "every requested repeat renders."
 */

/** Px shaved off the desired font per repeat beyond the first, so later
 * repeats of the same name read as fainter/smaller echoes. */
const FONT_DECAY_PER_REPEAT_PX = 0.6;

const OPACITY_MAX = 1;
const OPACITY_FLOOR = 0.4;
const OPACITY_DECAY_PER_REPEAT = 0.06;

/**
 * The single non-overlapping layer — every (node, repeat) instance placed
 * by dart-throwing, evenly covering the whole canvas (search box, header,
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

  // Deterministic: the single instance rendered in the design's highlight
  // color is the first repeat of the top-weight node (earliest in array
  // order on ties), never a Math.random pick.
  const highlightReceiverId = nodes.reduce((top, n) => (n.weight > top.weight ? n : top), nodes[0]).receiverId;

  const pending = buildPendingInstances(nodes, repeatsPerNode);
  const placedBoxes: PxBox[] = [];
  const items: ScatterItem[] = [];

  for (const instance of pending) {
    const { node, repeat } = instance;
    const scale = node.weight / maxWeight; // 0..1
    const baseFont = FONT_MIN_PX + scale * (FONT_MAX_PX - FONT_MIN_PX);
    const desiredFont = Math.max(FONT_MIN_PX, baseFont - repeat * FONT_DECAY_PER_REPEAT_PX);
    const nameLen = Math.max(node.name.length, 1);

    const placed = placeInstance(instance, desiredFont, nameLen, placedBoxes, canvasWidthPx, canvasHeightPx);
    if (!placed) continue; // No room even at FONT_MIN_PX — drop, never overlap.

    placedBoxes.push(placed.box);

    const baseOpacity = OPACITY_FLOOR + scale * (OPACITY_MAX - OPACITY_FLOOR);
    const opacity = Math.max(OPACITY_FLOOR, baseOpacity - repeat * OPACITY_DECAY_PER_REPEAT);

    items.push({
      key: `${node.receiverId}-${repeat}`,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
      leftPct: (placed.cx / canvasWidthPx) * 100,
      topPct: (placed.cy / canvasHeightPx) * 100,
      fontSize: placed.fontSize,
      opacity,
      isPrimary: repeat === 0,
      isHighlighted: repeat === 0 && node.receiverId === highlightReceiverId,
    });
  }

  return items;
}
