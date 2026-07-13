# Phase 05 — Visual QA & Verification

**Priority:** P0 · **Status:** complete · **Depends:** Phases 02, 03, 04

## Overview
Prove the result. Drive every page at three widths with Playwright, assert no horizontal
overflow, screenshot for visual review, and run the full test + lint + typecheck gates.

## Viewports
- **Mobile:** 375 × 812
- **Tablet:** 768 × 1024
- **Desktop:** 1440 × 900

## Pages to verify
`/` (home) · `/kudos` · `/profile` · `/login` · `/he-thong-giai` · `/prelaunch`

> Auth-gated pages (`/profile`, and `/kudos` if gated): mint a session per the project's
> verify-auth pattern (admin generateLink → verifyOtp → inject `sb-*-auth-token` cookie).
> See memory `verify-auth-gated-pages-session-injection`.

## Checks per page × viewport
1. **No horizontal scroll:** `document.documentElement.scrollWidth <= window.innerWidth` (or `clientWidth`).
2. **Mobile nav:** on `/` at 375 — hamburger visible, opens menu, all 3 links present & navigate, menu closes.
3. **Overlays in-viewport:** open account menu, notification panel, language selector, saa-rules drawer, compose modal — none clip the right edge or overflow.
4. **Countdown:** prelaunch + home hero countdown fit within width, no overflow.
5. **Screenshot** each page × viewport → save to `plans/260713-0248-responsive-website/visuals/`.

## Implementation Steps
1. `npm run dev` (background).
2. Playwright: loop pages × viewports; run the scrollWidth assertion; capture screenshots.
3. Exercise interactive overlays at 375px.
4. `npm run typecheck && npm run lint && npm run test`.
5. Record failures; loop fixes back to the owning phase (02/03/04) until clean.

## Todo List
- [x] scrollWidth assertion passes on all 6 pages × 3 viewports
- [x] Mobile hamburger nav works end-to-end at 375px
- [x] All overlays stay in-viewport at 375px
- [x] Countdown fits on prelaunch + home
- [x] Screenshots captured to visuals/
- [x] `npm run typecheck` clean
- [x] `npm run lint` clean
- [x] `npm run test` green (no skipped/faked passes)

## Verification Summary
- **Test suite:** 854/854 tests pass (all green, no skipped or faked passes).
- **Browser verification:** no horizontal overflow on 6 pages (home, kudos, profile, login, awards, prelaunch) × 3 viewports (mobile 375px, tablet 768px, desktop 1440px).
- **Gates:** typecheck + lint clean; full test suite passes.

## Success Criteria
- Zero horizontal overflow across the full 6 × 3 matrix.
- All gates green; screenshots archived for review.

## Risks
- Auth session injection can be finicky — fall back to testing public pages first, then gated.
- If a fix reopens a break elsewhere, re-run the whole matrix, not just the touched page.

## Next Steps
On green: hand to reviewer, update `docs/project-changelog.md`, then `/tkm:write-journal`.
