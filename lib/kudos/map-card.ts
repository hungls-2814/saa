import type { HashtagRef, KudosCard, KudosPerson } from './types';
import { deriveStarTier } from './star-tier';

/** A `profiles` row as embedded in a kudos card query (sender or receiver side). */
export interface KudosProfileRow {
  id: string;
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  department: { name: string } | null;
}

/** One `kudos_hashtags` junction row, with its `hashtags` embed resolved. */
export interface KudosHashtagJunctionRow {
  hashtag: { id: string; label: string } | null;
}

/** One `kudos_images` row. */
export interface KudosImageRow {
  url: string;
}

/** The raw shape `queries.ts` selects from `kudos_with_heart_count`. */
export interface KudosRow {
  id: string;
  content: string;
  created_at: string;
  heart_count: number;
  /** Per-kudos award title ("danh hiệu"); null on legacy rows. */
  title: string | null;
  /** F006: sender chose anonymity. */
  is_anonymous: boolean | null;
  /** F006: display alias shown in place of the real sender when anonymous. */
  anonymous_alias: string | null;
  sender: KudosProfileRow | null;
  receiver: KudosProfileRow | null;
  kudos_hashtags: KudosHashtagJunctionRow[] | null;
  kudos_images: KudosImageRow[] | null;
}

/** The sender shown for an anonymous kudos — no real identity, just the alias. */
function anonymousSender(alias: string | null): KudosPerson {
  return {
    id: '',
    fullName: (alias ?? '').trim() || 'Người gửi ẩn danh',
    department: '',
    avatarUrl: '',
    title: '',
    starTier: 0,
  };
}

/** Pre-fetched context `queries.ts` folds into each card (no per-card IO here). */
export interface MapCardContext {
  /** kudos ids the current viewer has hearted. */
  likedByMe: Set<string>;
  /** profile id -> received_count, from a batched `profile_kudos_stats` fetch. */
  receivedCounts: Map<string, number>;
}

const MAX_IMAGES = 5;

function mapPerson(row: KudosProfileRow | null, receivedCounts: Map<string, number>): KudosPerson {
  return {
    id: row?.id ?? '',
    fullName: row?.full_name ?? '',
    department: row?.department?.name ?? '',
    avatarUrl: row?.avatar_url ?? '',
    title: row?.title ?? '',
    starTier: deriveStarTier(row?.id ? (receivedCounts.get(row.id) ?? 0) : 0),
  };
}

function mapHashtags(junctions: KudosHashtagJunctionRow[] | null): HashtagRef[] {
  return (junctions ?? [])
    .map((junction) => junction.hashtag)
    .filter((hashtag): hashtag is { id: string; label: string } => hashtag !== null)
    .map((hashtag) => ({ id: hashtag.id, label: hashtag.label }));
}

/**
 * Pure row → `KudosCard` mapper. Folds `likedByMe` + sender/receiver star
 * tier from pre-fetched maps (`MapCardContext`) — no Supabase calls here, so
 * this is unit-testable with zero mocks (NFR1).
 */
export function mapKudosRowToCard(row: KudosRow, ctx: MapCardContext): KudosCard {
  const isAnonymous = row.is_anonymous ?? false;
  return {
    id: row.id,
    title: row.title ?? '',
    isAnonymous,
    // Anonymity is enforced HERE, in the server-side mapper: the real sender
    // profile is replaced by the alias before the card ever reaches the client,
    // so an anonymous author's identity is never serialized into the payload.
    sender: isAnonymous ? anonymousSender(row.anonymous_alias) : mapPerson(row.sender, ctx.receivedCounts),
    receiver: mapPerson(row.receiver, ctx.receivedCounts),
    content: row.content,
    createdAt: row.created_at,
    heartCount: row.heart_count,
    likedByMe: ctx.likedByMe.has(row.id),
    hashtags: mapHashtags(row.kudos_hashtags),
    images: (row.kudos_images ?? []).slice(0, MAX_IMAGES).map((image) => image.url),
  };
}
