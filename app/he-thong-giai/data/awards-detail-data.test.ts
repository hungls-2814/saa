import { describe, it, expect } from "vitest";
import { AWARD_DETAILS } from "./awards-detail-data";

describe("AWARD_DETAILS data structure", () => {
  it("contains exactly 6 award categories", () => {
    expect(AWARD_DETAILS).toHaveLength(6);
  });

  it("has correct slugs in order", () => {
    const expectedSlugs = [
      "top-talent",
      "top-project",
      "top-project-leader",
      "best-manager",
      "signature-2025-creator",
      "mvp",
    ];
    const actualSlugs = AWARD_DETAILS.map((detail) => detail.slug);
    expect(actualSlugs).toEqual(expectedSlugs);
  });

  it("has correct itemKeys for i18n", () => {
    const itemKeyMap = {
      "top-talent": "topTalent",
      "top-project": "topProject",
      "top-project-leader": "topProjectLeader",
      "best-manager": "bestManager",
      "signature-2025-creator": "signatureCreator",
      mvp: "mvp",
    };

    AWARD_DETAILS.forEach((detail) => {
      expect(detail.itemKey).toBe(itemKeyMap[detail.slug as keyof typeof itemKeyMap]);
    });
  });

  it("has orbSrc pointing to correct image files", () => {
    AWARD_DETAILS.forEach((detail) => {
      expect(detail.orbSrc).toMatch(/^\/home\/award-.*\.png$/);
      expect(detail.orbSrc).toContain(detail.slug);
    });
  });

  it("marks only Signature 2025 - Creator with hasDualPrize", () => {
    const dualPrizeItems = AWARD_DETAILS.filter((d) => d.hasDualPrize);
    expect(dualPrizeItems).toHaveLength(1);
    expect(dualPrizeItems[0].slug).toBe("signature-2025-creator");
  });

  it("all items have required properties", () => {
    AWARD_DETAILS.forEach((detail) => {
      expect(detail).toHaveProperty("slug");
      expect(detail).toHaveProperty("itemKey");
      expect(detail).toHaveProperty("orbSrc");
      expect(typeof detail.slug).toBe("string");
      expect(typeof detail.itemKey).toBe("string");
      expect(typeof detail.orbSrc).toBe("string");
    });
  });

  it("each slug is unique", () => {
    const slugs = AWARD_DETAILS.map((d) => d.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("each itemKey is unique", () => {
    const itemKeys = AWARD_DETAILS.map((d) => d.itemKey);
    const uniqueKeys = new Set(itemKeys);
    expect(uniqueKeys.size).toBe(itemKeys.length);
  });

  it("hasDualPrize is only present on Signature award", () => {
    AWARD_DETAILS.forEach((detail) => {
      if (detail.slug === "signature-2025-creator") {
        expect(detail.hasDualPrize).toBe(true);
      } else {
        expect(detail.hasDualPrize).toBeUndefined();
      }
    });
  });
});
