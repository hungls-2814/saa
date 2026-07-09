/**
 * Shared contract for the Sun* Kudos Live board (F005, `/kudos`).
 *
 * This is the single source of truth bridging Track A (presentational UI in
 * `app/kudos/components/`) and Track B (Supabase-backed query/action modules in
 * `lib/kudos/`). UI components are typed against these interfaces; the query
 * layer produces them. Keep this file free of runtime/Supabase imports — it is
 * pure types so both a client bundle and server modules can import it.
 *
 * Design ref: MoMorph `MaZUn5xHXZ` (Sun* Kudos - Live board).
 */

/** Star tier ("số hoa thị") — DERIVED from received-kudos count (10/20/50 → 1/2/3), never stored. */
export type StarTier = 0 | 1 | 2 | 3;

/**
 * Hero badge ("Huy hiệu Hero") — DERIVED from the count of DISTINCT senders who
 * sent this Sunner Kudos, never stored. `none` renders no badge. Tiers per
 * design b1Filzi9i6: 1–4 new, 5–9 rising, 10–20 super, >20 legend.
 */
export type HeroBadge = 'none' | 'new' | 'rising' | 'super' | 'legend';

/** A hashtag reference — chips render the label but key filtering on the id. */
export interface HashtagRef {
  id: string;
  label: string;
}

/** A department reference for the filter dropdown. */
export interface DepartmentRef {
  id: string;
  name: string;
}

/** A Sunner option in the compose-Kudos recipient autocomplete (F006). */
export interface RecipientOption {
  id: string;
  fullName: string;
  department: string;
  avatarUrl: string;
}

/** A Sunner as shown on a kudos card (sender or receiver). */
export interface KudosPerson {
  id: string;
  fullName: string;
  /** Department display name (denormalized for render); may be empty if unassigned. */
  department: string;
  avatarUrl: string;
  /** "danh hiệu" — honorific title; may be empty. */
  title: string;
  starTier: StarTier;
  /** Hero badge derived from distinct-sender count; `none` = render no badge. */
  heroBadge: HeroBadge;
}

/** A single kudos post rendered as a card in the Highlight carousel or the feed. */
export interface KudosCard {
  id: string;
  /**
   * The kudos's own award title ("danh hiệu" the sender grants the receiver) —
   * shown as the card title. Empty for legacy F005 rows that predate compose.
   */
  title: string;
  /**
   * Sent anonymously. When true, `sender` carries the sender-chosen alias in
   * `fullName` with a blank identity (the real author is never serialized into
   * this client-facing card — see `map-card.ts`).
   */
  isAnonymous: boolean;
  sender: KudosPerson;
  receiver: KudosPerson;
  content: string;
  /** ISO-8601 timestamp; formatted client-side as `HH:mm - MM/DD/YYYY`. */
  createdAt: string;
  heartCount: number;
  /** Whether the current viewer has liked this kudos. */
  likedByMe: boolean;
  hashtags: HashtagRef[];
  /** Attachment image URLs; the UI renders at most 5 thumbnails. */
  images: string[];
}

/** One node in the Spotlight receiver word-cloud. */
export interface SpotlightNode {
  receiverId: string;
  name: string;
  /** Node weight = number of kudos this receiver has received. */
  weight: number;
  /** ISO-8601 timestamp of the most recent kudos received (for the hover tooltip). */
  lastReceivedAt: string;
}

/** Per-current-user statistics for the sidebar (FR5). */
export interface PerUserStats {
  kudosReceived: number;
  kudosSent: number;
  heartsReceived: number;
  /** Secret Boxes opened / still unopened (design rows `D.1.6`/`D.1.7`).
   * The Secret Box feature has no data source on this board yet, so the real
   * query returns 0 for both; they render for design fidelity. */
  secretBoxOpened: number;
  secretBoxUnopened: number;
}

/** A recent gift recipient row for the "Top 10 nhận quà mới nhất" list (FR6). */
export interface GiftItem {
  id: string;
  recipientName: string;
  recipientAvatarUrl: string;
  description: string;
  /** ISO-8601 timestamp; list is ordered by this desc. */
  awardedAt: string;
}

/** Active board filter — single-select per facet, AND-combined. Department = receiver's. */
export interface FilterState {
  hashtagId?: string;
  departmentId?: string;
}

/** The complete initial payload the `/kudos` server page hands to the board. */
export interface BoardData {
  /** Top-5 kudos by heart_count over the whole event. */
  highlights: KudosCard[];
  /** First page of the newest-first feed. */
  feed: KudosCard[];
  /** Opaque keyset cursor for the next feed page, or null when exhausted. */
  feedNextCursor: string | null;
  spotlight: {
    /** Total kudos count shown in the "<N> KUDOS" header. */
    totalKudos: number;
    nodes: SpotlightNode[];
  };
  stats: PerUserStats;
  gifts: GiftItem[];
  hashtags: HashtagRef[];
  departments: DepartmentRef[];
}
