# Spotlight word-cloud retune (v2) — report

## Design source
- MoMorph screen `MaZUn5xHXZ`, node `B.7_Spotlight` (`2940:14174`), 1157x548.
- Extracted via `query_by_type(TEXT)` across all ~113 name-repeat text nodes inside the frame: real design font sizes for names run **6.66px–11.34px** (only the header "388 KUDOS" and hashtag chips use larger sizes). All name instances are `#FFF` except one: node `2940:14198` ("Nguyễn Hoàng Linh", the highest of the four observed font sizes, 11.34px) uses `rgba(241, 118, 118, 1)` (`#F17676`) — every *other* repeat of that same name elsewhere in the frame stays white. That is the one red highlight, and it lands on the name with the largest font in the set — i.e. the design's own top-weight receiver. This directly validated the plan: highlight = top-weight receiver's first instance, color `#F17676`.

## New model: single non-overlapping layer
Replaced the two-layer primary+fill model (`buildPrimaryLayer`/`buildFillLayer`, coarse 6-col + fine 12-col grids, fill allowed to overlap) with one function, `buildScatterLayer` (`spotlight-scatter-layers.ts`):

- **Grid sizing is derived, not fixed.** `cols = floor(canvasWidth / minCellWidth)` where `minCellWidth = maxNameLen * FONT_MIN_PX * CHAR_WIDTH_FACTOR + CELL_GAP_PX` — i.e. cols is chosen so that even the *longest* receiver name in the current data still fits at the floor font size (11px) inside one cell, width-wise. `rows` grows (capped by an analogous height-derived `maxRows`) until there are enough non-reserved cells for every `(node, repeat)` instance.
- **Every instance goes through the same box-fit cap** — `fontSize = min(desiredFont, maxFontByWidth, maxFontByHeight)`, with no floor override (the old primary layer had `Math.max(FILL_MIN_FONT_PX, ...)`, which could silently violate its own box-fit under tight cells). Removing that floor is what makes "never overlaps" a structural guarantee for *all* instances, not just one per node — dropping it means density now truly comes from grid fineness, not from the two-layer split.
- **Font/opacity**: `FONT_MIN_PX=11`, `FONT_MAX_PX=18`; desired font = `11 + weightScale*7`, minus `0.6px` per repeat beyond the first (still clamped by the cell). Opacity: `0.4 + weightScale*0.6`, minus `0.06` per repeat, floored at `0.4`.
- **Reserved zones** (fractional rects, in `spotlight-scatter-layers.ts`, checked by cell-center in `spotlight-scatter-grid.ts`'s new `countAvailableCells`/`assignShuffledCells`): search box top-left (`0–22% x, 0–15% y`), "N KUDOS" header (`32–68% x, 0–15% y`), activity ticker bottom-left (`0–52% x, 82–100% y`). Verified programmatically: 0 of 98 generated instances land inside any reserved rect.
- `spotlight-scatter.ts` now just calls `buildScatterLayer` once (kept the existing `DEFAULT_REPEATS_PER_NODE=14` / `MAX_TOTAL_INSTANCES=140` density cap).
- `spotlight-board.tsx`: added `HIGHLIGHT_COLOR = "#F17676"`, applied via `style.color` when `item.isHighlighted`; updated the module/inline comments that described the retired two-layer model.

## Test enforcement (`spotlight-scatter.test.ts`, 189 lines)
- `expectNoOverlaps(items)` — pairwise bounding-box intersection over **every** item (not a "primary" subset), using the same box estimate the algorithm itself uses to cap fonts. Run at: realistic 14-node/7-name density, a custom 800x400 canvas, and 40 nodes packed to the density cap.
- `isHighlighted` — asserted `filter(isHighlighted).length === 1`, on the higher-weight node (`"a"`, weight 42 vs `"b"`'s 20), and that the same node is picked deterministically across repeated calls.
- Font-range assertion: every instance's `fontSize` is within `[11, 18]`.
- Kept prior behavioral assertions (identity passthrough, key uniqueness, SSR-determinism, weight scaling, density cap, canvas bounds) adjusted for the new single-layer field semantics (`isPrimary` = first repeat, not "collision-free subset").

## Visual check
Could not screenshot the live `/kudos` route — it's Supabase-auth-gated (`app/kudos/page.tsx` redirects unauthenticated users) and I did not modify `proxy.ts`/`page.tsx` to bypass it, per instruction. Instead, rendered the pure layout output directly: ran `buildScatterItems(mockSpotlightNodes)` (the same 7-name/weight seed data `mock-data.ts` uses, which itself comes from the design) via `tsx`, generated static HTML reproducing `spotlight-board.tsx`'s exact CSS (`cqw` font sizing formula, absolute positioning, `spotlight-bg.png` background), and screenshotted it with Playwright at 1200x620 (`/tmp/.../scratchpad/spotlight-preview.png`, not committed — scratch-only). Result: 98 instances, small/dense, no visible overlaps, one red name ("Đỗ hoàng Hiệp", the mock data's top-weight receiver at 42), even coverage across the whole board including the swirl area, nothing rendered where the search/header/ticker would sit.

`git status` confirms only the intended files changed — no `proxy.ts`/`page.tsx` diff.

## Files
- `app/kudos/components/spotlight-scatter-grid.ts` — 111 lines. Added `isHighlighted` to `ScatterItem`, `ReservedRect` type, `countAvailableCells`, rewrote `assignShuffledCells` to exclude by reserved-rect fraction instead of a fixed reserved-column count.
- `app/kudos/components/spotlight-scatter-layers.ts` — 172 lines. Replaced `buildPrimaryLayer`/`buildFillLayer` with the single `buildScatterLayer`.
- `app/kudos/components/spotlight-scatter.ts` — 58 lines. Orchestrator now calls the one layer function.
- `app/kudos/components/spotlight-board.tsx` — 165 lines. Highlight color wiring + updated comments.
- `app/kudos/components/spotlight-scatter.test.ts` — 189 lines. Rewritten per the new done-bar.

## Verification
- `npm run typecheck` — pass, no errors.
- `npm run lint -- app/kudos` — 0 errors, 2 pre-existing `<img>` warnings (unrelated files: `avatar.tsx`, `kudos-banner.tsx`, untouched by this task).
- `npm run test` (full suite) — 48 files / 498 tests passed, including the 18 in the rewritten `spotlight-scatter.test.ts`.

## Concerns
- Reserved-zone rects (search/header/ticker footprints) are hand-estimated from `spotlight-board.tsx`'s Tailwind classes (padding, box sizes), not pixel-measured from a live render — generous enough that they shouldn't clip real content, but not derived from an exact DOM measurement.
- `MAX_GRID_COLS = 16` caps grid fineness even for very short names; not expected to matter for the current ~7-20 Vietnamese-name receiver set (names are long enough that the width-derived `cols` binds well below 16 in practice — confirmed cols=~9-10 for the 7-node mock set).

**Status:** DONE
