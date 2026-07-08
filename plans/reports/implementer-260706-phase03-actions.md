# Implementer Report — Phase 03: Server Actions (F005 Kudos, Track B)

## Task
Implement the three Server Actions the `/kudos` client board invokes: `toggleHeartAction`,
`loadMoreFeedAction`, `applyFiltersAction`. Thin, auth-checked wrappers over Phase-02
`queries.ts`. TDD.

- Status: **completed**

## Files Modified

- `lib/kudos/actions.ts` (new, 136 lines) — the three Server Actions, `'use server'`.
- `lib/kudos/actions.test.ts` (new, 216 lines) — 12 unit tests.

## Exported API

```ts
// toggleHeartAction
export type ToggleHeartError = 'unauthenticated' | 'self_like' | 'unknown';
export type ToggleHeartResult =
  | { ok: true; liked: boolean; heartCount: number }
  | { ok: false; error: ToggleHeartError };
export async function toggleHeartAction(kudosId: string): Promise<ToggleHeartResult>;

// loadMoreFeedAction
export type LoadMoreFeedError = 'unauthenticated' | 'invalid_cursor';
export type LoadMoreFeedResult =
  | { ok: true; items: KudosCard[]; nextCursor: string | null }
  | { ok: false; error: LoadMoreFeedError; nextCursor: null };
export async function loadMoreFeedAction(opts: {
  cursor: string | null;
  filter?: FilterState;
}): Promise<LoadMoreFeedResult>;

// applyFiltersAction
export type ApplyFiltersError = 'unauthenticated';
export type ApplyFiltersResult =
  | { ok: true; highlights: KudosCard[]; feed: KudosCard[]; nextCursor: string | null }
  | { ok: false; error: ApplyFiltersError };
export async function applyFiltersAction(filter: FilterState): Promise<ApplyFiltersResult>;
```

All three share the `{ ok: true; ... } | { ok: false; error }` discriminated shape.

## Implementation notes

- **`toggleHeartAction`**: `getUser()` guard → existence check via `.maybeSingle()` on `hearts`
  → branch delete/insert → recompute `heartCount` via `.select('*', { count: 'exact', head:
  true })` on `hearts` → `revalidatePath('/kudos')` only on success. Insert-error mapping:
  Postgres `42501` (RLS "insert own heart, not on own kudos" violation) → typed `self_like`
  failure, never thrown; `23505` (unique-violation, concurrent double-insert race) → treated as
  an already-liked success per the Phase-03 risk table (the PK is the real guard); any other
  code → typed `unknown` failure. Lookup/delete/count errors also map to `unknown` rather than
  throwing.
- **`loadMoreFeedAction`**: `getUser()` → `userId`. Cursor validity is checked with
  `decodeCursor` *before* calling `getKudosFeed` — a **present but invalid** cursor (tampered/
  malformed) short-circuits to `{ ok: false, error: 'invalid_cursor', nextCursor: null }` and
  never reaches the query layer; a **null/absent** cursor passes through untouched as "page 1"
  (not treated as tampering). `userId`, `cursor`, `filter` are forwarded to `getKudosFeed`
  as-is — no duplicated keyset/SQL logic (DRY, reuses Phase-02). No `revalidatePath` (read
  action).
- **`applyFiltersAction`**: `getUser()` → `userId`; calls `getHighlights` and `getKudosFeed`
  (no cursor → page 1) in parallel with the same `{ userId, filter }`, returns the combined
  `{ highlights, feed, nextCursor }`. No `revalidatePath`.
- Reused `lib/kudos/test-helpers/supabase-query-mock.ts` (`createQueryMock`) unmodified —
  `toggleHeartAction` drives it via a `from` `vi.fn()` with `mockReturnValueOnce` chained per
  Supabase call (lookup → insert/delete → count), since one action makes 2–3 sequential
  `.from('hearts')` calls with different results each.
- `loadMoreFeedAction`/`applyFiltersAction` tests mock `./queries` directly (`getHighlights`,
  `getKudosFeed`) rather than the Supabase client — these actions are pure pass-through/auth
  wrappers per the plan, so asserting the forwarded call args is the right unit boundary; the
  query-layer behavior itself is already covered by Phase-02's own tests.

## Tests Status

- Type check: **pass** (`npm run typecheck`, exit 0, no errors)
- Lint: **pass** — 0 errors/warnings in `lib/kudos/actions.ts` / `actions.test.ts`. The 1 error
  + 12 warnings from `npm run lint` are all pre-existing, in unrelated files
  (`app/components/language-selector.test.tsx`,
  `app/he-thong-giai/components/award-detail-section.test.tsx`,
  `app/he-thong-giai/components/awards-hero.test.tsx`) — untouched by this task.
- Unit tests: **pass** — 12/12 new tests in `lib/kudos/actions.test.ts`.
- Full suite: **pass** — 40 files / 426 tests, no regressions.

## Acceptance Criteria

- [x] SC8: like toggles persist one-per-user; self-like rejected without a 500 — covered by
      "maps a self-like RLS violation to a typed failure, never throwing".
- [x] SC8 (count): heart count recomputed fresh — covered by insert/delete branch tests
      asserting `heartCount` from the count query.
- [x] SC4: load-more forwards cursor/filter/userId; tampered cursor → typed failure,
      `nextCursor:null`, no query dispatched — covered by 4 `loadMoreFeedAction` tests.
- [x] SC5 (filter): apply-filters returns re-filtered highlights + feed reset to page 1 (no
      cursor passed) — covered by `applyFiltersAction` threading test.
- [x] Read actions thread `userId` into `getKudosFeed`/`getHighlights` so `likedByMe` +
      star-tier are correct on scrolled/filtered cards — asserted directly on call args.
- [x] Double-heart race (`23505`) treated as already-liked, not a failure.

## Issues Encountered

None. No deviations from the phase plan.

**Status:** DONE
**Summary:** `lib/kudos/actions.ts` + `lib/kudos/actions.test.ts` implement all three
Server Actions per spec, all reusing Phase-02 modules with no duplicated SQL; typecheck/lint/
full test suite (426 tests) all green.
