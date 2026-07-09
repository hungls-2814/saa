import { useTranslations } from "next-intl";

/** The 6 collectible icons — image + brand-name caption (proper nouns, not localized). */
const COLLECTIBLE_ICONS = [
  { image: "/kudos/badges/icon-revival.png", label: "REVIVAL" },
  { image: "/kudos/badges/icon-touch-of-light.png", label: "TOUCH OF LIGHT" },
  { image: "/kudos/badges/icon-stay-gold.png", label: "STAY GOLD" },
  { image: "/kudos/badges/icon-flow-to-horizon.png", label: "FLOW TO HORIZON" },
  { image: "/kudos/badges/icon-beyond-the-boundary.png", label: "BEYOND THE BOUNDARY" },
  { image: "/kudos/badges/icon-root-further.png", label: "ROOT FURTHER" },
] as const;

/**
 * "NGƯỜI GỬI KUDOS" section (MoMorph `3204:6076` / `3204:6079`, screen
 * `b1Filzi9i6`). Intro copy, the 6-icon collectible grid
 * (`public/kudos/badges/icon-*.png`), and the completion-reward blurb. Copy
 * resolves from the `Rules` i18n namespace; icon captions are brand names.
 */
export function SaaRulesIconGrid() {
  const t = useTranslations("Rules");
  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-xl leading-7 font-bold text-[#FFEA9E] sm:text-[22px] sm:leading-7">
        {t("sendersHeading")}
      </h3>
      <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
        {t("sendersIntro")}
      </p>
      <div className="grid grid-cols-3 gap-4 px-6">
        {COLLECTIBLE_ICONS.map((icon) => (
          <div key={icon.label} className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- design asset; some exports bundle
                the badge circle + caption in one crop, so object-top keeps only the circle visible */}
            <img
              src={icon.image}
              alt={icon.label}
              className="size-16 rounded-full border-2 border-white object-cover object-top"
            />
            <p className="text-center text-[11px] leading-4 font-bold tracking-[0.5px] text-white uppercase">
              {icon.label}
            </p>
          </div>
        ))}
      </div>
      <p className="text-base leading-6 font-bold tracking-[0.5px] text-white">
        {t("sendersReward")}
      </p>
    </div>
  );
}
