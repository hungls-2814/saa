"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { applyMarkdownFormat, insertLink } from "@/lib/kudos/markdown-format";
import { ComposeFieldError } from "./compose-field-label";
import { ComposeToolbar, type ComposeFormatAction } from "./compose-toolbar";
import { ComposeLinkModal } from "./compose-link-modal";

export interface ComposeContentEditorProps {
  value: string;
  onChange: (value: string) => void;
  /** Optional side-effect hook; markdown insertion itself is handled here. */
  onFormat?: (action: ComposeFormatAction) => void;
  onOpenGuidelines?: () => void;
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
  contentPlaceholder,
  mentionHint,
  errorId,
  error,
}: ComposeContentEditorProps) {
  const t = useTranslations("ComposeKudos");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // The link toolbar action opens a modal; the selection is captured up-front
  // because focus moves to the modal's inputs.
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkRange, setLinkRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [linkInitial, setLinkInitial] = useState("");

  function restoreCaret(start: number, endPos: number) {
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, endPos);
    });
  }

  function handleFormat(action: ComposeFormatAction) {
    onFormat?.(action);
    const el = textareaRef.current;
    if (!el) return;
    if (action === "link") {
      // Capture the selection now and open the add-link modal (design OyDLDuSGEa).
      const { selectionStart, selectionEnd } = el;
      setLinkRange({ start: selectionStart, end: selectionEnd });
      setLinkInitial(value.slice(selectionStart, selectionEnd));
      setLinkOpen(true);
      return;
    }
    const result = applyMarkdownFormat(value, el.selectionStart, el.selectionEnd, action);
    onChange(result.value);
    restoreCaret(result.selectionStart, result.selectionEnd);
  }

  function handleSaveLink(content: string, url: string) {
    const result = insertLink(value, linkRange.start, linkRange.end, content, url);
    onChange(result.value);
    setLinkOpen(false);
    restoreCaret(result.selectionStart, result.selectionEnd);
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1">
      <ComposeToolbar onFormat={handleFormat} onOpenGuidelines={onOpenGuidelines} />
      {linkOpen && (
        <ComposeLinkModal
          initialContent={linkInitial}
          onCancel={() => setLinkOpen(false)}
          onSave={handleSaveLink}
        />
      )}
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
