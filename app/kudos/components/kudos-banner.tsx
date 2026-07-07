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
 * Top keyvisual: "Hệ thống ghi nhận và cảm ơn" eyebrow over the `/kudos`
 * board's own keyvisual art (MoMorph "B_Highlight > A_KV Kudos" region) — a
 * dark-navy field on the left with a colorful organic swirl sweeping in from
 * the right, exactly as the design composes it (extracted via
 * `get_frame_image`, cropped to the region below the site's own top nav:
 * global frame y80-512, i.e. the 1440x432 `/kudos/kv-background.png`).
 *
 * The design's own "KUDOS" wordmark (SVN-Gotham font, unavailable in this
 * project, plus a red Sun* flash icon baked into its lockup) is reproduced
 * pixel-exact by baking that region directly into the background asset
 * instead of re-typesetting it — the heading row above it was masked back
 * to the scene's own dark gradient (sampled from the image's own untouched
 * left edge, feathered at the seams) so the LIVE, per-locale heading text
 * can render there without doubling. The "KUDOS" `<p>` stays in the DOM
 * (transparent) purely so screen readers and the existing "renders the
 * KUDOS wordmark" test still see real text — the visible glyph is the baked
 * image.
 *
 * Below the keyvisual: the two function pills (`Button chuc nang`): "send
 * Kudos" (compose trigger stub) and "search Sunner" (search trigger stub).
 * Neither pill opens real UI here — both dialogs are out of scope.
 */
export function KudosBanner({ onOpenCompose, onSearchSunner }: KudosBannerProps) {
  const t = useTranslations("KudosPage.banner");

  return (
    <div className="flex w-full flex-col items-center gap-6">
      <div
        className="relative flex h-[280px] w-full flex-col items-start justify-center gap-2 overflow-hidden bg-[#00101A] bg-cover bg-left bg-no-repeat px-6 sm:h-[360px] sm:px-10 lg:h-[432px] lg:justify-start lg:px-36 lg:pt-[104px]"
        style={{ backgroundImage: "url(/kudos/kv-background.png)" }}
      >
        {/* Design's "Cover" overlay (linear-gradient(25deg, #00101A 14.74%,
         * transparent 47.8%)): blends the art's bottom edge into the dark
         * page background below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#00101A] to-transparent sm:h-20 lg:h-24"
        />
        <h1 className="relative text-2xl font-bold leading-tight text-[#FFEA9E] sm:text-3xl lg:text-[36px] lg:leading-[44px]">
          {t("eyebrow")}
        </h1>
        <p className="relative select-none text-6xl font-bold tracking-[-0.13em] text-transparent sm:text-7xl lg:text-8xl">
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
