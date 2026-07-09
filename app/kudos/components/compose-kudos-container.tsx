"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { createKudoAction } from "@/lib/kudos/compose-actions";
import { listHashtags, listRecipients, uploadKudosImages } from "@/lib/kudos/compose-data";
import { MAX_HASHTAGS, MAX_IMAGES, validateImageFile } from "@/lib/kudos/compose-schema";
import type { ComposeErrors } from "@/lib/kudos/compose-schema";
import type { HashtagRef, RecipientOption } from "@/lib/kudos/types";
import { ComposeKudosModal, type ComposeKudosImage, type ComposeKudosSubmitPayload } from "./compose-kudos-modal";
import type { ComposeKudosErrors } from "./compose-kudos-types";
import { KudosToast } from "./kudos-toast";

export interface ComposeKudosContainerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current signed-in user id (null when logged out — submit then fails auth). */
  currentUserId: string | null;
  onSuccess?: () => void;
}

/**
 * Integration boundary (F006 C1): wires the presentational `ComposeKudosModal`
 * to real Supabase data — recipient/hashtag lists + image upload run client-side
 * over the authenticated session, and submit calls the `createKudoAction` server
 * action. Owns the parent-controlled hashtag/image lists the modal forwards
 * intents for; content/title/recipient/anonymity stay local to the modal.
 */
export function ComposeKudosContainer({ isOpen, onClose, currentUserId, onSuccess }: ComposeKudosContainerProps) {
  const t = useTranslations("ComposeKudos");
  const supabaseRef = useRef(createClient());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [recipients, setRecipients] = useState<RecipientOption[]>([]);
  const [suggestions, setSuggestions] = useState<HashtagRef[]>([]);
  const [addedTags, setAddedTags] = useState<HashtagRef[]>([]);
  const [images, setImages] = useState<ComposeKudosImage[]>([]);
  const [errors, setErrors] = useState<ComposeKudosErrors | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;
    const supabase = supabaseRef.current;
    let active = true;
    Promise.all([listRecipients(supabase, currentUserId), listHashtags(supabase)])
      .then(([people, tags]) => {
        if (!active) return;
        setRecipients(people);
        setSuggestions(tags);
      })
      .catch(() => active && setToast(t("errors.submitFailed")));
    return () => {
      active = false;
    };
  }, [isOpen, currentUserId, t]);

  const reset = useCallback(() => {
    setAddedTags([]);
    setImages([]);
    setErrors(undefined);
  }, []);

  function handleAddHashtag(label: string) {
    setErrors(undefined);
    if (addedTags.length >= MAX_HASHTAGS) return;
    if (addedTags.some((tag) => tag.label.toLowerCase() === label.toLowerCase())) return;
    const existing = suggestions.find((s) => s.label.toLowerCase() === label.toLowerCase());
    setAddedTags((prev) => [...prev, existing ?? { id: `new:${label}`, label }]);
  }

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !currentUserId) return;
    const files = Array.from(fileList);
    if (images.length + files.length > MAX_IMAGES) {
      setToast(t("errors.imagesTooMany"));
      return;
    }
    for (const file of files) {
      const check = validateImageFile({ type: file.type, size: file.size });
      if (!check.ok) {
        setToast(t(check.code === "type" ? "errors.imageType" : "errors.imageSize"));
        return;
      }
    }

    // Show a spinning placeholder per file immediately so the upload is visible;
    // swap them for the real thumbnails on success, or drop them on failure.
    const pending: ComposeKudosImage[] = files.map(() => ({
      id: `uploading-${crypto.randomUUID()}`,
      url: "",
      uploading: true,
    }));
    const pendingIds = new Set(pending.map((p) => p.id));
    setImages((prev) => [...prev, ...pending]);

    const result = await uploadKudosImages(supabaseRef.current, currentUserId, files, () => crypto.randomUUID());
    if (!result.ok) {
      setImages((prev) => prev.filter((img) => !pendingIds.has(img.id)));
      setToast(t("errors.submitFailed"));
      return;
    }
    setImages((prev) => [
      ...prev.filter((img) => !pendingIds.has(img.id)),
      ...result.urls.map((url) => ({ id: url, url })),
    ]);
  }

  function mapErrors(e: ComposeErrors): ComposeKudosErrors {
    return {
      recipient: e.receiver === "self" ? t("errors.receiverSelf") : e.receiver ? t("errors.receiverRequired") : undefined,
      title: e.title ? t("errors.titleRequired") : undefined,
      content: e.content ? t("errors.contentRequired") : undefined,
      hashtags: e.hashtags === "tooMany" ? t("errors.hashtagsTooMany") : e.hashtags ? t("errors.hashtagsRequired") : undefined,
      images: e.images ? t("errors.imagesTooMany") : undefined,
      anonymousAlias: e.alias ? t("errors.aliasRequired") : undefined,
    };
  }

  async function handleSubmit(payload: ComposeKudosSubmitPayload) {
    setSubmitting(true);
    setErrors(undefined);
    try {
      const result = await createKudoAction({
        receiverId: payload.recipientId,
        title: payload.title,
        content: payload.content,
        hashtagLabels: addedTags.map((tag) => tag.label),
        // Only committed uploads carry a URL; skip any still-uploading placeholder.
        imageUrls: images.map((img) => img.url).filter(Boolean),
        isAnonymous: payload.isAnonymous,
        anonymousAlias: payload.anonymousAlias ?? "",
      });
      if (result.ok) {
        reset();
        setToast(t("success"));
        onSuccess?.();
        onClose();
      } else if (result.error === "validation" && result.errors) {
        setErrors(mapErrors(result.errors));
      } else {
        setToast(t("errors.submitFailed"));
      }
    } catch {
      setToast(t("errors.submitFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        hidden
        onChange={(e) => {
          void handleFilesSelected(e.target.files);
          e.target.value = "";
        }}
      />
      <ComposeKudosModal
        isOpen={isOpen}
        onClose={onClose}
        onSubmit={handleSubmit}
        recipients={recipients}
        hashtags={addedTags}
        hashtagSuggestions={suggestions}
        onAddHashtag={handleAddHashtag}
        onRemoveHashtag={(id) => setAddedTags((prev) => prev.filter((tag) => tag.id !== id))}
        images={images}
        onAddImage={() => fileInputRef.current?.click()}
        onRemoveImage={(id) => setImages((prev) => prev.filter((img) => img.id !== id))}
        submitting={submitting}
        errors={errors}
      />
      <KudosToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );
}
