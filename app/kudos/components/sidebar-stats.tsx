"use client";

import { useTranslations } from "next-intl";
import type { PerUserStats } from "@/lib/kudos/types";

/**
 * "Thống kê chung" sidebar block (FR5): the current user's Kudos-received /
 * Kudos-sent / hearts-received counters. Secret-Box counters + "Mở quà"
 * button are deferred with the out-of-scope Secret Box feature.
 */
export function SidebarStats({ stats }: { stats: PerUserStats }) {
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
    </div>
  );
}
