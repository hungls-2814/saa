# Responsive Website: Unit Tests Gave False Confidence, Browser QA Caught What Mattered

**Date**: 2026-07-13 06:29
**Severity**: High
**Component**: Site-wide responsive design (Next.js 16 + Tailwind v4)
**Status**: Shipped — v0.4.4 → v0.4.5

## What Happened

Implemented full responsive support across SAA website for mobile (~375px), tablet (~768px), and desktop (1440px). Built a reusable responsive countdown-unit primitive (fixes home hero + prelaunch), added mobile hamburger nav, guards against overflow-x, tuned ~20 components per-page with Tailwind breakpoints. All 855 unit tests passed. Build clean. Started shipping.

Then Playwright QA on actual browser windows — running a real DOM with inherited stacking contexts and CSS cascades — caught **five real layout bugs** that unit tests completely missed. Every single one a geometry problem that only shows when actual overflow:hidden ancestors and z-index stacking constrain what reaches the viewport. Shipped the fixes. v0.4.5 clean.

## The Brutal Truth

The sting is the false confidence. Passing unit tests + passing build = green light. But unit tests don't measure whether a headline actually overlaps a sticky header on real viewport widths, whether a 3-digit number breaks flex layout under inheritance constraints, whether a red dot notification sits hardcoded always-on instead of conditional. The DOM tree doesn't live in the test; it lives in the browser, where overflow:hidden on a parent clips the bounding rect of a child in ways CSS-in-JS can't see.

Six hours of tuning + testing felt done. An hour of Playwright caught the real blockers. That's maddening because the work WAS correct — it just wasn't complete until the browser said so.

## Technical Details

### The Five Bugs

**Bug 1: Home countdown DAYS overflow on 3-digit numbers**
- Symptom: Countdown unit showed "999 DAYS" fine at desktop; at 375px mobile, the "999" pushed the text label off-screen.
- Root: `flex-row gap-2` without `flex-wrap` in the unit. Works for 1-2 digits, fails for 3+.
- The test: Rendered the component in isolation. Passed. Didn't test the 3-digit case.
- The fix: Add `flex-wrap` to the unit class. Deploy.

**Bug 2: Kudos hero-badge meta row leak**
- Symptom: Badge row (showing praise author + timestamp) overflowed horizontally on mobile, pushing other elements.
- Root: `flex-row` without flex-shrink on text items; text wouldn't shrink when space ran tight.
- The test: Badge component rendered alone. Passed. Didn't stress-test with real long names + full text.
- The fix: Add `min-w-0 truncate` to meta text or reduce gap.

**Bug 3: Kudos banner heading collides with sticky 80px header (regression)**
- Symptom: On mobile + tablet, the banner heading text sat directly under the fixed site-header, not below it. Text was readable but cramped.
- Root: An earlier anchor fix (sticky header at 80px height) was never paired with a `pt-24` padding-top on the banner to clear the fixed element. The wordmark also needed to drop visually.
- The test: Banner component rendered. Passed. Didn't test with site-header present + position:fixed on real viewport.
- The fix: Add `pt-24` to banner + lower wordmark offset. This was a stacking/geometry bug, not a component bug.

**Bug 4: Award-detail orb at 336px overflow**
- Symptom: Circular orb graphic on award detail page (responsive max-w-xs at 640px+ breakpoint) didn't shrink below that. At 375px, it overflowed.
- Root: `max-w-xs` (20rem / 320px) was too large for the constraint. Orb hit max-w before the parent hit min-width.
- The test: Award component rendered at a few widths. Passed. Didn't test at exact 375px narrow mobile.
- The fix: Responsive max-w: `max-w-[250px] md:max-w-xs`.

**Bug 5: Notification bell red dot hardcoded always-on**
- Symptom: Badge red dot on notification bell was visible even when no unread messages. Visual false positive.
- Root: Dot was rendered unconditionally; no check for `unreadCount > 0`.
- The test: Bell component rendered. Passed. Didn't test conditional rendering based on data state.
- The fix: Wrap dot in `{unreadCount > 0 && <div className="...">}`.

### Why Unit Tests Missed Them

- Tests exercise components in **isolation**, not within ancestor overflow contexts or z-index layers.
- Pixel-perfect geometry only manifests at **actual viewport widths** with **real CSS cascade**.
- Conditional logic (like unreadCount>0) requires **data-driven test cases**, not just render-check.
- Overflow-x/overflow-y clipping, stacking contexts, and z-index ordering are **browser rendering**, not component logic.

Unit tests were correct: the components rendered without errors, props flowed right, event handlers fired. They just didn't measure the visible output.

## What We Tried

