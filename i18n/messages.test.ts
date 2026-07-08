import { describe, it, expect } from "vitest";
import vi from "@/messages/vi.json";
import en from "@/messages/en.json";

/**
 * Key-parity guard for the two locale catalogs (`messages/vi.json` /
 * `messages/en.json`). next-intl has no static check for this — a key
 * present in one locale but missing in the other silently falls back to
 * showing the raw key path at runtime, which is exactly what SC11
 * (`/kudos` KudosPage namespace) requires we not ship.
 */

type MessageTree = { [key: string]: string | MessageTree };

function collectKeyPaths(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? [path] : collectKeyPaths(value, path);
  });
}

describe("messages/vi.json <-> messages/en.json key parity", () => {
  const viKeys = collectKeyPaths(vi).sort();
  const enKeys = collectKeyPaths(en).sort();

  it("has no keys present in vi but missing from en", () => {
    const missingFromEn = viKeys.filter((key) => !enKeys.includes(key));
    expect(missingFromEn).toEqual([]);
  });

  it("has no keys present in en but missing from vi", () => {
    const missingFromVi = enKeys.filter((key) => !viKeys.includes(key));
    expect(missingFromVi).toEqual([]);
  });

  it("KudosPage namespace covers every visible string used by the board (SC11)", () => {
    const kudosPageKeys = viKeys.filter((key) => key.startsWith("KudosPage."));
    // Sanity: every group used across the board's components resolves in both catalogs.
    const requiredGroups = [
      "sectionEyebrow",
      "banner.",
      "highlight.",
      "spotlight.",
      "feed.",
      "card.",
      "stats.",
      "gifts.",
      "toast.",
    ];
    for (const group of requiredGroups) {
      const hasGroup = kudosPageKeys.some((key) =>
        group.endsWith(".") ? key.startsWith(`KudosPage.${group}`) : key === `KudosPage.${group}`,
      );
      expect(hasGroup, `expected KudosPage to define "${group}"`).toBe(true);
    }
  });
});
