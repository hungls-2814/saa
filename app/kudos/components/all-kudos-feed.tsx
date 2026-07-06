"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";
import { KudosCard } from "./kudos-card";

export interface AllKudosFeedProps {
  feed: KudosCardType[];
  /** Whether a further keyset page exists (derived from `feedNextCursor !== null`). */
  hasMore: boolean;
  onLoadMore?: () => void;
  onToggleLike?: (kudosId: string) => void;
  onCopyLink?: (kudosId: string) => void;
  onSelectHashtag?: (hashtagId: string) => void;
}

/**
 * "ALL KUDOS" feed (FR3): newest-first cards with infinite scroll. An
 * IntersectionObserver sentinel calls `onLoadMore` once it enters view (the
 * caller owns the actual keyset fetch); a visible "load more" button is kept
 * as an accessible/testable fallback for the same action.
 */
export function AllKudosFeed({
  feed,
  hasMore,
  onLoadMore,
  onToggleLike,
  onCopyLink,
  onSelectHashtag,
}: AllKudosFeedProps) {
  const t = useTranslations("KudosPage.feed");
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (feed.length === 0) {
    return <p className="w-full py-12 text-center text-base text-white/70">{t("empty")}</p>;
  }

  return (
    <div className="flex w-full flex-col gap-6">
      {feed.map((kudos) => (
        <KudosCard
          key={kudos.id}
          kudos={kudos}
          variant="feed"
          onToggleLike={onToggleLike}
          onCopyLink={onCopyLink}
          onSelectHashtag={onSelectHashtag}
        />
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <button
            type="button"
            onClick={() => onLoadMore?.()}
            className="rounded border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-6 py-3 text-sm font-bold text-white transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
          >
            {t("loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}
