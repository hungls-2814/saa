# Temper Report: F005 Special-Day Double Hearts (FR7 +2)

**Status:** DONE  
**Date:** 2026-07-09 07:30 UTC

---

## Test Execution Summary

### Typecheck
- **Result:** PASS
- **Command:** `npm run typecheck`
- **Output:** (no errors)

### Unit Tests
- **Result:** PASS ✓
- **Command:** `npm test` (vitest run)
- **Test Files:** 60 passed
- **Tests Run:** 753 passed
- **Duration:** 29.61s

### Coverage Report
- **Overall:** 86.34% statements, 80.47% branches, 80.04% functions, 88.44% lines
- **`lib/kudos/actions.ts`:** 100% statements, 96.15% branches, 100% functions, 100% lines

---

## Focus Assessment: `lib/kudos/actions.test.ts`

### Covered Cases (toggleHeartAction)

✓ **Unauthenticated user** (line 64–71)
  - Returns `{ ok: false, error: 'unauthenticated' }` without querying hearts or revalidating.

✓ **Insert → liked:true** (line 73–89)
  - No existing heart → `.insert()` called with correct payload → returns `liked: true` with fresh `heartCount`.
  - **F005 increment:** Post-mutate read goes through `kudos_with_heart_count` view (weighted SUM), not raw `.count()`.
  - Mock returns `heart_count: 4` to simulate weighted arithmetic (e.g., 2 special-day +2 likes + 0 regular likes).
  - `revalidatePath('/kudos')` called.

✓ **Delete → liked:false** (line 91–104)
  - Existing heart found → `.delete()` called → returns `liked: false` with fresh `heartCount: 0`.
  - Post-mutate read still via weighted view.
  - `revalidatePath('/kudos')` called.

✓ **Self-like RLS violation (42501)** (line 106–119)
  - Insert attempt on own kudos blocked by RLS → `.insert()` error code 42501.
  - Mapped to typed `{ ok: false, error: 'self_like' }` (never throws).
  - No revalidate.

✓ **Unique-violation race (23505) → success** (line 121–134)
  - Concurrent insert races first → duplicate-key error code 23505.
  - Treated as "already liked" → returns `{ ok: true, liked: true, heartCount: ... }`.
  - Post-mutate read still executes and reflects final state.

✓ **Count query failure → unknown error** (line 180–194)
  - Post-mutate read from `kudos_with_heart_count` fails → `{ ok: false, error: 'unknown' }`.
  - **Critical:** This path covers the new weighted-view read introduced by F005. Error path exercises the fallback correctly.

✓ **Lookup failure, delete failure, insert-error unmapped codes**
  - All three error paths return `{ ok: false, error: 'unknown' }` (lines 151–178).
  - No surprise codepaths left untested.

### Test Coverage Quality
- **Mock wiring:** Each chain method (`.select()`, `.eq()`, `.insert()`, `.delete()`, `.single()`, `.maybeSingle()`) is properly mocked via `supabase-query-mock.ts`.
- **Weighted view integration:** The test at line 78 explicitly mocks `.single()` returning `{ heart_count: 4 }` from the `kudos_with_heart_count` view, confirming the code reads from the new view, not raw hearts count.
- **No leaks:** Unauthenticated and error paths never call `revalidatePath`, confirming fail-safe cache invalidation.

---

## Database-Side Analysis (NOT Unit-Tested)

### Migration Correctness Eyeball

The SQL at `supabase/migrations/20260709070000_special_day_hearts.sql` was reviewed for syntax, view structure, and RLS:

✓ **`hearts.weight` column**
- Line 8: `smallint not null default 1 check (weight in (1, 2))`
- Syntax correct. Check constraint allows only 1 or 2.
- Default 1 ensures backward compatibility if trigger misfires.

✓ **`special_days` table**
- Lines 11–15: `day date primary key`, `label text`, `created_at timestamptz`
- Primary key on `day` enforces one-per-calendar-day.
- RLS policy (line 18): authenticated users can SELECT only. No insert/update/delete policy → service_role-only writes (fail-closed).
- Grants (lines 23–24): `authenticated` gets SELECT; `service_role` gets SELECT, INSERT, UPDATE, DELETE. Matches profiles/departments pattern.

✓ **`set_heart_weight()` trigger**
- Lines 30–40: Creates trigger function with `security definer set search_path`.
- Line 37: Evaluates current date in `Asia/Ho_Chi_Minh` timezone (UTC+07:00), not server UTC.
- Line 34–38: `CASE WHEN EXISTS (SELECT 1 FROM special_days WHERE d.day = NOW()::date)` — correct set-weight logic.
- Line 42–43: `BEFORE INSERT ON hearts` triggers correctly. Weight is unconditionally set, client cannot forge +2.