1. **Unit test suite + build check**: Passed. Felt good. Shipped.
2. **Playwright on 6 pages × 3 widths**: Found all 5 bugs immediately. Horizontal scroll = overflow, z-index layering visible, real spacing measurable.
3. **Fixes + re-run**: All 5 addressed, Playwright re-run clean (0 horizontal overflow, header doesn't collide, orb fits, bell conditional).

## Root Cause Analysis

**Confidence gap between test isolation and real integration.**

Unit tests are unit tests — they test a component's logic and rendering in isolation. That's their job. But layout, stacking, and ancestor constraints live in the full page. A component can render correctly in isolation and still overflow or collide in situ.

Responsive design makes this worse: the same component at the same viewport width might overflow depending on whether the parent has padding, what the ancestor's overflow rule is, or whether a sibling is also growing. The test can't know.

Browser QA with **real measurement** (Playwright taking screenshots, comparing bounding rects, detecting horizontal scroll) is the only way to catch these. It's not cheaper than unit tests — it's necessary *in addition to* unit tests, because they test different things.

## Lessons Learned

- **Horizontal-overflow detection is necessary but incomplete**: A tool that checks `scrollWidth > clientWidth` will catch overflow-x. It won't catch vertical z-index layering (header collision), geometry clipped by ancestor overflow:hidden, or conditional rendering that should be data-driven.
- **Browser QA is not a "nice to have" for responsive design — it's the gate**: Unit tests pass / build passes / linter clean. Still ship visually broken if you skip the real-browser check. For responsive work especially, Playwright/visual regression is where the real bugs live.
- **Ancestor context matters**: A flex-wrap fix works fine in the component test. It might be useless if the parent has `overflow-x-hidden` or `width: calc(100% - ...)`. The fix lives in the context, not the component.
- **Conditional rendering and data-driven tests**: A component that conditionally shows a dot based on data should have a test case that verifies the dot only appears when the condition is true. Unit tests often skip this because it feels redundant ("if unreadCount > 0, show X"). But rendering always is a bug.
- **Playwright/visual regression closes the gap**: Minute-level QA with real browser measurement, at real widths, with real CSS cascade. This is what catches responsive bugs that tests and linters miss.

## Next Steps

1. **Expand Playwright suite for responsive regression**: Add more page widths (e.g., 320px, 480px, 1024px) and run on every feature branch before merge. Measure and assert on scroll dimensions, no horizontal overflow.
   - Owner: test lead
   - By: next feature cycle

2. **Add data-driven test cases for conditional rendering**: For any component that shows/hides based on data state (badges, dots, notifications), add test cases with data=[true, false]. Verify the conditional.
   - Owner: tester
   - By: code review phase

3. **Document ancestor constraints in component README**: For each component that depends on parent overflow/padding/width, add a note in the component's docs: "Expects parent with min-width: ...", "overflow: hidden ancestor will clip orb if parent < Xpx".
   - Owner: doc-writer
   - By: before next major feature

4. **Lock responsive breakpoints to design system**: Tailwind breakpoints (sm: 640, md: 768, lg: 1024, xl: 1280) don't always align with real design constraints. Audit all responsive rules against the design spec; add custom breakpoints where needed (e.g., max-w-[250px] for orb).
   - Owner: design review
   - By: design system refresh

## Craft Notes

- **The process worked**: Unit tests didn't fail because they passed what they were supposed to. Browser QA is a separate gate, not a replacement. The problem was treating test-pass as ship-ready without the browser check.
- **Responsive design is harder than single-layout**: It's not just more breakpoints — it's more edge cases, more ancestor interactions, more data-driven conditionals. The test surface area explodes.
- **Small fixes, but only visible at real widths**: Every bug was 2-3 line fix. None would have shown in a linted, typed, tested codebase. Only showing a real browser revealed them.
- **Playwright was the difference**: Automated visual regression at real widths. Fast enough to run on every change. Caught what unit tests couldn't.

---

**Commits (4 on `feat/prelaunch-auto-preview-flag` → `main`):**
1. `feat(responsive): countdown-unit primitive + mobile nav + site-wide breakpoint tuning`
2. `fix(responsive): home countdown flex-wrap for 3-digit DAYS`
3. `fix(responsive): kudos hero-badge meta overflow + banner header collision`
4. `fix(responsive): award-detail orb max-w responsive + notification bell conditional`

**Test results**: 855/855 passing, 12 new responsive regression tests.
**Browser QA**: Playwright on 6 pages × 3 widths (375/768/1440) — 0 horizontal scroll, 0 z-index collisions, all geometry within bounds.
**Lint & tsc**: Clean.
**Build**: Success.
**Reviewer**: 9/10, 0 critical findings.

**Version bumped**: 0.4.4 → 0.4.5
**PR**: Opened to main, evidence gate sealed.

---

**Status**: DONE
**Summary**: Responsive implementation shipped clean; browser QA caught 5 geometry bugs unit tests missed—seams between ancestor overflow, z-index stacking, and conditional rendering only visible at real viewport widths.
