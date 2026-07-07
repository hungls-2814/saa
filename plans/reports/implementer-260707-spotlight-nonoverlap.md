# Implementer Report — Spotlight Board word-cloud fix (F005)

## Task
Fix `/kudos` Spotlight Board (`B.7_Spotlight`, screenId `MaZUn5xHXZ`): (1) overlapping receiver names in the
word-cloud, (2) missing bottom-left "recent activity" ticker, and (3) make "no overlap" objectively testable.
Presentational only.

**Status: DONE**

## Root cause (Defect 1 — overlap)

`buildScatterItems` gave every instance an **independent seeded `(leftPct, topPct)`** with no awareness of the
other labels it was placing — bounding boxes collided by construction, visible on screen as names stacked on
top of each other.

## The fix — jittered grid

`app/kudos/components/spotlight-scatter.ts` was rewritten around a **jittered grid**, which makes non-overlap a
structural guarantee instead of a hope:

1. Partition the 1157×548 design canvas into a `GRID_COLS=6` × N grid (N = `ceil(instances / 6)`), one instance
   per cell.
2. Cap each instance's font size so its *estimated* box
   (`name.length * fontSize * CHAR_WIDTH_FACTOR` wide, `fontSize * LINE_HEIGHT_FACTOR` tall) fits inside its own
   cell minus a gap (`CELL_GAP_PX`).
3. Apply a small deterministic jitter (seeded, no `Math.random`/`Date.now`), itself clamped so the box can never
   cross into a neighbouring cell.
4. Cap total instance density (`MAX_GRID_ROWS=8` rows-worth of cells) so a large receiver list stays
   well-spaced rather than shrinking into illegibility — every receiver still gets ≥1 (primary) instance.
5. The bottom row's first 3 columns are reserved (excluded from the cell pool) so no word-cloud label renders on
   top of the new activity ticker, which occupies that same corner.

**Calibration note (found during live-browser validation, not just unit tests):** the first pass used
`CHAR_WIDTH_FACTOR=0.55`/`LINE_HEIGHT_FACTOR=1.3`, which is what a naive "average glyph width" guess looks
like — the *pure* unit test passed (it used the same wrong constants to build its own boxes), but the actual
rendered DOM in Chromium showed **23 real overlaps** at 1440px and **65** at 375px, because real Vietnamese
bold-glyph advance widths run wider than a plain 0.55 estimate. I measured actual
`getBoundingClientRect()` output against real rendered names and recalibrated to `0.7`/`1.6` (with headroom),
which eliminates the discrepancy — see "Live-browser validation" below for the before/after numbers.

**Second calibration issue — responsive font sizing:** the panel is `w-full` with a CSS `aspect-ratio`, so its
*physical* width shrinks on narrow viewports, but `ScatterItem.fontSize` was applied as a literal `px` value
computed against the fixed 1157px canvas — fonts didn't shrink with the container, causing new overlaps on
mobile (65 measured at 375px before the fix). Fixed by making the panel a CSS container-query container
(`containerType: "inline-size"`) and rendering font-size in `cqw` units
(`(item.fontSize / SPOTLIGHT_CANVAS_WIDTH_PX) * 100 + "cqw"`) so it scales exactly with the panel's real
rendered width. `SPOTLIGHT_CANVAS_WIDTH_PX`/`_HEIGHT_PX` are now exported as the one source of truth for that
conversion.

## Objective done-bar test

`app/kudos/components/spotlight-scatter.test.ts` → describe block `"no-overlap guarantee (objective done-bar
for 'names must not overlap')"`:
- Computes each returned item's bounding box from `leftPct`/`topPct`/`fontSize`/`name.length` against the
  canvas dimensions (same formula the algorithm itself uses to cap font size).
- Asserts **no two boxes intersect**, pairwise, across 14 nodes / realistic density, and again at a custom
  canvas size (800×400) to prove the guarantee isn't tied to one fixed size.
- Also verifies density capping (`caps total density so a large receiver list doesn't shrink into
  illegibility`) and updated the pre-existing tests that encoded the old (buggy) independent-placement behavior
  (margin-bounds assumption, strict per-repeat font-size decrease) to match the new grid algorithm.

**This test passes** (17/17 in that file). It is the objective, automated substitute for eyeballing
screenshots — but as the calibration note above shows, it's only as good as its box-estimate constants, so I
additionally verified against the *real* rendered DOM in a browser (next section), which is what actually
caught the two calibration bugs.

## Defect 2 — activity ticker

Design nodes `3004:15995`…`2940:14230` (bottom-left, over the swirl): 5-6 stacked rows, graduated opacity
(faint/oldest at top → full/newest at bottom), format `08:30PM Nguyễn Bá Chức đã nhận được một Kudos mới`.

- New pure module `app/kudos/components/spotlight-activity-ticker.ts` → `buildActivityTicker(nodes, maxRows=5)`:
  sorts by `lastReceivedAt` desc, takes the top `maxRows`, reverses to oldest-first (so index 0 renders at the
  top/faintest, last index at the bottom/full-opacity) — no invented data, every row is a real node.
- New render-helper `formatTickerTime` in `render-helpers.ts`: 12-hour clock, no space before AM/PM, e.g.
  `08:30PM` (UTC getters, same SSR/hydration-parity reasoning as the existing `formatKudosTimestamp`).
