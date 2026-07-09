"use client";

import { useTranslations } from "next-intl";
import type { HeroBadge, StarTier } from "@/lib/kudos/types";
import { Avatar } from "@/app/kudos/components/avatar";
import { HeroBadgeImage } from "@/app/kudos/components/hero-badge-image";
import { starGlyph } from "@/app/kudos/components/render-helpers";

export interface ProfileHeaderProps {
  fullName: string;
  avatarUrl: string;
  department: string;
  starTier: StarTier;
  heroBadge: HeroBadge;
}

/** Icon-collection slots (region A.3 / B2–B7) are Secret-Box-derived and out
 * of scope per `clarifications.md` — always rendered as static gray/locked
 * placeholders regardless of props. */
const LOCKED_ICON_COUNT = 6;

/**
 * Region A of the Personal Profile page (MoMorph `362:5052`
 * "mms_A_Info", screen `3FoIx6ALVb`): keyvisual band, centered avatar, name +
 * star tier ("số hoa thị") + department + Hero badge, and the (deferred,
 * static) icon-collection row.
 *
 * Purely presentational — no data fetching; `fullName`/`avatarUrl`/
 * `department`/`starTier`/`heroBadge` are supplied by the page composition
 * (phase 05) via `getMyProfileHeader`.
 */
export function ProfileHeader({
  fullName,
  avatarUrl,
  department,
  starTier,
  heroBadge,
}: ProfileHeaderProps) {
  const t = useTranslations("ProfilePage");
  const stars = starGlyph(starTier);

  return (
    <section className="relative w-full overflow-hidden bg-[#00101A]">
      {/*
       * Keyvisual band (design "Keyvisual" instance, componentId 1210:12613)
       * — same colorful-swirl art + fade-to-solid Cover treatment reused from
       * `app/he-thong-giai/page.tsx` (node 2167:5138 / 313:8439), exported to
       * `/home/awards-hero-keyvisual.png`. Sits behind the region content
       * only; the site header itself is composed as a preceding sibling by
       * the page (phase 05), so this band simply starts at this section's
       * own top edge.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0">
        {/*
         * Keyvisual art height matches the design (node 1210:12622: 512px tall
         * at 1440w). It MUST stay tall enough to sit behind the avatar AND the
         * name (design name y416–496 is within the 512px art) now that the
         * content is padded down below the header — scaled per breakpoint so
         * the name always lands on the art, never below it on solid bg.
         */}
        <div
          className="h-[420px] w-full bg-cover bg-top bg-no-repeat sm:h-[480px] lg:h-[512px]"
          style={{ backgroundImage: "url(/home/awards-hero-keyvisual.png)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(0deg, #00101A -4.23%, rgba(0,19,32,0) 52.79%)",
          }}
        />
      </div>

      {/*
       * Top padding clears the fixed 80px SiteHeader (absolute, painted over
       * this section) PLUS the design's 96px gap-below-header (Bìa node
       * 362:5050 padding-top) — so the avatar sits centered in the band below
       * the header, not riding up into it. Scaled down on smaller viewports.
       * Bottom padding = the design's 64px region A → region B gap (Frame 532).
       */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1224px] flex-col items-center gap-8 px-6 pb-16 pt-[120px] sm:px-10 sm:pt-[152px] lg:px-36 lg:pt-[176px]">
        {/* A.1 — centered avatar, larger than the Kudos-card treatment. */}
        <Avatar
          name={fullName}
          avatarUrl={avatarUrl}
          sizeClassName="size-[200px]"
          textSizeClassName="text-5xl"
        />

        {/* A.2 — name, then star tier + department + Hero badge row, same
            composition as `KudosPersonInfo` (design b1Filzi9i6). */}
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold leading-tight text-[#FFEA9E] sm:text-3xl lg:text-[36px] lg:leading-[44px]">
            {fullName}
          </h1>
          <div className="flex items-center gap-2.5 text-lg font-bold leading-7 text-white lg:text-[22px]">
            {stars && <span className="text-[#998C5F]">{stars}</span>}
            <span>{department}</span>
            {heroBadge !== "none" && (
              <>
                <span aria-hidden className="size-1 shrink-0 rounded-full bg-[#999] opacity-40" />
                <HeroBadgeImage badge={heroBadge} />
              </>
            )}
          </div>
        </div>

        {/*
         * A.3 — icon-collection row (B2–B7): Secret Box has zero backend per
         * `clarifications.md`, so every slot renders as a static gray/locked
         * circle (background/border values read off design node
         * `I362:5066;3053:10046`) — no data, no click handler.
         */}
        <div className="flex flex-col items-center gap-8">
          <div className="flex items-center gap-4">
            {Array.from({ length: LOCKED_ICON_COUNT }, (_, index) => (
              <span
                key={index}
                data-testid="locked-icon"
                aria-hidden
                className="size-16 shrink-0 rounded-full border-2 border-white bg-[#323231]"
              />
            ))}
          </div>
          <p className="text-lg font-bold leading-7 text-white lg:text-[22px]">
            {t("iconCollection")}
          </p>
        </div>
      </div>
    </section>
  );
}
