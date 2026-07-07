"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { SpotlightNode } from "@/lib/kudos/types";
import { formatKudosTimestamp, formatTickerTime } from "./render-helpers";
import { buildActivityTicker } from "./spotlight-activity-ticker";
import { buildScatterItems, SPOTLIGHT_CANVAS_WIDTH_PX } from "./spotlight-scatter";
import { SearchIcon } from "./icons";
import { CollapseIcon, ExpandIcon } from "./icon-controls";

export interface SpotlightBoardProps {
  totalKudos: number;
  nodes: SpotlightNode[];
  /** Route-stub navigation only — kudos-detail page is out of scope for this screen. */
  onSelectNode?: (receiverId: string) => void;
}

const MAX_SEARCH_LENGTH = 100;

/** The design's own highlight color (`B.7_Spotlight` node `2940:14198`,
 * fill `rgba(241, 118, 118, 1)`) — applied to exactly one scatter item, the
 * top-weight receiver's first instance (`ScatterItem.isHighlighted`). */
const HIGHLIGHT_COLOR = "#F17676";

/** Design's own 1157x548 box (`B.7_Spotlight`) — the compact/default panel
 * size, used to keep the container's aspect ratio faithful across viewport
 * widths. The design only shows this one state; "expanded" (~50% taller,
 * same width) is this implementation's own reasonable second state since no
 * expanded-state screen exists to extract exact numbers from. */
const COMPACT_ASPECT = "1157 / 548";
const EXPANDED_ASPECT = "1157 / 822";

/**
 * Spotlight Board (FR2): "<N> KUDOS" header, a receiver word-cloud sized by
 * kudos-received weight, a "Tìm kiếm" search (client-side node filter, max
 * 100 chars), and a compact/expand toggle for the PANEL itself (design's
 * `B.7.2_Pan zoom` corner control is a resize glyph, not a content-zoom
 * magnifying glass — see `ExpandIcon`/`CollapseIcon`), over a name-free
 * background — a dark constellation dot/line mesh plus a colorful organic
 * swirl fading in from the bottom-left corner (composed from this project's
 * own name-free art since the design's isolated background layer has no
 * exportable Figma render; see `public/kudos/spotlight-bg.png`). The
 * bottom-left "recent activity" ticker shown in the design (e.g. `08:30PM
 * Nguyễn Bá Chức đã nhận được một Kudos mới`) is reproduced as a **static**
 * render of the most-recently-received nodes (`buildActivityTicker`) — the
 * earlier "no live push" clarification only ruled out a realtime feed, not
 * rendering this text from the data already on the page. Node click
 * navigates to the kudos detail route stub per the clarified nav-stub rule.
 *
 * The design's word-cloud uses many repeated/rescaled text layers to create
 * density and organic scatter; `buildScatterItems` (spotlight-scatter.ts)
 * reproduces that with a single fine jittered-grid placement so no two
 * labels — across the whole board — ever overlap, evenly covering the
 * canvas around the search/header/ticker footprints. Node weight drives
 * each receiver's first (largest, brightest) instance, and the single
 * top-weight receiver's first instance renders in the design's highlight
 * red (`ScatterItem.isHighlighted`). Seeded by index (no
 * `Math.random`/`Date.now`) so layout is SSR/hydration-stable.
 */
export function SpotlightBoard({ totalKudos, nodes, onSelectNode }: SpotlightBoardProps) {
  const t = useTranslations("KudosPage.spotlight");
  const [search, setSearch] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);

  const scatterItems = useMemo(() => buildScatterItems(nodes), [nodes]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scatterItems;
    return scatterItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [scatterItems, search]);
  const tickerItems = useMemo(() => buildActivityTicker(nodes), [nodes]);

  return (
    <div
      // `containerType: inline-size` turns this panel into a CSS container-query
      // container so descendant `cqw` units below scale with its *actual*
      // rendered width — the layout math in spotlight-scatter.ts sizes fonts
      // against a fixed 1157px canvas, and a raw px value would balloon
      // relative to the panel (and start overlapping again) once the panel
      // shrinks below that on narrow viewports.
      className="relative min-h-[360px] w-full overflow-hidden rounded-[47px] border border-[#998C5F] bg-[#00070C] bg-cover bg-center transition-[aspect-ratio] duration-300 ease-out"
      style={{
        aspectRatio: isExpanded ? EXPANDED_ASPECT : COMPACT_ASPECT,
        backgroundImage: "url(/kudos/spotlight-bg.png)",
        containerType: "inline-size",
      }}
    >
      <div className="absolute inset-0 flex flex-col p-6 sm:p-10">
        <div className="relative mb-6 flex flex-col items-center gap-3 sm:flex-row">
          <label className="flex w-full max-w-[220px] items-center gap-2 rounded-[46px] border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-3 py-2">
            <SearchIcon className="size-4 shrink-0 text-white" />
            <input
              type="text"
              value={search}
              maxLength={MAX_SEARCH_LENGTH}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-full bg-transparent text-sm font-bold text-white placeholder:text-white/70 focus:outline-none"
            />
          </label>

          <p className="pointer-events-none text-center text-2xl font-bold text-white sm:absolute sm:inset-x-0 sm:text-4xl">
            {t("kudosCount", { count: totalKudos })}
          </p>
        </div>

        {nodes.length === 0 ? (
          <p className="flex-1 py-16 text-center text-base text-white/70">{t("empty")}</p>
        ) : (
          <div className="relative flex-1 overflow-hidden">
            {filtered.map((item) => (
              <Link
                key={item.key}
                href={`/kudos/${item.receiverId}`}
                onClick={() => onSelectNode?.(item.receiverId)}
                title={`${item.name} · ${formatKudosTimestamp(item.lastReceivedAt)}`}
                style={{
                  left: `${item.leftPct}%`,
                  top: `${item.topPct}%`,
                  fontSize: `${(item.fontSize / SPOTLIGHT_CANVAS_WIDTH_PX) * 100}cqw`,
                  opacity: item.opacity,
                  color: item.isHighlighted ? HIGHLIGHT_COLOR : undefined,
                  // Every instance is placed by one non-overlapping grid
                  // (see spotlight-scatter.ts); keep each receiver's first,
                  // largest instance stacked above its own fainter repeats.
                  zIndex: item.isPrimary ? 1 : 0,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-bold text-white transition-colors duration-200 ease-out hover:text-[#FFEA9E]"
              >
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {tickerItems.length > 0 && (
        <div className="pointer-events-none absolute bottom-6 left-4 flex max-w-[70%] flex-col gap-0.5 sm:bottom-8 sm:left-8">
          {tickerItems.map((item, index) => (
            <p
              key={item.key}
              style={{ opacity: (index + 1) / tickerItems.length }}
              className="truncate text-[10px] font-bold text-white sm:text-xs"
            >
              {`${formatTickerTime(item.lastReceivedAt)} ${item.name} ${t("activitySuffix")}`}
            </p>
          ))}
        </div>
      )}

      <div className="absolute bottom-4 right-4">
        <button
          type="button"
          aria-label={isExpanded ? t("collapse") : t("expand")}
          onClick={() => setIsExpanded((v) => !v)}
          className="flex size-8 items-center justify-center rounded text-white hover:bg-white/10"
        >
          {isExpanded ? <CollapseIcon className="size-5" /> : <ExpandIcon className="size-5" />}
        </button>
      </div>
    </div>
  );
}
