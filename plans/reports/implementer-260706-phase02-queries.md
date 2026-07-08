# Implementer report — F005 Phase 02: query modules + pure helpers

## Status
DONE

## Files created
- `lib/kudos/star-tier.ts` (13) + `star-tier.test.ts` (17)
- `lib/kudos/cursor.ts` (50) + `cursor.test.ts` (57)
- `lib/kudos/filter.ts` (19) + `filter.test.ts` (26)
- `lib/kudos/map-card.ts` (80) + `map-card.test.ts` (133)
- `lib/kudos/queries.ts` (126) — public API
- `lib/kudos/queries-internal.ts` (119) — private helpers (see deviation below)
- `lib/kudos/queries-lookups.ts` (109) — private lookups (see deviation below)
- `lib/kudos/queries.test.ts` (322)
- `lib/kudos/test-helpers/supabase-query-mock.ts` (30)

All files < 200 lines (NFR3). `lib/kudos/types.ts` was NOT touched (pre-existing, imported as-is).

## API surface (`lib/kudos/queries.ts`)
```ts
getHighlights(opts: { userId: string; filter?: FilterState }): Promise<KudosCard[]>
getKudosFeed(opts: { userId: string; cursor?: string | null; limit?: number; filter?: FilterState })
  : Promise<{ items: KudosCard[]; nextCursor: string | null }>
getBoardData(userId: string, filter?: FilterState): Promise<BoardData>
// re-exported from queries-lookups.ts / queries-internal.ts:
getSpotlight(): Promise<{ totalKudos: number; nodes: SpotlightNode[] }>
getPerUserStats(userId: string): Promise<PerUserStats>
getTopGifts(): Promise<GiftItem[]>
getHashtags(): Promise<HashtagRef[]>
getDepartments(): Promise<DepartmentRef[]>
getSenderStats(profileIds: string[]): Promise<Map<string, number>>  // profileId -> received_count
```
Helpers: `deriveStarTier`, `encodeCursor`/`decodeCursor`, `buildKudosFilter`, `mapKudosRowToCard` (all in their own files, importable independently).

