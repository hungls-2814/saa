# Implementer Report — Kudos Banner Wide-Viewport Proportions

## Task
Fix `/kudos` banner (`app/kudos/components/kudos-banner.tsx`) so proportions, the KUDOS
wordmark, and the swirl crop match the MoMorph design (`MaZUn5xHXZ`) at WIDE viewports
(not just exactly 1440px). Presentational only.

## Root cause (confirmed)
Two independent bugs, both only visible past 1440px viewport width:

1. **Proportions/swirl crop**: the banner used a fixed `lg:h-[512px]` while `w-full`. Past
   1440px, `bg-cover` scales the 1440×512 background image up to cover the wider (but still
   512-tall) box — since the scale factor differs per axis, the image gets zoomed and its
   top/bottom get cropped beyond the design's own framing.
2. **Content misalignment**: the heading/KUDOS wordmark/pills were positioned with
   `lg:left-36`/`lg:px-36` relative to the banner's own FULL-BLEED edges (banner renders
   outside the page's `max-w-[1440px]` column). Past 1440px viewport width, that drifts the
   wordmark right of where the design places it relative to the body content below (which
   IS in the centered `max-w-[1440px]` column).

## Design measurements extracted (MoMorph MCP, screenId `MaZUn5xHXZ`)
- `MM_MEDIA_KV Background` (node `I2940:13432;2167:5141`): `1440×512px`, own reported
  `aspect-ratio: 45/16` (= 2.8125). Confirmed against the actual asset file
  (`public/kudos/kv-background.png`, verified `1440×512` via PIL) — ratio matches exactly.
- `Frame 487` (heading+wordmark ancestor, node `2940:13436`): `width:1440px`,
  `padding: 0 144px 0 144px` — i.e. the SAME `max-w-[1440px]` + 144px-gutter column
  (`lg:px-36` = 144px) that the rest of the page body uses.
