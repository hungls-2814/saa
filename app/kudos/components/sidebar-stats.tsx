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
 * Kudos-sent / hearts-received counters, plus the "Mở Secret Box" button
 * beneath them. The design's two Secret-Box COUNTER rows ("Số secret box đã
 * mở" / "chưa mở") are intentionally NOT reproduced — this board has no
 * Secret-Box data source to back them, and they're deferred with the
 * out-of-scope Secret Box feature; only the button (a stub trigger) is in
 * scope per this fidelity pass.
 */
export function SidebarStats({ stats, onOpenSecretBox }: SidebarStatsProps) {
  const t = useTranslations("KudosPage.stats");

  const rows: Array<{ key: keyof PerUserStats; label: string }> = [
    { key: "kudosReceived", label: t("received") },
    { key: "kudosSent", label: t("sent") },
    { key: "heartsReceived", label: t("heartsReceived") },
  ];

  return (
    <div className="flex w-full flex-col gap-4 rounded-[17px] border border-[#998C5F] bg-[#00070C] p-6">
      {rows.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-2">
          <span className="text-right text-[22px] font-bold text-white">{row.label}</span>
          <span className="text-[32px] font-bold text-[#FFEA9E]">{stats[row.key]}</span>
        </div>
      ))}

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
