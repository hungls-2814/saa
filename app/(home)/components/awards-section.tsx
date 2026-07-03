import { getTranslations } from "next-intl/server";
import { AWARD_CATEGORIES } from "../data/awards-data";
import { AwardCard } from "./award-card";

/**
 * "Hệ thống giải thưởng" section: eyebrow + heading, then a responsive grid
 * of the 6 award category cards (3 cols desktop, 2 cols tablet/mobile).
 */
export async function AwardsSection() {
  const t = await getTranslations("Home.awards");

  return (
    <section className="w-full bg-[#00101A] px-6 py-16 sm:px-10 lg:px-36 lg:pt-[120px] lg:pb-0">
      <div className="mx-auto flex max-w-[1224px] flex-col gap-16 lg:gap-20">
        <header className="flex flex-col gap-4">
          <p className="text-sm font-bold text-white/70">{t("eyebrow")}</p>
          <hr className="border-t border-[#2E3940]" />
          <h2 className="text-4xl font-bold leading-[48px] text-[#FFEA9E] sm:text-5xl">
            {t("heading")}
          </h2>
        </header>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-[108px] lg:gap-y-20">
          {AWARD_CATEGORIES.map((award) => (
            <AwardCard key={award.slug} award={award} />
          ))}
        </div>
      </div>
    </section>
  );
}
