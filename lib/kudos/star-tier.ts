import type { StarTier } from './types';

/**
 * Derives the "số hoa thị" star tier from a Sunner's received-kudos count.
 * Pure function — never stored, always recomputed from `profile_kudos_stats`.
 * Thresholds (FR11 / SC10): 10 → 1 star, 20 → 2 stars, 50 → 3 stars.
 */
export function deriveStarTier(receivedCount: number): StarTier {
  if (receivedCount >= 50) return 3;
  if (receivedCount >= 20) return 2;
  if (receivedCount >= 10) return 1;
  return 0;
}
