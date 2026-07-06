"use client";

import { useTranslations } from "next-intl";
import { SearchIcon, SendIcon } from "./icons";

export interface KudosBannerProps {
  /** Opens the compose-Kudos dialog — trigger stub only (dialog is out of scope for this screen). */
  onOpenCompose?: () => void;
  /** Opens the Sunner-profile search — trigger stub only (search UI is out of scope for this screen). */
  onSearchSunner?: () => void;
}

/**
 * Top keyvisual: "Hệ thống ghi nhận và cảm ơn" eyebrow + KUDOS wordmark over
 * the shared Kudos hero art (same `/home/kudos-bg.png` asset used by the
 * homepage teaser — same design source, so it's reused rather than
 * re-extracted), plus the two function pills below it (`Button chuc nang`):
 * "send Kudos" (compose trigger stub) and "search Sunner" (search trigger
 * stub). Neither pill opens real UI here — both dialogs are out of scope.
 */
export function KudosBanner({ onOpenCompose, onSearchSunner }: KudosBannerProps) {
  const t = useTranslations("KudosPage.banner");

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        className="relative flex h-[280px] w-full flex-col items-start justify-center gap-2 bg-[#00101A] bg-cover bg-center bg-no-repeat px-6 sm:h-[360px] sm:px-10 lg:h-[512px] lg:px-36"
        style={{ backgroundImage: "url(/home/kudos-bg.png)" }}
      >
        <h1 className="text-2xl font-bold leading-tight text-[#FFEA9E] sm:text-3xl lg:text-[36px] lg:leading-[44px]">
          {t("eyebrow")}
        </h1>
        <p className="select-none text-6xl font-bold tracking-[-0.13em] text-[#DBD1C1] sm:text-7xl lg:text-8xl">
          KUDOS
        </p>
      </div>

      <div className="flex w-full flex-wrap gap-4 px-6 sm:px-10 lg:px-36">
        <button
          type="button"
          onClick={() => onOpenCompose?.()}
          className="flex flex-1 basis-[280px] items-center gap-4 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-6 text-left text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
        >
          <SendIcon className="size-6 shrink-0" />
          {t("sendPrompt")}
        </button>
        <button
          type="button"
          onClick={() => onSearchSunner?.()}
          className="flex flex-1 basis-[200px] items-center gap-4 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-6 text-left text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
        >
          <SearchIcon className="size-6 shrink-0" />
          {t("searchSunner")}
        </button>
      </div>
    </div>
  );
}
