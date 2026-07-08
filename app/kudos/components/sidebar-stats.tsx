"use client";

import { useTranslations } from "next-intl";
import type { PerUserStats } from "@/lib/kudos/types";
import { GiftIcon } from "./icon-controls";

export interface SidebarStatsProps {
  stats: PerUserStats;
  /** "Mở Secret Box" stub trigger (`D.1.8_Button mở quà`) — the Secret Box
   * dialog itself is out of scope for this screen; the caller decides what
   * "clicked" means (e.g. a coming-soon toast). */
  onOpenSecretBox?: () => void;
}

/**
 * "Thống kê chung" sidebar block (FR5): the current user's Kudos-received /
 * Kudos-sent / hearts-received counters, a design divider (`D.1.5`), then the
 * two Secret-Box counter rows (`D.1.6` "Số Secret Box bạn đã mở" / `D.1.7`
 * "Số Secret Box chưa mở"), and the "Mở Secret Box" button (`D.1.8`) beneath.
 * The Secret Box feature has no data source on this board yet, so its two
 * counters render backed by 0 from the real query (mock shows the design's 25)
 * and the button is a stub trigger — the caller decides what "clicked" means.
 */
export function SidebarStats({ stats, onOpenSecretBox }: SidebarStatsProps) {
  const t = useTranslations("KudosPage.stats");

  const countRows: Array<{ key: keyof PerUserStats; label: string }> = [
    { key: "kudosReceived", label: t("received") },
    { key: "kudosSent", label: t("sent") },
    { key: "heartsReceived", label: t("heartsReceived") },
  ];
  const secretBoxRows: Array<{ key: keyof PerUserStats; label: string }> = [
    { key: "secretBoxOpened", label: t("secretBoxOpened") },
    { key: "secretBoxUnopened", label: t("secretBoxUnopened") },
  ];

  const renderRow = (row: { key: keyof PerUserStats; label: string }) => (
    <div key={row.key} className="flex items-center justify-between gap-2">
      <span className="text-right text-[22px] font-bold text-white">{row.label}</span>
      <span className="text-[32px] font-bold text-[#FFEA9E]">{stats[row.key]}</span>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4 rounded-[17px] border border-[#998C5F] bg-[#00070C] p-6">
      {countRows.map(renderRow)}

      {/* D.1.5 divider — 1px line (#2E3940) separating Kudos counters from Secret Box counters. */}
      <hr className="border-0 border-t border-[#2E3940]" />

      {secretBoxRows.map(renderRow)}

      <button
        type="button"
        onClick={() => onOpenSecretBox?.()}
        className="flex h-[60px] w-full items-center justify-center gap-2 rounded-lg bg-[#FFEA9E] px-4 text-[22px] font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-[#FFEA9E]/80"
      >
        {t("openSecretBox")}
        <GiftIcon className="size-6" />
      </button>
    </div>
  );
}
