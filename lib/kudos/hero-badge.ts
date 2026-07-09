import type { HeroBadge } from './types';

/**
 * Derives a Sunner's Hero badge from the number of DISTINCT teammates who have
 * sent them Kudos ("số lượng đồng đội gửi"). Pure function — never stored,
 * always recomputed from `profile_kudos_stats.distinct_sender_count`.
 *
 * Tiers (design b1Filzi9i6): 0 → none, 1–4 → New, 5–9 → Rising, 10–20 → Super,
 * ≥21 → Legend. Distinct from the star-tier, which counts TOTAL kudos received.
 */
export function deriveHeroBadge(distinctSenderCount: number): HeroBadge {
  if (distinctSenderCount > 20) return 'legend';
  if (distinctSenderCount >= 10) return 'super';
  if (distinctSenderCount >= 5) return 'rising';
  if (distinctSenderCount >= 1) return 'new';
  return 'none';
}
