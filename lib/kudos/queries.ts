/**
 * Server-only Supabase query modules for the `/kudos` board (F005, Track B).
 * Never import this from a client component. Auth/session is handled
 * upstream (proxy guard + page `getUser()`); every read here assumes an
 * already-authenticated `userId`.
 */
import { createClient } from '@/lib/supabase/server';
import type { BoardData, FilterState, KudosCard } from './types';
import { buildKudosFilter } from './filter';
import { decodeCursor, encodeCursor } from './cursor';
import type { KudosRow } from './map-card';
import { buildCardSelect, mapRowsToCards, resolveHashtagKudosIds } from './queries-internal';
import { getDepartments, getHashtags, getPerUserStats, getSpotlight, getTopGifts } from './queries-lookups';

export { getSenderStats } from './queries-internal';
export { getSpotlight, getPerUserStats, getTopGifts, getHashtags, getDepartments } from './queries-lookups';

const DEFAULT_FEED_LIMIT = 20;

/** FR1: top-5 kudos by `heart_count` over the whole event. */
export async function getHighlights(opts: {
  userId: string;
  filter?: FilterState;
}): Promise<KudosCard[]> {
  const { userId, filter } = opts;
  const supabase = await createClient();
  const descriptor = buildKudosFilter(filter ?? {});

  let hashtagKudosIds: string[] | null = null;
  if (descriptor.hashtagId) {
    hashtagKudosIds = await resolveHashtagKudosIds(supabase, descriptor.hashtagId);
    if (hashtagKudosIds.length === 0) return [];
  }

  let query = supabase
    .from('kudos_with_heart_count')
    .select(buildCardSelect(descriptor.departmentId))
    .order('heart_count', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (descriptor.departmentId) query = query.eq('receiver.department_id', descriptor.departmentId);
  if (hashtagKudosIds) query = query.in('id', hashtagKudosIds);

  const { data, error } = await query;
  if (error) throw error;

  return mapRowsToCards((data ?? []) as unknown as KudosRow[], userId, supabase);
}

/** FR3: newest-first feed, keyset-paginated on `(created_at desc, id desc)`. */
export async function getKudosFeed(opts: {
  userId: string;
  cursor?: string | null;
  limit?: number;
  filter?: FilterState;
}): Promise<{ items: KudosCard[]; nextCursor: string | null }> {
  const { userId, cursor, limit = DEFAULT_FEED_LIMIT, filter } = opts;
  const supabase = await createClient();
  const descriptor = buildKudosFilter(filter ?? {});

  let hashtagKudosIds: string[] | null = null;
  if (descriptor.hashtagId) {
    hashtagKudosIds = await resolveHashtagKudosIds(supabase, descriptor.hashtagId);
    if (hashtagKudosIds.length === 0) return { items: [], nextCursor: null };
  }

  let query = supabase
    .from('kudos_with_heart_count')
    .select(buildCardSelect(descriptor.departmentId))
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    // Over-fetch by 1 to detect a next page in one round trip.
    .limit(limit + 1);

  if (descriptor.departmentId) query = query.eq('receiver.department_id', descriptor.departmentId);
  if (hashtagKudosIds) query = query.in('id', hashtagKudosIds);

  const decoded = decodeCursor(cursor ?? null);
  if (decoded) {
    // Compound keyset predicate: rows strictly older than the cursor, or the
    // same `created_at` tie-broken by a smaller `id`. A simpler single-column
    // `.lt('created_at', ...)` fallback is acceptable at human insert
    // cadence (research §6) but the id tiebreak is kept for determinism.
    query = query.or(
      `created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as KudosRow[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  const items = await mapRowsToCards(pageRows, userId, supabase);
  const last = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return { items, nextCursor };
}

/** Composes the full initial SSR payload for `app/kudos/page.tsx`. */
export async function getBoardData(userId: string, filter: FilterState = {}): Promise<BoardData> {
  const [highlights, feedPage, spotlight, stats, gifts, hashtags, departments] = await Promise.all([
    getHighlights({ userId, filter }),
    getKudosFeed({ userId, filter, limit: DEFAULT_FEED_LIMIT }),
    getSpotlight(),
    getPerUserStats(userId),
    getTopGifts(),
    getHashtags(),
    getDepartments(),
  ]);

  return {
    highlights,
    feed: feedPage.items,
    feedNextCursor: feedPage.nextCursor,
    spotlight,
    stats,
    gifts,
    hashtags,
    departments,
  };
}
