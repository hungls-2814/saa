"use client";

import { useTranslations } from "next-intl";
import { AWARD_DETAILS } from "../data/awards-detail-data";
import { useActiveSection } from "./use-active-section";
import { TargetIcon } from "./award-icons";

// Computed once at module scope so `useActiveSection` receives a stable
// array reference across renders (it's an effect dependency).
const SLUGS = AWARD_DETAILS.map((detail) => detail.slug);

/**
 * Sticky left nav: 6 award categories with a leading icon. Active item
 * (driven by `useActiveSection`'s scroll-spy) renders gold with an
 * underline; clicking smooth-scrolls to that section.
 */
export function AwardsSidebar() {
  const t = useTranslations("AwardsPage.items");
  const { active, scrollTo } = useActiveSection(SLUGS);

  return (
    <nav
      aria-label="Award categories"
      className="top-28 flex w-full shrink-0 flex-row flex-wrap gap-1 lg:sticky lg:w-[178px] lg:flex-col lg:flex-nowrap lg:gap-4"
    >
      {AWARD_DETAILS.map((detail) => {
        const isActive = active === detail.slug;
        return (
          <button
            key={detail.slug}
            type="button"
            onClick={() => scrollTo(detail.slug)}
            aria-current={isActive ? "true" : undefined}
            className={`flex items-center gap-1 rounded px-4 py-4 text-left text-sm font-bold leading-5 tracking-[0.25px] transition-colors duration-200 ease-out hover:bg-white/5 ${
              isActive
                ? "border-b border-[#FFEA9E] text-[#FFEA9E] [text-shadow:0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287]"
                : "text-white"
            }`}
          >
            <TargetIcon className="size-6 shrink-0" />
            <span>{t(`${detail.itemKey}.title`)}</span>
          </button>
        );
      })}
    </nav>
  );
}
