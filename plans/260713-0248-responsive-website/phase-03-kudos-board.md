# Phase 03 — Kudos Board

**Priority:** P1 · **Status:** complete · **Depends:** Phase 01

## Overview
The Kudos board is the most component-dense page and is already the most mobile-aware (feed +
sidebar collapse via `flex-col lg:flex-row`, container-query spotlight, `overflow-x-auto`
toolbar). Work here is **verification + a few targeted fixes**, not restructuring.

## Key Insights (from audit)
- **Banner** (`kudos-banner.tsx`): on mobile height `h-[280px]`, the absolutely-positioned
  wordmark (`top-[130px]`, ~57px tall) + absolute pill row (`bottom-4`) + centered heading can
  crowd/overlap inside 280px. **Verify at 375px**; if tight, raise mobile height or make the pill
  row static (flow below) instead of absolute.
- **kudos-card** highlight variant `h-[525px]` is a fixed height with `line-clamp-3` → clipping
  or dead space on narrow cards. Prefer `min-h-[525px]` (or responsive height) on small screens.
- **compose modal** (`compose-kudos-modal.tsx`): centered `w-full max-w-[752px]` with `p-4` inset
  + internal scroll — functional on mobile, **not broken**. Optional enhancement: true full-screen
  on `<sm` (drop `p-4` inset, `rounded-3xl`, `max-h`) for a better mobile compose experience.
- **sidebar-stats** fixed font sizes `text-[32px]` / `text-[22px]` — not responsive; scale with `sm:`.
- Sidebar collapse threshold is `lg` (1024) → tablet 768 is single-column. Confirm that's the
  desired tablet behavior (acceptable per plan; note only).

## Requirements
- No overlap/clipping in banner at 375px.
- Highlight card content not clipped on narrow widths.
- Compose flow usable on mobile.
- No horizontal scroll on Kudos at 375/768.

## Related Code Files
**Verify (change only if audit risk confirmed at 375px):**
- `app/kudos/components/kudos-banner.tsx` — absolute wordmark/pill overlap in `h-[280px]`

**Modify:**
- `app/kudos/components/kudos-card.tsx` — highlight `h-[525px]` → `min-h` or responsive height
- `app/kudos/components/sidebar-stats.tsx` — `text-[32px]`/`text-[22px]` → add `sm:` scaling from a smaller mobile base
- `app/kudos/components/compose-kudos-modal.tsx` — *(optional)* full-screen on `<sm`

**Read for context:** `app/kudos/components/kudos-board.tsx` (layout owner), `spotlight-board.tsx`, `highlight-carousel.tsx`, `compose-toolbar.tsx` (already responsive — reference, no change)

## Implementation Steps
1. Load Kudos at 375px (Playwright) — capture banner, highlight card, spotlight, compose modal.
2. Banner: if wordmark/pills/heading overlap → raise mobile `h-[280px]` or destack pill row to static flow.
3. kudos-card highlight: swap fixed `h-[525px]` for `min-h-[525px]` (or `h-auto sm:h-[525px]`), keep `line-clamp-3`.
4. sidebar-stats: mobile base font (e.g. `text-2xl sm:text-[32px]`, `text-lg sm:text-[22px]`).
5. *(optional)* compose modal full-screen on `<sm`.
6. typecheck + lint.

## Todo List
- [x] Verify banner at 375px; fix overlap only if confirmed
- [x] kudos-card highlight height → min-h/responsive
- [x] sidebar-stats font sizes responsive
- [x] (optional) compose modal full-screen on mobile
- [x] Confirm tablet (768) single-column feed/sidebar acceptable
- [x] typecheck + lint clean; existing tests green

## Implementation Notes
- **Deviation (banner/card fixes):** kudos hero-badge meta row (`kudos-person.tsx`) leaked past narrow cards — fixed with `flex-wrap`. Kudos-banner heading/wordmark overlap was confirmed at mobile; fixed at BOTH mobile AND tablet (sm range) by top-anchoring the heading instead of raising height alone.

## Success Criteria
- Banner elements legible & non-overlapping at 375px.
- Highlight card shows content without clipping on mobile.
- No horizontal scroll on Kudos at 375/768/1440.

## Risks
- Kudos has the largest test surface — run the full `app/kudos/**` vitest files after edits and fix any snapshot/layout assertions.

## Next Steps
Feeds Phase 05. Independent of Phases 02 and 04.
