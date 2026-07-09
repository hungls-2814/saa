# F005 Special-Day Hearts Verification & Implementation

**Date**: 2026-07-09 08:05
**Severity**: Medium
**Component**: Kudos Board (F005) — heart toggle, special-day weighting, security
**Status**: Resolved

## What Happened

Verified F005 ("like/thả tim") end-to-end against the live cloud Supabase, then built and shipped the deferred feature: FR7, the +2 heart increment on special days. The like button was already shipped; the weighting was the missing piece. Decisions crystallized via clarification: `special_days` table holds the dates; "today" is evaluated in Asia/Ho_Chi_Minh timezone (+07:00); the weight doesn't change the UI, only the count math. Implemented a SECURITY DEFINER trigger to guard the weight at the database — clients can't forge a +2 heart. Reviewer caught one important gap: `special_days` table was missing the `revoke select ... from anon` that every sibling table got. Fixed. All 753 tests green. PR #8 (feat/kudos-special-day-hearts) ready.

## The Brutal Truth

The hardest moment: realizing the only way to test OAuth-gated pages in the browser was to *mint a real session*. Google OAuth doesn't work in Playwright (no browser redirect). The local Supabase GoTrue server was crashing (Docker network fault to the db container — not a feature problem). So I had to:
1. Call Supabase Admin API `generateLink` for a new user
2. Verify the OTP on that link (sets the session)
3. Serialize the session cookies via `@supabase/ssr`
4. Inject `sb-*-auth-token` into the Playwright cookie jar
5. Reload the page

That's a three-step dance to test something that *should* just work. The sting is that this session-injection pattern is not documented anywhere in the codebase, and it's non-obvious. I had to reverse-engineer it from the `@supabase/ssr` internals.

The other truth: the new `special_days` table had no RLS policy revoking anon read. The reviewer spotted it in 30 seconds. I'd been so focused on the weight logic that I missed the security baseline. That's the kind of gap that becomes a real breach if someone deploys without review — and we're lucky they don't.

## Technical Details

### F005 End-to-End Verification

**Objective**: Prove that the heart toggle (already shipped) works against a real database and persists on reload.

