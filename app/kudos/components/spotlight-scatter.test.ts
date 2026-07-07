import { describe, it, expect } from "vitest";
import { buildScatterItems } from "./spotlight-scatter";
import { manyNodes, nodes } from "./spotlight-scatter-test-helpers";

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
});
