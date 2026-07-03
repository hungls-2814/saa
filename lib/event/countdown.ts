/**
 * Pure countdown helpers for the SAA 2025 homepage hero. No side effects, no
 * clock reads inside — callers pass `now` explicitly so the ticking client
 * component controls when a recompute happens.
 */

/**
 * Fallback event datetime used when `NEXT_PUBLIC_EVENT_DATETIME` is not set in
 * the environment, so the countdown is active out-of-the-box (matches the
 * design's "Coming soon" state) instead of collapsing to 00:00:00.
 */
export const DEFAULT_EVENT_DATETIME = "2026-12-26T18:30:00+07:00";

export interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  /** True once `now` has reached or passed `target`. */
  ended: boolean;
}

/**
 * Parse an event datetime from an environment-style string (ISO-8601
 * expected). Returns `null` for missing/empty/invalid input so callers can
 * fall back gracefully instead of throwing.
 */
export function parseEventDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Compute the remaining days/hours/minutes until `target`. Minutes are
 * floored (never rounded up) so the display only decrements once a full
 * minute has elapsed. Returns `null` when there is no valid target — callers
 * should treat that the same as "ended" for display purposes.
 */
export function getCountdown(
  target: Date | null,
  now: Date,
): CountdownValue | null {
  if (!target) return null;

  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, ended: true };
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  return { days, hours, minutes, ended: false };
}
