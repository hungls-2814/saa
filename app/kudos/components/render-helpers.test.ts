import { describe, it, expect } from "vitest";
import {
  formatKudosTimestamp,
  starGlyph,
  formatHeartCount,
  truncateHashtags,
  truncateImages,
  initialsOf,
} from "./render-helpers";

describe("formatKudosTimestamp", () => {
  it("formats an ISO timestamp as HH:mm - MM/DD/YYYY", () => {
    expect(formatKudosTimestamp("2025-10-30T10:00:00.000Z")).toBe(
      "10:00 - 10/30/2025",
    );
  });

  it("pads single-digit hours/minutes/month/day", () => {
    expect(formatKudosTimestamp("2025-01-05T03:05:00.000Z")).toBe(
      "03:05 - 01/05/2025",
    );
  });

  it("returns an empty string for an invalid timestamp", () => {
    expect(formatKudosTimestamp("not-a-date")).toBe("");
  });
});

describe("starGlyph", () => {
  it.each([
    [0, ""],
    [1, "✱"],
    [2, "✱✱"],
    [3, "✱✱✱"],
  ] as const)("renders %i stars as %s", (tier, expected) => {
    expect(starGlyph(tier)).toBe(expected);
  });
});

describe("formatHeartCount", () => {
  it("formats with the Vietnamese thousands separator", () => {
    expect(formatHeartCount(1000)).toBe("1.000");
  });

  it("formats small counts without a separator", () => {
    expect(formatHeartCount(7)).toBe("7");
  });
});

describe("truncateHashtags", () => {
  const tags = Array.from({ length: 7 }, (_, i) => `#tag${i}`);

  it("keeps all items and reports no truncation when under the cap", () => {
    const result = truncateHashtags(tags.slice(0, 3));
    expect(result.shown).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });

  it("caps at 5 and reports truncation when over the cap", () => {
    const result = truncateHashtags(tags);
    expect(result.shown).toHaveLength(5);
    expect(result.truncated).toBe(true);
  });
});

describe("truncateImages", () => {
  it("caps the gallery at 5 thumbnails", () => {
    const images = Array.from({ length: 8 }, (_, i) => `img-${i}.png`);
    expect(truncateImages(images)).toHaveLength(5);
  });

  it("leaves a shorter gallery untouched", () => {
    expect(truncateImages(["a.png", "b.png"])).toEqual(["a.png", "b.png"]);
  });
});

describe("initialsOf", () => {
  it("takes first + last word initials for multi-word names", () => {
    expect(initialsOf("Huỳnh Dương Xuân Nhật")).toBe("HN");
  });

  it("takes a single initial for a one-word name", () => {
    expect(initialsOf("Cher")).toBe("C");
  });

  it("returns an empty string for blank input", () => {
    expect(initialsOf("   ")).toBe("");
  });
});
