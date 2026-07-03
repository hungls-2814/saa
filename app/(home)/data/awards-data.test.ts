import { describe, it, expect } from "vitest";
import { AWARD_CATEGORIES } from "./awards-data";
import vi from "@/messages/vi.json";
import en from "@/messages/en.json";

/**
 * Guard against MISSING_MESSAGE: the award titleKey/descKey are resolved at
 * runtime under the `Home.awards` next-intl namespace. Component tests mock
 * next-intl (echoing the key), so they cannot catch a key that doesn't exist
 * in the real message files — this test resolves against the actual JSON.
 */
function resolve(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (node, key) =>
      node && typeof node === "object"
        ? (node as Record<string, unknown>)[key]
        : undefined,
    obj,
  );
}

describe("awards-data i18n keys", () => {
  for (const locale of [
    { name: "vi", messages: vi },
    { name: "en", messages: en },
  ]) {
    describe(`locale ${locale.name}`, () => {
      it.each(AWARD_CATEGORIES)(
        "resolves title + desc for $slug",
        (award) => {
          const title = resolve(locale.messages, `Home.awards.${award.titleKey}`);
          const desc = resolve(locale.messages, `Home.awards.${award.descKey}`);
          expect(typeof title, `${award.titleKey} missing`).toBe("string");
          expect((title as string).length).toBeGreaterThan(0);
          expect(typeof desc, `${award.descKey} missing`).toBe("string");
          expect((desc as string).length).toBeGreaterThan(0);
        },
      );

      it("resolves the detailLink label", () => {
        expect(typeof resolve(locale.messages, "Home.awards.detailLink")).toBe(
          "string",
        );
      });
    });
  }
});
