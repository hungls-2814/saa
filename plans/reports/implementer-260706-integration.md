# Implementer Report — F005 Phase 04 (auth gate + i18n) + Phase 06 (integration)

## Task
Wire the Track-A presentational `/kudos` UI to the Track-B queries/actions on a real, auth-gated
`/kudos` page. Covers plan phases `phase-04-auth-gate-i18n.md` and `phase-06-integration.md`.

**Status:** DONE

## Files created
- `app/kudos/page.tsx` (61 lines) — server component: auth guard (mirrors
  `app/he-thong-giai/page.tsx`), `getBoardData` fetch wrapped in try/catch (falls back to an
  inline `EMPTY_BOARD_DATA` shell on failure), `SiteHeader active="kudos"` + `SiteFooter`.
- `app/kudos/page.test.tsx` (78 lines) — guard-focused: unauthenticated → redirect, Supabase
  unconfigured → redirect, authenticated → fetches board data, `getBoardData` throw → falls back
  to the empty shell instead of crashing.
- `app/kudos/components/kudos-board-container.tsx` (138 lines) — the single `"use client"`
  boundary; holds `data`/`filters`/`toast` state and wires `KudosBoard`'s callbacks to the
  Server Actions (see mapping below).
- `app/kudos/components/kudos-board-container.test.tsx` (161 lines) — 12 cases: initial render,
  optimistic like + reconcile, self-like revert+toast, action-throw revert+toast, in-flight
  double-click guard, filter replace, filter failure toast, copy-link success/failure.
- `app/kudos/components/use-kudos-feed.ts` (39 lines) — infinite-scroll hook; in-flight ref guard
  so a double-firing scroll sentinel can't issue two concurrent `loadMoreFeedAction` calls.
- `app/kudos/components/use-kudos-feed.test.ts` (99 lines) — 6 cases incl. the double-fire guard.
- `app/kudos/components/kudos-toast.tsx` (38 lines) — dismissible, 4s-auto-expiring toast used
  for both the Copy-Link success message and action-failure notices.
- `app/kudos/components/kudos-toast.test.tsx` (55 lines) — 5 cases incl. timer reset on message
  change.
- `i18n/messages.test.ts` (54 lines) — vi/en key-parity guard (SC11) placed under `i18n/**` so
  it's picked up by the vitest `include` globs (`messages/**` is not included).

## Files modified
- `proxy.ts` — added `"/kudos"` to `PROTECTED_PATHS` + updated the comment.
- `proxy.test.ts` — added a `protected routes (/kudos)` describe block mirroring the existing
  `/he-thong-giai` one (unauthenticated → redirect, authenticated → 200).
- `messages/vi.json` / `messages/en.json` — added `KudosPage.toast` (`copyLinkSuccess`,
  `selfLike`, `error`); everything else under `KudosPage` was already in place from Track A.

## Container → Server Action mapping
| `KudosBoard` prop | Container behavior |
|---|---|
| `onFilterChange` | `applyFiltersAction(filters)` → replaces `highlights`/`feed`/`feedNextCursor`; a monotonic `filterTokenRef` counter makes fast successive changes latest-wins (a stale response is dropped) |
| `onToggleLike` | optimistic flip of `likedByMe`/`heartCount` → `toggleHeartAction(id)` → reconcile with `{liked, heartCount}`; `false` result reverts and toasts (`selfLike` copy for `error: "self_like"`, generic `error` otherwise); a `likingRef` Set blocks a second click on the same card while one is in flight |
| `onLoadMore` | delegated to `useKudosFeed().loadMore(feedNextCursor, filters)` → `loadMoreFeedAction` → appends items, advances `feedNextCursor`; hook's own in-flight ref stops a double-firing scroll sentinel |
| `onCopyLink` | `navigator.clipboard.writeText(origin + /kudos/:id)` → success/failure toast |
| `onSelectHashtag` | **intentionally left unwired** — `kudos-board.tsx`'s internal `handleSelectHashtag` already folds a hashtag-chip click into `onFilterChange` with the merged `FilterState` before also firing `onSelectHashtag`; wiring both would fire `applyFiltersAction` twice per click |
| `onOpenCompose` / `onSearchSunner` | left as no-op (out of scope per plan) |

Spotlight-board node clicks, avatar/name links, and card/detail links were already wired to
route stubs by Track A (`kudos-person.tsx`, `spotlight-board.tsx`, `kudos-card.tsx`) — untouched.

## i18n parity
Added `KudosPage.toast.{copyLinkSuccess,selfLike,error}` to both catalogs. `i18n/messages.test.ts`
asserts full key-set parity between `vi.json`/`en.json` (both directions) plus presence of every
`KudosPage` group used by the board (`banner`, `highlight`, `spotlight`, `feed`, `card`, `stats`,
`gifts`, `toast`). All 3 tests pass.

## Client/server boundary
`kudos-board-container.tsx` is the only file with `"use client"` that imports `lib/kudos/actions`
(a `"use server"` module) — `lib/kudos/queries.ts` is never imported by anything under
`app/kudos/components/`; it's only called server-side in `app/kudos/page.tsx`. Verified via
`grep -rn "from '@/lib/kudos/queries'" app/kudos/components/` → no matches.

## Verification
- `npm run typecheck` — exit 0, clean.
- `npm run lint` — 1 error + 12 warnings, all pre-existing in files I never touched
  (`app/components/language-selector.test.tsx`,
  `app/he-thong-giai/components/award-detail-section.test.tsx`,
  `app/he-thong-giai/components/awards-hero.test.tsx`). No new lint issues.
- `npm run test` — **455/455 passing**, 45 test files (Track A's 59 + Track B's existing suite +
  my 27 new tests, no regressions). Two benign jsdom "Not implemented: navigation to another
  Document" console lines from `<Link>` clicks — not failures.

## Deviations from the spec text
1. `onSelectHashtag` left unwired in the container (see mapping table above) — wiring it would
   double-fire `applyFiltersAction` for the same hashtag-chip click, since `KudosBoard` already
   routes that click through `onFilterChange` with the merged filter.
2. Toast component named `kudos-toast.tsx` rather than `copy-link-toast.tsx` (plan allowed
   "or reuse existing toast if present") since it's shared by the copy-link success message and
   the generic/self-like error notices, not copy-link-only.
3. Added a `KudosPage.toast.selfLike` key beyond the plan's literal ask (a generic `error` toast)
   — the self-like block is a named, expected failure path (spec/clarifications call it out
   explicitly), so it gets its own message rather than the generic "something went wrong" text.
4. `EMPTY_BOARD_DATA` is a local const in `page.tsx`, not exported from `lib/kudos/types.ts`
   (kept `types.ts` untouched, out of this task's file scope).

## Unresolved / accepted gaps (per plan)
- No `error.tsx` for `/kudos` — `getBoardData` failure renders the shell with empty data; a
  Server Action failure surfaces only as a toast. This matches the plan's explicit accepted
  scope gap (YAGNI, no error-state design in spec).
- `onOpenCompose`/`onSearchSunner` remain stubs (compose dialog / Sunner search are out of scope
  for this screen per Track A's own docs).

**Status:** DONE
