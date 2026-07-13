import Image from "next/image";
import { getTranslations } from "next-intl/server";
import type { AwardDetail } from "../data/awards-detail-data";
import { TargetIcon, DiamondIcon, LicenseIcon } from "./award-icons";

/**
 * One award category section (`#<slug>` anchor): 336x336 orb image and a
 * content card (title, description, quantity, prize), alternating
 * left/right by index — even index = orb left, odd index = orb right,
 * matching the design's D.1–D.6 layout.
 *
 * Signature 2025 - Creator (`hasDualPrize`) shows two prize values
 * (cá nhân / tập thể) separated by an "Hoặc" divider instead of one.
 */
export async function AwardDetailSection({
  detail,
  index,
}: {
  detail: AwardDetail;
  index: number;
}) {
  const t = await getTranslations(`AwardsPage.items.${detail.itemKey}`);
  const tLabels = await getTranslations("AwardsPage");
  const orbOnRight = index % 2 === 1;

  return (
    <section
      id={detail.slug}
      className={`scroll-mt-28 flex flex-col gap-10 border-b border-[#2E3940] pb-16 last:border-none last:pb-0 lg:flex-row lg:gap-10 ${
        orbOnRight ? "lg:flex-row-reverse" : ""
      }`}
    >
      <div className="relative mx-auto aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-3xl border border-[#FFEA9E] shadow-[0_4px_4px_rgba(0,0,0,0.25),0_0_6px_#FAE287] sm:max-w-[336px] lg:mx-0">
        <Image
          src={detail.orbSrc}
          alt={t("title")}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 220px, 336px"
        />
      </div>

      <div className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <TargetIcon className="size-6 shrink-0 text-[#FFEA9E]" />
            <h3 className="text-2xl font-bold leading-8 text-[#FFEA9E]">{t("title")}</h3>
          </div>
          <p className="text-justify text-base font-bold leading-6 tracking-[0.5px] text-white">
            {t("desc")}
          </p>
        </div>

        <div className="h-px w-full bg-[#2E3940]" />

        <div className="flex flex-wrap items-center gap-4">
          <DiamondIcon className="size-6 shrink-0 text-[#FFEA9E]" />
          <span className="text-2xl font-bold leading-8 text-[#FFEA9E]">
            {tLabels("quantityLabel")}
          </span>
          <span className="text-4xl font-bold leading-[44px] text-white">
            {t("quantityValue")}
          </span>
          <span className="text-sm font-bold leading-5 tracking-[0.1px] text-white">
            {t("quantityUnit")}
          </span>
        </div>

        <div className="h-px w-full bg-[#2E3940]" />

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <LicenseIcon className="size-6 shrink-0 text-[#FFEA9E]" />
            <span className="text-2xl font-bold leading-8 text-[#FFEA9E]">
              {tLabels("prizeLabel")}
            </span>
          </div>

          {detail.hasDualPrize ? (
            <>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold leading-[44px] text-white">
                  {t("prizeIndividualValue")}
                </span>
                <span className="text-sm font-bold leading-5 tracking-[0.1px] text-white">
                  {t("prizeIndividualNote")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold leading-5 tracking-[0.1px] text-[#2E3940]">
                  {tLabels("orLabel")}
                </span>
                <div className="h-px flex-1 bg-[#2E3940]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-4xl font-bold leading-[44px] text-white">
                  {t("prizeGroupValue")}
                </span>
                <span className="text-sm font-bold leading-5 tracking-[0.1px] text-white">
                  {t("prizeGroupNote")}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold leading-[44px] text-white">
                {t("prizeValue")}
              </span>
              {t.has("prizeNote") && (
                <span className="text-sm font-bold leading-5 tracking-[0.1px] text-white">
                  {t("prizeNote")}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
