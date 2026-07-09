"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { HashtagRef } from "@/lib/kudos/types";
import { PlusIcon, CloseIcon } from "./compose-icons";
import { ComposeFieldError, ComposeFieldLabel } from "./compose-field-label";

const MAX_HASHTAGS = 5;

export interface ComposeHashtagFieldProps {
  /** Currently-selected hashtags (rendered as chips + checked in the dropdown). */
  hashtags: HashtagRef[];
  onAddHashtag: (label: string) => void;
  onRemoveHashtag: (id: string) => void;
  /** The full hashtag list from the DB, offered in the dropdown. */
  suggestions?: HashtagRef[];
  addLabel?: string;
  maxLabel?: string;
  errorId: string;
  error?: string;
}

/**
 * "Hashtag*" field (MoMorph `mms_E_Frame 536` + dropdown `p9zO-c4a4x`): a
 * "+ Hashtag / Tối đa 5" trigger that opens a dark multi-select dropdown listing
 * every DB hashtag. Selected rows show a check; toggling a row selects/deselects
 * it. At 5 selections the unselected rows are disabled. Selected tags also render
 * as removable chips beside the trigger.
 */
export function ComposeHashtagField({
  hashtags,
  onAddHashtag,
  onRemoveHashtag,
  suggestions = [],
  addLabel,
  maxLabel,
  errorId,
  error,
}: ComposeHashtagFieldProps) {
  const t = useTranslations("ComposeKudos");
  const resolvedAddLabel = addLabel ?? t("hashtagAdd");
  const resolvedMaxLabel = maxLabel ?? t("hashtagMax");
  const atMax = hashtags.length >= MAX_HASHTAGS;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  const selectedOf = (s: HashtagRef) =>
    hashtags.find((h) => h.label.toLowerCase() === s.label.toLowerCase());

  function toggle(s: HashtagRef) {
    const existing = selectedOf(s);
    if (existing) onRemoveHashtag(existing.id);
    else if (!atMax) onAddHashtag(s.label);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="relative flex flex-wrap items-center gap-4" ref={rootRef}>
        <ComposeFieldLabel label={resolvedAddLabel} required />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-describedby={errorId}
          className="flex h-12 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1"
        >
          <PlusIcon className="size-6 text-[#999]" />
          <span className="flex flex-col items-start leading-tight">
            <span className="text-sm font-bold text-[#00101A]">{resolvedAddLabel}</span>
            <span className="text-[11px] font-bold tracking-[0.5px] text-[#999]">{resolvedMaxLabel}</span>
          </span>
        </button>

        {open && (
          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-label={resolvedAddLabel}
            className="absolute left-0 top-full z-20 mt-2 flex max-h-80 w-[320px] flex-col overflow-auto rounded-2xl bg-[#141414] p-2 shadow-xl"
          >
            {suggestions.map((s) => {
              const selected = Boolean(selectedOf(s));
              const disabled = !selected && atMax;
              return (
                <li key={s.id} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    disabled={disabled}
                    onClick={() => toggle(s)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-base font-bold text-white transition-colors duration-150 ${
                      selected ? "bg-[#3D3D3D]" : "hover:bg-white/10"
                    } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    <span>#{s.label}</span>
                    {selected && <CheckCircleIcon className="size-6 shrink-0 text-white" />}
                  </button>
                </li>
              );
            })}
            {suggestions.length === 0 && (
              <li className="px-4 py-3 text-sm font-bold text-white/60">{t("hashtagEmpty")}</li>
            )}
          </ul>
        )}

        {hashtags.map((tag) => (
          <span
            key={tag.id}
            className="flex items-center gap-1.5 rounded-full border border-[#998C5F] bg-white py-1.5 pl-3 pr-1.5 text-sm font-bold tracking-[0.5px] text-[#D4271D]"
          >
            #{tag.label}
            <button
              type="button"
              aria-label={`${t("hashtagLabel")} ${tag.label}`}
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

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7-5.4 5.4a1 1 0 0 1-1.4 0L7.3 12.5a1 1 0 1 1 1.4-1.4l1.9 1.9 4.7-4.7a1 1 0 1 1 1.4 1.4Z" />
    </svg>
  );
}
