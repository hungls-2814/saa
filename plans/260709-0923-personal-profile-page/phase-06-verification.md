# Phase 06 — Verification (QA)

## Context
- Depends on: 05 (all code in place). Runs against FINAL code (no stubs).
- Commands: `npm run typecheck`, `npm run lint`, `npm run test`.

## Overview
- Priority: P2 · Status: done ✅.
- Tester validates the whole feature; no source edits (tester owns test files only). All 6 phases complete, 825/825 tests pass.

## Test matrix
| Layer | Target | Assert |
|-------|--------|--------|
| Unit | getKudosByUser | sent filters sender_id, received filters receiver_id, order created_at desc, empty → [] |
| Unit | getMyProfileHeader | derives starTier/heroBadge from counts; missing profile/stats → safe defaults, no throw |
| Unit | profile-header | renders name/department/badge; empty avatar → initials fallback |
| Unit | profile-kudos-section | toggle flips list + count; default sent; empty state per direction; no onToggleLike wired |
| Integration | page.tsx | unauth → redirect('/login'); auth → renders A/B/C/D; parallel fetch shape |
| i18n | ProfilePage namespace | every consumed key resolves in en + vi, no missing-message warning |

## Todo
- [ ] `npm run typecheck` green
- [ ] `npm run lint` green
- [ ] `npm run test` green (all above pass)
- [ ] no missing next-intl message warnings

## Success criteria
- All commands exit 0. No skipped/failing tests. No fake data or mocks masking real behavior.

## Risk assessment
- **Low** — Supabase client mocking in query tests. Follow existing `lib/kudos/*.test.ts` conventions (do not invent a new harness).

## Rollback
N/A (verification only). On failure → report to lead, fix in owning phase, re-run.
