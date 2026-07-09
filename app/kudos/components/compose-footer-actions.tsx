"use client";

import { useTranslations } from "next-intl";
import { CloseIcon } from "./compose-icons";
import { SendIcon } from "./icons";

export interface ComposeFooterActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  submitting?: boolean;
}

/**
 * Footer action row (MoMorph `mms_H_Frame 538`): outlined "Hủy" on the left,
 * solid-gold "Gửi" (disabled until every required field is filled, or while a
 * submit is in flight) on the right.
 */
export function ComposeFooterActions({
  onCancel,
  onSubmit,
  canSubmit,
  submitting = false,
}: ComposeFooterActionsProps) {
  const t = useTranslations("ComposeKudos");
  return (
    <div className="flex w-full gap-6">
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="flex shrink-0 items-center gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-10 py-4 text-base font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)] disabled:opacity-50"
      >
        {t("cancel")}
        <CloseIcon className="size-6" />
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || submitting}
        aria-busy={submitting}
        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FFEA9E] py-4 text-[22px] font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-[#FADB70] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("submit")}
        <SendIcon className="size-6" />
      </button>
    </div>
  );
}
