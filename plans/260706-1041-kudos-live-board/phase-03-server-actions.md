# Phase 03 — Server actions (Track B)

## Context
- Research: `plans/reports/researcher-260706-1041-supabase-data-layer.md` §6 (mutation), §7 (tests)
- Spec: `spec/kudos-board/overview.md` (FR3, FR4, FR7) · blockedBy: Phase 02

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** The three Server Actions the client board invokes: like toggle (persisted),
  feed load-more (keyset), and apply-filters (re-filter highlights + feed). Thin wrappers over
  Phase-02 queries; auth-checked; mutations `revalidatePath('/kudos')`.

## Key insights
- `toggleHeartAction`: `getUser()` → check existing heart → delete or insert; RLS self-like
  violation surfaces as a Postgres error → catch, return a user-facing failure the UI toasts
  (don't let it 500). `revalidatePath('/kudos')`.
- Return the fresh `{ liked, heartCount }` so the client updates optimistically-then-reconciled.
- `loadMoreFeedAction` + `applyFiltersAction` are **read** actions (no revalidate) that return data
  the client appends/replaces — keeps infinite scroll and filtering client-driven over SSR base.
- **Both read actions MUST `getUser()` and pass `userId`** into `getKudosFeed`/`getHighlights` so
  appended/re-filtered cards fold the caller's hearts (`likedByMe`) + sender star-tier — otherwise
  scrolled/filtered cards render `likedByMe:false` for kudos the user already liked (HIGH #3).
- **`loadMoreFeedAction` treats the cursor as untrusted:** `decodeCursor` validates ISO ts + UUID;
  on decode/validation failure the action returns a typed failure with `nextCursor:null` and never
  throws untyped (HIGH #6).
- Actions reuse Phase-02 `queries.ts` + `map-card.ts` — no duplicated SQL (DRY).

## Requirements
- **Functional:** FR7 like toggle (one-per-user, no self-like), FR3 load-more (keyset),
  FR4 apply-filters (highlights + feed reset to page 1).
- **Non-functional:** NFR4 revalidate on mutate; NFR1 tested via mock.

## Related code files
**Create**
- `lib/kudos/actions.ts` (`"use server"`):
  - `toggleHeartAction(kudosId) → { liked, heartCount }`
  - `loadMoreFeedAction({ cursor, filter }) → { items, nextCursor }` (invalid cursor → `nextCursor:null`)
  - `applyFiltersAction(filter) → { highlights, feed, nextCursor }`
- `lib/kudos/actions.test.ts` — insert + delete branches, self-like error mapping, load-more
  cursor pass-through + tampered-cursor typed-failure, userId threaded into reads, filter reset

## Implementation steps
1. `toggleHeartAction`: auth guard; existence check via `maybeSingle`; branch delete/insert;
   map RLS error → typed failure result; recompute `heartCount` (query view or COUNT); revalidate.
2. `loadMoreFeedAction`: `getUser()` → `userId`; `decodeCursor` (validate ISO ts + UUID; invalid →
   return typed failure, `nextCursor:null`) → `getKudosFeed({userId,cursor,filter})` → map cards →
   next cursor from last row (null when page < limit).
3. `applyFiltersAction`: `getUser()` → `userId`; `getHighlights({userId,filter})` +
   `getKudosFeed({userId,filter})` page1 → next cursor.
4. Tests: mock `createClient` (auth + chainable builder); assert insert/delete args, self-like
   path returns failure (not throw-500), `userId` forwarded to reads, tampered cursor → typed
   failure, cursor + filter forwarded.

## Todo
- [x] `toggleHeartAction` (+ self-like error mapping + revalidate)
- [x] `loadMoreFeedAction` (getUser + validated cursor + keyset)
- [x] `applyFiltersAction` (getUser + highlights + feed reset)
- [x] `actions.test.ts` (toggle branches, self-like, userId threading, tampered cursor, filter)

## Success criteria
- **SC8:** like toggles persist one-per-user; self-like rejected without a 500; count updates.
- **SC4:** load-more returns next keyset page (no dup/skip); null cursor at end; tampered cursor → page 1 / typed failure.
- **SC5(filter):** apply-filters returns re-filtered highlights + feed page 1.
- Appended/re-filtered cards carry correct `likedByMe` + sender star-tier (userId threaded).

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Self-like RLS error bubbles as 500 | M×M | catch Postgres error code → typed `{ ok:false }` result → UI toast |
| Double-heart race | L×M | PK `(user_id,kudos_id)` rejects the 2nd insert; treat dup as already-liked |
| revalidatePath wipes client scroll/filter state | M×M | load-more/filter are non-revalidating reads; only toggle revalidates |
| Read actions omit userId → scrolled/filtered cards show wrong `likedByMe` | **M×H** | both actions `getUser()` → thread userId into `getKudosFeed`/`getHighlights` |
| Tampered cursor throws untyped / injects into `.or()` | **M×H** | validate in `decodeCursor`; invalid → typed failure, `nextCursor:null` |

## Security
All actions `getUser()`-gated; writes rely on RLS (own-row hearts, self-like block). No
service-role key in app runtime. No unvalidated SQL (query-builder only).

## Next
Unblocks Phase 06 integration (client wires these actions to UI events).
