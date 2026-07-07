# Implementer Report — `/kudos` banner fixes (Cover gradient contrast + pills-in-KV)

## Task
Fix two `/kudos` banner defects to match the MoMorph design (`fileKey=9ypp4enmFmdK3YAFJLIu6C`, `screenId=MaZUn5xHXZ`), presentational only.

**Status: DONE**

## Root-cause echo

**Defect 1 — contrast.** The code only applied a thin bottom fade (`h-[37px]/47px/67px` gradient-to-transparent at the container's bottom edge), so the KUDOS wordmark and heading sat directly over the raw swirl art with no darkening — low contrast against the bright orange.

**Defect 2 — pills outside the KV.** The two function pills lived in a separate `<div>` below the keyvisual container (on the page's flat `#00101A` background), not inside the keyvisual's own bounds, so they never got the art/gradient backing the design shows.

## Design values extracted vs. what was actually applied

The design's `Keyvisual > Cover` node reports `linear-gradient(25deg, #00101A 14.74%, rgba(0,19,32,0) 47.8%)` on a `1440×957` box offset to `top:445px` inside the `512px`-tall keyvisual instance. Taking those numbers at face value (a `top-[86.91%] h-[186.91%]` overlay on the container) rendered *close* but measurably wrong — I verified this by extracting the design's actual rendered background pixels (crop of the authoritative full-page design screenshot) and diffing them against `public/kudos/kv-background.png` (the raw, un-darkened asset already in the repo). Mean abs pixel diff in the background region was **34.2/255** — visibly too much swirl showing through versus the design.

Root cause: the `957`-tall/`top:445px` box is a leftover from the Cover node's master component (authored at a taller size elsewhere) — it does not describe this instance's actual `1440×512` crop. Trusting it produces the wrong darkening extent.

**Fix — re-derived the gradient empirically from real pixels.** Using the raw background asset and the design's composited screenshot as ground truth, I solved for the affine darkening function `alpha(x,y)` directly (least-squares fit over ~3,700 masked sample points, excluding text/wordmark/pill regions), then converted that fit back into a clean CSS `linear-gradient` for a gradient box that exactly matches the container (`1440×512`, no offset):

```
linear-gradient(16.9deg, #00101A 19.65%, rgba(0,16,26,0) 68.87%)
```

Applied as `absolute inset-0` (full-size, no offset needed) instead of the old bottom sliver. Residual mean abs diff in the background-only region after this fix: **3.7/255** (down from 34.2/255) — a ~9x improvement, matching antialiasing/compression noise level.

## How the background now contains the pills

Removed the outer `flex flex-col gap-*` wrapper that separated the keyvisual `<div>` from a second pills `<div>`. `KudosBanner` now returns a single container (`relative h-[280px]/360px/512px w-full overflow-hidden`, unchanged size) holding: Cover overlay → heading → wordmark → pills row, with the pills row `absolute inset-x-0 bottom-4/6/8` anchored to the keyvisual's own bottom edge — the design's own `Button chuc nang` frame sits 32px above the keyvisual's 512px bottom edge, matched here via `lg:bottom-8`. Horizontal inset (`px-6/10/36`) and the 32px gap between pills (`lg:gap-8`) also come from the design's measured `Frame 487`/`Button chuc nang` bounds. `KudosBoard`'s composition (banner rendered standalone above the rest of the page) needed no changes — no double-render or extra spacing above section A.

## Overlay-alignment result

Rendered the page at 1440px width (design's own frame width) via Playwright, screenshotted, and diffed against the design's full-page export cropped to the same `0,0,1440,512` region:
- Background-only pixels (excluding text/wordmark/pill boxes): **3.72** mean abs diff (was 34.2 pre-fix).
- Full region incl. text/icons (expected small diffs from font rendering, not a defect): **6.04** mean abs diff.
- Visual diff image confirms near-black (i.e. matching) everywhere except font-rendering edges on text/wordmark/pill labels.

One pre-existing, out-of-scope observation: the two pills' *widths* (738px/381px in the design) don't match 1:1 in the render (currently ~593px/513px) because the existing `flex-1 basis-[280px]`/`basis-[200px]` values predate this task and weren't part of either stated defect (contrast, pills-inside-KV). Position/gap (32px) and vertical placement now match; I left the width ratio untouched per file-ownership/scope discipline — flagging it here rather than silently expanding scope.

## Files/assets changed
- `app/kudos/components/kudos-banner.tsx` (115 lines) — restructured to a single container; replaced the bottom-fade div with the full-size, re-derived Cover gradient; moved the pills row inside the container as an absolutely-positioned, bottom-anchored row.
- No asset files touched (`kv-background.png`, `kudos-wordmark.svg` unchanged, per instructions).

Temporary auth-gate bypass used only for local visual validation (`proxy.ts` `PROTECTED_PATHS`, `app/kudos/page.tsx` user fallback) — reverted via `git checkout`; `git diff` on both is empty.

## Verification
- `npx tsc --noEmit`: clean.
- `npm run lint`: 0 errors, 14 warnings (all pre-existing, including the same `no-img-element` warning already present on this file's wordmark `<img>` before this change).
- `npm run test`: 48 files / 492 tests passed (full suite, including `kudos-banner.test.tsx` and `kudos-board.test.tsx` unchanged and green).

**Status:** DONE
