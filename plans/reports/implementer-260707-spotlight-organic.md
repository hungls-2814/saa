# Spotlight Board — background asset fix + organic (dart-throwing) placement

**Task:** Fix two remaining `/kudos` Spotlight issues vs. design (screenId `MaZUn5xHXZ`, node `B.7_Spotlight`). Presentational only.

**Status: DONE**

## Issue 1 — background asset

Tried to extract the design's real background layer first:
- `list_media_nodes`/`get_media_files` on the frame: none of `B.7_Spotlight`'s
  3 background rectangles (`2940:14178` "image 24", `2940:14181` "image 25",
  `2940:14173` "Root further mo rong 1") are `MM_MEDIA_`-prefixed, so they
  never appear.
- `get_media_file` (fileKey + nodeId) on all three: **401 Unauthorized**.
- `get_figma_image` on the same node IDs: **500**.

Fell back to `get_frame_image` (full 1440x5862 frame render) and cropped to
`B.7_Spotlight`'s own bounding box (142,1658)-(1299,2206) — same fallback as
the prior round, confirmed still the only working path for this file's
isolated-layer export. That crop (`spotlight-box.png` in scratch) is the
ground truth I calibrated against; I did **not** use it directly as the
asset since it has the word-cloud names baked in (would double-render
against the real DOM text).

Pixel-sampled the crop and found the previous asset had drifted from the
design on two axes:
1. **Extent** — design's swirl fades to base navy by ~x=0.30-0.35 of the
   width at every row; the old asset bled across ~40-60% of the width.
2. **Brightness/saturation** — design swirl pixels top out around
   `rgb(75,58,24)` against a `rgb(3,11,15)` base; the old asset reused the
   brand swirl art at close to full saturation/brightness.

Recomposed `public/kudos/spotlight-bg.png` (1735x822, still name-free) in a
scratch Pillow script: same base navy + constellation dot/line mesh as
before (full-canvas, unchanged density), but the swirl layer is now a
different `kv-background.png` slice (x:1150-1440, chosen because it has the
best green/purple/mustard hue variety at every row — the design's swirl
runs the *entire left edge top-to-bottom*, not just a bottom-left corner, so
the source slice needed color across full height, not just its lower half),
stretched to cover the canvas, desaturated (×0.62) and darkened (×0.42), then
faded out via a single smooth horizontal cosine-eased + Gaussian-blurred
alpha mask (no paste-box — per `[[composing-name-free-background-radial-fade-pil]]`,
a paste-box + independent edge mask leaves a visible seam; this is a
continuous per-pixel field, so no box edge exists to begin with).

Compared old vs. new vs. the design crop side-by-side at matching crop
regions (viewed in-session): new asset's left-edge swirl extent, hue mix,
and overall darkness now closely track the design reference; base navy and
constellation mesh were already correct and are unchanged.

Generation script (not committed, one-off asset build):
`/tmp/.../scratchpad/spotlight/gen-spotlight-bg.py` (Pillow, `.claude/skills/.venv/bin/python3`).

## Issue 2 — organic (dart-throwing) placement

**Root cause confirmed:** the prior layout placed every instance in a
jittered grid cell — even with per-instance jitter, centers still
clustered around a small, fixed set of cell-center columns/rows, so the
cloud read as aligned rows/columns rather than a genuinely random scatter.

**Fix:** replaced the grid assignment with deterministic dart-throwing,
split across two new files to keep each under 200 lines:

