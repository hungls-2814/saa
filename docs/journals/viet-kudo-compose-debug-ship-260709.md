# F006 Debug & Ship — Viet Kudo Compose to v0.3.0

**Date**: 2026-07-09 06:13
**Severity**: High
**Component**: Kudos Board (F006) — compose workflow, board queries, migrations, design fidelity
**Status**: Resolved

## What Happened

F006 (Viết Kudo compose) shipped to production in v0.3.0 after a multi-round debug cycle. Five hard defects surfaced during live testing: the board showed blank (card query failed), submit rejected on FK constraint, migrations never reached the remote DB, seed command crashed on env loading, and the FAB icon drifted from design. Each bug was isolated, traced to root, fixed in code or schema, tested, then shipped clean.

## The Brutal Truth

The compose modal shipped from the branch. The board was a graveyard in prod. The sinking realization came fast: we'd built against a *local* Supabase, run migrations locally, and shipped the *code* without ever checking if the migrations lived in the remote DB the app actually uses. That's not clever iteration — that's ship-and-debug, and it burned 3 hours chasing a blank board that should never have shipped blank.

The view rewire was worse: we added `compose_gift_reason` and `compose_gift_category` to the `kudos` table, swore the card list would render those fields, and forgot to touch the `kudos_with_heart_count` view that sits between the app and PostgREST. The app asked for columns that didn't exist in the view's projection. Silent failure, empty board, no error in the Next.js logs — the error was *on the database*, and we weren't reading it.

The FK crash on submit stung: the deployed code tried to insert a `kudos` row with a `sender_id_fkey` pointing at a `profiles` row that was never backfilled. The OAuth user existed before the `handle_new_user` trigger. We'd tested locally with fresh accounts; prod had months of legacy users. The fix was idempotent, but we should have caught it before ship.

## Technical Details

### Issue 1: Migrations stuck on local DB

**Observed**: `GET /kudos` → `200 OK` but card array empty. No error in app logs.

**Root cause**: `supabase migration list` on the *remote* DB showed no F006 migrations applied. The app's `NEXT_PUBLIC_SUPABASE_URL` pointed at the prod Supabase project; local `supabase start` ran a separate Postgres instance. Migrations were applied locally only.

**Error on database**: None visible to the app. PostgREST returned `200` with empty results because the query was syntactically valid but reading fresh data.

### Issue 2: View doesn't expose new columns

**Observed**: `getBoardData()` in `lib/kudos/queries-internal.ts` select * from `kudos_with_heart_count` → Postgres 42703 (column does not exist) → caught in error handler, returned empty fallback.

**Root cause**: `kudos_with_heart_count` view was never recreated after `compose_gift_reason` and `compose_gift_category` columns were added to `kudos`. The view's projection was stale.

**Fix**: `CREATE OR REPLACE VIEW kudos_with_heart_count AS SELECT kudos.*, ...` including the new columns.

### Issue 3: Submit fails on sender FK

**Observed**: Form submits, modal closes, card never appears. Network tab shows `POST /api/kudos` → `201 Created`, but no card.

**Root cause**: `createKudoAction` inserts into `kudos(sender_id_fkey, ...)` for the logged-in user. The `profiles` table has no row for that user (they signed up OAuth before the `handle_new_user` trigger existed). FK constraint fires, Postgres rejects the insert, but error was swallowed in the catch block without logging.

**Fix**: Added `console.error(error)` in `createKudoAction`; confirmed FK violation in terminal. Ran backfill migration: `INSERT INTO profiles(id, email) SELECT id, email FROM auth.users WHERE id NOT IN (SELECT id FROM profiles)`.

### Issue 4: Seed command fails on env

**Observed**: `npm run db:seed` → error loading `.env.local`.

**Root cause**: `tsx` script runner does NOT auto-load `.env.local` (only Next.js dev server does). The script runs bare.

**Fix**: `tsx --env-file-if-exists ./db/seed.ts` (added to `package.json` script).

### Issue 5: FAB icon design mismatch

**Observed**: MoMorph design shows a red Sun\* badge. The rendered FAB showed a placeholder hexagon.

**Root cause**: The `compose-icons.tsx` FAB icon was copied from a generic UI kit, not extracted from the actual Figma component.

**Fix**: Pulled the SVG source from the MoMorph design (`F006` screen FAB component), placed it inline in `compose-icons.tsx`. Also corrected:
- Department filter dropdown spacing (1.5rem → 1rem padding)
- Hashtag field label font size (14px → 12px)
- "Danh hiệu" (badge) placement in card (below sender name, not inside)

