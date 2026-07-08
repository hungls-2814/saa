# F005 Sun* Kudos Live Board — Master's Inspection

Scope: all untracked F005 files (`app/kudos/`, `lib/kudos/`, `supabase/`, `scripts/`) vs `main`.
Verified: `npx tsc --noEmit` clean, `npx vitest run` → 45 files / 459 tests passing.

## Critical Issues
None found.

## High Priority

### H1 — HighlightCarousel crashes when the highlight set shrinks under a filter (SC5 regression)
`app/kudos/components/highlight-carousel.tsx:31-42`

`activeIndex` is local `useState(0)` and is never reset or clamped when the `highlights` prop
changes. FR4/SC5 requires filtering to "re-filter both Highlight + All-Kudos" — after
`applyFiltersAction` resolves, `kudos-board-container.tsx` replaces `data.highlights` with a
(possibly shorter) array while the carousel keeps whatever `activeIndex` the user had scrolled
to. If the user is on, say, slide 5/5 and then applies a filter that narrows highlights to 2
items, `active = highlights[4]` is `undefined`, which is passed straight into `<KudosCard
kudos={active} .../>`; the card immediately dereferences `kudos.hashtags` and throws
`TypeError: Cannot read properties of undefined (reading 'hashtags')`.

I reproduced this directly (test harness, not shipped):
```
walk HighlightCarousel to index 4/5, then rerender with a 2-item highlights array
→ TypeError: Cannot read properties of undefined (reading 'hashtags')
```
There is no error boundary anywhere in this tree (no `error.tsx` is an accepted scope gap, but
that gap was scoped around server data-fetch failures in `page.tsx`, not client-render throws
inside `KudosBoardContainer`) — this throw unmounts the whole client board.

**Fix:** clamp/reset in `HighlightCarousel`, e.g.
```tsx
const safeIndex = Math.min(activeIndex, highlights.length - 1);
```
or reset `activeIndex` via `useEffect` keyed on `highlights` identity/length. Also update
`isLast`/`prev`/`next` to use the clamped index. Add a regression test: render with 5 items,
click to the last slide, rerender with 2 items, assert no throw and a valid card renders.

## Medium Priority

### M1 — Cursor timestamp validation accepts comma/paren-bearing strings that reach a PostgREST filter template unescaped
`lib/kudos/cursor.ts:9-11`, consumed at `lib/kudos/queries.ts:79-88`

`isValidIsoTimestamp` accepts anything `Date.parse` accepts, which is far looser than ISO-8601 —
V8's `Date.parse` also parses RFC 2822-style strings such as `"Sat, 03 Feb 2001 04:05:06 GMT"`,
which contains a literal comma. `decodeCursor`'s own doc comment says the decoded value "is later
template-interpolated into a PostgREST `.or()` keyset predicate… a malformed or tampered value
here must never make it downstream" — but a comma (the top-level OR-clause separator in
PostgREST's filter grammar) or a paren can pass this check and land unescaped in:
```ts
query.or(`created_at.lt.${decoded.createdAt},and(created_at.eq.${decoded.createdAt},id.lt.${decoded.id})`)
```
This breaks the intended single-condition shape and can inject extra clauses into the filter
DSL. Blast radius is bounded today — `authenticated read kudos`/`hearts` RLS policies use
`using (true)`, so there's no cross-tenant row to leak via this path — but it's a real gap
against the "cursor must never inject" contract the code itself states, and a future RLS
tightening (e.g. per-department read policies) would turn this into a real authorization bypass.
Also a robustness issue today: a crafted cursor can produce a PostgREST 400/500, surfaced to the
user as the generic error toast.

**Fix:** use a strict ISO-8601 regex instead of `Date.parse`, e.g.
`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/`, or at minimum reject any value containing
`,`, `(`, `)`. Add a cursor.test.ts case with an RFC-2822-with-comma `createdAt` to lock this in.

## Low Priority

- `lib/kudos/queries-lookups.ts:25-34` `getSpotlight()` fetches every `kudos` row with no limit
  to build the word-cloud. Fine at the documented event scale; flag only if kudos volume is
  expected to grow past a few thousand rows per event.
- `app/kudos/components/kudos-board.tsx:96` passes `onLoadMore={() => loadMore(...)}` as a fresh
  arrow function every render, so the `IntersectionObserver` effect in `all-kudos-feed.tsx:35-45`
  disconnects/reconnects on every parent re-render. Harmless today (guarded by the `inFlight` ref
  and `cursor === null` check in `use-kudos-feed.ts`), but worth a `useCallback` if it ever shows
  up in profiling.
