import { describe, it, expect } from "vitest";
import { buildScatterItems } from "./spotlight-scatter";
import { expectNoOverlaps, manyNodes, nodes } from "./spotlight-scatter-test-helpers";

describe("buildScatterItems", () => {
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

  describe("organic (non-grid) placement", () => {
    /** A grid-based layout (even a jittered one) reuses a small, fixed set
     * of column/row centers — most items' positions cluster tightly around
     * those few shared values. True dart-throwing scatters continuously
     * across the whole canvas, so no small bucket of nearby positions ever
     * holds a large share of the items. */
    function maxSharedBucket(values: number[], bucketWidthPct: number): number {
      const counts = new Map<number, number>();
      for (const value of values) {
        const bucket = Math.round(value / bucketWidthPct) * bucketWidthPct;
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
      }
      return Math.max(...counts.values());
    }

    it("spreads left/top positions across many distinct values, not a small repeating set", () => {
      const names = [
        "Nguyễn Văn Quy",
        "Nguyễn Bá Chức",
        "Đỗ hoàng Hiệp",
        "Dương thúy An",
        "Mai phương Thúy",
        "Lê Kiều Trang",
        "Nguyễn Hoàng Linh",
      ];
      const items = buildScatterItems(manyNodes(30, names), 5);
      const lefts = items.map((i) => i.leftPct);
      const tops = items.map((i) => i.topPct);

      // A 16-column jittered grid (the previous implementation) collapses
      // dozens of items onto ~16 shared x-centers; dart-throwing shouldn't
      // let any single 2%-wide band hold more than a small minority.
      expect(maxSharedBucket(lefts, 2)).toBeLessThan(items.length * 0.25);
      expect(maxSharedBucket(tops, 2)).toBeLessThan(items.length * 0.25);
      // Distinct rounded values should be a large fraction of the item count
      // — a grid would repeat the same handful of rounded centers across many
      // items (≈0.13 here). The bar is below 0.6 because the left-swirl
      // reserve narrows the horizontal band names spread across.
      expect(new Set(lefts.map((v) => Math.round(v))).size).toBeGreaterThan(items.length * 0.45);
    });
  });
});
