"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { KudosCard as KudosCardType } from "@/lib/kudos/types";
import { KudosPersonInfo } from "./kudos-person";
import { MarkdownContent } from "./markdown-content";
import { ArrowRightIcon, HeartIcon, LinkIcon } from "./icons";
import {
  formatHeartCount,
  formatKudosTimestamp,
  truncateHashtags,
  truncateImages,
} from "./render-helpers";

export interface KudosCardProps {
  kudos: KudosCardType;
  /** highlight = 3-line content clamp + "Xem chi tiết"; feed = 5-line clamp + image gallery (FR1/FR3/FR11). */
  variant: "highlight" | "feed";
  onToggleLike?: (kudosId: string) => void;
  onCopyLink?: (kudosId: string) => void;
  onSelectHashtag?: (hashtagId: string) => void;
}

/**
 * One Kudos post: sender → arrow → receiver, timestamp, content box,
 * hashtags, and an action bar (heart/like + Copy Link, plus "Xem chi tiết"
 * for the highlight variant only) — per FR1/FR3/FR11.
 */
export function KudosCard({
  kudos,
  variant,
  onToggleLike,
  onCopyLink,
  onSelectHashtag,
}: KudosCardProps) {
  const t = useTranslations("KudosPage.card");
  const isHighlight = variant === "highlight";
  const { shown: shownTags, truncated } = truncateHashtags(kudos.hashtags);
  const images = truncateImages(kudos.images);

  return (
    <article
      className={`flex w-full flex-col gap-4 rounded-3xl bg-[#FFF8E1] p-6 pb-4 ${
        // Fixed height (design: 528x525, width stays responsive via the
        // carousel's own max-w wrapper) so every highlight frame is
        // identical while navigating — a card with no height of its own
        // used to resize the whole row per-content on every click.
        isHighlight
          ? "h-[525px] overflow-hidden border-4 border-[#FFEA9E]"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <KudosPersonInfo person={kudos.sender} />
        <div className="flex h-[123px] shrink-0 items-center justify-center px-1">
          <ArrowRightIcon className="size-8 text-[#00101A]" />
        </div>
        <KudosPersonInfo person={kudos.receiver} />
      </div>

      <hr className="border-t border-[#FFEA9E]" />

      <div className="flex flex-col gap-4">
        <p className="text-base font-bold tracking-[0.5px] text-[#999]">
          {formatKudosTimestamp(kudos.createdAt)}
        </p>

        <div className="rounded-xl border border-[#FFEA9E] bg-[rgba(255,234,158,0.4)] p-4 sm:p-6">
          {kudos.title && (
            <h3 className="mb-2 text-xl font-extrabold text-[#00101A] sm:text-2xl">
              {kudos.title}
            </h3>
          )}
          <MarkdownContent
            content={kudos.content}
            className={`text-justify text-lg font-bold leading-relaxed text-[#00101A] sm:text-xl ${
              isHighlight ? "line-clamp-3" : "line-clamp-5"
            }`}
          />
        </div>

        {!isHighlight && images.length > 0 && (
          <div className="flex flex-wrap gap-4">
            {images.map((src, i) =>
              src ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-uploaded Storage URL; next/image remote loader not configured for this bucket
                <img
                  key={`${kudos.id}-img-${i}`}
                  src={src}
                  alt=""
                  className="size-[88px] shrink-0 rounded-[18px] border border-[#998C5F] object-cover"
                />
              ) : (
                <span
                  key={`${kudos.id}-img-${i}`}
                  aria-hidden
                  className="flex size-[88px] shrink-0 items-center justify-center rounded-[18px] border border-[#998C5F] bg-white text-xs text-[#998C5F]"
                >
                  {i + 1}
                </span>
              ),
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-bold tracking-[0.5px]">
          {shownTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => onSelectHashtag?.(tag.id)}
              className="text-[#D4271D] hover:underline"
            >
              #{tag.label}
            </button>
          ))}
          {truncated && <span className="text-[#D4271D]">…</span>}
        </div>
      </div>

      <hr className="border-t border-[#FFEA9E]" />

      <div className="flex items-center justify-between gap-6">
        <button
          type="button"
          onClick={() => onToggleLike?.(kudos.id)}
          aria-pressed={kudos.likedByMe}
          className="flex items-center gap-1 text-2xl font-bold text-[#00101A]"
        >
          {formatHeartCount(kudos.heartCount)}
          <HeartIcon
            filled={kudos.likedByMe}
            className={`size-8 ${kudos.likedByMe ? "text-[#D4271D]" : "text-[#999]"}`}
          />
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopyLink?.(kudos.id)}
            className="flex items-center gap-1 rounded px-4 py-4 text-base font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-black/5"
          >
            {t("copyLink")}
            <LinkIcon className="size-6" />
          </button>
          {isHighlight && (
            <Link
              href={`/kudos/${kudos.id}`}
              className="flex items-center gap-1 rounded px-4 py-4 text-base font-bold text-[#00101A] transition-colors duration-200 ease-out hover:bg-black/5"
            >
              {t("detail")}
              <ArrowRightIcon className="size-6" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