- `lib/kudos/actions.test.ts` (274 lines) and `lib/kudos/queries.test.ts` (338 lines) exceed the
  NFR3 200-line budget; all production files are under it. Likely NFR3 was intended for
  production code only — flagging for awareness, not a fix.

## Verified Correct (focus areas from the brief)

1. **RLS/SQL** (`supabase/migrations/*.sql`): both views declare `security_invoker=true` +
   `revoke select … from anon` (schema-level defense-in-depth against direct
   `GET /rest/v1/<view>`); self-like block is a syntactically correct `WITH CHECK NOT EXISTS`
   referencing the incoming row's bare `kudos_id` column; `handle_new_user()` is
   `SECURITY DEFINER SET search_path = ''` with fully-qualified `public.profiles`; kudos insert
   policy correctly pins `sender_id = (select auth.uid())`; `kudos_no_self_kudos` CHECK present;
   RLS is enabled on all 8 tables with no policy gaps that would over-permit or silently
   zero-row a legitimate read.
2. **Client/server boundary**: `lib/kudos/queries.ts` (and its `queries-internal.ts` /
   `queries-lookups.ts` siblings) is imported only from `app/kudos/page.tsx` (a server
   component) — grepped the whole `app/kudos` tree, no client component imports it. The single
   `"use client"` boundary is `kudos-board-container.tsx`, which only calls `lib/kudos/actions.ts`
   (`"use server"`). `SUPABASE_SERVICE_ROLE_KEY` only appears in `scripts/seed-kudos*.ts` and
   `.env.local.example` (correctly un-prefixed, with an explicit "never NEXT_PUBLIC_" comment).
3. **Wiring correctness**: optimistic like revert-on-failure and self-like toast are both handled
   in `kudos-board-container.tsx:88-113`; `use-kudos-feed.ts` guards in-flight + `cursor === null`
   stop correctly; the `onSelectHashtag` de-dup is genuinely correct — `KudosBoard.handleSelectHashtag`
   folds a chip click into `onFilterChange`, and the container intentionally leaves the separate
   `onSelectHashtag` prop unwired (verified: not passed from the container at all), so a chip
   click fires `applyFiltersAction` exactly once, not twice. `page.tsx`'s auth guard mirrors
   `he-thong-giai`'s pattern, and the `getBoardData` try/catch renders a coherent
   `EMPTY_BOARD_DATA` shell on failure.
4. **Cursor**: UUID validation is a correct strict hex regex; only the timestamp half has the
   gap noted in M1.
5. **Plan/SC adherence**: spot-checked SC1 (auth gate), SC2 (top-5/heart_count order, `n/min(5,total)`
   paginator), SC4 (keyset predicate — compound `created_at`/`id` tiebreak, correct `!inner` FK
   hint needed for the department filter to actually restrict rows instead of silently returning
   everything), SC5, SC6, SC7 (`.limit(10)` + empty message), SC8, SC9, SC10 (star-tier thresholds
   0/9/10/19/20/49/50/1000 all unit-tested and correct), SC11 (`KudosPage` namespace: 31/31 keys
   present in both `en.json` and `vi.json`, no drift; no hardcoded Vietnamese strings found in any
   `app/kudos/**/*.tsx`). All production files are under the 200-line NFR3 budget, kebab-case.
6. **Seed idempotency**: `resolveOrCreateAuthUser` (`scripts/seed-kudos-auth.ts:27-43`) attempts
   `admin.createUser` and falls back to `findAuthUserByEmail` only on an "already
   registered/exists" error — safe to re-run. `upsertSunnerProfile` UPDATEs the
   trigger-created row (never inserts) and throws loudly if the expected row is missing rather
   than silently no-op'ing. All domain upserts in `seed-kudos-domain.ts` key on stable/fixed
   UUIDs or natural keys (`onConflict`), so a second run produces zero duplicates.

## Verdict

**REWORK required before ship** — one HIGH (H1, a genuinely reachable client-crash on normal
filter usage, reproduced) must be fixed; M1 should be fixed in the same pass since it's a small,
well-scoped change to the same untrusted-input boundary the brief specifically asked me to
verify. Everything else (RLS, client/server boundary, seed idempotency, i18n parity, SC1-SC12
provable-without-DB) is solid and ready.

**Status:** DONE_WITH_CONCERNS
**Summary:** RLS, auth boundary, server/client action split, and seed idempotency are all
correct and secure; one reproduced HIGH-severity client crash (HighlightCarousel stale index
after a filter shrinks the highlight set) and one MEDIUM cursor-validation gap (lenient
`Date.parse` lets comma-bearing strings reach the PostgREST `.or()` template) need fixing before
delivery.
