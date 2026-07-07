import { expect } from "vitest";
import type { SpotlightNode } from "@/lib/kudos/types";
import type { ScatterItem } from "./spotlight-scatter";

/** Shared fixtures/assertions for spotlight-scatter.test.ts and
 * spotlight-scatter-overlap.test.ts — kept in one place so both files agree
 * on what "a receiver" and "no overlap" mean. */

export const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

/** Builds `count` synthetic nodes cycling through `names` — used to exercise
 * realistic/large receiver lists without inventing production data. */
export function manyNodes(count: number, names: string[] = ["Nguyễn Hoàng Linh"]): SpotlightNode[] {
  return Array.from({ length: count }, (_, i) => ({
    receiverId: `r${i}`,
    name: names[i % names.length],
    weight: (i % 6) + 1,
    lastReceivedAt: new Date(2025, 9, 30, 10, i).toISOString(),
  }));
}

/** Estimated bounding box for a rendered label — the same estimate the
 * layout algorithm itself uses (see spotlight-scatter-dart-throw.ts:
 * CHAR_WIDTH_FACTOR / LINE_HEIGHT_FACTOR), so this is the objective
 * pass/fail check for "no two names ever overlap". */
export function boundingBoxOf(item: ScatterItem, canvasWidthPx = 1157, canvasHeightPx = 548) {
  const boxWidth = item.name.length * item.fontSize * 0.7;
  const boxHeight = item.fontSize * 1.6;
  const centerX = (item.leftPct / 100) * canvasWidthPx;
  const centerY = (item.topPct / 100) * canvasHeightPx;
  return {
    left: centerX - boxWidth / 2,
    right: centerX + boxWidth / 2,
    top: centerY - boxHeight / 2,
    bottom: centerY + boxHeight / 2,
  };
}

function intersects(a: ReturnType<typeof boundingBoxOf>, b: ReturnType<typeof boundingBoxOf>) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/** Asserts no two items' estimated bounding boxes intersect, across every
 * rendered instance — the core guarantee of the single non-overlapping
 * dart-throwing layer. */
export function expectNoOverlaps(items: ScatterItem[], canvasWidthPx = 1157, canvasHeightPx = 548) {
  const boxes = items.map((item) => boundingBoxOf(item, canvasWidthPx, canvasHeightPx));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(intersects(boxes[i], boxes[j])).toBe(false);
    }
  }
}
