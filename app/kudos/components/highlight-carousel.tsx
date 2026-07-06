"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";
import { KudosCard } from "./kudos-card";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

export interface HighlightCarouselProps {
  /** Top-5 kudos by heart_count (FR1) — the caller is responsible for the
   * top-5/heart_count ordering; this component only paginates what it's given. */
  highlights: KudosCardType[];
  onToggleLike?: (kudosId: string) => void;
  onCopyLink?: (kudosId: string) => void;
  onSelectHashtag?: (hashtagId: string) => void;
}

/**
 * Highlight Kudos carousel (FR1): one active card at a time, with dimmed
 * neighbor cards peeking in on either side. Prev/next disable at the ends;
 * the paginator reads `n/min(5, total)` per the resolved clarification
 * (e.g. "2/3" when only 3 highlights exist).
 */
export function HighlightCarousel({
  highlights,
  onToggleLike,
  onCopyLink,
  onSelectHashtag,
}: HighlightCarouselProps) {
  const t = useTranslations("KudosPage.highlight");
  const [activeIndex, setActiveIndex] = useState(0);

  if (highlights.length === 0) {
    return <p className="py-12 text-center text-base text-white/70">{t("empty")}</p>;
  }

  // Clamp the active index to the current highlights length. The array can
  // shrink out from under this component when a filter is applied (FR4/SC5);
  // a stale `activeIndex` would otherwise point past the end and render an
  // undefined card, crashing the client tree.
  const total = Math.min(5, highlights.length);
  const safeIndex = Math.min(activeIndex, highlights.length - 1);
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === highlights.length - 1;
  const prev = highlights[safeIndex - 1];
  const active = highlights[safeIndex];
  const next = highlights[safeIndex + 1];

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <div className="relative flex w-full items-center justify-center gap-6 overflow-hidden">
        {prev && (
          <div
            aria-hidden
            className="hidden w-1/3 shrink-0 scale-95 opacity-30 md:block"
          >
            <KudosCard kudos={prev} variant="highlight" />
          </div>
        )}
        <div className="w-full max-w-[528px] shrink-0">
          <KudosCard
            kudos={active}
            variant="highlight"
            onToggleLike={onToggleLike}
            onCopyLink={onCopyLink}
            onSelectHashtag={onSelectHashtag}
          />
        </div>
        {next && (
          <div
            aria-hidden
            className="hidden w-1/3 shrink-0 scale-95 opacity-30 md:block"
          >
            <KudosCard kudos={next} variant="highlight" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-8">
        <button
          type="button"
          aria-label={t("prev")}
          disabled={isFirst}
          onClick={() => setActiveIndex(Math.max(0, safeIndex - 1))}
          className="flex size-12 items-center justify-center rounded text-white transition-colors duration-200 ease-out enabled:hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeftIcon className="size-7" />
        </button>
        <span className="text-[28px] font-bold leading-9 text-[#999]">
          {safeIndex + 1}/{total}
        </span>
        <button
          type="button"
          aria-label={t("next")}
          disabled={isLast}
          onClick={() => setActiveIndex(Math.min(highlights.length - 1, safeIndex + 1))}
          className="flex size-12 items-center justify-center rounded text-white transition-colors duration-200 ease-out enabled:hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronRightIcon className="size-7" />
        </button>
      </div>
    </div>
  );
}
