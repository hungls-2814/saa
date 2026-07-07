import { describe, it, expect } from "vitest";
import { buildActivityTicker } from "./spotlight-activity-ticker";
import type { SpotlightNode } from "@/lib/kudos/types";

const nodes: SpotlightNode[] = [
  { receiverId: "a", name: "Đỗ hoàng Hiệp", weight: 42, lastReceivedAt: "2025-10-30T13:30:00.000Z" },
  { receiverId: "b", name: "Nguyễn Bá Chức", weight: 20, lastReceivedAt: "2025-10-30T20:30:00.000Z" },
];

describe("buildActivityTicker", () => {
  it("returns no rows for an empty node list", () => {
    expect(buildActivityTicker([])).toEqual([]);
  });

  it("takes the most-recently-received nodes, ordered oldest-first (newest renders last/bottom)", () => {
    const items = buildActivityTicker(nodes, 5);
    expect(items).toHaveLength(2);
    expect(items[0].receiverId).toBe("a"); // 13:30 — older
    expect(items[1].receiverId).toBe("b"); // 20:30 — newer, renders last
  });

  it("caps at maxRows", () => {
    const manyNodes: SpotlightNode[] = Array.from({ length: 8 }, (_, i) => ({
      receiverId: `r${i}`,
      name: `Name ${i}`,
      weight: 1,
      lastReceivedAt: new Date(2025, 9, 30, 10, i).toISOString(),
    }));
    expect(buildActivityTicker(manyNodes, 5)).toHaveLength(5);
  });

  it("carries the real node identity through (no invented data)", () => {
    const items = buildActivityTicker(nodes);
    for (const item of items) {
      const source = nodes.find((n) => n.receiverId === item.receiverId);
      expect(item.name).toBe(source?.name);
      expect(item.lastReceivedAt).toBe(source?.lastReceivedAt);
    }
  });

  it("is deterministic across repeated calls with the same input", () => {
    expect(buildActivityTicker(nodes)).toEqual(buildActivityTicker(nodes));
  });
});
