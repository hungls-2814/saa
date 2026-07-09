"use client";

import { useTranslations } from "next-intl";
import { PlusIcon, CloseIcon } from "./compose-icons";
import { ComposeFieldError, ComposeFieldLabel } from "./compose-field-label";

const MAX_IMAGES = 5;

/** One attached image thumbnail. `url: ""` renders a placeholder box (no
 * invented stock photo). `uploading: true` marks a thumbnail whose file is
 * still being uploaded to Storage — it shows a spinner and no remove button. */
export interface ComposeKudosImage {
  id: string;
  url: string;
  uploading?: boolean;
}

export interface ComposeImageFieldProps {
  images: ComposeKudosImage[];
  onAddImage: () => void;
  onRemoveImage: (id: string) => void;
  errorId: string;
  error?: string;
}

/**
 * "Image" field (MoMorph `mms_F_Frame 537`): up to 5 thumbnails, each with a
 * red circular remove button, plus a "+ Image / Tối đa 5" trigger that hides
 * once the cap is reached (per design + spec).
 */
export function ComposeImageField({
  images,
  onAddImage,
  onRemoveImage,
  errorId,
  error,
}: ComposeImageFieldProps) {
  const t = useTranslations("ComposeKudos");
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-4">
        <ComposeFieldLabel label={t("imageLabel")} />
        {images.map((image, index) => (
          <span key={image.id} className="relative size-20 shrink-0">
            <span className="flex size-20 items-center justify-center overflow-hidden rounded-[18px] border border-[#998C5F] bg-white">
              {image.uploading ? (
                <span
                  role="status"
                  aria-label={t("imageUploading")}
                  className="size-8 animate-spin rounded-full border-4 border-[#FFEA9E] border-t-[#998C5F]"
                />
              ) : image.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL; next/image remote loader not configured for this bucket
                <img
                  src={image.url}
                  alt=""
                  className="size-full rounded border border-[#FFEA9E] object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex size-full items-center justify-center rounded border border-[#FFEA9E] text-xs font-bold text-[#998C5F]"
                >
                  {index + 1}
                </span>
              )}
            </span>
            {!image.uploading && (
              <button
                type="button"
                aria-label={`${t("imageLabel")} ${index + 1}`}
                onClick={() => onRemoveImage(image.id)}
                className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-[#D4271D] text-white"
              >
                <CloseIcon className="size-3" />
              </button>
            )}
          </span>
        ))}

        {images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={onAddImage}
            aria-describedby={errorId}
            className="flex h-12 items-center gap-2 rounded-lg border border-[#998C5F] bg-white px-2 py-1"
          >
            <PlusIcon className="size-6 text-[#999]" />
            <span className="flex flex-col items-start leading-tight">
              <span className="text-sm font-bold text-[#00101A]">{t("imageAdd")}</span>
              <span className="text-[11px] font-bold tracking-[0.5px] text-[#999]">
                {t("imageMax")}
              </span>
            </span>
          </button>
        )}
      </div>
      <ComposeFieldError id={errorId} message={error} />
    </div>
  );
}
