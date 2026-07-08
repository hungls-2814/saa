import type { StarTier } from "@/lib/kudos/types";

/**
 * Pure render helpers shared by the Kudos board cards (FR11). Kept free of
 * React/JSX so they're trivially unit-testable and reusable from both
 * client and server components.
 */

/** Formats an ISO-8601 timestamp as `HH:mm - MM/DD/YYYY` (FR11). Uses UTC
 * getters so server- and client-rendered markup always agree (no
 * viewer-timezone hydration mismatch). */
export function formatKudosTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const YYYY = d.getUTCFullYear();
  return `${hh}:${mm} - ${MM}/${DD}/${YYYY}`;
}

/** Formats an ISO-8601 timestamp as a 12-hour clock string with no space
 * before the meridiem, e.g. `08:30PM` (Spotlight Board activity ticker,
 * design node `3004:15995`). Uses UTC getters for the same SSR/hydration
 * parity reason as `formatKudosTimestamp`. */
export function formatTickerTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const hours24 = d.getUTCHours();
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${pad(hours12)}:${pad(d.getUTCMinutes())}${period}`;
}

/** "Số hoa thị" — renders the star tier as a string of asterisk glyphs
 * (0 tiers = no glyphs). Never invents a tier beyond the derived 0–3 range. */
export function starGlyph(tier: StarTier): string {
  return "✱".repeat(tier);
}

/** Formats a heart/like count using the Vietnamese thousands separator seen
 * in the design (e.g. 1000 → "1.000"). */
export function formatHeartCount(count: number): string {
  return count.toLocaleString("vi-VN");
}

/**
 * Splits hashtags into "shown" (max 5) + a flag for whether more were
 * truncated, per FR11 ("hashtags max 5/line then …").
 */
export function truncateHashtags<T>(
  hashtags: readonly T[],
  max = 5,
): { shown: T[]; truncated: boolean } {
  return { shown: hashtags.slice(0, max), truncated: hashtags.length > max };
}

/** Caps an image gallery at 5 thumbnails per FR11 / FR3. */
export function truncateImages<T>(images: readonly T[], max = 5): T[] {
  return images.slice(0, max);
}

/** Initials fallback for an avatar with no photo (e.g. "Huỳnh Dương Xuân
 * Nhật" → "HN") — first + last word initial, uppercased. */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  const first = words[0][0] ?? "";
  const last = words[words.length - 1][0] ?? "";
  return (words.length > 1 ? first + last : first).toUpperCase();
}
