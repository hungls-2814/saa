'use server';

/**
 * Server Actions the `/kudos` client board invokes (F005, Track B). Thin,
 * auth-checked wrappers over the Phase-02 query modules (`queries.ts`) — no
 * duplicated SQL. `toggleHeartAction` is the only mutation and the only one
 * that `revalidatePath('/kudos')`; the other two are reads the client
 * appends/replaces client-side (infinite scroll + filtering stay
 * client-driven over the SSR base, so they must not revalidate).
 */
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { decodeCursor } from './cursor';
import { getHighlights, getKudosFeed } from './queries';
import type { FilterState, KudosCard } from './types';

/** Postgres error codes relevant to the hearts insert path. */
const RLS_VIOLATION_CODE = '42501';
const UNIQUE_VIOLATION_CODE = '23505';

interface PostgrestErrorLike {
  code?: string;
}

export type ToggleHeartError = 'unauthenticated' | 'self_like' | 'unknown';
export type ToggleHeartResult =
  | { ok: true; liked: boolean; heartCount: number }
  | { ok: false; error: ToggleHeartError };

export type LoadMoreFeedError = 'unauthenticated' | 'invalid_cursor';
export type LoadMoreFeedResult =
  | { ok: true; items: KudosCard[]; nextCursor: string | null }
  | { ok: false; error: LoadMoreFeedError; nextCursor: null };

export type ApplyFiltersError = 'unauthenticated';
export type ApplyFiltersResult =
  | { ok: true; highlights: KudosCard[]; feed: KudosCard[]; nextCursor: string | null }
  | { ok: false; error: ApplyFiltersError };

/**
 * FR7: like toggle. RLS enforces one-heart-per-user and blocks self-likes
 * (`insert own heart, not on own kudos` policy) — a self-like surfaces as a
 * `42501` insufficient-privilege error, which is mapped to a typed failure
 * instead of bubbling as a 500. A `23505` unique-violation (a concurrent
 * second insert racing the first) is treated as "already liked", not a
 * failure — the PK is the real double-heart guard (see Phase-03 risks).
 */
export async function toggleHeartAction(kudosId: string): Promise<ToggleHeartResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const { data: existing, error: lookupError } = await supabase
    .from('hearts')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('kudos_id', kudosId)
    .maybeSingle();
  if (lookupError) return { ok: false, error: 'unknown' };

  let liked: boolean;
  if (existing) {
    const { error } = await supabase.from('hearts').delete().eq('user_id', user.id).eq('kudos_id', kudosId);
    if (error) return { ok: false, error: 'unknown' };
    liked = false;
  } else {
    const { error } = await supabase.from('hearts').insert({ user_id: user.id, kudos_id: kudosId });
    if (error) {
      const code = (error as PostgrestErrorLike).code;
      if (code === RLS_VIOLATION_CODE) return { ok: false, error: 'self_like' };
      if (code !== UNIQUE_VIOLATION_CODE) return { ok: false, error: 'unknown' };
      // else: duplicate-insert race — already liked, fall through as success.
    }
    liked = true;
  }

  // F005 increment: heart_count is a weighted SUM (special-day likes count as
  // +2), so the post-mutate read goes through the view instead of a raw
  // COUNT on `hearts`.
  const { data: row, error: countError } = await supabase
    .from('kudos_with_heart_count')
    .select('heart_count')
    .eq('id', kudosId)
    .single();
  if (countError) return { ok: false, error: 'unknown' };

  revalidatePath('/kudos');
  return { ok: true, liked, heartCount: row?.heart_count ?? 0 };
}

/**
 * FR3: keyset load-more. The cursor is untrusted client input — `cursor`
 * present but failing `decodeCursor` (tampered/malformed) returns a typed
 * failure with `nextCursor: null` rather than forwarding it into the
 * keyset query. Threads `userId` into `getKudosFeed` so appended cards fold
 * the caller's `likedByMe` + sender star-tier.
 */
export async function loadMoreFeedAction(opts: {
  cursor: string | null;
  filter?: FilterState;
}): Promise<LoadMoreFeedResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated', nextCursor: null };

  if (opts.cursor && !decodeCursor(opts.cursor)) {
    return { ok: false, error: 'invalid_cursor', nextCursor: null };
  }

  const { items, nextCursor } = await getKudosFeed({
    userId: user.id,
    cursor: opts.cursor,
    filter: opts.filter,
  });
  return { ok: true, items, nextCursor };
}

/**
 * FR4: apply-filters. Re-filters both the highlight carousel and the feed,
 * resetting the feed to page 1 (no cursor). Threads `userId` for the same
 * `likedByMe` + star-tier reasons as `loadMoreFeedAction`.
 */
export async function applyFiltersAction(filter: FilterState): Promise<ApplyFiltersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'unauthenticated' };

  const [highlights, feedPage] = await Promise.all([
    getHighlights({ userId: user.id, filter }),
    getKudosFeed({ userId: user.id, filter }),
  ]);

  return { ok: true, highlights, feed: feedPage.items, nextCursor: feedPage.nextCursor };
}