- `spotlight-scatter-dart-throw.ts` (new, 168 lines) — the placement
  primitives:
  - `buildPendingInstances`: orders the work list as every node's primary
    (repeat 0) first, **heaviest node first**, then each repeat layer across
    all nodes in turn (all repeat-1's, then all repeat-2's, ...). Primaries
    claim space while the canvas is emptiest (guarantees "every receiver
    gets at least one instance" even under density pressure); repeat layers
    grow density evenly across the whole canvas instead of one node's
    cluster filling in before its neighbors start.
  - `placeInstance`: for each instance, tries up to 800 deterministic seeded
    candidate positions (`seededFraction`, no `Math.random`/`Date.now`) at
    its desired font; if none clear, retries at 5 progressively smaller
    fonts down to `FONT_MIN_PX` (the escape valve for crowded regions). A
    candidate is accepted only if its estimated box (same
    `CHAR_WIDTH_FACTOR`/`LINE_HEIGHT_FACTOR` formula the test suite's own
    `boundingBoxOf` uses, plus a small 2px margin) clears every reserved
    rect (search box / header / ticker) and every already-placed box.
    Returns `null` (instance dropped, never rendered overlapping) if no
    step/attempt ever clears.
- `spotlight-scatter-layers.ts` (rewritten, 86 lines) — orchestration only:
  computes each instance's desired font/opacity from node weight + repeat
  decay (unchanged formulas), calls `placeInstance`, assembles `ScatterItem`s.
- `spotlight-scatter-grid.ts` (rewritten, 101 lines) — foundation types
  (`ScatterItem`, `PxBox`, `ReservedRect`) + `seededFraction` PRNG +
  `boxesIntersect`/`boxIntersectsReserved` collision primitives. Dropped the
  now-unused cell-grid helpers (`assignShuffledCells`, `countAvailableCells`,
  `seededShuffle`) since there's no grid anymore.

Tuning notes: initial margin (6px) + attempt budget (160) under-packed a
realistic 7-receiver/14-repeat case (only 74/98 instances placed against a
measured ~74% area-packing ratio — coincidentally right at the Rényi random
sequential adsorption limit). Reduced margin to 2px (still non-zero
breathing room, but proportionally cheap since it was eating up to 34% of a
`FONT_MIN_PX` box's height) and raised attempts to 800/6 shrink steps; all
98 now place, and full-suite runtime stayed at ~300-400ms for this test file.

**Tests** (`spotlight-scatter.test.ts` unchanged behavioral assertions,
`spotlight-scatter-overlap.test.ts` new — split out to stay under 200 lines,
shared fixtures/`expectNoOverlaps` factored into
`spotlight-scatter-test-helpers.ts`):
- No-overlap test unchanged and still green (it's a pure function of
  `leftPct`/`topPct`/`fontSize`/`name.length`, independent of *how* those
  were computed).
- **New**: "organic (non-grid) placement" — asserts no 2%-wide bucket of
  `leftPct` (or `topPct`) values holds more than 25% of all items, and that
  distinct rounded `leftPct` values cover >60% of the item count. A
  grid-based layout (even jittered) collapses dozens of items onto a
  handful of shared column/row centers and would fail both checks; true
  dart-throwing spreads continuously and passes comfortably.

## "1 Issue" dev-overlay finding

Could not observe the live overlay directly (no auth-gate bypass, per
instructions — `/kudos` redirects unauthenticated to `/login` before any
component renders). Ran `npx eslint app/kudos` instead and found exactly 2
pre-existing warnings, both `@next/next/no-img-element` (raw `<img>` instead
of `next/image`): `app/kudos/components/avatar.tsx:37` and
`app/kudos/components/kudos-banner.tsx:125`. Both files are reachable from
the `/kudos` route's module graph (`avatar.tsx` via `kudos-person.tsx`/
`sidebar-gifts.tsx`, `kudos-banner.tsx` directly) — Next's dev overlay
surfaces ESLint warnings for the current route's compiled modules, so this
is almost certainly the source of the "N Issues" badge. Neither file is in
this task's scope (not touched, not created by any prior Spotlight round) —
flagging for a separate task rather than fixing here.

## Verification
- `npm run typecheck` — pass, 0 errors
- `npx eslint` (touched files) — pass, 0 warnings
- `npm run test` — **499 passed** across 49 files (was 498/48; +1 new test
  file split out, +1 new organic-placement test)
- `git diff proxy.ts app/kudos/page.tsx` — empty (no auth-gate bypass used;
  visual validation instead rendered `buildScatterItems`'s real output
  against 7 mock `SpotlightNode`s into static HTML via `tsx`, screenshotted
  with Playwright, viewed in-session, not saved to the repo)

## Files
- `public/kudos/spotlight-bg.png` — replaced (273 KB, was 566 KB)
- `app/kudos/components/spotlight-scatter-dart-throw.ts` — new, 168 lines
- `app/kudos/components/spotlight-scatter-layers.ts` — rewritten, 86 lines
- `app/kudos/components/spotlight-scatter-grid.ts` — rewritten, 101 lines
- `app/kudos/components/spotlight-scatter.ts` — doc-comment update, 58 lines
- `app/kudos/components/spotlight-board.tsx` — doc-comment update, 167 lines
- `app/kudos/components/spotlight-scatter.test.ts` — trimmed to core
  behavioral tests, 101 lines
- `app/kudos/components/spotlight-scatter-overlap.test.ts` — new (no-overlap
  + highlighted + organic-placement describes), 84 lines
- `app/kudos/components/spotlight-scatter-test-helpers.ts` — new (shared
  fixtures/assertions), 56 lines

## Memory
Reused `[[composing-name-free-background-radial-fade-pil]]` and
`[[momorph-asset-extraction-via-frame-crop]]` — both held up unchanged; no
new memory needed for Issue 1. Considered saving a note on the Rényi random
sequential adsorption limit for dart-throwing packing density, but that's a
one-off numeric coincidence for this task's specific density target, not a
durable process lesson — skipped.

**Status:** DONE
**Summary:** Recalibrated the Spotlight background swirl to the design's
actual left-edge-band extent/darkness (measured via frame-crop pixel
sampling), and replaced jittered-grid placement with deterministic
dart-throwing (seeded candidates, box-collision acceptance, font-shrink
escape valve) so names scatter organically with no grid alignment and no
overlaps. All tests/typecheck/lint green; auth-gate files untouched.
**Concerns:** None blocking. The "1 Issue" overlay diagnosis is inferred
from static ESLint analysis (couldn't observe the live overlay without
bypassing auth), though the 2 pre-existing `no-img-element` warnings in
`avatar.tsx`/`kudos-banner.tsx` are the only plausible source found in the
`/kudos` route's module graph.
