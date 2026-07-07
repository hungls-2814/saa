import { describe, it, expect } from "vitest";
import { buildScatterItems } from "./spotlight-scatter";
import type { SpotlightNode } from "@/lib/kudos/types";

const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

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

  it("fades and shrinks later repeats relative to the primary instance", () => {
    const items = buildScatterItems([nodes[0]], 3);
    expect(items[1].fontSize).toBeLessThan(items[0].fontSize);
    expect(items[2].fontSize).toBeLessThan(items[1].fontSize);
    expect(items[1].opacity).toBeLessThan(items[0].opacity);
  });

  it("keeps every position within the [14, 86] percent margin bounds", () => {
    const items = buildScatterItems(nodes, 5);
    for (const item of items) {
      expect(item.leftPct).toBeGreaterThanOrEqual(14);
      expect(item.leftPct).toBeLessThanOrEqual(86);
      expect(item.topPct).toBeGreaterThanOrEqual(14);
      expect(item.topPct).toBeLessThanOrEqual(86);
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
});
