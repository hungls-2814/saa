"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ComposeFooterActions } from "./compose-footer-actions";
import { ComposeRecipientSelect, type ComposeRecipientOption } from "./compose-recipient-select";
import { ComposeTitleField } from "./compose-title-field";
import { ComposeContentEditor } from "./compose-content-editor";
import { ComposeHashtagField } from "./compose-hashtag-field";
import { ComposeImageField, type ComposeKudosImage } from "./compose-image-field";
import { ComposeAnonymousField } from "./compose-anonymous-field";
import type { ComposeKudosModalProps } from "./compose-kudos-types";

export type { ComposeRecipientOption, ComposeKudosImage };
export type { ComposeFormatAction } from "./compose-toolbar";
export type {
  ComposeKudosErrors,
  ComposeKudosSubmitPayload,
  ComposeKudosModalProps,
} from "./compose-kudos-types";

/** Design shows 5 filled thumbnails (MoMorph `mms_F_Frame 537`) — mirrored
 * here as empty-url placeholders (no invented photo, see `ComposeImageField`)
 * so the standalone component matches that reference state by default. */
const DEFAULT_IMAGES: ComposeKudosImage[] = Array.from({ length: 5 }, (_, i) => ({
  id: `mock-image-${i + 1}`,
  url: "",
}));

/**
 * "Viết Kudo" compose dialog (MoMorph `520:10673`, screen `ihQ26W78P2`).
 * Presentational only — local state covers the free-text/toggle inputs
 * (danh hiệu, content, anonymous alias); the recipient list, hashtag chips,
 * and image thumbnails are controlled via props so integration can swap in
 * real Supabase-backed data without touching this file.
 */
export function ComposeKudosModal({
  isOpen,
  onClose,
  onCancel,
  onSubmit,
  recipients = [],
  hashtags = [],
  hashtagSuggestions = [],
  onAddHashtag,
  onRemoveHashtag,
  images = DEFAULT_IMAGES,
  onAddImage,
  onRemoveImage,
  onSelectRecipient,
  onFormat,
  onOpenGuidelines,
  onRequestLinkUrl,
  submitting = false,
  errors,
}: ComposeKudosModalProps) {
  const t = useTranslations("ComposeKudos");
  const [recipient, setRecipient] = useState<ComposeRecipientOption | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousAlias, setAnonymousAlias] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit =
    Boolean(recipient) &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    hashtags.length > 0 &&
    (!isAnonymous || anonymousAlias.trim().length > 0);

  function handleSelectRecipient(next: ComposeRecipientOption) {
    setRecipient(next);
    onSelectRecipient?.(next);
  }

  function handleSubmit() {
    if (!canSubmit || !recipient) return;
    onSubmit?.({
      recipientId: recipient.id,
      title: title.trim(),
      content: content.trim(),
      hashtagIds: hashtags.map((tag) => tag.id),
      imageIds: images.map((image) => image.id),
      isAnonymous,
      anonymousAlias: isAnonymous ? anonymousAlias.trim() : undefined,
    });
  }

  function handleCancel() {
    (onCancel ?? onClose)();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#00101A]/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="compose-kudos-title"
        className="flex w-full min-w-0 max-w-[752px] flex-col gap-8 rounded-3xl bg-[#FFF8E1] p-6 sm:p-10"
      >
        <h2
          id="compose-kudos-title"
          className="text-2xl leading-tight font-bold text-[#00101A] sm:text-[32px] sm:leading-[40px] text-center"
        >
          {t("title")}
        </h2>

        <ComposeRecipientSelect
          recipients={recipients}
          selected={recipient}
          onSelect={handleSelectRecipient}
          errorId="compose-recipient-error"
          error={errors?.recipient}
        />

        <ComposeTitleField
          value={title}
          onChange={setTitle}
          errorId="compose-title-error"
          error={errors?.title}
        />

        <ComposeContentEditor
          value={content}
          onChange={setContent}
          onFormat={(action) => onFormat?.(action)}
          onOpenGuidelines={onOpenGuidelines}
          onRequestLinkUrl={onRequestLinkUrl}
          errorId="compose-content-error"
          error={errors?.content}
        />

        <ComposeHashtagField
          hashtags={hashtags}
          suggestions={hashtagSuggestions}
          onAddHashtag={(label) => onAddHashtag?.(label)}
          onRemoveHashtag={(id) => onRemoveHashtag?.(id)}
          errorId="compose-hashtags-error"
          error={errors?.hashtags}
        />

        <ComposeImageField
          images={images}
          onAddImage={() => onAddImage?.()}
          onRemoveImage={(id) => onRemoveImage?.(id)}
          errorId="compose-images-error"
          error={errors?.images}
        />

        <ComposeAnonymousField
          checked={isAnonymous}
          onToggle={setIsAnonymous}
          alias={anonymousAlias}
          onAliasChange={setAnonymousAlias}
          aliasErrorId="compose-anonymous-alias-error"
          aliasError={errors?.anonymousAlias}
        />

        <ComposeFooterActions
          onCancel={handleCancel}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  );
}
