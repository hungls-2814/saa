/**
 * Server-only Supabase query module for the personal profile page (F008,
 * Track B, `/profile`). Never import this from a client component. Auth/session
 * is handled upstream (proxy guard + page `getUser()`); every read here
 * assumes an already-authenticated `userId`.
 *
 * Sibling of `queries.ts` / `queries-lookups.ts` — deliberately NOT merged
 * into either: `getPerUserStats` (region B) keeps its 3-field shape, and
 * `getKudosByUser` reuses the same card select/map pipeline as the `/kudos`
 * feed but without pagination (region D has no cursor, small volume).
 */
import { createClient } from '@/lib/supabase/server';
import type { KudosCard, StarTier, HeroBadge } from './types';
import type { KudosRow } from './map-card';
import { buildCardSelect, mapRowsToCards } from './queries-internal';
import { deriveStarTier } from './star-tier';
import { deriveHeroBadge } from './hero-badge';

/** Which side of a kudos relationship to list for the current user. */
export type ProfileKudosDirection = 'sent' | 'received';

/** Region A (profile-header) data — identity + derived star tier / Hero badge. */
export interface ProfileHeaderData {
  fullName: string;
  avatarUrl: string;
  department: string;
  starTier: StarTier;
  heroBadge: HeroBadge;
}

/** A `profiles` row joined to its department, as read for the header query. */
interface ProfileHeaderRow {
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  department: { name: string } | null;
}

/** The `profile_kudos_stats` fields the header derives star tier / Hero badge from. */
interface ProfileStatsRow {
  received_count: number;
  distinct_sender_count: number | null;
}

/**
 * FR1/FR5 region D: all kudos the current user sent, or all they received —
 * newest first. No pagination (YAGNI — a single Sunner's own kudos volume is
 * small), unlike the board's keyset-paginated `getKudosFeed`.
 */
export async function getKudosByUser(opts: {
  userId: string;
  direction: ProfileKudosDirection;
}): Promise<KudosCard[]> {
  const { userId, direction } = opts;
  const supabase = await createClient();

  let query = supabase
    .from('kudos_with_heart_count')
    .select(buildCardSelect())
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  query = direction === 'sent' ? query.eq('sender_id', userId) : query.eq('receiver_id', userId);

  const { data, error } = await query;
  if (error) throw error;

  return mapRowsToCards((data ?? []) as unknown as KudosRow[], userId, supabase);
}

/**
 * FR1 region A: the current user's own identity header. Runs the `profiles`
 * lookup and the `profile_kudos_stats` lookup concurrently — they're
 * independent single-row reads keyed off the same `userId`. Null-safe: a
 * missing profile row (should not happen for an authenticated user, but
 * defended anyway) or a missing stats row (brand-new user, zero kudos yet)
 * both fall back to safe defaults instead of throwing.
 */
export async function getMyProfileHeader(userId: string): Promise<ProfileHeaderData> {
  const supabase = await createClient();

  const [profileResult, statsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, avatar_url, title, department:departments(name)')
      .eq('id', userId)
      .maybeSingle(),
    supabase.from('profile_kudos_stats').select('received_count, distinct_sender_count').eq('profile_id', userId).maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (statsResult.error) throw statsResult.error;

  const profile = profileResult.data as unknown as ProfileHeaderRow | null;
  const stats = statsResult.data as unknown as ProfileStatsRow | null;

  return {
    fullName: profile?.full_name ?? '',
    avatarUrl: profile?.avatar_url ?? '',
    department: profile?.department?.name ?? '',
    starTier: deriveStarTier(stats?.received_count ?? 0),
    heroBadge: deriveHeroBadge(stats?.distinct_sender_count ?? 0),
  };
}
