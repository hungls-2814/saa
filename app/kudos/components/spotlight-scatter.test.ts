import { describe, it, expect } from "vitest";
import { buildScatterItems, type ScatterItem } from "./spotlight-scatter";
import type { SpotlightNode } from "@/lib/kudos/types";

const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

/** Estimated bounding box for a rendered label — the same estimate the
 * layout algorithm itself uses to cap font size (see spotlight-scatter.ts:
 * CHAR_WIDTH_FACTOR / LINE_HEIGHT_FACTOR), so this is the objective
 * pass/fail check for "names must not overlap". */
function boundingBoxOf(item: ScatterItem, canvasWidthPx = 1157, canvasHeightPx = 548) {
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

describe("buildScatterItems", () => {
  it("returns no items for an empty node list", () => {
    expect(buildScatterItems([])).toEqual([]);
  });

  it("expands each node into repeatsPerNode scattered instances", () => {
    const items = buildScatterItems(nodes, 3);
    expect(items).toHaveLength(6);
    expect(items.filter((i) => i.receiverId === "a")).toHaveLength(3);
    expect(items.filter((i) => i.receiverId === "b")).toHaveLength(3);
  });

  it("marks exactly one primary instance per node, first in order", () => {
    const items = buildScatterItems(nodes, 4);
    const aItems = items.filter((i) => i.receiverId === "a");
    expect(aItems[0].isPrimary).toBe(true);
    expect(aItems.slice(1).every((i) => !i.isPrimary)).toBe(true);
  });

  it("carries the real node identity through every repeat (no invented data)", () => {
    const items = buildScatterItems(nodes, 2);
    for (const item of items) {
      const source = nodes.find((n) => n.receiverId === item.receiverId);
      expect(item.name).toBe(source?.name);
      expect(item.lastReceivedAt).toBe(source?.lastReceivedAt);
    }
  });

  it("scales the primary instance by weight (heavier node renders larger + more opaque)", () => {
    const items = buildScatterItems(nodes, 1);
    const heavy = items.find((i) => i.receiverId === "a")!;
    const light = items.find((i) => i.receiverId === "b")!;
    expect(heavy.fontSize).toBeGreaterThan(light.fontSize);
    expect(heavy.opacity).toBeGreaterThan(light.opacity);
  });

  it("fades later repeats relative to the primary instance and never exceeds its font size", () => {
    const items = buildScatterItems([nodes[0]], 3);
    expect(items[1].opacity).toBeLessThan(items[0].opacity);
    expect(items[2].opacity).toBeLessThan(items[1].opacity);
    // Font size is capped by cell size (see boundingBoxOf), so later repeats
    // are never *larger* than the primary even when the cap binds equally.
    expect(items[1].fontSize).toBeLessThanOrEqual(items[0].fontSize);
    expect(items[2].fontSize).toBeLessThanOrEqual(items[1].fontSize);
  });

  it("keeps every position within the canvas bounds", () => {
    const items = buildScatterItems(nodes, 5);
    for (const item of items) {
      expect(item.leftPct).toBeGreaterThanOrEqual(0);
      expect(item.leftPct).toBeLessThanOrEqual(100);
      expect(item.topPct).toBeGreaterThanOrEqual(0);
      expect(item.topPct).toBeLessThanOrEqual(100);
    }
  });

  it("is deterministic across repeated calls with the same input (SSR/hydration-stable)", () => {
    const first = buildScatterItems(nodes, 4);
    const second = buildScatterItems(nodes, 4);
    expect(second).toEqual(first);
  });

  it("uses distinct React keys for every instance", () => {
    const items = buildScatterItems(nodes, 4);
    const keys = new Set(items.map((i) => i.key));
    expect(keys.size).toBe(items.length);
  });

  it("caps total density so a large receiver list doesn't shrink into illegibility", () => {
    const manyNodes: SpotlightNode[] = Array.from({ length: 40 }, (_, i) => ({
      receiverId: `r${i}`,
      name: "Nguyễn Văn Quy",
      weight: (i % 5) + 1,
      lastReceivedAt: new Date(2025, 9, 30, 10, i).toISOString(),
    }));
    const items = buildScatterItems(manyNodes, 4);
    // Every receiver still gets at least its primary instance...
    expect(new Set(items.map((i) => i.receiverId)).size).toBe(40);
    // ...but repeats are trimmed well below 4x40 to keep cells readable.
    expect(items.length).toBeLessThan(40 * 4);
  });

  describe("no-overlap guarantee (objective done-bar for 'names must not overlap')", () => {
    it("never intersects any two label bounding boxes at realistic density", () => {
      const names = [
        "Nguyễn Văn Quy",
        "Nguyễn Bá Chức",
        "Đỗ hoàng Hiệp",
        "Dương thúy An",
        "Mai phương Thúy",
        "Lê Kiều Trang",
        "Nguyễn Hoàng Linh",
      ];
      const manyNodes: SpotlightNode[] = Array.from({ length: 14 }, (_, i) => ({
        receiverId: `r${i}`,
        name: names[i % names.length],
        weight: (i % 6) + 1,
        lastReceivedAt: new Date(2025, 9, 30, 10, i * 5).toISOString(),
      }));

      const items = buildScatterItems(manyNodes);
      const boxes = items.map((item) => boundingBoxOf(item));

      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(intersects(boxes[i], boxes[j])).toBe(false);
        }
      }
    });

    it("never intersects at a custom canvas size", () => {
      const items = buildScatterItems(nodes, 5, 800, 400);
      const boxes = items.map((item) => boundingBoxOf(item, 800, 400));
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(intersects(boxes[i], boxes[j])).toBe(false);
        }
      }
    });
  });
});
