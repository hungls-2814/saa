/**
 * The 6 SAA 2025 award categories shown in the homepage awards grid.
 * `titleKey`/`descKey` point into the `Home.awards.items.<slug>` i18n namespace.
 * `slug` matches the Awards Information page hash anchors (routing map).
 */
export interface AwardCategory {
  slug: string;
  titleKey: string;
  descKey: string;
}

export const AWARD_CATEGORIES: AwardCategory[] = [
  { slug: "top-talent", titleKey: "items.topTalent.title", descKey: "items.topTalent.desc" },
  { slug: "top-project", titleKey: "items.topProject.title", descKey: "items.topProject.desc" },
  {
    slug: "top-project-leader",
    titleKey: "items.topProjectLeader.title",
    descKey: "items.topProjectLeader.desc",
  },
  { slug: "best-manager", titleKey: "items.bestManager.title", descKey: "items.bestManager.desc" },
  {
    slug: "signature-2025-creator",
    titleKey: "items.signatureCreator.title",
    descKey: "items.signatureCreator.desc",
  },
  { slug: "mvp", titleKey: "items.mvp.title", descKey: "items.mvp.desc" },
];
