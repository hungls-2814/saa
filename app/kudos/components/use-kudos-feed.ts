"use client";

import { useCallback, useRef } from "react";
import { loadMoreFeedAction } from "@/lib/kudos/actions";
import type { FilterState, KudosCard } from "@/lib/kudos/types";

export interface UseKudosFeedOptions {
  /** Called with the newly-fetched page to append to the feed. */
  onAppend: (items: KudosCard[], nextCursor: string | null) => void;
  /** Called on a failed/errored load-more attempt (state is left unchanged by the caller). */
  onError: () => void;
}

/**
 * Button-driven load-more for the `/kudos` "ALL KUDOS" feed (FR3,
 * Integration Phase 06). Owns only the in-flight guard — a rapid double-click
 * on the "Xem thêm" button in `AllKudosFeed` can fire `onLoadMore` twice
 * before state updates, so a ref-based flag drops any call that arrives while
 * a fetch is still pending.
 */
export function useKudosFeed({ onAppend, onError }: UseKudosFeedOptions) {
  const inFlight = useRef(false);

  const loadMore = useCallback(
    async (cursor: string | null, filter: FilterState) => {
      if (inFlight.current || cursor === null) return;
      inFlight.current = true;
      try {
        const result = await loadMoreFeedAction({ cursor, filter });
        if (result.ok) {
          onAppend(result.items, result.nextCursor);
        } else {
          onError();
        }
      } catch {
        onError();
      } finally {
        inFlight.current = false;
      }
    },
    [onAppend, onError],
  );

  return { loadMore };
}
