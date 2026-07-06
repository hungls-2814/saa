"use client";

import { useTranslations } from "next-intl";
import type { BoardData, FilterState } from "@/lib/kudos/types";
import { KudosBanner } from "./kudos-banner";
import { FilterBar } from "./filter-bar";
import { SectionHeader } from "./section-header";
import { HighlightCarousel } from "./highlight-carousel";
import { SpotlightBoard } from "./spotlight-board";
import { AllKudosFeed } from "./all-kudos-feed";
import { SidebarStats } from "./sidebar-stats";
import { SidebarGifts } from "./sidebar-gifts";

export interface KudosBoardProps {
  data: BoardData;
  /** Current hashtag/department selection (FR4); owned by the caller so page
   * navigation/URL state can round-trip it. */
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onToggleLike?: (kudosId: string) => void;
  onCopyLink?: (kudosId: string) => void;
  /** Fired both by a card's hashtag chip and by picking a hashtag from the
   * filter dropdown — both set/replace the single hashtag filter (FR4). */
  onSelectHashtag?: (hashtagId: string) => void;
  onLoadMore?: () => void;
  onOpenCompose?: () => void;
  onSearchSunner?: () => void;
}

/**
 * `/kudos` board composition (Track A, F005): assembles the banner, filter
 * bar, Highlight carousel, Spotlight word-cloud, All-Kudos feed, and the
 * stats/gifts sidebar into the page layout. Purely presentational — the
 * caller (Integration/page.tsx) supplies `data` (a static SSR fetch per the
 * "no realtime" clarification) and the event callbacks; this component does
 * not fetch or mutate anything itself. `SiteHeader`/`SiteFooter` are NOT
 * rendered here — the caller composes those around this component since
 * they need the authenticated `user` from the page's own Supabase call.
 */
export function KudosBoard({
  data,
  filters,
  onFilterChange,
  onToggleLike,
  onCopyLink,
  onSelectHashtag,
  onLoadMore,
  onOpenCompose,
  onSearchSunner,
}: KudosBoardProps) {
  const t = useTranslations("KudosPage");

  function handleSelectHashtag(hashtagId: string) {
    onFilterChange({ ...filters, hashtagId });
    onSelectHashtag?.(hashtagId);
  }

  return (
    <div className="flex w-full flex-col items-center bg-[#00101A]">
      <KudosBanner onOpenCompose={onOpenCompose} onSearchSunner={onSearchSunner} />

      <div className="flex w-full max-w-[1512px] flex-col gap-16 px-6 py-10 sm:px-10 sm:py-16 lg:gap-[120px] lg:px-36 lg:py-24">
        <section className="flex flex-col gap-8">
          <SectionHeader
            eyebrow={t("sectionEyebrow")}
            title={t("highlight.title")}
            actions={
              <FilterBar
                hashtags={data.hashtags}
                departments={data.departments}
                value={filters}
                onFilterChange={onFilterChange}
              />
            }
          />
          <HighlightCarousel
            highlights={data.highlights}
            onToggleLike={onToggleLike}
            onCopyLink={onCopyLink}
            onSelectHashtag={handleSelectHashtag}
          />
        </section>

        <section className="flex flex-col gap-8">
          <SectionHeader eyebrow={t("sectionEyebrow")} title={t("spotlight.title")} />
          <SpotlightBoard totalKudos={data.spotlight.totalKudos} nodes={data.spotlight.nodes} />
        </section>

        <section className="flex flex-col gap-8">
          <SectionHeader eyebrow={t("sectionEyebrow")} title={t("feed.title")} />
          <div className="flex flex-col items-start gap-6 lg:flex-row">
            <div className="w-full flex-1">
              <AllKudosFeed
                feed={data.feed}
                hasMore={data.feedNextCursor !== null}
                onLoadMore={onLoadMore}
                onToggleLike={onToggleLike}
                onCopyLink={onCopyLink}
                onSelectHashtag={handleSelectHashtag}
              />
            </div>
            <aside className="flex w-full flex-col gap-6 lg:w-[422px] lg:shrink-0">
              <SidebarStats stats={data.stats} />
              <SidebarGifts gifts={data.gifts} />
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
