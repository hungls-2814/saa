"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "./avatar";
import { ChevronDownIcon } from "./icons";
import { ComposeFieldError, ComposeFieldLabel } from "./compose-field-label";

/** A Sunner as shown in the "Người nhận" autocomplete (MoMorph `520:9871`).
 * Deliberately not `KudosPerson` from `lib/kudos/types` — that type carries
 * board-display fields (title/starTier) this search result doesn't have. */
export interface ComposeRecipientOption {
  id: string;
  fullName: string;
  department: string;
  /** Photo URL, or `""` to render the initials fallback (no invented
   * per-person stock photo — see `Avatar`). */
  avatarUrl: string;
}

export interface ComposeRecipientSelectProps {
  recipients: ComposeRecipientOption[];
  selected: ComposeRecipientOption | null;
  onSelect: (recipient: ComposeRecipientOption) => void;
  errorId: string;
  error?: string;
}

/**
 * "Người nhận*" search combobox (MoMorph `mms_B_Chọn người nhận`). Opens an
 * autocomplete list of `recipients` on focus, filtered by the typed query;
 * picking a row calls `onSelect` and shows the chosen name in the field.
 */
export function ComposeRecipientSelect({
  recipients,
  selected,
  onSelect,
  errorId,
  error,
}: ComposeRecipientSelectProps) {
  const t = useTranslations("ComposeKudos");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const filtered = recipients.filter((r) =>
    r.fullName.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex w-full flex-col gap-2" ref={rootRef}>
      <ComposeFieldLabel htmlFor="compose-recipient" label={t("recipientLabel")} required />
      <div className="relative">
        <div className="flex h-14 w-full items-center justify-between gap-4 rounded-lg border border-[#998C5F] bg-white px-6">
          <input
            id="compose-recipient"
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="compose-recipient-listbox"
            aria-describedby={errorId}
            autoComplete="off"
            value={open ? query : (selected?.fullName ?? "")}
            placeholder={t("recipientPlaceholder")}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            className="w-full bg-transparent text-base font-bold tracking-[0.15px] text-[#00101A] outline-none placeholder:text-[#999]"
          />
          <button
            type="button"
            aria-label={t("recipientLabel")}
            onClick={() => setOpen((o) => !o)}
            className="shrink-0 text-[#00101A]"
          >
            <ChevronDownIcon className="size-6" />
          </button>
        </div>

        {open && (
          <ul
            id="compose-recipient-listbox"
            role="listbox"
            aria-label="Người nhận"
            className="absolute left-0 top-full z-20 mt-2 flex max-h-64 w-full flex-col gap-1 overflow-auto rounded-lg border border-[#998C5F] bg-white p-1.5 shadow-xl"
          >
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm font-bold text-[#999]">
                {t("recipientEmpty")}
              </li>
            )}
            {filtered.map((recipient) => (
              <li key={recipient.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={recipient.id === selected?.id}
                  onClick={() => {
                    onSelect(recipient);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded px-3 py-2 text-left hover:bg-black/5"
                >
                  <Avatar
                    name={recipient.fullName}
                    avatarUrl={recipient.avatarUrl}
                    sizeClassName="size-10"
                    textSizeClassName="text-sm"
                  />
                  <span className="flex flex-col">
                    <span className="text-sm font-bold text-[#00101A]">
                      {recipient.fullName}
                    </span>
                    <span className="text-xs font-bold text-[#999]">
                      {recipient.department}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <ComposeFieldError id={errorId} message={error} />
    </div>
  );
}