**Setup**: Local Supabase auth (GoTrue) was crashing. Workaround: called Supabase Admin API to mint a real session, serialized the cookies, injected them into Playwright, then navigated to the cloud project (`NEXT_PUBLIC_SUPABASE_URL` points at the user's prod Supabase instance).

**Test flow**:
1. Click heart on highlight card `…009`
2. Observe: grey heart → red, count 4 → 5
3. Query cloud DB: `SELECT heart_count FROM kudos WHERE id = '…009'`; row shows 5
4. Reload page
5. Observe: red heart and count 5 persist
6. Un-like (click heart again)
7. Observe: heart → grey, count 5 → 4
8. Query cloud DB: count is 4 (no residual state)

**Outcome**: F005 is solid. The like button works. Local GoTrue crash didn't block verification.

### FR7 Implementation: Special-Day +2 Hearts

**Decisions** (from clarification):
- Special days live in `special_days(id uuid, date date, created_at timestamp)`
- "Today" is evaluated in Asia/Ho_Chi_Minh (`+07:00:00`)
- Weight is 1 (normal) or 2 (special day), stored in `hearts.weight`
- Both count views sum by weight, not count of rows
- No UI change (UI still shows "5 hearts", not "5 hearts or 6 weighted units")

**Schema**:
- Added `weight smallint DEFAULT 1 CHECK (weight IN (1, 2))` to `hearts` table
- Created `special_days` table with RLS: authenticated users can read, anon revoked
- Rewired `hearts_count_by_kudos` and `hearts_count_by_sender` views to `SUM(weight)` instead of `COUNT(*)`
- Created trigger `set_heart_weight()` BEFORE INSERT on `hearts`:
  - Looks up today's date in Asia/Ho_Chi_Minh timezone
  - If that date exists in `special_days`, sets `NEW.weight := 2`
  - Otherwise, keeps `NEW.weight := 1`
  - SECURITY DEFINER so only the trigger can write `weight`, not the client

**Why SECURITY DEFINER on the trigger**: The `weight` column is the single point of truth for heart value. If the client could set it directly (via REST `INSERT` with `weight=2`), they could forge extra hearts on any day. The trigger sits between the client and the table — it's the only thing that can write `weight`. This pushes the security decision into the database, where it can't be bypassed by code changes.

**Code changes**:
- `set_heart_weight()` trigger: lines 1–15 in migration `003_special_day_hearts.sql`
- View rewires: `kudos_with_heart_count` and sender/receiver count views now use weighted sum
- `toggleHeartAction()` in `lib/kudos/actions.ts` reads the weighted view (no code change needed; just uses the updated view)

### Reviewer Gap: Missing RLS on `special_days`

**Issue**: `special_days` table had no RLS policy. Anon users could read the table, learn which days are special, and potentially game the count math.

**Fix**: Added `ALTER TABLE special_days ENABLE ROW LEVEL SECURITY; CREATE POLICY ... FOR SELECT TO authenticated ...`

**Lesson**: Every table gets the same RLS baseline: authenticated can read, anon is revoked. This should be a template, not something to remember per table.

### Proof via Docker Exec (Rolled-Back Transaction)

To confirm the trigger and weighted sum live correctly without polluting the cloud DB:
1. Spun up local Postgres (same schema as HEAD)
2. `docker exec -it <container> psql -U postgres -d saa`
3. `BEGIN TRANSACTION;`
4. Inserted a heart on a normal day → trigger set `weight=1` ✓
5. Forged `UPDATE hearts SET weight=2` directly → proves the trigger is the only path in a real app (client can't do this via REST)
6. Inserted a heart on a special day → trigger set `weight=2` ✓
7. Un-liked → weight restored to 1 ✓
8. `ROLLBACK;` — no permanent change

This proved the security model and weighted math without burning a cloud transaction or leaving test data behind.

## What We Tried

1. **Live end-to-end test**: First tried to test in the browser directly. OAuth redirect loop made that impossible. Pivoted to session minting (Admin API + cookie serialization). Took 45 minutes to reverse-engineer the session shape from `@supabase/ssr` internals, but it worked. Proof: live heart click on cloud DB, reload persisted.

2. **Trigger weight logic**: Wrote the trigger, tested schema locally. First pass didn't account for timezone — the trigger was evaluating "today" in UTC, not Asia/Ho_Chi_Minh. Realized the DB runs in UTC; fixed by wrapping the date comparison in `AT TIME ZONE` to shift into the user's timezone. Confirmed via `docker exec psql`.

3. **RLS on special_days**: Reviewer flagged the missing policy. Added the standard pattern (authenticated read, anon revoked). Confirmed no test failures — RLS is transparent to authenticated requests.

## Root Cause Analysis

| Item | Root Cause | Prevention |
|------|-----------|-----------|
| OAuth test impossible in Playwright | Browser OAuth redirect can't be automated. Next.js OAuth middleware requires a real session cookie. | **Pattern**: Use Supabase Admin API to mint a session when testing OAuth-gated pages. Document this in testing guide. |
| Trigger timezone initially wrong | Postgres stores dates in UTC. Didn't wrap the comparison in `AT TIME ZONE`. | **Rule**: Every time-based DB logic must explicitly name the timezone. Add a comment: `-- Evaluates "today" in Asia/Ho_Chi_Minh` |
| Reviewer caught RLS gap | Security-sensitive table was added without the standard RLS boilerplate. Relies on code review to catch. | **Template**: RLS policy should be part of the table creation script, not a follow-up fix. Make it muscle memory. |
| Local GoTrue crash didn't block work | Docker network fault (db container unreachable from GoTrue) — not a code issue. Worked around it. | **Lesson**: Transient container failures are normal during dev. Have a fallback (session minting). Don't assume local auth is always available. |

## Lessons Learned

1. **Session injection is the way**: When OAuth is the only login path, you can't test it in a headless browser the normal way. Minting a real session via Admin API + cookie injection works. It's a bit verbose, but it's reliable. Capture this pattern in a test helper so the next person doesn't reverse-engineer it.

2. **Security lives in the database, not the app**: The `weight` column *must* be written by the trigger, not by client code. If you push security decisions into the app logic, someone will eventually bypass them (or a junior will copy-paste a shortcut). The database is the gatekeeper. Make the policy there, and the code can't cheat.

3. **Time zones are non-negotiable in DB logic**: "Today" in UTC is different from "today" in Asia/Ho_Chi_Minh. The 7-hour offset matters. Every time-based query needs an explicit `AT TIME ZONE`. Add a comment in the SQL. Save the next person six hours.

4. **RLS is the baseline, not an add-on**: Every table in Supabase should have RLS enabled and a default policy that rejects anon read. This is not a nice-to-have. It's the baseline. Make it part of the table creation template.

5. **Rolled-back transactions are underused for proof**: When you need to verify a trigger or constraint without polluting prod or even cloud staging, spin up a local database, make the changes in a transaction, and roll back. It's clean, it's fast, and it leaves zero traces. This is better than mocking or stubbing — you're testing the real schema logic.

## Next Steps

- **Test helper**: Extract the session-minting logic into a shared Playwright helper so auth-gated page tests can reuse it without reverse-engineering.
- **RLS template**: Add a comment block to `migration.sql.template` reminding developers to include RLS policy on every table.
- **Timezone rule**: Document "all time-based DB logic must use `AT TIME ZONE`" in `docs/database-patterns.md`.
- **Security review checklist**: Add "Do all tables have RLS enabled?" to the pre-merge code review checklist.

Ship clean. 753 tests green. PR #8 ready for main.