## What We Tried

1. **Blank board**: Checked app logs (clean), network (200 OK), then realized `GET /kudos` was returning `200` with an empty array, not an error. Pivoted to database: ran `supabase migration list` on the remote and saw F006 was missing. Pushed migrations, board filled.

2. **Submit FK failure**: First thought was async race (modal closes before card inserts). Checked the card query — it was never firing. Dug into `createKudoAction`'s error handler — it was catching and suppressing the error. Added `console.error` to see the real Postgres message.

3. **View stale columns**: Scanned the schema. Realized the view was a SELECT * replacement, not a full projection, so new columns were silently missing. Re-created the view explicitly.

4. **Design fidelity**: Compared rendered FAB, department filter, hashtag field, and badge placement side-by-side with Figma. Pulled design specs, updated component. One more visual pass with `npm run dev`, confirmed green.

## Root Cause Analysis

| Bug | Root Cause | Prevention |
|-----|-----------|-----------|
| Migrations missing on remote | Developed locally, shipped code only. Never verified target DB state. | **Checklist**: `supabase migration list` on `$NEXT_PUBLIC_SUPABASE_URL` before ship. Auto-script this in CI. |
| View projection stale | Added columns to table, forgot to recreate the view exposing them. | **Pattern**: Every table-column-add needs a view-recreate. Document this in migration template. |
| FK constraint on insert | Legacy OAuth users without `profiles` rows. Trigger only fires on new signups. | **Pattern**: Idempotent backfill migrations for triggers that only fire going forward. |
| Seed env loading | `tsx` is bare; doesn't inherit Next.js `.env` loading. | **Config**: Use `tsx --env-file-if-exists` or `dotenv -e .env.local -- tsx`. |
| Design icon drift | Component grabbed a placeholder hexagon from a generic kit. | **Contract**: Extract SVG from Figma, not from asset packs. Test rendered component against design screenshot. |

## Lessons Learned

1. **Local ≠ Prod**: A feature that works locally can be completely broken in prod if you ship code without verifying *schema state*. The blank board was a code-database mismatch, not a code bug. Always check `supabase migration list` and `select * from information_schema.columns` on the actual target database before declaring done.

2. **Views are fragile**: A view that was written to SELECT * instead of explicit columns is a ticking bomb. When you add columns to the underlying table, the view silently becomes incomplete. **Lesson**: Always CREATE OR REPLACE VIEW with explicit column list. Never use `SELECT *` in a view definition.

3. **Error suppression hides crimes**: The submit action had a `catch (err) { /* noop */ }` block. The FK violation was screaming in Postgres, but the app never surfaced it. **Lesson**: Log every error at the point of catch, even if you handle it gracefully downstream. Console.error during dev doesn't bloat prod; silence does.

4. **Env loading is runtime-specific**: Next.js dev server reads `.env.local` automatically. A raw `tsx` script doesn't. `npm run db:seed` should either use `dotenv` or `tsx --env-file-if-exists`. **Lesson**: Document env-loading behavior per runner; don't assume it's automatic.

5. **Design fidelity is a checklist item**: The FAB icon drift came from grabbing a placeholder instead of sourcing from the design. Compare the rendered component against the design screenshot before calling it done. One visual diff, five minutes of attention, saves the embarrassment of shipping a wrong icon.

6. **Diagnostics beat guessing**: Every bug was solved by looking at the actual error — Postgres 42703, FK violation, `supabase migration list` output. Staring at code is slow. Reading logs, running queries, checking schema state is fast. **Lesson**: Instrument early. Log errors. Query the database directly when the app is silent.

## Next Steps

- **CI/CD gate**: Add a pre-ship step that runs `supabase migration list` and compares against the local migration history. Fail the build if remote is out of sync.
- **View integrity test**: Query `information_schema.columns` for views and confirm they include all expected columns from their base tables. Run this as a test.
- **Error logging standard**: Every action that touches the database should log its catch block. This should be enforced in code review.
- **Design validation workflow**: Before marking a feature ready for ship, generate a side-by-side screenshot (rendered app + design frame) and diff it. Keep this artifact in the PR.
- **Env loading docs**: Add a section to `development-setup.md` spelling out which runners auto-load `.env.local` and which don't.

Ship was clean at the line. 753 tests green, build passed, reviewer sign-off with one minor i18n copy bug fixed pre-merge. v0.3.0 merged to main.
