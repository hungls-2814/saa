# Kudos Highlight Carousel — Design Alignment (MoMorph MaZUn5xHXZ)

**Date**: 2026-07-14 06:30  
**Severity**: Medium (visual fidelity, shipped feature)  
**Component**: Kudos → Highlight Carousel (design node 2940:13431, screenId MaZUn5xHXZ, file 9ypp4enmFmdK3YAFJLIu6C)  
**Status**: Merged (v0.4.7)

## What Happened

Aligned carousel UI to authoritative MoMorph design. Five point fixes:

1. **Sender→receiver separator**: Replaced plain arrow (→) with design's outlined right-pointing paper-plane icon (new `PaperPlaneIcon`). Top-aligned to avatars. Design node "Icon sent" / "B.3.4_Icon mũi tên".

2. **"Xem chi tiết" link arrow**: Changed horizontal → to diagonal ↗ (new `ArrowUpRightIcon`).

3. **Card corner radius**: `rounded-3xl` (24px) → `rounded-2xl` (16px) per design spec.

4. **Equal-height highlight cards**: Changed carousel row from `items-center` to `items-stretch`. Cards now `h-full` with `min-h-[525px]` floor. Middle content region `flex-1 justify-center` pins action bar to bottom. Decision: flexbox-stretch behavior (equal heights + centered middle + pinned footer) chosen over fixed 525px to prevent clipping under our app's larger type scale (text-xl, p-6, py-4 render ~544px real card height).

5. **Cleanup**: Removed unused `ArrowRightIcon` export.

**Quality gates**: tsc clean, eslint 0 errors, 855/855 tests pass.

## Technical Insight

The design achieves fixed-height cards via a fixed 240px center region with `justify-center`. We reproduced the *behavior* (equal heights + centered content + action bar at bottom) with flexbox stretch + `h-full` instead of hardcoding pixels. This pattern adapts to our type scale without clipping—a micro-pattern worth repeating for future carousel work.

## Root Cause

None—this was straightforward design spec application. No drift, no guessing.

## Lessons Learned

Icons and link indicators carry visual weight in a feed. Matching the design's specific glyphs (paper-plane vs generic arrow, diagonal vs horizontal) tightens the UI polish without code bloat.

## Next Steps

None. Shipped.

---

**Files modified**:
- `app/kudos/components/icons.tsx` (PaperPlaneIcon, ArrowUpRightIcon)
- `app/kudos/components/kudos-card.tsx` (card radius, height rules)
- `app/kudos/components/highlight-carousel.tsx` (layout: items-stretch, flex-1 center)

**Commit**: v0.4.7 (main)  
**Test results**: 855/855 passing  
**Lint & tsc**: Clean  
**Status**: DONE — merged, design spec complete
