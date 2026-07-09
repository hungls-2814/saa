"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { CloseIcon } from "./compose-icons";
import { LinkIcon } from "./icons";

export interface ComposeLinkModalProps {
  /** Prefill for "Nội dung" — the editor's current text selection, if any. */
  initialContent?: string;
  onCancel: () => void;
  onSave: (content: string, url: string) => void;
}

/**
 * "Thêm đường dẫn" add-link box (MoMorph OyDLDuSGEa). Captures a link label
 * ("Nội dung") + URL, then hands them back so the editor inserts
 * `[content](url)` markdown. Rendered above the compose modal (z-[60]); "Lưu"
 * is disabled until a URL is entered. Mounted only while open (by the editor),
 * so its fields initialize fresh each time — no prop→state reset effect.
 */
export function ComposeLinkModal({ initialContent = "", onCancel, onSave }: ComposeLinkModalProps) {
  const t = useTranslations("ComposeKudos");
  const [content, setContent] = useState(initialContent);
  const [url, setUrl] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const canSave = url.trim().length > 0;
  function handleSave() {
    if (canSave) onSave(content, url);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#00101A]/60 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("linkTitle")}
        className="flex w-full max-w-[600px] flex-col gap-6 rounded-3xl bg-[#FFF8E1] p-8"
      >
        <h3 className="text-2xl font-bold text-[#00101A]">{t("linkTitle")}</h3>

        <label className="flex items-center gap-4">
          <span className="w-20 shrink-0 text-lg font-bold text-[#00101A]">{t("linkContent")}</span>
          <input
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={200}
            className="h-12 flex-1 rounded-lg border border-[#998C5F] bg-white px-4 text-base font-bold text-[#00101A] outline-none"
          />
        </label>

        <label className="flex items-center gap-4">
          <span className="w-20 shrink-0 text-lg font-bold text-[#00101A]">{t("linkUrl")}</span>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
              }
            }}
            placeholder="https://"
            className="h-12 flex-1 rounded-lg border border-[#998C5F] bg-white px-4 text-base font-bold text-[#00101A] outline-none placeholder:text-[#999]"
          />
        </label>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex shrink-0 items-center gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.1)] px-8 py-3 text-base font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-[rgba(255,234,158,0.2)]"
          >
            {t("cancel")}
            <CloseIcon className="size-5" />
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#FFEA9E] py-3 text-lg font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-[#FADB70] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("linkSave")}
            <LinkIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
