# Phase 09 — Deliver (plan sync + docs + spec promotion)

## Context
- blockedBy: Phase 08 · Docs rules: `.claude/rules/documentation-management.md`

## Overview
- **Priority:** P2
- **Status:** in_progress
- **Description:** Close out F005: promote the spec, sync project docs, mark plan complete, commit.

## Work items
1. **Spec promotion:** move/copy `spec/kudos-board/overview.md` →
   `docs/features/F005-kudos-live-board/overview.md`; set frontmatter `status: active`.
2. **Roadmap:** `docs/development-roadmap.md` — F005 → complete; refresh progress.
3. **Changelog:** `docs/project-changelog.md` — add F005 entry (Kudos Live board + first Supabase
   data layer + migrations/seed).
4. **Architecture:** `docs/system/architecture.md` — add `app/kudos/`, `lib/kudos/`,
   `supabase/migrations/`, `scripts/seed-kudos.ts`, `SUPABASE_SERVICE_ROLE_KEY` to directory/env.
5. **Plan sync:** flip all phase statuses to complete; record outcome + review score in `plan.md`.
6. **Verify cross-plan links:** homepage (F002) Kudos CTA + hero/footer now resolve to a real `/kudos`.
7. **Commit:** git-manager, conventional commits, **push origin only** (per memory); no AI refs.

## Todo
- [ ] spec promoted to `docs/features/F005-kudos-live-board/`
- [ ] roadmap + changelog + architecture updated
- [ ] plan.md + phase statuses synced
- [ ] homepage `/kudos` links verified live
- [ ] committed + pushed to origin

## Success criteria
- Spec active under `docs/features/`; docs reflect shipped state; plan marked complete;
  `/kudos` reachable from homepage CTA.

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Migrations shipped but dev DB not seeded → empty board on demo | M×M | run `db:seed` on dev + the Phase-07 smoke pass (migrate + seed×2 + self-like + keyset load-more + anon-view-block); attach as delivery evidence |
| Service-role key accidentally committed | L×H | `.gitignore` check; grep staged diff for the key before push |

## Rollback
Feature is additive: new route + new tables + new lib. Revert = remove `/kudos` from
`PROTECTED_PATHS`, delete `app/kudos/` + `lib/kudos/`, drop the migrations (down = drop the new
tables/views/trigger). No existing route/data touched, so rollback does not cascade.

## Next
Feature shipped. Deferred follow-ups: rank-up leaderboard, Secret Box, compose dialog,
special-day +2 hearts, realtime, user-profile & kudos-detail pages.
