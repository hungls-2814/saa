# Kudos Live Board Planning Session — F005 Blueprint & Red-Team Catch

**Date**: 2026-07-06 10:41  
**Severity**: High (security + data-layer first for repo)  
**Component**: Feature F005 (`/kudos` route, MoMorph MaZUn5xHXZ)  
**Status**: Resolved — plan ready for takumi

## What Happened

Completed `/tkm:create-plan` session for Kudos Live board feature. Blueprint written to `plans/260706-1041-kudos-live-board/`: plan.md + 9 phase files + spec/kudos-board/overview.md + clarifications.md. Work type: feature with MoMorph two-track (Track A: UI parallel to Track B: data/logic).

Resolved 8 clarifications through interaction (auth-gated scope, real Supabase, star-tier derivation, seed strategy, one-heart-per-user, no self-like). Red-team pass caught 3 CRITICAL + 6 HIGH + 2 MEDIUM issues — **all fixed before plan finalization**.

## The Brutal Truth

The unauthenticated-data-leak finding stung. Plain Postgres views in Supabase bypass RLS and run as owner; REST API grants SELECT to `anon` key by default. Entire auth-gate becomes theater if views aren't locked down. Walked right into it — the kind of gap that only surfaces under scrutiny, and the fix is non-obvious: `security_invoker=true` + `revoke select ... from anon` on every view. **First real Postgres layer in this repo outside auth.** Pressure high.

## Technical Details

**The security issue:** Figma spec didn't flag this. MoMorph board data (hearts, likedByMe, star-tiers) exposed to public via REST if views lack security_invoker. Fixed in plan phase-03 (database models).

**Seed-vs-trigger interaction:** `handle_new_user()` trigger requires `user_metadata` carrying full_name; admin seed without it crashes. Solution: seed must UPSERT profiles, not INSERT fresh.

**Two-track contract gaps:** likedByMe boolean threading through sender fetch, star-tier derivation from heart_count (10/20/50→1/2/3), hashtag shape {id,label} vs bare string. Pinned in phase contracts for integration phase catch-up.

## What We Tried

- MCP Figma fetch blocked (auth unavailable) — resolved via MoMorph MCP file key match instead
- `.claude/scripts/set-active-plan.cjs` called in plan but file missing — harmless, step skipped

## Root Cause Analysis

Security gap: assumed Supabase default grants were sensible for auth-gated routes. They aren't — RLS is the boundary, not middleware. Views are invisible to RLS unless `security_invoker` set. Missed because docs don't flag this hard enough.

Seed design flaw: trigger logic assumed `user_metadata` presence; seed admin API can't populate it, so profiles crash until UPSERT + trigger-run works.

Two-track: early contract pinning saved integration phase — both tracks can run parallel without discovery delays.

## Lessons Learned

1. **For Supabase + Next routes:** RLS is your authz layer, not the guard. Every view + every table must `security_invoker=true` to respect RLS. Test via anon key early.
2. **Triggers + seeding don't mix cleanly:** seed must anticipate trigger side effects (NULL checks, FK cascades). UPSERT outside trigger, then trigger runs idempotent.
3. **Two-track contracts matter:** pinning sender fetch paths, hashtag shape, star-tier calc in phase refs before UI/backend split = integration phase is glue, not detective work.

## Next Steps

1. Confirm Google OAuth `user_metadata.full_name` vs `name` key with one real login (receiver-department filter is convention call).
2. Start `/tkm:takumi plans/260706-1041-kudos-live-board/plan.md` — Track A (UI board, dialog, hearts) + Track B (Postgres migrations, RLS, seeding, heart API) run parallel.
3. During takumi, red-team plan with one eye on RLS escape hatches (views, functions, grants).

**Report path:** `plans/260706-1041-kudos-live-board/reports/`  
**Status:** DONE — plan approved, ready for implementation
