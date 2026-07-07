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
 * The design's own "Cover" node (`Keyvisual > Cover`) carries the real
 * darkening overlay. Its own reported CSS (`linear-gradient(25deg, #00101A
 * 14.74%, transparent 47.8%)` on a 1440x957 box offset above the 512px-tall
 * keyvisual) doesn't reproduce the design pixel-for-pixel once measured
 * against the actual rendered frame — the node's box is a leftover from a
 * taller master component, not this instance's true 512px crop. Re-deriving
 * the gradient directly from the design's own rendered pixels (comparing
 * the flat `MM_MEDIA_KV Background` export against the composited frame
 * screenshot, solving for the affine darkening function) gives the gradient
 * that actually reproduces it over THIS 1440x512 box:
 * `linear-gradient(16.9deg, #00101A 19.65%, rgba(0,16,26,0) 68.87%)`.
 * Applied full-size (not the old thin bottom fade), it darkens the
 * bottom-left of the keyvisual — exactly where the KUDOS wordmark and the
 * two pills sit — so the silver wordmark glyphs read at the design's
 * contrast against the swirl art instead of sitting on bare bright orange.
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
 * The two function pills (`Button chuc nang`) — "send Kudos" (compose
 * trigger stub) and "search Sunner" (search trigger stub) — sit INSIDE the
 * same keyvisual container in the design (`Button chuc nang`'s 480px bottom
 * edge is above the keyvisual's own 512px bottom edge, a 32px inset), not
 * below it on the page background. They're positioned here as an
 * absolutely placed row anchored to the keyvisual's own bottom edge, so the
 * darkened swirl art (via the Cover overlay above) backs them exactly as in
 * the design, instead of sitting on the flat page background. Neither pill
 * opens real UI here — both dialogs are out of scope.
 */
export function KudosBanner({ onOpenCompose, onSearchSunner }: KudosBannerProps) {
  const t = useTranslations("KudosPage.banner");

  return (
    <div
      className="relative h-[280px] w-full overflow-hidden bg-[#00101A] bg-cover bg-left bg-no-repeat sm:h-[360px] lg:h-[512px]"
      style={{ backgroundImage: "url(/kudos/kv-background.png)" }}
    >
      {/* Design's "Cover" darkening overlay, full-size — gradient
       * re-derived from the design's own rendered pixels (see doc comment
       * above); reproduces the frame's actual composited look. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(16.9deg, #00101A 19.65%, rgba(0,16,26,0) 68.87%)",
        }}
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

      {/* Design's "Button chuc nang" row — anchored to the keyvisual's own
       * bottom edge (32px inset at the 1440px design width) so both pills
       * sit on the darkened keyvisual art, not the page background below. */}
      <div className="absolute inset-x-0 bottom-4 flex flex-wrap gap-4 px-6 sm:bottom-6 sm:px-10 lg:bottom-8 lg:gap-8 lg:px-36">
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
