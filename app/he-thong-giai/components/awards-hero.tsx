import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Hero banner: full-bleed key-visual art background, ROOT FURTHER wordmark,
 * eyebrow ("Sun* Annual Awards 2025"), and the big gold page title
 * ("Hệ thống giải thưởng SAA 2025"). Mirrors the homepage hero's background
 * treatment (design keyvisual scaled to the section, content on top).
 */
export async function AwardsHero() {
  const t = await getTranslations("AwardsPage.hero");

  return (
    <section className="relative flex w-full flex-col items-start px-6 pt-24 pb-12 sm:px-10 lg:px-36 lg:pt-24 lg:pb-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 bg-[length:100%_100%] bg-top bg-no-repeat opacity-70"
        style={{
          aspectRatio: "1512 / 820",
          backgroundImage: "url(/home/hero-keyvisual.png)",
        }}
      />

      <div className="relative z-[1] mx-auto flex w-full max-w-[1224px] flex-col gap-4">
        <Image
          src="/login/root-further-wordmark.png"
          alt="ROOT FURTHER"
          width={338}
          height={150}
          className="h-auto w-full max-w-[338px]"
          priority
          unoptimized
        />

        <div className="flex flex-col gap-4">
          <p className="text-2xl font-bold leading-8 text-white">{t("eyebrow")}</p>
          <div className="h-px w-full bg-[#2E3940]" />
          <h1 className="text-[57px] font-bold leading-[64px] tracking-[-0.25px] text-[#FFEA9E]">
            {t("title")}
          </h1>
        </div>
      </div>
    </section>
  );
}
