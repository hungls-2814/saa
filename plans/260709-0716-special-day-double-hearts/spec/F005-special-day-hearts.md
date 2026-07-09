---
feature: F005 (increment)
name: Special-day double hearts
lang: en
status: draft
supersedes: "F005 FR7 note: (Special-day +2 DEFERRED.)"
---

# F005 increment — Special-day double hearts (FR7 +2)

## Purpose
Lift the F005 deferral: on a **special day**, a like is worth **+2** hearts instead of +1.
The heart weight is decided by the **database** at like-time and frozen on the row, so clients
can never forge a +2 and a like keeps the value it earned even after the day passes.

## Decisions (this increment)
- **Special-day source** — a DB table `special_days(day date)`. Data-driven; a day is "special"
  iff a row exists for that calendar date. (Chosen over ENV list / event-date-only.)
- **Timezone** — the calendar day is evaluated in **Asia/Ho_Chi_Minh (+07:00)**, matching the
  SAA audience, not server UTC. A like at 23:30 VN on a special day still counts as +2.
- **Weight authority** — a `BEFORE INSERT` trigger on `hearts` sets `weight` (1 or 2). The client
  insert never carries a trusted weight; the trigger overwrites it unconditionally.
- **Display** — NONE. No badge/toast. The heart count simply reflects the weighted sum
  (a special-day like moves the count by 2). YAGNI.
- **Retroactivity** — weight is frozen at insert time. Un-like then re-like on a normal day → +1.

## Requirements
- **FR7′** Like toggle is unchanged (one-per-user, self-like blocked, persisted) EXCEPT the count
  arithmetic: `heart_count` and `hearts_received` = **SUM(weight)**, not COUNT(*).
- **FR7′-a** `hearts.weight smallint not null default 1 check (weight in (1,2))`.
- **FR7′-b** `special_days` table: `authenticated` may read (`using (true)`); no client write
  (fail-closed); `service_role` full DML (seed/admin). `anon` gets nothing.
- **FR7′-c** Trigger `set_heart_weight()` (SECURITY DEFINER, `search_path = public, pg_temp`) sets
  `new.weight := 2` when `(now() at time zone 'Asia/Ho_Chi_Minh')::date ∈ special_days`, else 1.
- **FR7′-d** Views `kudos_with_heart_count` and `profile_kudos_stats` recomputed with
  `coalesce(sum(h.weight),0)` — replacing count. **Replace from each view's LATEST definition**
  (compose-columns migration `20260709000000` already redefined `kudos_with_heart_count`; preserve
  every existing column + `security_invoker=true` + the anon revoke).
- **FR7′-e** `toggleHeartAction` reads the post-mutate count from `kudos_with_heart_count.heart_count`
  (weighted) instead of a raw `COUNT` on `hearts`. Insert payload drops any weight (DB owns it).

## Non-functional
- **NFR1** `toggleHeartAction`'s count-read stays mockable via the existing `@/lib/supabase/server`
  chainable stub. Trigger/view behaviour verified at the DB layer (migration applies cleanly + live
  toggle), not vitest.
- **NFR2/3/4** unchanged (service key server-only; files <200 lines; `revalidatePath('/kudos')`).

## Success criteria
- **SC-A** Migration applies cleanly: `weight` column + `special_days` (+RLS/grants) + trigger +
  both views recomputed; idempotent seed adds the configured special day(s).
- **SC-B** On a special day, one like moves `heart_count` by **+2** and the receiver's
  `hearts_received` by **+2**; on a normal day, by +1. (Live-DB verified.)
- **SC-C** A forged insert with `weight=2` on a normal day is overwritten to 1 by the trigger.
- **SC-D** Self-like still blocked; un-like removes the full weight (count returns to base).
- **SC-E** `toggleHeartAction` unit tests pass against the weighted view-read (mocked).

## Out of scope
Admin UI for `special_days` (managed via seed/SQL) · per-day multipliers other than ×2 ·
any client-visible special-day indicator.
