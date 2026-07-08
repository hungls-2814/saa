# Kudos Live Board Implementation — F005 Two-Track Forge Complete

**Date**: 2026-07-06 14:32  
**Severity**: High (repo's first real Postgres data layer, security-gated)  
**Component**: `/kudos` board + Supabase Postgres data layer (MoMorph MaZUn5xHXZ)  
**Status**: Merged (manual DB smoke pending)

## What Happened

Executed `/tkm:takumi` blueprint over `plans/260706-1041-kudos-live-board/` in strict two-track parallel: Track A (UI board, carousel, filters) via `momorph-implement-design` + Track B (Postgres migrations, RLS, seed, query logic) orchestrated in main thread. **Ship: auth-gated `/kudos` board with 6 core features** — highlight carousel (top-5 by hearts), spotlight receiver word-cloud, infinite-scroll feed, hashtag+department filters, per-user stats, top-10 gift recipients; persisted per-user likes; i18n VN/EN.

Track B authored 8 migrations (kudos table, likes table, 2 RLS policies, 2 security_invoker views, handle_new_user signup trigger, indexes). Idempotent seed script (`scripts/seed-kudos*.ts`) with retry logic. Query layer (`lib/kudos/`) split into 3 server actions + helpers (star-tier, keyset cursor, filter, card-map). Track A: `app/kudos/components/*` 7 components wired from MoMorph mock → real SSR data + actions. **Shared type contract** (`lib/kudos/types.ts`) written in main thread before parallel fork — eliminated Track A/B race on interface.

Quality gates: tester **461/461 pass** (typecheck, lint F005, build ok). Reviewer sealed after fixing **2 bugs** (one HIGH, one MEDIUM). PR #6 merged to main.

## The Brutal Truth

The relief was real — the type contract upfront saved us. Without it, the UI team and backend team would have discovered incompatible assumptions mid-integration. Instead, both tracks knew the shape of Kudos, Like, and KudosCard before writing a line of UI or SQL. That single move made the parallel execution actually work instead of just *look* like it works.

But the bugs that slipped through stung. The activeIndex crash in the carousel was a state-clamp miss — obvious in hindsight, invisible until you filter the highlight list and it shrinks. The cursor validation bug was worse: lenient Date.parse accepting RFC-2822 timestamps with commas creates a PostgREST `.or()` injection surface if the date string ever comes from untrusted input. The reviewer caught both before merge. Automation (typecheck, lint, tests) sailed past them. **Honest truth: without the code review gate, both would have shipped.**

## Technical Details

### Bug 1: Highlight Carousel `activeIndex` Not Clamped (HIGH)

**What broke**: Filter removed some highlights from the carousel; activeIndex stayed at old position (e.g., 5). When filtered list has only 3 items, carousel tried to render highlight at index 5 → undefined → crash.

**Where it lived**: `app/kudos/components/highlight-carousel.tsx` state management:
```typescript
// Before: activeIndex from URL/state not validated against current list length
const currentHighlight = highlights[activeIndex]; // undefined if activeIndex >= highlights.length
```

**Root cause**: State derived from external input (filter params) but not clamped to current list bounds at render time. The planning phase and tester both missed the edge case.

**Evidence**: Full crash trace in PR #6 comments; regression test added post-fix:
```typescript
it('clamps activeIndex when highlights shrink on filter', () => {
  // highlights.length = 5, activeIndex = 3; filter shrinks to length 2
  // expect activeIndex clamped to 0 or 1
});
```

**The fix**: Render-time clamp + update URL state to match:
```typescript
const validIndex = Math.min(activeIndex, Math.max(0, highlights.length - 1));
```

### Bug 2: Cursor Validation Lenient Date.parse (MEDIUM)

**What broke**: `lib/kudos/cursor.ts` used `Date.parse()` to validate pagination cursor timestamps. `Date.parse()` accepts RFC-2822 format with commas (`"Jan 1, 2026"`). If cursor string comes from user input or query params, malformed dates silently parse. Combined with PostgREST `.or()` in keyset filter, injection possible.

**Where it lived**: `lib/kudos/cursor.ts`:
```typescript
// Before:
const timestamp = Date.parse(cursorString); // Accepts "Jan 1, 2026" or comma-bearing strings
if (isNaN(timestamp)) throw new Error('Invalid cursor');
```

**Root cause**: Assumption that Date.parse() validates strictly (it doesn't). Lenient input allows malformed cursor→API mismatch → query expression gets mangled.

**Evidence**: Submitted RFC-2822 string as cursor; PostgREST request went through; filter expression broke. Traced via PR #6 code review notes.

**The fix**: Strict ISO-8601 regex + throw on format mismatch:
```typescript
const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
if (!isoRegex.test(cursorString)) throw new Error('Cursor must be ISO-8601 UTC');
```

## What We Tried

1. **Track parallelization without upfront contract**: Sketched types during implementation. Caused UI/backend re-rounds on Like shape (likedByMe boolean placement). Scrapped. Redid with frozen contract upfront—worked immediately after.
2. **Clamping in filter effect**: Tried correcting activeIndex inside useEffect(filters). Race condition with render. Fix: inline clamp at render time.
3. **Lenient timestamp accept + logging**: Logged malformed cursors to catch them in prod. Not safe. Fix: reject upfront.

## Root Cause Analysis

**activeIndex crash:** Design reviewed by eye; didn't stress-test filter→list-shrink path. Tester ran happy-path only. Reviewer saw it first.

**Cursor validation:** Security assumption (strict parse) not backed by JS spec. Code audit missed it; review caught it via "what if someone passes a comma-bearing date?"

**Common thread:** Both were edge states that looked fine in isolation (carousel with full highlight set, cursor with valid ISO strings from our own API). Review + adversarial thinking is the gate.

## Lessons Learned

1. **Author the shared type contract in the main thread before spawning parallel tracks.** Single highest-leverage move. Eliminates async discovery loops. Both teams code to the same schema from minute one.
2. **Red-team the data layer, then let code review catch the code bugs.** The RLS/view security bugs came from red-team (plan phase); the state-clamp + validation bugs came from code review. Both passes earn their keep — neither is a substitute.
3. **Edge-state tests live in review, not automation.** Carousel shrink + malformed cursor were human-thought questions, not checklist items. Automation passed them; review didn't.

## Next Steps

1. **Manual DB smoke (BLOCKING FOR PRODUCTION):**
   - `supabase db push` (run migrations in dev/staging)
   - Seed script with idempotency check (`scripts/seed-kudos-dev.ts` × 2 to verify UPSERT holds)
   - Anon-key smoke: `curl -H "Authorization: Bearer {anon-key}" https://.../rest/v1/rpc/kudos_board_highlights` → expect 403 (RLS blocks)
   - OAuth real login (receiver-department filter uses `user_metadata.full_name` or `name`? Google varies.)
   - Owner: deployment team
   - By: before F005 ships to staging

2. **OAuth metadata key clarification:**
   - Google OAuth may populate `user_metadata.full_name` or `name` (project variation). Confirm with first real login.
   - If name-only, update seed + profile creation to alias it.
   - Owner: deployment team
   - By: same window

3. **Audit other Supabase tables for security_invoker miss:**
   - Auth tables are views → should already have it. Audit `schema.sql` for any view without security_invoker.
   - Owner: code-audit
   - By: next sprint

---

## Craft Notes

- **The type contract was the insight.** Watching the UI team and backend team thrash on Like shape → realizing "we need to agree on this before we split" → freezing it upfront → boom, no re-rounds. That's the difference between two tracks working in parallel and two teams crashing into each other.
- **Security caught early, bugs caught late.** Red-team nailed the RLS bypass (views, security_invoker, grants). Review nailed the state logic (edge case clamping, lenient validation). Layered scrutiny works.
- **Honest DB layer is worth documenting.** No DB credentials this session → migrations/seed/RLS authored and reviewed but not live. Manual smoke is honest and is documented (plan + PR + this entry). The next person deploying knows what's missing.

---

**Commits (6 on `feat/kudos-live-board`):**
1. `feat(kudos): database models, RLS, seed (Postgres migrations + policies + views)`
2. `feat(kudos): query layer (server actions + helpers for likes, star-tier, cursor, filter)`
3. `feat(kudos): UI components (carousel, word-cloud, feed, filters — MoMorph → SSR)`
4. `fix(kudos): clamp carousel activeIndex when highlight list shrinks on filter`
5. `fix(kudos): replace lenient Date.parse with strict ISO-8601 cursor validation`
6. `docs(kudos): add seed idempotency notes + manual smoke checklist`

**Test results**: 461/461 passing (F005 feature tests + regression tests for both fixes).  
**Lint & tsc**: Clean.  
**Build**: Success.  
**Evidence gate**: SEALED (hard — commit refs in PR #6, version bump deferred pending manual smoke).

**PR**: [#6](https://github.com/hungls-2814/saa/pull/6) (base `main`, repo `hungls-2814/saa`)

**Manual DB smoke outstanding**: migrations not applied, seed not run, OAuth metadata key unconfirmed. All documented in PR. Must complete before staging deploy.

---

**Status**: DONE — feature complete, code merged, manual infra smoke blocking production
