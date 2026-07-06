# Phase 02 — Query modules + pure helpers (Track B)

## Context
- Research: `plans/reports/researcher-260706-1041-supabase-data-layer.md` §6, §7
- Spec: `spec/kudos-board/overview.md` (FR1–FR6, FR11, NFR1) · blockedBy: Phase 01

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** Server-side query modules over the Phase-01 schema + the pure helpers the
  spec's derived values need. Pure logic split out for mock-free unit tests; DB access tested
  via the chainable `@/lib/supabase/server` stub (matches `middleware.test.ts`).

## Key insights
- All queries use existing async `createClient()` from `lib/supabase/server.ts` (server-only).
- **Keyset** pagination on `(created_at desc, id desc)`; cursor = base64(JSON{createdAt,id}).
  Note fallback: single-column `.lt('created_at')` acceptable at human insert cadence (research §6).
- Star-tier + cursor codec + filter descriptor are **pure** → test with zero mocks (NFR1).
- `heart_count` from `kudos_with_heart_count`; per-user stats + sender star-tier from
  `profile_kudos_stats` (Phase 01, DRY).
- **`userId` must thread through `getHighlights`/`getKudosFeed`** (and the load-more/apply-filters
  actions in Phase 03) so `likedByMe` folds correctly — otherwise appended/re-filtered cards render
  `likedByMe:false` for already-liked kudos. `likedByMe` = single `.in('kudos_id', visibleIds)`
  query on the user's `hearts`, folded per card in `map-card`.
- **Sender star-tier has NO embeddable FK** — `profile_kudos_stats` is an aggregate view, so
  PostgREST cannot embed it from `kudos.sender_id`. Fetch it separately: one
  `.in('id', distinctSenderIds)` query on `profile_kudos_stats`, then fold `received_count` →
  `deriveStarTier` into each card in `map-card` (alongside `likedByMe`).
- **`decodeCursor` handles untrusted input** — the base64 JSON is client-supplied and gets
  template-interpolated into the `.or()` keyset predicate. Validate `{createdAt,id}` (valid ISO
  timestamp + valid UUID) before use; invalid → treat as no cursor (page 1) / typed failure.
- **Department filter matches the RECEIVER's department** (recognition board filters by who is
  celebrated). PostgREST embedded filter needs the `!inner` hint:
  `.select('...,receiver:profiles!kudos_receiver_id_fkey!inner(department_id)')`
  `.eq('receiver.department_id', id)`.
- **Carousel paginator denominator = `min(5, total_highlights)`** ("n/3" when only 3 exist).

## Requirements
- **Functional:** FR1 highlights (heart_count desc, limit 5; paginator `min(5,total)`), FR2
  spotlight (total count + receiver nodes weight=received_count), FR3 feed (keyset), FR4 filter
  descriptor applied to highlights+feed (department = **receiver** department, `!inner`), FR5
  per-user stats, FR6 top-10 gifts, hashtag+department option lists.
- **Non-functional:** NFR1 pure-testable, NFR3 files <200 lines.

## Related code files
**Create**
- `lib/kudos/types.ts` — shared contract types (see plan.md Key shared contracts)
- `lib/kudos/queries.ts` — `getHighlights({userId,filter})`, `getKudosFeed({userId,cursor,limit,filter})`,
  `getSpotlight()`, `getPerUserStats(userId)`, `getTopGifts()`, `getHashtags()`, `getDepartments()`,
  `getSenderStats(senderIds)` (batch `.in('id',...)` on `profile_kudos_stats`),
  `getBoardData(userId, filter)` (composes the initial SSR payload)
- `lib/kudos/star-tier.ts` — `deriveStarTier(receivedCount): StarTier` (0/1/2/3 @ 10/20/50)
- `lib/kudos/cursor.ts` — `encodeCursor` + `decodeCursor` (validates ISO ts + UUID; invalid → null)
- `lib/kudos/filter.ts` — `buildKudosFilter(FilterState)` → query descriptor (no `.eq()`/`.or()` here)
- `lib/kudos/map-card.ts` — row → `KudosCard` (fold hearts→likedByMe + sender star-tier from
  batched stats, cap images/hashtags)
- `lib/kudos/test-helpers/supabase-query-mock.ts` — chainable `mockReturnThis` stub (research §7)
- Co-located vitest: `star-tier.test.ts`, `cursor.test.ts`, `filter.test.ts`, `map-card.test.ts`,
  `queries.test.ts`

## Implementation steps
1. Define `types.ts` per shared contract.
2. Pure helpers: `star-tier.ts`, `cursor.ts` (encode + validating decode), `filter.ts`,
   `map-card.ts` (+ their tests first, TDD).
3. `queries.ts`: implement each fetch per research §6; thread `userId`; apply `buildKudosFilter`
   to highlights + feed; department filter on `receiver.department_id` via `!inner` embed;
   compound-cursor `.or()` predicate (with fallback comment) for feed.
4. Batch star-tier: collect distinct `senderIds` from the page → `getSenderStats(senderIds)` →
   fold `received_count`→star-tier + `likedByMe` in `map-card` (no N+1).
5. `getBoardData()` composes highlights (paginator `min(5,total)`) + feed page1 + cursor +
   spotlight + stats + gifts + option lists.
6. `queries.test.ts`: use the query-mock; assert table/view names, order/limit/filter calls,
   `receiver.department_id` `!inner` filter, batched sender-stats `.in` call, mapped shape.

## Todo
- [x] `types.ts` shared contract
- [x] pure helpers (star-tier, validating cursor, filter, map-card) + tests
- [x] `queries.ts` all fetchers (userId threaded) + `getSenderStats` batch + `getBoardData`
- [x] department filter on receiver via `!inner`
- [x] query-mock helper + `queries.test.ts`

## Success criteria
- **SC10:** star-tier correct at 0/9/10/19/20/49/50 (pure-fn tests); folded into cards from batched stats.
- **SC2/SC3/SC4/SC6/SC7:** each query returns correctly-shaped, correctly-ordered/limited data
  (asserted against the mock); filter descriptor narrows highlights+feed; department filters on receiver.
- Cursor round-trips; **invalid/tampered cursor → null (page 1), never throws**; feed keyset
  predicate excludes the cursor row (no dup/skip).
- Highlights paginator denominator = `min(5,total)`.

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Supabase nested-select FK hint syntax wrong | M×M | use explicit `profiles!kudos_sender_id_fkey(...)` (research §6) |
| `.or()` compound cursor string malformed | M×M | unit-assert the predicate string; document `.lt` fallback |
| N+1 for `likedByMe` per card | L×M | single `.in`-query on visible ids, fold in `map-card` |
| Sender star-tier: aggregate view not FK-embeddable → per-card fetch | M×M | one batched `.in('id',senderIds)` on `profile_kudos_stats`, fold in `map-card` |
| Tampered cursor interpolated into `.or()` predicate (injection surface) | **M×H** | `decodeCursor` validates ISO ts + UUID before use; invalid → null / typed failure |
| Department embedded filter silently returns all rows without `!inner` | M×M | use `!inner` hint + assert the `receiver.department_id` filter in tests |

## Security
Server-only modules (never imported by client components). No secrets; RLS enforces read scope.

## Next
Unblocks Phase 03 (server actions call these queries + map-card).
