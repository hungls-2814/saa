/**
 * Private helpers for `queries.ts`: the shared card `.select()` string,
 * the two-step hashtag-filter resolution, the batched `likedByMe` fetch, and
 * row→card composition. Split out purely to keep `queries.ts` under the
 * NFR3 200-line budget — none of this is a separate public contract.
 */
import { createClient } from '@/lib/supabase/server';
import type { KudosCard } from './types';
import { mapKudosRowToCard, type KudosRow } from './map-card';

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/** Per-profile aggregates folded into cards: star-tier source + Hero-badge source. */
export interface ProfileStatMaps {
  /** profile id -> received_count (total kudos received) → star tier. */
  receivedCounts: Map<string, number>;
  /** profile id -> distinct_sender_count (distinct senders) → Hero badge. */
  distinctSenderCounts: Map<string, number>;
}

/**
 * Batched star-tier + Hero-badge source: `profile_kudos_stats` is an aggregate
 * view with no FK back to `kudos`, so it can't be embedded in the card select.
 * One `.in('profile_id', ids)` query covers every sender AND receiver on a page
 * (both are `KudosPerson`s carrying a derived star tier + Hero badge) — no N+1.
 */
export async function getSenderStats(profileIds: string[]): Promise<ProfileStatMaps> {
  const empty: ProfileStatMaps = { receivedCounts: new Map(), distinctSenderCounts: new Map() };
  if (profileIds.length === 0) return empty;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profile_kudos_stats')
    .select('profile_id, received_count, distinct_sender_count')
    .in('profile_id', profileIds);
  if (error) throw error;

  const receivedCounts = new Map<string, number>();
  const distinctSenderCounts = new Map<string, number>();
  for (const row of (data ?? []) as {
    profile_id: string;
    received_count: number;
    distinct_sender_count: number | null;
  }[]) {
    receivedCounts.set(row.profile_id, row.received_count);
    distinctSenderCounts.set(row.profile_id, row.distinct_sender_count ?? 0);
  }
  return { receivedCounts, distinctSenderCounts };
}

const KUDOS_CARD_FIELDS = `
  id,
  content,
  created_at,
  heart_count,
  title,
  is_anonymous,
  anonymous_alias,
  sender:profiles!kudos_sender_id_fkey(id, full_name, avatar_url, title, department:departments(name)),
  kudos_hashtags(hashtag:hashtags(id, label)),
  kudos_images(url)
`;

/**
 * Builds the `.select()` string for a kudos card query. The receiver embed
 * needs the `!inner` FK hint only when a department filter is active — a
 * plain (left) embed would silently return ALL rows regardless of the
 * `.eq('receiver.department_id', ...)` filter, so `!inner` is load-bearing.
 */
export function buildCardSelect(departmentId?: string | null): string {
  const receiverFk = departmentId
    ? 'profiles!kudos_receiver_id_fkey!inner'
    : 'profiles!kudos_receiver_id_fkey';
  return `${KUDOS_CARD_FIELDS},\n  receiver:${receiverFk}(id, full_name, avatar_url, title, department:departments(name))`;
}

/**
 * Resolves which kudos ids carry a given hashtag. Deliberately a separate
 * query rather than an `!inner`-embedded `.eq()` on `kudos_hashtags`: an
 * inner-embed filter would also prune the *returned* hashtag rows on
 * matching kudos, so a card matching the filter would only show the one
 * filtered hashtag chip instead of all of its hashtags.
 */
export async function resolveHashtagKudosIds(
  supabase: SupabaseServerClient,
  hashtagId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('kudos_hashtags')
    .select('kudos_id')
    .eq('hashtag_id', hashtagId);
  if (error) throw error;
  return (data ?? []).map((row: { kudos_id: string }) => row.kudos_id);
}

async function fetchLikedKudosIds(
  supabase: SupabaseServerClient,
  userId: string,
  kudosIds: string[],
): Promise<Set<string>> {
  if (kudosIds.length === 0) return new Set();
  const { data, error } = await supabase
    .from('hearts')
    .select('kudos_id')
    .eq('user_id', userId)
    .in('kudos_id', kudosIds);
  if (error) throw error;
  return new Set((data ?? []).map((row: { kudos_id: string }) => row.kudos_id));
}

/**
 * Folds `likedByMe` + sender/receiver star tier into a page of raw rows.
 * Both fetches are single batched queries keyed off the page's ids — no
 * per-card round trips.
 */
export async function mapRowsToCards(
  rows: KudosRow[],
  userId: string,
  supabase: SupabaseServerClient,
): Promise<KudosCard[]> {
  if (rows.length === 0) return [];

  const kudosIds = rows.map((row) => row.id);
  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.sender?.id, row.receiver?.id])
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [likedByMe, stats] = await Promise.all([
    fetchLikedKudosIds(supabase, userId, kudosIds),
    getSenderStats(profileIds),
  ]);

  return rows.map((row) =>
    mapKudosRowToCard(row, {
      likedByMe,
      receivedCounts: stats.receivedCounts,
      distinctSenderCounts: stats.distinctSenderCounts,
    }),
  );
}
