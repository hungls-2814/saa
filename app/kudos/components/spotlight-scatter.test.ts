import { describe, it, expect } from "vitest";
import { buildScatterItems, type ScatterItem } from "./spotlight-scatter";
import type { SpotlightNode } from "@/lib/kudos/types";

const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

/** Builds `count` synthetic nodes cycling through `names` — used to exercise
 * realistic/large receiver lists without inventing production data. */
function manyNodes(count: number, names: string[] = ["Nguyễn Hoàng Linh"]): SpotlightNode[] {
  return Array.from({ length: count }, (_, i) => ({
    receiverId: `r${i}`,
    name: names[i % names.length],
    weight: (i % 6) + 1,
    lastReceivedAt: new Date(2025, 9, 30, 10, i).toISOString(),
  }));
}

/** Estimated bounding box for a rendered label — the same estimate the
 * layout algorithm itself uses to cap every instance's font size (see
 * spotlight-scatter-layers.ts: CHAR_WIDTH_FACTOR / LINE_HEIGHT_FACTOR), so
 * this is the objective pass/fail check for "no two names ever overlap". */
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

/** Asserts no two items' estimated bounding boxes intersect, across every
 * rendered instance — the core guarantee of the single non-overlapping
 * layer (not just a "primary" subset, as the prior two-layer model had). */
function expectNoOverlaps(items: ScatterItem[], canvasWidthPx = 1157, canvasHeightPx = 548) {
  const boxes = items.map((item) => boundingBoxOf(item, canvasWidthPx, canvasHeightPx));
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      expect(intersects(boxes[i], boxes[j])).toBe(false);
    }
  }
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

  it("marks exactly one primary (first) instance per node", () => {
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

  it("scales the first instance by weight (heavier node renders larger + more opaque)", () => {
    const items = buildScatterItems(nodes, 1);
    const heavy = items.find((i) => i.receiverId === "a")!;
    const light = items.find((i) => i.receiverId === "b")!;
    expect(heavy.fontSize).toBeGreaterThan(light.fontSize);
    expect(heavy.opacity).toBeGreaterThan(light.opacity);
  });

  it("fades later repeats relative to the first instance and never exceeds its font size", () => {
    const items = buildScatterItems([nodes[0]], 3);
    expect(items[1].opacity).toBeLessThan(items[0].opacity);
    expect(items[2].opacity).toBeLessThan(items[1].opacity);
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
    expect(buildScatterItems(nodes, 4)).toEqual(buildScatterItems(nodes, 4));
  });

  it("uses distinct React keys for every instance", () => {
    const items = buildScatterItems(nodes, 4);
    expect(new Set(items.map((i) => i.key)).size).toBe(items.length);
  });

  it("caps total density so a large receiver list doesn't shrink into illegibility", () => {
    const items = buildScatterItems(manyNodes(40, ["Nguyễn Văn Quy"]), 4);
    // Every receiver still gets at least its first instance...
    expect(new Set(items.map((i) => i.receiverId)).size).toBe(40);
    // ...but repeats are trimmed well below 4x40 to keep the cloud readable.
    expect(items.length).toBeLessThan(40 * 4);
  });

  describe("small, dense word-cloud texture", () => {
    it("renders a dense cloud (~80-120 instances) for a realistic receiver count", () => {
      // Mirrors the production seed data shape (see scripts/seed-kudos-data.ts):
      // a handful of distinct receivers, tiled repeatedly to fake density
      // rather than inventing more names.
      const items = buildScatterItems(manyNodes(7));
      expect(items.length).toBeGreaterThanOrEqual(80);
      expect(items.length).toBeLessThanOrEqual(120);
    });

    it("keeps every instance within the 11-18px design-scale font range", () => {
      for (const item of buildScatterItems(nodes)) {
        expect(item.fontSize).toBeGreaterThanOrEqual(11);
        expect(item.fontSize).toBeLessThanOrEqual(18);
      }
    });

    it("makes the first instance distinctly larger and brighter than its own later repeats", () => {
      const [first, ...repeats] = buildScatterItems([nodes[0]], 5);
      for (const repeat of repeats) {
        expect(repeat.fontSize).toBeLessThanOrEqual(first.fontSize);
        expect(repeat.opacity).toBeLessThan(first.opacity);
      }
    });
  });

  describe("no-overlap guarantee across the whole board", () => {
    it("never intersects any two instances' bounding boxes at realistic density", () => {
      const names = [
        "Nguyễn Văn Quy",
        "Nguyễn Bá Chức",
        "Đỗ hoàng Hiệp",
        "Dương thúy An",
        "Mai phương Thúy",
        "Lê Kiều Trang",
        "Nguyễn Hoàng Linh",
      ];
      expectNoOverlaps(buildScatterItems(manyNodes(14, names)));
    });

    it("never intersects at a custom canvas size", () => {
      expectNoOverlaps(buildScatterItems(nodes, 5, 800, 400), 800, 400);
    });

    it("never intersects even a large receiver list packed to the density cap", () => {
      expectNoOverlaps(buildScatterItems(manyNodes(40), 4));
    });
  });

  describe("single highlighted (red) instance", () => {
    it("marks exactly one instance as highlighted, on the top-weight receiver's first instance", () => {
      const items = buildScatterItems(nodes, 6);
      const highlighted = items.filter((i) => i.isHighlighted);
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0].receiverId).toBe("a"); // node "a" has the higher weight (42 vs 20)
      expect(highlighted[0].isPrimary).toBe(true);
    });

    it("stays deterministic (same node highlighted) across repeated calls", () => {
      const first = buildScatterItems(nodes, 6).find((i) => i.isHighlighted);
      const second = buildScatterItems(nodes, 6).find((i) => i.isHighlighted);
      expect(second?.receiverId).toBe(first?.receiverId);
    });
  });
});
