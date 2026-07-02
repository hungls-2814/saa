# Plan — Login Page (Google OAuth via Supabase) + VN/EN i18n

**Feature:** F001 · **Screen:** MoMorph GzbNeVGJHz · **Discipline:** interactive (MoMorph two-track)
**Spec:** `spec/login/overview.md` · **Clarifications:** `clarifications.md`
**Reports:** `../reports/researcher-260702-0410-supabase-ssr-auth.md`, `../reports/researcher-260702-0355-next-intl-cookie-i18n.md`

## Goal
Pixel-perfect SAA 2025 Login screen at `/login`; Google OAuth via Supabase (all Google accounts);
success → `/todo` (protected placeholder); failure → toast; full VN/EN i18n via `NEXT_LOCALE` cookie.

## Stack decisions (from research)
- `@supabase/supabase-js@^2.110`, `@supabase/ssr@^0.12`, `next-intl@^4.13`.
- Next 16: `await cookies()`; route guards in **`proxy.ts`** (not deprecated `middleware.ts`), nodejs runtime.
- Supabase cookies: `getAll`/`setAll` only; authz via `getUser()`.
- i18n "without routing": `i18n/request.ts` reads `NEXT_LOCALE`, default `vi`; switch via Server Action + `router.refresh()`.

## Phases (Track A = UI, Track B = backend/logic — parallel-runnable; integration near end)

| # | Phase | Track | Status |
|---|-------|-------|--------|
| 01 | Deps & config (install, next.config.ts plugin, .env.local.example) | B | done |
| 02 | Supabase client layer + proxy guards + OAuth callback + signout | B | done |
| 03 | i18n setup (request.ts, messages vi/en, layout provider, set-locale action) | B | done |
| 04 | Login screen UI — pixel-perfect from Figma | A (bg agent) | done |
| 05 | Protected `/todo` placeholder | B | done |
| 06 | Integration — wire UI ↔ i18n ↔ Supabase, toast, locale switcher | — | done |
| 07 | Tests + Supabase/Google setup docs | — | done |

Details: `phase-01..07-*.md`.

## Completion Summary
**Feature:** Login screen + Google OAuth via Supabase + VN/EN i18n fully implemented, tested (119 tests pass), code review completed (Critical/High findings fixed), evidence gate sealed. Running on localhost:3000.

## Key dependencies
- Phase 06 integrates the outputs of 02/03/04/05 (no hard block earlier; 04 runs in parallel).
- Phase 07 runs against final integrated code.
- External: user must create Supabase project + enable Google provider (phase 07 doc guides this) before real login works end-to-end.

## Success criteria
See `spec/login/overview.md` acceptance criteria (7 checks). All must pass; app must compile + lint clean.
