"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { applyMarkdownFormat } from "@/lib/kudos/markdown-format";
import { ComposeFieldError } from "./compose-field-label";
import { ComposeToolbar, type ComposeFormatAction } from "./compose-toolbar";

export interface ComposeContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional side-effect hook; markdown insertion itself is handled here. */
  onFormat?: (action: ComposeFormatAction) => void;
  onOpenGuidelines?: () => void;
  /** Prompt for a URL (link action); injected so the editor stays testable. */
  onRequestLinkUrl?: () => string | null;
  contentPlaceholder?: string;
  mentionHint?: string;
  errorId: string;
  error?: string;
}

/**
 * The kudos-message editor: toolbar + textarea rendered as one seamless
 * bordered box (MoMorph `Nhập nội dung`), plus the "@ + tên" mention hint
 * (`mms_D.1_Gợi ý`). The toolbar is functional — it wraps/prefixes the current
 * textarea selection with markdown via `applyMarkdownFormat`, then restores the
 * caret so typing continues naturally (F006 markdown-functional decision).
 */
export function ComposeContentEditor({
  value,
  onChange,
  onFormat,
  onOpenGuidelines,
  onRequestLinkUrl,
  contentPlaceholder,
  mentionHint,
  errorId,
  error,
}: ComposeContentEditorProps) {
  const t = useTranslations("ComposeKudos");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleFormat(action: ComposeFormatAction) {
    onFormat?.(action);
    const el = textareaRef.current;
    if (!el) return;
    const url = action === "link" ? (onRequestLinkUrl?.() ?? undefined) : undefined;
    if (action === "link" && url === null) return;
    const result = applyMarkdownFormat(value, el.selectionStart, el.selectionEnd, action, url);
    onChange(result.value);
    // Restore the selection after React re-renders the controlled value.
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <ComposeToolbar onFormat={handleFormat} onOpenGuidelines={onOpenGuidelines} />
      <textarea
        id="compose-content"
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={errorId}
        maxLength={5000}
        placeholder={contentPlaceholder ?? t("contentPlaceholder")}
        className="h-[200px] w-full resize-none rounded-b-lg border border-t-0 border-[#998C5F] bg-white px-6 py-4 text-base font-bold tracking-[0.15px] text-[#00101A] outline-none placeholder:text-[#999]"
      />
      <p className="text-base font-bold tracking-[0.5px] text-[#00101A]">
        {mentionHint ?? t("mentionHint")}
      </p>
      <ComposeFieldError id={errorId} message={error} />
    </div>
  );
}
