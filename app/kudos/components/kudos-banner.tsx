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
 * board's own keyvisual art (MoMorph "Bìa > Frame 532 > Frame 487 > A_KV
 * Kudos" region) — a dark-navy field on the left with a colorful organic
 * swirl sweeping in from the right, exactly as the design's own
 * `MM_MEDIA_KV Background` export composes it (1440x512, no baked text —
 * `/kudos/kv-background.png`).
 *
 * The design's own "KUDOS" wordmark (SVN-Gotham font, unavailable in this
 * project, plus a red Sun* flash icon) is its own exportable design node
 * (`MM_MEDIA_Kudos logo`, 593x104) — reproduced pixel-exact by using that
 * SVG directly (`/kudos/kudos-wordmark.svg`) as a normal absolutely
 * positioned, decorative `<img>` at the design's left/top/size, fully
 * decoupled from the background's own `bg-cover` scaling (baking the
 * wordmark into the background bitmap, as a prior pass did, drifts out of
 * alignment with the live heading at any viewport width other than the
 * asset's own 1440px — this keeps both independently exact). A `sr-only`
 * "KUDOS" text node carries the real accessible name.
 *
 * Below the keyvisual: the two function pills (`Button chuc nang`): "send
 * Kudos" (compose trigger stub) and "search Sunner" (search trigger stub),
 * separated from the keyvisual by the design's own 64px gap (`Frame 532`'s
 * flex gap between `Frame 487` and `Button chuc nang`). Neither pill opens
 * real UI here — both dialogs are out of scope.
 */
export function KudosBanner({ onOpenCompose, onSearchSunner }: KudosBannerProps) {
  const t = useTranslations("KudosPage.banner");

  return (
    <div className="flex w-full flex-col items-center gap-6 sm:gap-10 lg:gap-16">
      <div
        className="relative h-[280px] w-full overflow-hidden bg-[#00101A] bg-cover bg-left bg-no-repeat sm:h-[360px] lg:h-[512px]"
        style={{ backgroundImage: "url(/kudos/kv-background.png)" }}
      >
        {/* Design's "Cover" overlay (linear-gradient(25deg, #00101A 14.74%,
         * transparent 47.8%)): blends the art's bottom edge into the dark
         * page background below. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[37px] bg-gradient-to-t from-[#00101A] to-transparent sm:h-[47px] lg:h-[67px]"
        />
        <div className="flex h-full w-full flex-col items-start justify-center px-6 sm:px-10 lg:justify-start lg:px-36 lg:pt-[184px]">
          <h1 className="relative text-2xl font-bold leading-tight text-[#FFEA9E] sm:text-3xl lg:text-[36px] lg:leading-[44px]">
            {t("eyebrow")}
          </h1>
        </div>
        {/* Design's "MM_MEDIA_Kudos logo" lockup (flash icon + KUDOS glyphs)
         * — absolutely positioned at its own exact left/top/size so it
         * stays pixel-exact independent of the background image's scaling. */}
        <img
          src="/kudos/kudos-wordmark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-6 top-[130px] w-[324px] sm:left-10 sm:top-[167px] sm:w-[417px] lg:left-36 lg:top-[238px] lg:w-[593px]"
        />
        <p className="sr-only">KUDOS</p>
      </div>

      <div className="flex w-full flex-wrap gap-4 px-6 sm:px-10 lg:px-36">
        <button
          type="button"
          onClick={() => onOpenCompose?.()}
          className="flex flex-1 basis-[280px] items-center gap-2 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-6 text-left text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
        >
          <SendIcon className="size-6 shrink-0" />
          {t("sendPrompt")}
        </button>
        <button
          type="button"
          onClick={() => onSearchSunner?.()}
          className="flex flex-1 basis-[200px] items-center gap-2 rounded-[68px] border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-4 py-6 text-left text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
        >
          <SearchIcon className="size-6 shrink-0" />
          {t("searchSunner")}
        </button>
      </div>
    </div>
  );
}
