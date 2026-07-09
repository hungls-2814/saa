"use client";

import { useTranslations } from "next-intl";
import { ComposeFieldError } from "./compose-field-label";

export interface ComposeAnonymousFieldProps {
  checked: boolean;
  onToggle: (checked: boolean) => void;
  alias: string;
  onAliasChange: (value: string) => void;
  aliasErrorId: string;
  aliasError?: string;
}

/**
 * "Gửi lời cám ơn và ghi nhận ẩn danh" checkbox (MoMorph `mms_G`, unchecked
 * by default). The alias input it reveals is not part of the default-state
 * design — added per clarification session 260708-1505 ("alias required
 * when the box is checked"), styled to match the modal's other text fields.
 */
export function ComposeAnonymousField({
  checked,
  onToggle,
  alias,
  onAliasChange,
  aliasErrorId,
  aliasError,
}: ComposeAnonymousFieldProps) {
  const t = useTranslations("ComposeKudos");
  return (
    <div className="flex w-full flex-col gap-3">
      <label className="flex w-fit items-center gap-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          className="size-6 rounded border border-[#999] bg-white accent-[#00101A]"
        />
        <span className="text-[22px] leading-7 font-bold text-[#999]">
          {t("anonymousLabel")}
        </span>
      </label>

      {checked && (
        <div className="flex flex-col gap-2 pl-10">
          <input
            id="compose-anonymous-alias"
            type="text"
            value={alias}
            onChange={(e) => onAliasChange(e.target.value)}
            aria-describedby={aliasErrorId}
            maxLength={60}
            placeholder={t("anonymousAliasPlaceholder")}
            className="h-14 w-full rounded-lg border border-[#998C5F] bg-white px-6 text-base font-bold tracking-[0.15px] text-[#00101A] outline-none placeholder:text-[#999]"
          />
          <ComposeFieldError id={aliasErrorId} message={aliasError} />
        </div>
      )}
    </div>
  );
}
