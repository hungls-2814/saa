# Phase 04 — Profile / Login / Awards / Prelaunch

**Priority:** P1 · **Status:** complete · **Depends:** Phase 01

## Overview
Cover the remaining pages. Most page shells already stack correctly; the one hard break is the
profile locked-icon row. Login/Awards/Prelaunch need only height/spacing tuning and a couple of
child-component verifications.

## Key Insights (from audit)
- **profile-header.tsx** — locked-icon row: 6 × `size-16` (64px) + `gap-4` (16px) ≈ **464px** in a
  **non-wrapping** flex → overflows 375px (and the 768px content area after gutters). Avatar
  `size-[200px]` is large but fits. **Hard break.**
- **login-hero.tsx** — `min-h-[845px]` + `gap-20` (80px) → excessively tall on mobile (no overflow,
  poor UX).
- **he-thong-giai** page shell already stacks (`flex-col lg:flex-row`), but children
  `awards-sidebar.tsx` / `award-detail-section.tsx` / `awards-hero.tsx` were **not audited** —
  verify for fixed px widths at 375/768.
- **prelaunch** already responsive (row `flex-wrap`, responsive gaps/text); its only real risk was
  countdown-unit, fixed in Phase 01. Verify only.
- `app/home/page.tsx` is a 308-redirect alias — **no work**.

## Requirements
- Profile icon row + avatar fit mobile without horizontal scroll.
- Login hero not excessively tall on mobile.
- Awards children have no fixed-px overflow.
- No horizontal scroll on any of these pages at 375/768.

## Related Code Files
**Modify:**
- `app/profile/components/profile-header.tsx` — icon row `flex-wrap` (or `overflow-x-auto`) + shrink to `size-12 sm:size-16`, `gap-2 sm:gap-4`; avatar `size-[140px] sm:size-[200px]`; allow star/department row to wrap
- `app/login/components/login-hero.tsx` — `min-h-[600px] lg:min-h-[845px]`; `gap-10 sm:gap-20`
- `app/login/components/login-toast.tsx` — optional `max-w-[90vw]` guard

**Verify (change only if audit risk confirmed):**
- `app/he-thong-giai/components/awards-sidebar.tsx`
- `app/he-thong-giai/components/award-detail-section.tsx`
- `app/he-thong-giai/components/awards-hero.tsx`
- `app/prelaunch/page.tsx`, `app/prelaunch/components/prelaunch-countdown.tsx`

**Read for context:** `app/profile/page.tsx`, `app/login/page.tsx`, `app/he-thong-giai/page.tsx` (shells already responsive)

## Implementation Steps
1. profile-header: wrap/shrink the locked-icon row; responsive avatar; allow meta row to wrap.
2. login-hero: responsive min-height + gap.
3. Audit awards children at 375/768 (Playwright/grep for `w-[Npx]`); fix any fixed-width overflow with `w-full max-w-[Npx]` or stacking.
4. Verify prelaunch renders correctly post Phase-01 countdown fix.
5. login-toast max-width guard (optional).
6. typecheck + lint.

## Todo List
- [x] profile-header icon row wrap/shrink + responsive avatar + meta-row wrap
- [x] login-hero responsive min-height & gap
- [x] Audit + fix awards-sidebar / award-detail-section / awards-hero
- [x] Verify prelaunch after Phase 01
- [x] (optional) login-toast max-width
- [x] typecheck + lint clean; existing tests green

## Implementation Notes
- **Deviation (award-detail-section):** award-detail-section.tsx had a fixed `336px` orb that overflowed at 375px width. Fixed to responsive: `w-full max-w-[220px] sm:max-w-[336px]` to fit mobile while preserving full size at larger breakpoints.

## Success Criteria
- Profile icon row wraps/scrolls contained — no page overflow at 375px.
- Login hero reasonable height on mobile.
- Awards + Prelaunch: no horizontal scroll at 375/768/1440.

## Risks
- Awards children unaudited — treat step 3 as discovery; budget for one or two fixed-width fixes.

## Next Steps
Feeds Phase 05. Independent of Phases 02 and 03.
