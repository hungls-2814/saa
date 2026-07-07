"use client";

import { useTranslations } from "next-intl";
import type { GiftItem } from "@/lib/kudos/types";
import { Avatar } from "./avatar";

/**
 * "10 SUNNER NHẬN QUÀ MỚI NHẤT" sidebar list (FR6): the caller passes an
 * already `awarded_at`-desc, limit-10 list — this component only renders it.
 */
export function SidebarGifts({ gifts }: { gifts: GiftItem[] }) {
  const t = useTranslations("KudosPage.gifts");

  return (
    <div className="flex w-full flex-col gap-4 rounded-[17px] border border-[#998C5F] bg-[#00070C] py-6 pl-6 pr-4">
      <h3 className="whitespace-pre-line text-center text-[22px] font-bold leading-7 text-[#FFEA9E]">
        {t("title")}
      </h3>

      {gifts.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/70">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {gifts.map((gift) => (
            <li key={gift.id} className="flex items-center gap-2">
              <Avatar name={gift.recipientName} avatarUrl={gift.recipientAvatarUrl} textSizeClassName="text-sm" />
              <div className="flex flex-col gap-0.5">
                <p className="text-[22px] font-bold leading-7 text-[#FFEA9E]">{gift.recipientName}</p>
                <p className="text-base font-bold tracking-[0.15px] text-white">{gift.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
