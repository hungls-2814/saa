# Plan — Countdown / Prelaunch page (F004)

Screen: Countdown - Prelaunch page — momorph 8PJQswPZmU (file 9ypp4enmFmdK3YAFJLIu6C)
Discipline: interactive · MoMorph two-track · SDD on · spec_lang: en
Spec: `docs/features/F004-countdown-prelaunch/overview.md` (status: active) · Decisions: `clarifications.md`

## Goal
Public `/prelaunch` countdown page + a middleware gate that locks the whole app
to it until SAA opens, then unlocks to the homepage.

## Phases
| # | Track | Phase | Status |
|---|-------|-------|--------|
| 1 | B (backend) | Middleware prelaunch gate + shared datetime helpers + tests | ✅ done |
| 2 | A (UI) | `/prelaunch` page from Figma, reuse countdown logic + LED unit, bg asset, i18n | ✅ done |
| 3 | Integration | Wire page ↔ gate contract (`/prelaunch`, env datetime, on-zero → `/`) | ✅ done |
| 4 | Temper | tester — full suite + coverage (281/281 pass, typecheck + lint clean) | ✅ done |
| 5 | Inspect | reviewer — 1 CRITICAL (datetime-resolution divergence) found & FIXED; 0 critical remaining | ✅ done |
| 6 | Deliver | plan sync + spec promotion | ✅ done |

## Key contracts (shared between tracks)
- Route path: `/prelaunch` (const `PRELAUNCH_PATH` in `proxy.ts`).
- Datetime: `resolveEventTarget()` / `isBeforeLaunch(now)` in `lib/event/countdown.ts`
  (env `NEXT_PUBLIC_EVENT_DATETIME` + `DEFAULT_EVENT_DATETIME`, fails open).
- On countdown zero: page redirects client-side to `/`; middleware also redirects
  `/prelaunch` → `/` after launch.
- Page is public; `/auth/*` + static assets excluded by `config.matcher`.

## Dependencies
- Track A & B are parallel-runnable (no file overlap). Integration follows both.

## Quality Gates
- **Critical Fix Applied**: Reviewer found datetime-resolution divergence between page and gate (redirect-loop risk). Page now uses `resolveEventTargetIso` to match gate. Re-verified 281/281 pass. Verdict: SEALED.
- **Deferred MINOR**: Matcher `auth` substring boundary check (pre-existing, cross-app). Logged as documented follow-up; does not block launch.
