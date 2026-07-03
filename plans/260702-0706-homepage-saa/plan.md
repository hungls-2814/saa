# Plan — Homepage SAA 2025 (F002)

MoMorph screen: **Homepage SAA** — `i87tDx10uM` (file `9ypp4enmFmdK3YAFJLIu6C`)
Spec draft: `spec/homepage/overview.md` · Clarifications: `clarifications.md`
Discipline: interactive · Work type: feature · SDD: on

## Goal
Replace the Next scaffold `app/page.tsx` with the SAA 2025 public homepage: header,
hero + countdown, Root Further content, awards grid, Sun* Kudos promo, footer, and a
floating quick-action widget — pixel-faithful to the design, fully localized (VN/EN),
and auth-aware.

## Two-track shape
- **Track A (UI)** — full homepage UI from the MoMorph design via `momorph-implement-design`
  (asset extraction + visual validation loop). One screen → one `implementer` subagent.
- **Track B (behavior/logic)** — countdown util, env config, i18n messages, session
  wiring, routing map. Runs alongside; integrated into the UI as it lands.

## Phases
| # | Phase | Track | Status |
|---|-------|-------|--------|
| 01 | Homepage UI (all sections + assets) | A | complete |
| 02 | Behavior & integration (countdown, i18n, auth, routing, env) | B | complete |
| 03 | Tests (countdown util + component/UI) | — | complete |

## Key decisions (see clarifications.md)
- Route: homepage at `/` via `app/(home)/page.tsx` route group.
- Countdown: `NEXT_PUBLIC_EVENT_DATETIME`, default `2026-12-26T18:30:00+07:00`.
- Links point to real (not-yet-built) hrefs: `/awards-information#<slug>`, `/kudos`, `/standards`.
- Auth-aware header from Supabase session; roles/Admin Dashboard deferred.
- Reuse login assets where identical (SAA logo, ROOT FURTHER wordmark, VN flag, chevron).

## Dependencies
- Existing: next-intl cookie i18n (`i18n/*`, `lib/i18n/set-locale.ts`), Supabase
  (`lib/supabase/*`), sign-out action (`lib/auth/sign-out.ts`), Tailwind v4.
- New env var must be documented in `.env.local.example` and setup docs.

## Outcome
Delivered 26 production files (UI components, logic, i18n, tests). Test suite: 176/176 pass.
Reviewer: 9.5/10 after fixes (asset optimization, i18n key parity, test naming clarity).
Intentional deviations: award descriptions (Best Manager / Signature Creator / MVP) use
identical placeholder copy from MoMorph design verbatim; decorative bitmap art recreated as
CSS/SVG (Figma asset URLs were null, API 500'd).

## Delivery gates
Compile → tester (100% pass) → reviewer → project-manager + doc-writer → evidence gate →
commit (git-manager) → journal.
