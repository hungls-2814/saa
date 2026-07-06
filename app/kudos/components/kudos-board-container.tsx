"use client";

import { useCallback, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { applyFiltersAction, toggleHeartAction } from "@/lib/kudos/actions";
import type { BoardData, FilterState, KudosCard } from "@/lib/kudos/types";
import { KudosBoard } from "./kudos-board";
import { KudosToast } from "./kudos-toast";
import { useKudosFeed } from "./use-kudos-feed";

export interface KudosBoardContainerProps {
  /** SSR payload from `getBoardData` — the real replacement for the Track A mock data. */
  initialData: BoardData;
}

function patchCard(cards: KudosCard[], kudosId: string, liked: boolean, heartCount: number) {
  return cards.map((card) => (card.id === kudosId ? { ...card, likedByMe: liked, heartCount } : card));
}

/**
 * The single `"use client"` boundary for `/kudos` (Integration, Phase 06).
 * Holds all interactive board state and wires `KudosBoard`'s presentational
 * callbacks to the Phase-02/03 Server Actions — the board itself, its
 * cards, filter bar, carousel, and feed stay pure/props-in.
 *
 * `onSelectHashtag` is intentionally left unwired: `KudosBoard` already
 * folds a hashtag-chip click into `onFilterChange` with the merged
 * `FilterState` (see `kudos-board.tsx`), so re-wiring `onSelectHashtag` here
 * too would fire `applyFiltersAction` twice for the same click.
 */
export function KudosBoardContainer({ initialData }: KudosBoardContainerProps) {
  const t = useTranslations("KudosPage.toast");
  const [data, setData] = useState<BoardData>(initialData);
  const [filters, setFilters] = useState<FilterState>({});
  const [toast, setToast] = useState<string | null>(null);
  const likingRef = useRef<Set<string>>(new Set());
  const filterTokenRef = useRef(0);

  const showError = useCallback(() => setToast(t("error")), [t]);

  const { loadMore } = useKudosFeed({
    onAppend: (items, nextCursor) =>
      setData((prev) => ({ ...prev, feed: [...prev.feed, ...items], feedNextCursor: nextCursor })),
    onError: showError,
  });

  const handleFilterChange = useCallback(
    async (nextFilters: FilterState) => {
      setFilters(nextFilters);
      const token = ++filterTokenRef.current;
      try {
        const result = await applyFiltersAction(nextFilters);
        if (token !== filterTokenRef.current) return; // a newer filter change has since won
        if (result.ok) {
          setData((prev) => ({
            ...prev,
            highlights: result.highlights,
            feed: result.feed,
            feedNextCursor: result.nextCursor,
          }));
        } else {
          showError();
        }
      } catch {
        if (token === filterTokenRef.current) showError();
      }
    },
    [showError],
  );

  const handleToggleLike = useCallback(
    async (kudosId: string) => {
      if (likingRef.current.has(kudosId)) return;
      const target = data.feed.find((c) => c.id === kudosId) ?? data.highlights.find((c) => c.id === kudosId);
      if (!target) return;

      likingRef.current.add(kudosId);
      const { likedByMe: originalLiked, heartCount: originalCount } = target;
      const optimisticLiked = !originalLiked;
      const optimisticCount = originalCount + (optimisticLiked ? 1 : -1);

      setData((prev) => ({
        ...prev,
        highlights: patchCard(prev.highlights, kudosId, optimisticLiked, optimisticCount),
        feed: patchCard(prev.feed, kudosId, optimisticLiked, optimisticCount),
      }));

      try {
        const result = await toggleHeartAction(kudosId);
        if (result.ok) {
          setData((prev) => ({
            ...prev,
            highlights: patchCard(prev.highlights, kudosId, result.liked, result.heartCount),
            feed: patchCard(prev.feed, kudosId, result.liked, result.heartCount),
          }));
        } else {
          setData((prev) => ({
            ...prev,
            highlights: patchCard(prev.highlights, kudosId, originalLiked, originalCount),
            feed: patchCard(prev.feed, kudosId, originalLiked, originalCount),
          }));
          setToast(result.error === "self_like" ? t("selfLike") : t("error"));
        }
      } catch {
        setData((prev) => ({
          ...prev,
          highlights: patchCard(prev.highlights, kudosId, originalLiked, originalCount),
          feed: patchCard(prev.feed, kudosId, originalLiked, originalCount),
        }));
        showError();
      } finally {
        likingRef.current.delete(kudosId);
      }
    },
    [data.feed, data.highlights, showError, t],
  );

  const handleCopyLink = useCallback(
    (kudosId: string) => {
      const url = `${window.location.origin}/kudos/${kudosId}`;
      navigator.clipboard
        .writeText(url)
        .then(() => setToast(t("copyLinkSuccess")))
        .catch(() => showError());
    },
    [showError, t],
  );

  return (
    <>
      <KudosToast message={toast} onDismiss={() => setToast(null)} />
      <KudosBoard
        data={data}
        filters={filters}
        onFilterChange={handleFilterChange}
        onToggleLike={handleToggleLike}
        onCopyLink={handleCopyLink}
        onLoadMore={() => loadMore(data.feedNextCursor, filters)}
      />
    </>
  );
}
