# Phase 02 — Home & Shared Layout Tuning

**Priority:** P1 · **Status:** complete · **Depends:** Phase 01

## Overview
The homepage is already responsive-aware; this phase closes the remaining tuning gaps — an
oversized heading that can overflow a card, over-tall hero on mobile, tight award grid, and an
overlay edge-guard. No structural rewrites.

## Key Insights (from audit)
- `kudos-section.tsx` h2 `text-[57px] leading-[64px]` is **not scaled** — a long word at 375px
  (card inner ≈ 311px) can overflow the card and force horizontal scroll.
- `hero-section.tsx` `min-h-[779px]` is a fixed height → excessive empty space on mobile.
- `awards-section.tsx` grid is `grid-cols-2 ... lg:grid-cols-3` — 2 columns at 375px make each
  card ≈ 155px, cramped.
- `notification-button.tsx` panel `w-72` (288px) fits 375 but has no guard for <320px.
- `countdown.tsx` units row `gap-10` (40px) — tighten on mobile.

## Requirements
- No page-level horizontal scroll on Home at 375 / 768px.
- Headings and grids read comfortably on mobile without cramping.
- Overlays stay within the viewport at all widths.

## Related Code Files
**Modify:**
- `app/(home)/components/kudos-section.tsx` — heading `text-4xl sm:text-[57px]` (+ matching leading)
- `app/(home)/components/hero-section.tsx` — `min-h-[600px] lg:min-h-[779px]`
- `app/(home)/components/awards-section.tsx` — grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- `app/(home)/components/award-card.tsx` — optional `text-xl sm:text-2xl` title if 2-col retained anywhere
- `app/(home)/components/notification-button.tsx` — panel `w-72 max-w-[calc(100vw-2rem)]`
- `app/(home)/components/countdown.tsx` — units `gap-6 sm:gap-10`

**Read for context:** `app/(home)/page.tsx`, `app/(home)/components/root-further-section.tsx` (already fully responsive — reference, no change)

## Implementation Steps
1. kudos-section heading → responsive size + leading.
2. hero min-height → responsive.
3. awards grid → 1 col mobile, 2 col `sm`, 3 col `lg`.
4. notification panel edge guard.
5. countdown gap → responsive.
6. typecheck + lint.

## Todo List
- [x] kudos-section heading responsive
- [x] hero min-height responsive
- [x] awards grid 1/2/3 columns
- [x] award-card title size (if needed)
- [x] notification panel viewport guard
- [x] countdown gap responsive
- [x] typecheck + lint clean; existing tests green

## Implementation Notes
- **Deviation (discovered during implementation):** home hero countdown overflowed at mobile (375px) because DAYS unit text can be 3 digits, expanding the baseline unit width beyond plan. Fixed by adding `flex-wrap` to `app/(home)/components/countdown.tsx` to allow the three units to wrap to multiple rows on narrow screens.

## Success Criteria
- No horizontal scroll on Home at 375/768/1440.
- Awards: 1 col @375, 2 col @640, 3 col @1024. Hero not excessively tall on mobile.
- Notification panel never clips the right edge, even <320px.

## Risks
- Low. All edits are class-level breakpoint additions; desktop appearance unchanged (`lg:`/`sm:` restore current values).

## Next Steps
Feeds Phase 05 verification. Independent of Phases 03 and 04.
