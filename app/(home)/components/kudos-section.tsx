import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * "Sun* Kudos" promo block: eyebrow, title, heading + description, CTA, and
 * a decorative KUDOS wordmark on a dark card with a diagonal gold accent.
 *
 * `kudos-bg.png` is the real card background extracted from the MoMorph
 * design render (diagonal gold arc + KUDOS wordmark), with the left text
 * column pre-masked to the card's `#0F0F0F` base and blended with a smooth
 * fade so it never shows through behind this section's own rendered text.
 */
export async function KudosSection() {
  const t = await getTranslations("Home.kudos");

  return (
    <section className="w-full bg-[#00101A] px-6 py-8 sm:px-10 lg:px-36 lg:pt-[120px] lg:pb-24">
      <div
        className="relative mx-auto flex max-w-[1224px] flex-col overflow-hidden rounded-2xl bg-[#0F0F0F] bg-cover bg-right bg-no-repeat p-8 sm:p-14 lg:flex-row lg:items-center lg:justify-between lg:px-16 lg:py-[46px]"
        style={{ backgroundImage: "url(/home/kudos-bg.png)" }}
      >
        <div className="relative z-[1] flex max-w-[457px] flex-col gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-2xl font-bold leading-8 text-white">
              {t("eyebrow")}
            </p>
            <h2 className="text-4xl font-bold leading-[44px] tracking-[-0.25px] text-[#FFEA9E] sm:text-[57px] sm:leading-[64px]">
              {t("title")}
            </h2>
            <p className="text-justify text-base font-bold leading-6 tracking-[0.5px] text-white">
              <span className="block font-bold">{t("heading")}</span>
              {t("description")}
            </p>
          </div>

          <Link
            href="/kudos"
            className="inline-flex w-fit items-center gap-2 rounded bg-[#FFEA9E] px-4 py-4 text-base font-bold text-[#00101A] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#FFF8E1] hover:shadow-lg"
          >
            {t("detailLink")}
          </Link>
        </div>

        {/* Reserves space on the right so the card's intrinsic aspect ratio
            keeps the baked-in KUDOS wordmark (part of kudos-bg.png) visible
            instead of being overlapped by the text column above. */}
        <div aria-hidden className="hidden h-[200px] w-[364px] shrink-0 lg:block" />
      </div>
    </section>
  );
}
