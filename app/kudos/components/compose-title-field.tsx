"use client";

import { useTranslations } from "next-intl";
import { ComposeFieldError, ComposeFieldLabel } from "./compose-field-label";

export interface ComposeTitleFieldProps {
  value: string;
  onChange: (value: string) => void;
  errorId: string;
  error?: string;
}

/**
 * "Danh hiệu*" (award title) input, MoMorph `Frame 552`. Not part of the F005
 * spec CSV — added per clarification session 260708-1505 as `kudos.title`,
 * shown as the card title on the board.
 */
export function ComposeTitleField({
  value,
  onChange,
  errorId,
  error,
}: ComposeTitleFieldProps) {
  const t = useTranslations("ComposeKudos");
  return (
    <div className="flex w-full flex-col gap-2">
      <ComposeFieldLabel htmlFor="compose-title" label={t("awardTitleLabel")} required />
      <input
        id="compose-title"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={errorId}
        maxLength={120}
        placeholder={t("awardTitlePlaceholder")}
        className="h-14 w-full rounded-lg border border-[#998C5F] bg-white px-6 text-base font-bold tracking-[0.15px] text-[#00101A] outline-none placeholder:text-[#999]"
      />
      <p className="text-base font-bold tracking-[0.15px] text-[#999]">
        {t("awardTitleHintExample")}
        <br />
        {t("awardTitleHintUsage")}
      </p>
      <ComposeFieldError id={errorId} message={error} />
    </div>
  );
}