## Tests
44 new tests, all green (5 files). Full repo suite: 414/414 passing (39 files), no regressions. `npm run typecheck` exit 0. `npx eslint lib/kudos/` clean (repo-wide lint has 1 pre-existing error + warnings, all in unrelated `*.test.tsx` files outside this task's scope).

## Acceptance criteria
- [x] SC10 star-tier thresholds 0/9/10/19/20/49/50 → 0/0/1/1/2/2/3 (pure-fn test, zero mocks).
- [x] Cursor round-trips valid input; garbage/non-base64/invalid-JSON/wrong-shape/bad-ISO/bad-UUID/array/primitive all → `null`, never throws (8 cases tested).
- [x] `buildKudosFilter` — pure descriptor, no `.eq()/.or()` calls, AND-combines both facets.
- [x] `map-card` — folds `likedByMe`, folds star tier for BOTH sender and receiver from a batched map, caps images at 5, drops null hashtag junction rows, handles null sender/receiver gracefully.
- [x] `queries.test.ts` asserts: exact table names (`kudos_with_heart_count`, `hearts`, `profile_kudos_stats`, `kudos_hashtags`, `gifts`, `hashtags`, `departments`), `order`/`limit` calls, `!inner` embed hint present in the `.select()` string only when `departmentId` is set + `.eq('receiver.department_id', id)`, hashtag pre-resolution via `kudos_hashtags` + `.in('id', ids)` on the main query, batched `.in('profile_id', ids)` on `profile_kudos_stats` (single `.from()` call, not per-id), compound `.or()` cursor predicate string, tampered-cursor → no `.or()` call, error propagation (throws, doesn't swallow).
- [x] Feed keyset: over-fetch `limit+1`, slice to `limit`, `nextCursor` only set when the extra row proved more exist — excludes the cursor row itself (predicate is `lt`, strictly older) so no dup/skip.
- [x] Highlights denominator: `getHighlights` returns whatever the DB has up to 5 (`min(5,total)` is then just `array.length`, computed by the UI — no separate count query needed here).
- [x] Department filter targets receiver via `!inner`.

## Deviations from the phase file (flagged as required)

1. **File split beyond the listed `queries.ts`.** A literal single `queries.ts` covering all 9 fetchers hit 233 lines, over the NFR3 200-line cap. Split into `queries.ts` (highlights/feed/board-data, the two-query composition) + `queries-lookups.ts` (spotlight/stats/gifts/hashtags/departments) + `queries-internal.ts` (private select-builder, hashtag-id resolution, likedByMe fetch, row→cards composition, `getSenderStats`). `queries.ts` re-exports everything, so the public import path `from '@/lib/kudos/queries'` is unchanged and matches the phase's documented surface exactly.

2. **`getSenderStats` is called with the union of sender+receiver ids, not sender-only.** The shared `KudosPerson` type requires `starTier` on both `sender` and `receiver`; `profile_kudos_stats` is a generic per-profile view (not sender-specific), so `mapRowsToCards` collects `[sender.id, receiver.id]` per row before the batched `.in('profile_id', ids)` call. Still exactly one query per page (no N+1) — same shape and name as specified, just fed a broader id set so the receiver's star tier isn't silently left at 0.

3. **Hashtag filter uses a two-step lookup, not an inline `!inner` embed (unlike department).** `resolveHashtagKudosIds` runs a small separate `kudos_hashtags` query first, then `.in('id', ids)` on the main query. Reason: `kudos_hashtags` is a one-to-many embed (a card can have multiple hashtags); filtering it with `!inner .eq('kudos_hashtags.hashtag_id', id)` would also prune the *returned* embedded rows to just the matched hashtag, so a card matching the filter would display only that one hashtag chip instead of its full hashtag list. Department is safe to filter inline because `receiver` is a to-one embed (a card has exactly one receiver), so no partial-data side effect. Both are unit-asserted against the mock (`kudos_hashtags.eq('hashtag_id', ...)` then `.in('id', ...)` on the main query vs. `!inner` string + `.eq('receiver.department_id', ...)`).

4. **`profile_kudos_stats.profile_id`, not `.id`.** The phase text says `.in('id', senderIds)`; the actual Phase-01 migration names the column `profile_id` (see `20260706000000_kudos_schema.sql:88-111`). Followed the migration (source of truth per the assignment) — `getSenderStats`/`getPerUserStats` both filter on `profile_id`.

5. **Feed "has more" detection: over-fetch `limit+1`** rather than assuming `results.length === limit` implies more pages. This costs nothing extra (still one query) and avoids the classic off-by-one where the last page exactly fills `limit` and gets a spurious non-null `nextCursor`.

## Residual risk (inherited from research, not fixable at this layer)
Every embed off `kudos_with_heart_count` (`sender`, `receiver`, `kudos_hashtags`, `kudos_images`) relies on PostgREST detecting FKs *through* a `GROUP BY` view. This is the exact risk the phase file's risk table already flags ("Supabase nested-select FK hint syntax wrong"). Unit tests here only assert the correct `.select()`/`.eq()`/`.in()` strings are sent to the (mocked) builder — they cannot verify PostgREST actually resolves the embed against the real view. Recommend a smoke check against the live Supabase project before/during Phase 06 integration; if the embed doesn't resolve, the fallback is querying `kudos` directly (not the view) and computing `heart_count` via a parallel `hearts` count query.

## Unresolved questions
None blocking. The one open item worth a human decision: whether `getSpotlight`'s in-JS aggregation (fetch all `kudos` rows ordered desc, reduce by `receiver_id`) is acceptable at scale, or whether a dedicated SQL aggregate (e.g. a `spotlight_nodes` view) should replace it later — flagged as YAGNI for now per research's "event scale" framing, not a defect.

**Status:** DONE
**Summary:** All Phase-02 pure helpers + query modules implemented, TDD (red→green) throughout, 44 new tests + 414/414 full suite green, typecheck/lint clean. Three implementation-level deviations from the phase file are documented above (file split for the line-count budget, sender+receiver batched star-tier ids, two-step hashtag filter) plus one correction to match the actual migration column name (`profile_id`).
