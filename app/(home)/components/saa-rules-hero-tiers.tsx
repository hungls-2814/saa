import { useTranslations } from "next-intl";

/** Badge asset + proper-noun label per tier; condition/blurb resolve from i18n. */
const HERO_TIERS = [
  { badge: "/kudos/badges/hero-new.png", label: "New Hero", key: "New" },
  { badge: "/kudos/badges/hero-rising.png", label: "Rising Hero", key: "Rising" },
  { badge: "/kudos/badges/hero-super.png", label: "Super Hero", key: "Super" },
  { badge: "/kudos/badges/hero-legend.png", label: "Legend Hero", key: "Legend" },
] as const;

/**
 * "NGƯỜI NHẬN KUDOS" section (MoMorph `3204:6131`, screen `b1Filzi9i6`).
 * Four Hero badge tiers, each a badge pill image
 * (`public/kudos/badges/hero-*.png`) plus the sender-count condition and
 * reward blurb. Copy resolves from the `Rules` i18n namespace; badge labels
 * ("New Hero" …) are proper nouns kept as constants.
 */
export function SaaRulesHeroTiers() {
  const t = useTranslations("Rules");
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl leading-7 font-bold text-[#FFEA9E] sm:text-[22px] sm:leading-7">
        {t("receiversHeading")}
      </h3>
      <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
        {t("receiversIntro")}
      </p>
      <div className="flex flex-col gap-4">
        {HERO_TIERS.map((tier) => (
          <div key={tier.label} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- design asset, non-fixed aspect ratio pill */}
              <img
                src={tier.badge}
                alt={tier.label}
                className="h-[22px] w-auto rounded-full border border-[#FFEA9E]"
              />
              <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
                {t(`tiers.${tier.key}.condition`)}
              </p>
            </div>
            <p className="text-sm leading-5 font-bold tracking-[0.1px] text-white">
              {t(`tiers.${tier.key}.blurb`)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
