"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { HashtagRef } from "@/lib/kudos/types";
import { PlusIcon, CloseIcon } from "./compose-icons";
import { ComposeFieldError, ComposeFieldLabel } from "./compose-field-label";

const MAX_HASHTAGS = 5;

export interface ComposeHashtagFieldProps {
  hashtags: HashtagRef[];
  /** Add a hashtag by label — existing tags are matched, new labels created on submit. */
  onAddHashtag: (label: string) => void;
  onRemoveHashtag: (id: string) => void;
  /** Existing tags offered as autocomplete suggestions. */
  suggestions?: HashtagRef[];
  addLabel?: string;
  maxLabel?: string;
  placeholder?: string;
  errorId: string;
  error?: string;
}

/**
 * "Hashtag*" field (MoMorph `mms_E_Frame 536`): a "+ Hashtag / Tối đa 5"
 * trigger that reveals an inline input (autocomplete existing via a datalist +
 * create-new on Enter, per clarification session 260708-1505), plus the
 * currently-added chips.
 */
export function ComposeHashtagField({
  hashtags,
  onAddHashtag,
  onRemoveHashtag,
  suggestions = [],
  addLabel,
  maxLabel,
  placeholder,
  errorId,
  error,
}: ComposeHashtagFieldProps) {
  const t = useTranslations("ComposeKudos");
  const resolvedAddLabel = addLabel ?? t("hashtagAdd");
  const resolvedMaxLabel = maxLabel ?? t("hashtagMax");
  const resolvedPlaceholder = placeholder ?? t("hashtagPlaceholder");
  const atMax = hashtags.length >= MAX_HASHTAGS;
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    const label = draft.trim();
    if (label.length > 0) onAddHashtag(label);
    setDraft("");
    setAdding(false);
  }

  const available = suggestions.filter(
    (s) => !hashtags.some((h) => h.label.toLowerCase() === s.label.toLowerCase()),
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <ComposeFieldLabel label={resolvedAddLabel} required />
        {adding && !atMax ? (
          <span className="flex h-12 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-3">
            <input
              autoFocus
              list="compose-hashtag-suggestions"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commit();
                } else if (e.key === "Escape") {
                  setDraft("");
                  setAdding(false);
                }
              }}
              onBlur={commit}
              maxLength={50}
              placeholder={resolvedPlaceholder}
              aria-label={resolvedAddLabel}
              className="w-40 bg-transparent text-sm font-bold text-[#00101A] outline-none placeholder:text-[#999]"
            />
            <datalist id="compose-hashtag-suggestions">
              {available.map((s) => (
                <option key={s.id} value={s.label} />
              ))}
            </datalist>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={atMax}
            aria-describedby={errorId}
            className="flex h-12 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="size-6 text-[#999]" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-sm font-bold text-[#00101A]">{resolvedAddLabel}</span>
              <span className="text-[11px] font-bold tracking-[0.5px] text-[#999]">{resolvedMaxLabel}</span>
            </span>
          </button>
        )}

        {hashtags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full border border-[#998C5F] bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold tracking-[0.5px] text-[#D4271D]"
          >
            #{tag.label}
            <button
              type="button"
              aria-label={`Xóa hashtag ${tag.label}`}
              onClick={() => onRemoveHashtag(tag.id)}
              className="flex size-5 items-center justify-center rounded-full bg-[#D4271D] text-white"
            >
              <CloseIcon className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <ComposeFieldError id={errorId} message={error} />
    </div>
  );
}
