import Image from "next/image";
import { getTranslations } from "next-intl/server";

/**
 * Hero content: ROOT FURTHER wordmark (left-aligned) followed by a centred
 * title block — eyebrow ("Sun* Annual Awards 2025"), divider, and the big gold
 * page title ("Hệ thống giải thưởng SAA 2025").
 *
 * The key-visual art is painted once at the page level (see `page.tsx`) so it
 * spans header/hero/content-top and fades to the solid #00101A below — matching
 * the homepage treatment and the design's frame-level keyvisual + gradient
 * cover (nodes 313:8437 / 313:8439), rather than a hero-scoped bg-cover crop.
 *
 * Design spacing (1440 canvas): content starts at y184 below the absolute 80px
 * header (lg:pt-[184px]); the Root Further logo and the title block sit 120px
 * apart (Bìa gap, node 313:8449); the title block (node 313:8453) is centred —
 * eyebrow node 313:8454 textAlign:center, title node 313:8456 justifyContent:center.
 */
export async function AwardsHero() {
  const t = await getTranslations("AwardsPage.hero");

  return (
    <section className="relative w-full px-6 sm:px-10 lg:px-36">
      <div className="relative z-[1] mx-auto flex w-full max-w-[1224px] flex-col gap-16 pt-28 pb-16 lg:gap-[120px] lg:pt-[184px] lg:pb-[120px]">
        <Image
          src="/login/root-further-wordmark.png"
          alt="ROOT FURTHER"
          width={300}
          height={133}
          className="h-auto w-full max-w-[220px] sm:max-w-[300px]"
          priority
          unoptimized
        />

        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-xl font-bold leading-8 text-white sm:text-2xl">
            {t("eyebrow")}
          </p>
          <div className="h-px w-full bg-[#2E3940]" />
          <h1 className="text-4xl font-bold leading-tight tracking-[-0.25px] text-[#FFEA9E] sm:text-5xl lg:text-[57px] lg:leading-[64px]">
            {t("title")}
          </h1>
        </div>
      </div>
    </section>
  );
}
