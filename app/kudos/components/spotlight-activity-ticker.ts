import type { SpotlightNode } from "@/lib/kudos/types";

/**
 * Pure builder for the Spotlight Board's bottom-left "recent activity"
 * ticker (design nodes `3004:15995`-`2940:14230`, e.g. "08:30PM Nguyễn Bá
 * Chức đã nhận được một Kudos mới"). Split out of `spotlight-scatter.ts`
 * (which owns the word-cloud grid placement) to keep each file
 * single-purpose and under the project's file-size guideline.
 */

/** One row of the ticker. */
export interface ActivityTickerItem {
  key: string;
  receiverId: string;
  name: string;
  lastReceivedAt: string;
}

const DEFAULT_TICKER_ROWS = 5;

/**
 * Builds the ticker rows from real node data — no invented entries. Takes
 * the `maxRows` most-recently-received nodes and returns them **oldest
 * first** so the caller can render index 0 at the top (faintest) through
 * the last index at the bottom (fully opaque, newest), matching the
 * design's fade-in-from-top stack.
 */
export function buildActivityTicker(
  nodes: readonly SpotlightNode[],
  maxRows: number = DEFAULT_TICKER_ROWS,
): ActivityTickerItem[] {
  return [...nodes]
    .sort((a, b) => new Date(b.lastReceivedAt).getTime() - new Date(a.lastReceivedAt).getTime())
    .slice(0, maxRows)
    .reverse()
    .map((node) => ({
      key: node.receiverId,
      receiverId: node.receiverId,
      name: node.name,
      lastReceivedAt: node.lastReceivedAt,
    }));
}
