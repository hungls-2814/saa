# Phase 06 — Integration (join track)

## Context
- Spec: `spec/kudos-board/overview.md` (all FR) · blockedBy: **03, 04, 05**
- Consumes: Track A UI (Phase 05), queries (02), actions (03), page shell + i18n (04)

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** The single join point. Replace Track-A mock data with real SSR `BoardData`;
  wire client event props to the Server Actions; make filters, carousel, infinite scroll, and
  like toggle work end-to-end on real data.

## Key insights
- `app/kudos/page.tsx` (server) calls `getBoardData(user.id, {})` → passes into a client board
  wrapper holding filter/feed/like state.
- Client wrapper is the ONLY `"use client"` boundary; presentational cards stay pure (props in).
- Like = optimistic toggle → `toggleHeartAction` → reconcile with returned `{liked,heartCount}`.
- Filter change → `applyFiltersAction` → replace highlights + feed + reset cursor.
- Scroll sentinel (IntersectionObserver) → `loadMoreFeedAction` → append + advance cursor;
  stop when `nextCursor` null.
- Copy Link → `navigator.clipboard.writeText` + i18n toast.
- **Error handling (MEDIUM):** wrap `getBoardData` in `page.tsx` and the client load-more/
  apply-filters/toggle calls in try/catch — on failure leave state unchanged + show a toast (no
  full `error.tsx`). Spec has no error-state design → logged as an **ACCEPTED scope gap** (YAGNI),
  not a silent omission.

## Requirements
- **Functional:** FR1–FR8 fully interactive on real data. **Non-functional:** NFR3, NFR4.

## Related code files
**Create**
- `app/kudos/components/kudos-board.tsx` — client wrapper: filter/feed/like state + action calls
- `app/kudos/components/use-kudos-feed.ts` — client hook: infinite-scroll + cursor state
- `app/kudos/components/copy-link-toast.tsx` (or reuse existing toast if present)
**Modify**
- `app/kudos/page.tsx` — fetch `getBoardData`, render `SiteHeader active` + `<KudosBoard .../>` + footer
- Track-A components — swap mock props for real props / event callbacks (no structural rewrite)

## Implementation steps
1. Wire `page.tsx` → `getBoardData(user.id)` → `KudosBoard` props.
2. `KudosBoard`: hold `{filter, highlights, feed, cursor, liking}`; pass down + event handlers.
3. Like handler → `toggleHeartAction`; map self-like failure → toast.
4. Filter handler + card hashtag-chip → `applyFiltersAction` (reset both highlight + feed).
5. `use-kudos-feed` sentinel → `loadMoreFeedAction`; append/stop.
6. Copy Link → clipboard + toast; avatar/name → profile stub route; card/node → detail stub route.
7. Wrap `getBoardData` (page) + client action calls in try/catch → toast on failure, state
   unchanged (accepted scope gap; no `error.tsx`).
8. `npm run typecheck` + `lint` clean.

## Todo
- [x] `page.tsx` real SSR data wiring
- [x] `KudosBoard` client wrapper (state + actions)
- [x] like toggle (optimistic + self-like toast)
- [x] filter + hashtag-chip re-filter (both highlight + feed)
- [x] infinite scroll hook
- [x] copy-link toast + nav stubs
- [x] error try/catch + toast (getBoardData + action calls)
- [x] typecheck + lint clean

## Success criteria
- **SC2–SC9:** every interactive behaviour works on real Supabase data end-to-end.
- No mock data remains; all copy from `KudosPage`; typecheck + lint clean.

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Server/client boundary leaks (queries into client) | M×H | queries/actions server-only; single client wrapper takes plain data + action refs |
| Optimistic like desyncs on error | M×M | reconcile with action return; revert on failure + toast |
| Scroll sentinel double-fires load-more | M×M | guard with in-flight flag in `use-kudos-feed` |
| Filter race (fast successive changes) | L×M | latest-wins via request token/abort in wrapper |
| Query/action failure crashes the board (no spec error state) | M×M | try/catch getBoardData + action calls → toast, state unchanged; accepted scope gap (YAGNI) |

## Security
Page stays auth-gated (Phase 04). Client never holds service-role key. Actions re-check `getUser()`.

## Next
Unblocks Phase 07 (tester runs the full suite against final integrated code).
