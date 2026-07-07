"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { SpotlightNode } from "@/lib/kudos/types";
import { formatKudosTimestamp } from "./render-helpers";
import { SearchIcon, ZoomInIcon, ZoomOutIcon } from "./icons";

export interface SpotlightBoardProps {
  totalKudos: number;
  nodes: SpotlightNode[];
  /** Route-stub navigation only — kudos-detail page is out of scope for this screen. */
  onSelectNode?: (receiverId: string) => void;
}

const MAX_SEARCH_LENGTH = 100;
const ZOOM_LEVELS = [1, 1.3, 1.6] as const;

/** Design's own 1157x548 box (`B.7_Spotlight`), used to keep the container's
 * aspect ratio faithful across viewport widths. */
const DESIGN_ASPECT = "1157 / 548";

/**
 * Spotlight Board (FR2): "<N> KUDOS" header, a receiver word-cloud sized by
 * kudos-received weight, a "Tìm kiếm" search (client-side node filter, max
 * 100 chars), and a pan/zoom toggle, over the design's own keyvisual
 * background — a faint scattered-name constellation map plus a colorful
 * organic swirl in the bottom-left (extracted from the MoMorph frame render
 * and masked where the search box / count header / zoom control / a
 * decorative live-notification demo sit, since those are rendered live by
 * this component — see `public/kudos/spotlight-bg.png`). The
 * live-notification stack shown in the design at that bottom-left position
 * is the deferred realtime feature (clarifications: "no live push"), so it
 * is intentionally not reproduced here. Node click navigates to the kudos
 * detail route stub per the clarified nav-stub rule.
 *
 * The design's word-cloud uses many repeated/rescaled text layers to fake
 * density and organic scatter; that's approximated here with a simpler
 * flex-wrap layout sized by weight, which stays responsive and testable
 * (exact particle-scatter placement is a decorative detail, not data) — the
 * background's own faint scattered names supply that texture underneath.
 */
export function SpotlightBoard({ totalKudos, nodes, onSelectNode }: SpotlightBoardProps) {
  const t = useTranslations("KudosPage.spotlight");
  const [search, setSearch] = useState("");
  const [zoomIndex, setZoomIndex] = useState(0);

  const maxWeight = useMemo(
    () => Math.max(1, ...nodes.map((n) => n.weight)),
    [nodes],
  );
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter((n) => n.name.toLowerCase().includes(q));
  }, [nodes, search]);

  const isMinZoom = zoomIndex === 0;
  const isMaxZoom = zoomIndex === ZOOM_LEVELS.length - 1;

  return (
    <div
      className="relative min-h-[360px] w-full overflow-hidden rounded-[47px] border border-[#998C5F] bg-[#00070C] bg-cover bg-center"
      style={{ aspectRatio: DESIGN_ASPECT, backgroundImage: "url(/kudos/spotlight-bg.png)" }}
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
          <div className="relative flex-1 overflow-auto">
            <div
              className="flex min-h-full flex-wrap content-center items-center justify-center gap-x-6 gap-y-4 py-8 transition-transform duration-200 ease-out"
              style={{ transform: `scale(${ZOOM_LEVELS[zoomIndex]})` }}
            >
              {filtered.map((node) => {
                const scale = 0.4 + (node.weight / maxWeight) * 0.6;
                return (
                  <Link
                    key={node.receiverId}
                    href={`/kudos/${node.receiverId}`}
                    onClick={() => onSelectNode?.(node.receiverId)}
                    title={`${node.name} · ${formatKudosTimestamp(node.lastReceivedAt)}`}
                    style={{ fontSize: `${14 + scale * 24}px`, opacity: 0.5 + scale * 0.5 }}
                    className="font-bold text-white transition-colors duration-200 ease-out hover:text-[#FFEA9E]"
                  >
                    {node.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-1">
        <button
          type="button"
          aria-label={t("zoomOut")}
          disabled={isMinZoom}
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          className="flex size-8 items-center justify-center rounded text-white enabled:hover:bg-white/10 disabled:opacity-30"
        >
          <ZoomOutIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={t("zoomIn")}
          disabled={isMaxZoom}
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          className="flex size-8 items-center justify-center rounded text-white enabled:hover:bg-white/10 disabled:opacity-30"
        >
          <ZoomInIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
