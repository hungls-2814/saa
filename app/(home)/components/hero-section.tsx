import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Countdown } from "./countdown";
import { DEFAULT_EVENT_DATETIME } from "@/lib/event/countdown";

/**
 * Hero: ROOT FURTHER wordmark, countdown, event info (time/venue/livestream
 * note), and the two CTA buttons. The key-visual art is painted once at the
 * page level (see `page.tsx`, clean node 2167:9028 + Cover gradient) so it
 * spans the hero and the intro section below; this component only renders the
 * foreground content. Content is centered in the design's 1224px content column
 * (aligned with the awards/kudos sections) and top-aligned below the 80px header.
 */
export async function HeroSection() {
  const t = await getTranslations("Home.hero");

  return (
    <section
      className="relative flex min-h-[779px] w-full items-start px-6 pt-28 pb-16 sm:px-10 lg:pt-[184px] lg:pb-24"
    >
      <div className="relative z-[1] mx-auto flex w-full max-w-[1224px] flex-col items-start">
      <div className="flex w-full max-w-[680px] flex-col gap-10">
        <Image
          src="/login/root-further-wordmark.png"
          alt="ROOT FURTHER"
          width={451}
          height={200}
          className="h-auto w-full max-w-[451px]"
          priority
          unoptimized
        />

        <div className="flex flex-col gap-4">
          <Countdown
            targetIso={
              process.env.NEXT_PUBLIC_EVENT_DATETIME ?? DEFAULT_EVENT_DATETIME
            }
          />

          <div className="flex flex-col gap-2 text-white">
            <p className="flex flex-wrap items-center gap-x-[60px] gap-y-1 text-sm font-bold tracking-[0.15px] sm:text-base">
              <span>
                {t("timeLabel")}{" "}
                <span className="text-[#FFEA9E]">{t("timeValue")}</span>
              </span>
              <span>
                {t("locationLabel")}{" "}
                <span className="text-[#FFEA9E]">{t("locationValue")}</span>
              </span>
            </p>
            <p className="text-sm font-bold tracking-[0.5px]">
              {t("livestreamNote")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-10">
          <a
            href="/he-thong-giai"
            className="rounded-lg px-6 py-4 text-base font-bold text-[#00101A] transition-all duration-200 ease-out bg-[#FFEA9E] hover:-translate-y-0.5 hover:bg-[#FFF8E1] hover:shadow-lg"
          >
            {t("ctaAbout")}
          </a>
          <a
            href="/kudos"
            className="rounded-lg border border-white/40 px-6 py-4 text-base font-bold text-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/10"
          >
            {t("ctaKudos")}
          </a>
        </div>
      </div>
      </div>
    </section>
  );
}
