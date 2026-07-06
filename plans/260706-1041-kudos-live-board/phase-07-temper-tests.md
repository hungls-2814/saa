# Phase 07 — Temper (tester)

## Context
- Spec: `spec/kudos-board/overview.md` (SC1–SC12) · blockedBy: Phase 06
- Test convention: vitest ^4 + @testing-library/react; mock `@/lib/supabase/server` (research §7)

## Overview
- **Priority:** P1
- **Status:** done
- **Description:** Prove the integrated feature. Full `npm run test` green + coverage; tests run
  against FINAL code (no mocks that fake a green build; no test DB — mock the Supabase client).
- **Scope honesty:** the mocked-`createClient` vitest suite proves the code *calls* insert/delete/
  select with the expected args and maps an *assumed* error shape — it does NOT prove real DB
  behaviour. **These SCs are NOT provable by the mocked suite alone** and require the manual/
  integration smoke pass below before Phase 08 sign-off: SC8 (self-like rejected without 500),
  SC12 (migrations apply clean / seed idempotent), SC1-anon (views unreadable by anon key), and
  real-row keyset load-more (SC4).

**Result:** 461 tests pass (45 files); coverage reported; typecheck + lint clean. Manual smoke items deferred to pre-production.

## Test matrix
| Layer | Targets | SC |
|-------|---------|----|
| Unit (pure) | `deriveStarTier` (0/9/10/19/20/49/50), cursor round-trip, `buildKudosFilter`, `map-card` caps | SC10, SC11 |
| Unit (query, mocked client) | highlights limit/order, feed keyset predicate, spotlight count, per-user stats, top-10 gifts, option lists | SC2,3,4,6,7 |
| Unit (actions, mocked) | toggle insert/delete branches, self-like → typed failure (not 500), load-more cursor, apply-filters reset | SC8,4,5 |
| Guard | proxy `/kudos` unauthenticated → `/login`; page `getUser()` redirect | SC1 |
| i18n | `KudosPage` vi/en key parity; all visible keys present | SC11 |
| Component (RTL) | carousel arrows disable at ends + paginator `n/min(5,total)`; empty-states render; like heart color/count; hashtag-chip triggers filter; copy-link toast | SC2,3,7,8,9 |
| **Manual/integration (real dev Supabase — BEFORE Phase 08 sign-off)** | apply migrations clean; run `db:seed` **twice** (no dupes); self-like through the running app → confirm the *real* error path (not a 500); keyset load-more across real inserted rows (no dup/skip); anon key CANNOT `GET` either view | SC12, SC8, SC4, SC1-anon |

## Todo
- [x] `npm run typecheck` clean
- [x] `npm run lint` clean
- [x] `npm run test` all green, no skips/fakes
- [x] coverage report (aim high on `lib/kudos/*` + components)
- [ ] **manual smoke on dev Supabase:** migrate + seed×2 + self-like + keyset load-more + anon-view-block — **deferred to pre-production**
- [x] failures → recommend fixes → re-run

## Success criteria
- All SC1–SC12 have at least one passing test; suite green against final code; coverage reported.
- SC8/SC12/SC4/SC1-anon confirmed by the manual dev-Supabase smoke pass (mocked suite alone is insufficient).

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Chainable mock diverges from real supabase-js | M×M | mirror `middleware.test.ts` + research §7 stub; assert call args not internals |
| Flaky IntersectionObserver in jsdom | M×M | stub observer; unit-test the load-more callback directly |

## Next
Passing suite → Phase 08 (reviewer).