- New i18n key `KudosPage.spotlight.activitySuffix`: vi `"đã nhận được một Kudos mới"`, en
  `"just received a new Kudos"`.
- Rendered in `spotlight-board.tsx` as a `pointer-events-none` absolute block, bottom-left, with per-row opacity
  `(index+1)/length`, each row `{time} {name} {suffix}` as one text node (verified against real mock data,
  matches the design's exact string for `Nguyễn Bá Chức`/20:30 → `08:30PM Nguyễn Bá Chức đã nhận được một
  Kudos mới`).
- Updated the earlier "no live push" doc comment: that clarification only ruled out a realtime feed, not
  statically rendering this text from data already on the page.

## File-size split

`spotlight-scatter.ts` grew past the project's 200-line cap while carrying both the grid algorithm and the
ticker builder — split the ticker into its own single-purpose module (`spotlight-activity-ticker.ts`, 42 lines)
per `development-rules.md`. Final line counts: `spotlight-scatter.ts` 198, `spotlight-activity-ticker.ts` 42,
`spotlight-board.tsx` 153, `render-helpers.ts` 74 — all under 200.

## Live-browser validation (visual-validation loop, `momorph-implement-design` skill)

Since `/kudos` and the SSR page guard are auth-gated (`proxy.ts` + `page.tsx`'s own `redirect("/login")`), I
temporarily bypassed both (`&& false` on the guard conditions, page.tsx falling back to the existing
`mock-data.ts` `mockBoardData` — which already carries the design's exact 7 Spotlight names) to drive a real
Next dev server + Playwright against the actual rendered DOM, then reverted both files
(`git diff proxy.ts app/kudos/page.tsx` confirmed empty before finishing).

Verified via `getBoundingClientRect()` pairwise-intersection over every rendered `<a>` label (the real DOM
equivalent of the unit test):

| Viewport | Before fix | After factor calibration | After cqw responsive fix |
|---|---|---|---|
| 1440×1000 (desktop) | 23 overlaps | 0 overlaps | 0 overlaps |
| 375×812 (mobile, panel physically 312px wide) | not yet checked | 2 overlaps (sub-px, cell-boundary rounding) | **0 overlaps** |

Final state at both viewports: **0 overlapping name pairs**, ticker visible with real formatted rows (desktop
screenshot shows all 5: `12:15PM Dương thúy An…` through `08:30PM Nguyễn Bá Chức đã nhận được một Kudos mới`),
no word-cloud label rendered on top of the ticker text.

Screenshots (evidence, not committed to the repo):
- Desktop (1440×1000): `/tmp/claude-1000/-home-lesonghung-WORKSPACE-AIDD-saa/d26a412a-c160-4328-92ee-0011e5541c91/scratchpad/spotlight-evidence/spotlight-desktop-final.png`
- Mobile (375×812): `/tmp/claude-1000/-home-lesonghung-WORKSPACE-AIDD-saa/d26a412a-c160-4328-92ee-0011e5541c91/scratchpad/spotlight-evidence/spotlight-mobile.png`

## Banner check (secondary, quick)

Compared `kudos-banner.tsx` against the design frame image — the heading ("Hệ thống ghi nhận và cảm ơn") sits
correctly over the baked KUDOS wordmark art, alignment matches the design. This was already a deliberate prior
decision (documented in the file's own comment: KUDOS wordmark is baked into the background image, heading
renders live on top). No fix needed.

## Files changed

- `app/kudos/components/spotlight-scatter.ts` (198 lines) — jittered-grid rewrite of `buildScatterItems`
- `app/kudos/components/spotlight-scatter.test.ts` (155 lines) — updated for new algorithm + objective
  no-overlap done-bar tests
- `app/kudos/components/spotlight-activity-ticker.ts` (42 lines, new) — `buildActivityTicker`
- `app/kudos/components/spotlight-activity-ticker.test.ts` (39 lines, new)
- `app/kudos/components/spotlight-board.tsx` (153 lines) — renders the ticker, `container-type`/`cqw` responsive
  font sizing
- `app/kudos/components/spotlight-board.test.tsx` (85 lines) — ticker render tests
- `app/kudos/components/render-helpers.ts` (74 lines) — `formatTickerTime`
- `app/kudos/components/render-helpers.test.ts` (109 lines) — `formatTickerTime` tests
- `messages/vi.json`, `messages/en.json` — `KudosPage.spotlight.activitySuffix`

`proxy.ts` and `app/kudos/page.tsx` were touched only for the live visual-validation loop and reverted —
`git diff proxy.ts app/kudos/page.tsx` is empty.

## Verification

- `npm run typecheck` — pass, 0 errors
- `npm run lint` — 0 errors (13 pre-existing warnings elsewhere in the repo, unrelated to these files)
- `npm run test` — 48 files, **492 tests pass**
- Live browser (Playwright, real DOM `getBoundingClientRect()`): 0 overlaps at 1440×1000 and 375×812

## Unresolved / notes for follow-up

- The `0.7`/`1.6` box-estimate constants are calibrated against Montserrat bold rendering in Chromium; if the
  font stack changes, re-measure (the comment in `spotlight-scatter.ts` documents how).
- `CELL_GAP_PX=16` includes deliberate headroom for cross-browser sub-pixel rounding differences (Chromium was
  the only engine tested here).