- `MM_MEDIA_Kudos logo` (node `2940:13440`): `left=144, top=238, width=593, height=104` —
  relative to that same 1440-wide column (already matched the existing code's `lg:left-36
  lg:top-[238px] lg:w-[593px]` exactly, confirming those px values were correct at 1440 —
  only their reference frame, the viewport edge instead of the centered column, was wrong).
- `Button chuc nang` (pill row, node `2940:13448`): `width:1440px`, and its first pill
  (`2940:13449`) starts at `x=144` — same column, same 144px gutter.

## Model applied
1. **Proportions**: drive height by the design's own ratio instead of a fixed px height —
   `lg:h-auto lg:aspect-[45/16]` replacing `lg:h-[512px]`. Since the box's aspect ratio now
   always equals the background asset's native ratio, `bg-cover` never has to crop beyond
   what the design itself crops, at any width ≥ 1440px.
2. **Content alignment**: wrapped the heading, KUDOS wordmark, and pill row in one
   `relative mx-auto h-full w-full max-w-[1440px]` column — the same column shape
   (`max-w-[1440px]` + `lg:px-36`) the page body uses below the banner — while leaving the
   swirl background full-bleed on the outer element. All existing `left-36`/`top-[238px]`/
   `w-[593px]`/`px-36` values were kept as-is (they were already correct relative to the
   1440 frame); only their positioning root changed from the viewport edge to this column.
3. **Swirl crop**: no separate crop logic needed — a direct consequence of (1); `bg-left`
   position was kept since with matching aspect ratios `bg-cover` doesn't need to reposition.

## Overlay verification (two widths)
Used a temporary unauthenticated preview route (`app/qa-banner-preview/page.tsx`, outside
the auth-gated `/kudos` prefix) to render `<KudosBanner />` directly, screenshotted via
Playwright, then **deleted** before finishing (confirmed `git status` clean except
`kudos-banner.tsx`; `git diff --stat -- proxy.ts app/kudos/page.tsx` is empty — neither file
was ever touched).

**At 1440px** (`getBoundingClientRect` measurements):
- banner: `1440×512` (exact 45:16, matches design height 512 exactly)
- content column: `1440×512`, `x=0` (no margin — full column, as expected exactly at 1440)
- wordmark: `left=144, top=238, width=593` — matches design's `144/238/593` exactly
- Visual: heading, KUDOS wordmark, both pills, and swirl composition match the design frame
  image (`get_frame_image`) pixel-for-pixel at this width (this width was already correct
  before this fix; confirmed no regression).

**At 1920px**:
- banner: `1920×682.66`, ratio `2.81254` ≈ `45/16` (2.8125) — proportions hold
- content column: `1440×682.66`, `x=240` (= `(1920-1440)/2`, correctly centered)
- wordmark: `left=384 (=240+144), top=238, width=593` — tracks the design's 1440-frame
  values inside the centered column, no longer drifted off the viewport edge
- heading: `left=384` — same left edge as the wordmark, confirming vertical alignment holds
- pills: `left=384` (first button) — same content-column left edge; both pills' bottom edge
  sits `32px` above the banner's own bottom edge (still fully inside the taller keyvisual,
  not below it — no regression of the prior bottom-anchor fix)
- Swirl: screenshot composition (dark navy field on the left, colorful ribbons sweeping in
  diagonally from the right) visually matches the design's framing, just scaled up — no
  extra crop, confirming the aspect-ratio fix eliminated the over-zoom bug

Screenshots captured during verification (Playwright, since deleted along with the temp
route — not persisted as deliverables, per "presentational only" scope):
- 1440px viewport: heading/wordmark/pills aligned exactly as at baseline, swirl uncropped.
- 1920px viewport: banner visibly taller (682px vs 512px), wordmark/heading/pills all
  re-centered under the `max-w-[1440px]` column with equal ~240px dark-swirl margin on
  both sides, swirl framing unchanged from the 1440px case (just scaled).

## Files changed
- `app/kudos/components/kudos-banner.tsx` (135 lines changed: 89 insertions / 46 deletions
  net of doc-comment expansion; file is 158 lines total, under the 200-line cap). Sole
  functional changes: `lg:h-[512px]` → `lg:h-auto lg:aspect-[45/16]`; added a
  `relative mx-auto h-full w-full max-w-[1440px]` wrapper around heading + wordmark + pill
  row (previously siblings of the outer full-bleed div).

No other files were modified. `proxy.ts` and `app/kudos/page.tsx` diffs are empty (verified
via `git diff --stat`). The temporary `app/qa-banner-preview/page.tsx` preview route used
only for the overlay screenshots was deleted before completion.

## Tests
- Typecheck: pass (`npm run typecheck` clean; one transient `.next` stale-route type error
  from the now-deleted temp preview route cleared after restarting `next dev` once to let it
  regenerate its route manifest — not a real source error).
- Lint: pass, 0 errors (14 pre-existing `<img>`/unused-var warnings across the codebase,
  none new — the one warning on `kudos-banner.tsx:125` for the `<img>` wordmark predates
  this change and is intentional per the file's own doc comment, decoupling the wordmark
  from `next/image`'s layout system).
- Unit tests: pass, 492/492 (48 test files) — `kudos-banner.test.tsx`'s existing 4 tests
  (text/role-based queries, not DOM-structure-based) needed no changes since they query by
  accessible text/role, unaffected by the new wrapper `div`.

## Acceptance criteria
- [x] Banner proportions match design ratio (45:16) at any width ≥ 1440, verified at 1440
      and 1920.
- [x] KUDOS wordmark left-edge/size/vertical position (relative to heading and the centered
      content column) matches the design at both 1440 and 1920.
- [x] Swirl composition (dark field left, swirl from the right) preserved, no over-crop, at
      both widths.
- [x] Pills remain bottom-anchored inside the keyvisual (not below it) — no regression.
- [x] Cover darkening gradient untouched — no regression.
- [x] File stays under 200 lines (158).
- [x] `proxy.ts` / `app/kudos/page.tsx` diffs empty — no auth-gate bypass left behind.

## Issues encountered
None blocking. One transient false-positive typecheck error from a stale `.next` dev-route
type validator (caused by deleting the temp preview route mid-session) — resolved by a
throwaway `next dev` restart; unrelated to the actual code change.

**Status:** DONE
