# Implementer Report — Spotlight Board name-free background + real word-cloud

## Task
Fix one design-fidelity bug in `/kudos` Spotlight Board (F005): `spotlight-bg.png` had
demo receiver names baked into the background bitmap (doubled with the DOM text overlay,
and a static picture instead of a data-driven word cloud). Presentational-only fix.

**Status: DONE**

## Root cause (confirmed)
MoMorph node `B.7_Spotlight`'s background is composed of 3 RECTANGLE layers ("image 24",
"image 25", "Root further mo rong 1") that sit **behind** ~90 real Figma TEXT nodes (the
demo names). None of the 3 background rectangles are `MM_MEDIA_`-prefixed, so they never
appear in `get_media_files`; `get_figma_image` 500'd on their node IDs directly. The
previous implementation's only fallback (crop `get_frame_image`'s full-frame render) baked
in the composited text because the word-cloud saturates almost the entire frame — there is
no name-free sub-region to crop.

## Fix

### 1. Name-free background (composed asset, not extracted)
Per the task's explicit fallback instructions, composed a fresh asset in Python/Pillow
(`public/kudos/spotlight-bg.png`, 1735×822, replaces the old file) rather than extracting:
- **Constellation mesh**: ~110 scattered points (seeded `random.seed(20260707)`, one-off
  generation script, not app runtime) connected to their 3 nearest neighbors with faint
  lines + dots — reproduces the design's dark particle-map texture, zero text.
- **Organic swirl**: reused this project's *own* `public/kudos/kv-background.png` (the
  `/kudos` keyvisual, MoMorph node `I2940:13432;2167:5141`), cropped from its text/logo-free
  region (`x:820-1440, y:0-300`, avoiding both the "KUDOS" wordmark and the banner's own
  dark bottom bar), muted 0.6x, and faded into the bottom-left corner via a **single radial
  alpha mask over a cover-fit canvas** (no separate paste-box — see memory note below for
  why the more obvious "paste + independently-blurred edge mask" approach leaves a visible
  hard rectangle).
- **Verified no baked text**: visually inspected the final PNG at full resolution (Read
  tool) — confirmed zero readable characters anywhere in the asset.

### 2. Real DOM word-cloud (`app/kudos/components/spotlight-scatter.ts`, new, 76 lines)
Pure, testable helper `buildScatterItems(nodes, repeatsPerNode = 4)`:
- Expands each real `SpotlightNode` into several scattered instances (default 4) to reach
  the design's density, **without inventing data** — every instance carries the source
  node's real `receiverId`/`name`/`lastReceivedAt`.
- Position/size/opacity are derived from a **deterministic seeded hash**
  (`Math.sin(seed * 12.9898) * 43758.5453123` fractional part — a well-known deterministic
  PRNG trick), seeded by `nodeIndex * 97 + repeat * 13 + 1`. No `Math.random`/`Date.now`
  anywhere, so layout is identical on server and client (no hydration mismatch) and
  trivially snapshot-testable.
- Node `weight` still drives the *primary* (first, `repeat===0`) instance's size/opacity;
  later repeats shrink/fade via a `falloff` factor for the "filler" density look.
- Positions clamped to a 14–86% margin band so large/long names never clip the panel's
  rounded border (measured empirically via screenshot — see visual-validation section).

`spotlight-board.tsx` was updated to: compute `scatterItems` once from all `nodes`
(`useMemo`, weight scale stays stable across searches), filter that list by the search
query (same UX as before — search hides/shows which names are visible), and render each
item as an absolutely-positioned `<Link>` (`left/top` %, `fontSize`, `opacity`,
`translate(-50%,-50%)`) instead of the old `flex-wrap` layout. Container switched from
`overflow-auto` to `overflow-hidden` (no stray scrollbar around a fixed-bounds word cloud).

## Files changed
- `public/kudos/spotlight-bg.png` — replaced (565 KB, was 274 KB), name-free
- `app/kudos/components/spotlight-scatter.ts` — new, 76 lines, pure helper
- `app/kudos/components/spotlight-scatter.test.ts` — new, 9 unit tests
- `app/kudos/components/spotlight-board.tsx` — word-cloud render logic + doc comment updated
- `app/kudos/components/spotlight-board.test.tsx` — updated 3 assertions from
  `getByText`/singular to `getAllByText`/`queryAllByText` (repeated names are now expected)

Generation script (not committed — one-off asset build, scratchpad only):
`/tmp/.../scratchpad/gen_spotlight_bg.py` (Pillow + numpy, `.claude/skills/.venv/bin/python3`).

## Visual validation
Bypassed the `/kudos` auth gate **temporarily** (`proxy.ts` `PROTECTED_PATHS` +
`app/kudos/page.tsx` guard/fetch, mirroring the prior `implementer-260707-kudos-fidelity`
report's approach) with 7 mock `SpotlightNode`s, screenshotted via Playwright at
1440px width, then **fully reverted both files** — confirmed via `git diff proxy.ts
app/kudos/page.tsx` = empty after `git checkout --`.

Compared against the design reference (`get_frame_image` render read at the start of this
task, which showed the *old* baked-text bug) and the design motif description:
- Background: dark constellation dot/line mesh across the whole panel + colorful organic
  swirl fading from the bottom-left corner, zero readable text — matches.
- Word cloud: real receiver names at varying size/opacity/position, denser near a few
  prominent (higher-weight) instances, matching the design's collage density. Some
  overlap between adjacent names is present — this matches the original design's own dense
  overlapping-text aesthetic (confirmed by comparing to the initial buggy reference image).
- Search ("Tìm kiếm") correctly filters to only the matching name's scattered instances.
- Compact/expand toggle: background still cover-fits and stays name-free at both aspect
  ratios; word cloud stays within bounds.
- Fixed a real clipping bug found during this validation pass: initial margin (6%) let
  large/long names bleed past the rounded panel border; bumped to 14% and switched
  `overflow-auto` → `overflow-hidden`.

## Test / build results
- `npm run typecheck`: pass, 0 errors
- `npm run lint`: pass, 0 errors (13 pre-existing warnings in unrelated files, none new)
- `npm run test`: **478 passed** across 47 files (includes 9 new scatter-helper tests + 6
  updated spotlight-board tests)

## Memory
Saved `[[composing-name-free-background-radial-fade-pil]]` — the PIL alpha-compositing
pitfall (paste-box + independent edge-blur mask leaves a visible hard rectangle; fix is
cover-fit canvas + single radial mask) for reuse on future MoMorph asset-composition tasks.

**Status:** DONE
**Summary:** Replaced the name-baked `spotlight-bg.png` with a composed name-free asset
(constellation mesh + reused-brand-swirl corner fade) and replaced the static flex-wrap
name list with a deterministic, data-driven scattered word-cloud. All tests/typecheck/lint
green; auth-gate files confirmed untouched after temporary screenshot bypass was reverted.
**Concerns:** None blocking. The background swirl's exact color/shape is a composed
approximation (not a pixel-exact Figma export) since the design's isolated background layer
has no working export path in MoMorph for this file — flagged in code comments for future
re-extraction if MoMorph's Figma-render pipeline is fixed for these node IDs.
