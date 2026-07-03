/**
 * The 6 SAA 2025 award categories shown on the Awards System detail page
 * (`/he-thong-giai`), in design order. `itemKey` points into the
 * `AwardsPage.items.<itemKey>` i18n namespace (title/desc/quantity/prize
 * copy); `slug` is the section anchor shared with the homepage award cards.
 * `hasDualPrize` flags Signature 2025 - Creator, the only category with two
 * prize values (cá nhân / tập thể) instead of one.
 */
export interface AwardDetail {
  slug: string;
  itemKey: string;
  orbSrc: string;
  hasDualPrize?: boolean;
}

export const AWARD_DETAILS: AwardDetail[] = [
  { slug: "top-talent", itemKey: "topTalent", orbSrc: "/home/award-top-talent.png" },
  { slug: "top-project", itemKey: "topProject", orbSrc: "/home/award-top-project.png" },
  {
    slug: "top-project-leader",
    itemKey: "topProjectLeader",
    orbSrc: "/home/award-top-project-leader.png",
  },
  { slug: "best-manager", itemKey: "bestManager", orbSrc: "/home/award-best-manager.png" },
  {
    slug: "signature-2025-creator",
    itemKey: "signatureCreator",
    orbSrc: "/home/award-signature-2025-creator.png",
    hasDualPrize: true,
  },
  { slug: "mvp", itemKey: "mvp", orbSrc: "/home/award-mvp.png" },
];