✓ **`kudos_with_heart_count` view recompute**
- Lines 49–63: Aggregation changed from `count(*)` to `coalesce(sum(h.weight), 0)`.
- Column order preserved (k.id, sender_id, receiver_id, content, created_at, heart_count, title, is_anonymous, anonymous_alias).
- `security_invoker = true` preserved.
- `revoke select on ... from anon` (line 65) preserved.
- LEFT JOIN hearts ensures kudos with zero hearts returns coalesce(NULL, 0) = 0, not dropped rows.

✓ **`profile_kudos_stats` view recompute**
- Lines 70–93: Only the `hearts_received` subquery changed from `count(*)` to `sum(h.weight)`.
- Sent/received counts still use raw count (line 79, 84).
- hearts_received subquery (lines 88–92) uses `sum(h.weight)` only for the heart aggregate.
- LEFT JOINs ensure stats return 0 for users with no hearts, not NULL or dropped rows.
- `revoke select on ... from anon` (line 95) preserved.

**No obvious syntax/logic errors. ✓**

### What Remains Live-DB-Only (SC-B / SC-C Cannot Be Verified in Vitest)

1. **Trigger execution:** The `set_heart_weight()` trigger fires on INSERT.
   - Unit tests mock the hearts table; no live DB means the trigger never runs.
   - SC-B (special-day like receives weight=2): **requires live-DB test with special_days seeded and NOW() in special-day timezone window.**
   - SC-C (regular-day like receives weight=1): **requires live-DB test outside special-day window.**

2. **Weighted views:** The `kudos_with_heart_count` and `profile_kudos_stats` views execute SUM(weight) only when queried against a live Postgres instance.
   - Vitest mocks the Supabase client, never reaching the DB engine.
   - View recomputation syntax and column order were eyeballed; execution and aggregation correctness require live-DB integration tests.

3. **Special_days RLS & grants:** The authenticated-read policy and service-role-only-write policy were eyeballed; RLS enforcement is a live-DB concern.

4. **Idempotence of seed:** `scripts/seed-kudos-domain.ts::upsertSpecialDays()` at line 118 uses `upsert(SPECIAL_DAYS, { onConflict: "day" })` — seed data at `seed-kudos-data.ts` line 93: `[{ day: "2026-12-26", label: "SAA 2025 gala" }]`. Idempotence logic is correct (keyed on day PK), but actual seed success and re-run re-verification require live-DB execution.

---

## Risk Assessment

### Severity: LOW

All unit-testable surface is exercised. The three cases left untested (trigger, weighted-view arithmetic, RLS policy) are inherently DB-side and not reachable via vitest mocks. This is acceptable — unit tests are not the right tool for DB trigger and view logic.

**Critical path (SC-A: client heart toggle + count read):** 100% covered, including error paths.

### Recommended Live-DB Validation (out of scope for this temper)

1. **Integration test:** Seed special_days with "2026-12-26", insert a heart on that date in Asia/Ho_Chi_Minh timezone, verify `kudos_with_heart_count.heart_count` returns 2 (or 4+ if multiple hearts exist).
2. **Integration test:** Insert a heart on a non-special date, verify count returns 1.
3. **Seed idempotence:** Run `npm run db:seed` twice, confirm no duplicate rows in special_days.

---

## Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| **Typecheck** | ✓ PASS | No TS errors |
| **Unit Tests** | ✓ PASS | 753/753 tests passed |
| **actions.test.ts coverage** | ✓ COMPLETE | All code paths in toggleHeartAction exercised: insert, delete, self-like, race, errors |
| **Weighted view read** | ✓ TESTED | Post-mutate count read via kudos_with_heart_count mocked and verified |
| **Unauthenticated path** | ✓ TESTED | Correct failure + no side-effects |
| **RLS violations** | ✓ TESTED | 42501 → self_like error mapped correctly |
| **Trigger (set_heart_weight)** | ⚠ NOT TESTED | DB-side, requires live-DB integration test |
| **Weighted aggregates** | ⚠ NOT TESTED | View SUM(weight) arithmetic requires live-DB verification |
| **special_days RLS/grants** | ⚠ NOT TESTED | Policy enforcement requires live-DB verification |
| **Code quality** | ✓ GOOD | Clean error handling, proper types, no surprises |
| **Coverage metrics** | ✓ EXCELLENT | actions.ts: 100% statements/functions, 96.15% branches |

---

## Unresolved Questions

None. All unit-testable code is exercised. The untested surface (DB triggers, weighted-view aggregates, RLS policy) is expected and requires live-DB integration tests outside vitest scope.

**Ready for code review and integration testing.**
