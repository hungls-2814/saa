# Phase 01 — Foundation & Shared Primitives

**Priority:** P0 (blocks 02/03/04) · **Status:** complete

## Overview
Ship the shared building blocks the rest of the plan leans on: a responsive countdown
primitive (used by two pages), a mobile navigation for the site header, and a site-level
horizontal-overflow safety net. Establish the breakpoint convention once, here.

## Key Insights (from audit)
- `countdown-unit.tsx` has **no breakpoints** — fixed `h-[82px] w-[51px]` digit boxes and
  `text-[40px]` digits. Three units + `gap-[60px]` ≈ 468px → overflows 375px. It is **shared**
  by `app/prelaunch/components/prelaunch-countdown.tsx` and `app/(home)/components/countdown.tsx`.
  One fix repairs both.
- `site-header.tsx` nav is `hidden md:flex` with **no mobile replacement** — mobile users lose
  About/Awards/Kudos links entirely. Footer already stacks fine; header is the gap.
- No `overflow-x-hidden` guard anywhere; a single overflowing child scrolls the whole site.

## Requirements
- Countdown digit boxes shrink on mobile, restore to current size at `sm:`.
- Mobile users can reach all primary nav links via a hamburger toggle (`md:hidden`).
- No horizontal page scroll introduced by any single overflowing element.

## Related Code Files
**Modify:**
- `app/components/countdown-unit.tsx` — add responsive variants to digit boxes, digits, gaps, label
- `app/(home)/components/site-header.tsx` — hamburger button (`md:hidden`) + mobile menu drawer; tighten right-cluster gap
- `app/layout.tsx` — add `overflow-x-hidden` on `<body>` as safety net

**Create:**
- `app/(home)/components/mobile-nav-menu.tsx` — mobile drawer/overlay listing the 3 nav links (keep <200 lines; reuse existing link data from site-header)

**Read for context:**
- `app/(home)/components/saa-rules-modal.tsx` — existing right-anchored drawer pattern to mirror (`fixed inset-0 flex justify-end`, `w-full max-w-[Npx]`, `overflow-y-auto`)
- `app/prelaunch/components/prelaunch-countdown.tsx`, `app/(home)/components/countdown.tsx` — consumers of countdown-unit (verify no per-page override needed)

## Implementation Steps
1. **countdown-unit.tsx**: box `h-[60px] w-[38px] sm:h-[82px] sm:w-[51px]`; digit font `text-[28px] sm:text-[40px]`; inner `gap-2 sm:gap-3.5`; label `text-lg sm:text-2xl`. Keep aspect/spacing proportional.
2. **site-header.tsx**: add a hamburger `<button>` visible `md:hidden` beside the right cluster; wire open/close state; render `<MobileNavMenu>` when open. Change right-cluster spacing `gap-4` → `gap-2 sm:gap-4` to avoid crowding at 375px.
3. **mobile-nav-menu.tsx**: overlay + panel following the `saa-rules-modal` drawer idiom; list About / Awards / Kudos (same hrefs/labels the desktop nav uses); close on link click and on backdrop click; trap nothing fancy — keep it simple.
4. **layout.tsx**: add `overflow-x-hidden` to `<body>` classes.
5. Run `npm run typecheck` and `npm run lint` after edits.

## Todo List
- [x] Responsive countdown-unit digit boxes/fonts/gaps/label
- [x] Verify prelaunch + home countdown render correctly with new primitive
- [x] Hamburger button + state in site-header (`md:hidden`)
- [x] mobile-nav-menu.tsx drawer with 3 nav links, backdrop + link-click close
- [x] Tighten header right-cluster gap on mobile
- [x] `overflow-x-hidden` on body
- [x] typecheck + lint clean
- [x] Update/extend tests for site-header (mobile menu toggle) and countdown-unit

## Implementation Notes
- **DRY refactoring post-review:** site-header nav links single-sourced into one NAV_ITEMS array (removed duplication between desktop nav and mobile drawer).
- **Test coverage:** added mobile-nav-menu.test.tsx (7 tests) + hamburger assertion in site-header.test.tsx.

## Success Criteria
- 3 countdown units fit within 375px with no horizontal scroll (they wrap only as a last resort).
- Hamburger appears <768px, hidden ≥768px; opening reveals all 3 links; each navigates & closes menu.
- Desktop header/countdown visually unchanged at ≥1024px.
- typecheck + lint pass; existing tests green (add coverage for the new toggle).

## Risks
- Hamburger state must not leak into desktop (`md:hidden` on button, `md:flex` stays on nav).
- countdown-unit is shared — verify BOTH consumers after the change (home hero + prelaunch).

## Next Steps
Unblocks Phases 02, 03, 04. They may proceed in parallel once this lands.
