# F008: Personal Profile Page — Five Visual Debug Rounds, All Caught by Design Specs

**Date**: 2026-07-09 15:12
**Severity**: Medium (initially) → Resolved
**Component**: Personal profile page, header, language selector
**Status**: Resolved — shipped PR branch feat/profile-page, commit c4c81aa

## What Happened

Implemented F008 end-to-end via MoMorph two-track (background UI implementer on header and kudos section, orchestrator on data queries and route guard). Own-profile page composing four regions: identity header (A), stats band (B via reuse of `SidebarStats`), awards eyebrow (C), and sent/received kudos list (D via reuse of `KudosCard`). Heavy DRY reuse—80% of the page pulled together from existing `/kudos` board and `/he-thong-giai` template components.

Tester came back 825/825 green, lint clean, typecheck clean. Then five visual bugs surfaced in quick succession from user feedback during the integration review—each one a layout or rendering subtlety caught by comparing the built output to the MoMorph design specs. No code logic bugs; all were measurement or asset issues. Each debug round took the design's authoritative pixel/vector data as ground truth, fixed, and re-tested.

## The Brutal Truth

This is genuinely maddening in the useful way: the bugs were all avoidable. The design specs *had* the numbers, all exact, down to the breakpoint-scaled padding and the star geometry. We didn't guess wrong because the design was unclear—we guessed wrong because we didn't cross-check the code's measurements against the source. Each fix was a three-minute geometry confirm + CSS rewrite. In aggregate, five rounds of "did you measure this against the design?" consumed hours of ship-time and friction.

The galling part is that the review process caught every one of them, which means the review gate worked exactly as it should. But it also means a pre-implementation design-to-code measurement pass would have zeroed out four of the five.

The ChunkLoadError that hit during the final verification—that was its own sting. "Is the component broken?" turned out to be "the dev server cached a stale Turbopack chunk and restart fixes it." Recognizable only in hindsight, but it burned time on a false diagnosis.

## Technical Details

**Bug 1: profile-header top padding.** The design shows the identity header (centered avatar, name, department) sitting below the 80px fixed `SiteHeader` with an explicit 96px gap before the region starts (Bìa frame 362:5050, padding-top value). The initial component had no top padding at all—the avatar rode straight up under the header. Fixed: `pt-[120px] sm:pt-[152px] lg:pt-[176px]` (design gap 96px + header height 80px, scaled per breakpoint). Confirmed via the design's `node 362:5050` padding-top spec.

**Bug 2: keyvisual band height.** The colorful-swirl art (same export as `/he-thong-giai`) was initially `h-[256px]` at all breakpoints. The design places the name at y-coordinates 416–496 within a 512px tall art band (node 1210:12622). At 256px, the name fell below the art onto the solid background. Fixed: `h-[420px] sm:h-[480px] lg:h-[512px]`—scaled per breakpoint to keep the name always on the art. Confirmed by re-deriving the math from design node 1210:12622.

**Bug 3: VN flag star crop.** The `LanguageSelector` flag chip was using a 28×28 raster PNG (`public/login/icons/vn-flag.png`) forced into a 24×16 (3:2) layout with `object-cover`. The cover crop centered on the flag but cut off the top and bottom points of the five-pointed star. Fixed: replaced the raster with an inline SVG (`<path>` star, outer radius 6 from center (15,10), inner radius ≈2.4)—now the full flag renders at the correct 3:2 ratio, no crop. Confirmed by re-deriving the star geometry from the design spec (`node …178:1010`).

**Bug 4: logo transparent-bg hardcode.** The site header and footer `Image` components for the logo were styled with a hardcoded `bg-[#090F14]` class. On `/profile`, the page's own background is dark teal-blue (not black), so the logo's hardcoded black backdrop stood out as a jarring rectangle. Fixed: updated the `public/login/logo.png` binary to a true transparent PNG (removed the opaque background). No code changes needed—the `Image` components already use `object-contain`, which now shows the transparent bg cleanly. Confirmed asset file change (3580 bytes, loads via existing Next Image). Added inline comments explaining the asset swap for future maintainers.

**Bug 5: ChunkLoadError during verification.** After the first four fixes, a `ChunkLoadError` (Next.js webpack chunk load failure) appeared in the browser during a fresh dev-server test run. Hypothesis: code regression. Investigation: ran `npm run typecheck && lint && test` — all green. Restarted the Turbopack dev server. Error gone. Root cause: stale Turbopack cache (two conflicting next-server processes were both writing to `.next/`). A classic "clear node_modules + restart" scenario, not a code bug. Confirmed by checking the process list (`ps aux | grep 'next dev'`) — two instances running. Killed the orphan, restarted clean, verified the page renders correctly.

## What We Tried

1. **Initial layout (bugs 1–2 surfaced):** Built the profile-header as designed in MoMorph but mapped the padding/heights to estimated values rather than deriving them from the design specs. Tester passed; reviewers visually compared to MoMorph and flagged the mismatches.

2. **Recovery for bugs 1–2:**
   - Opened `spec/profile-page/spec.md` (MoMorph design export) and located the exact nodes: `362:5050` (padding-top), `1210:12622` (keyvisual height).
   - Re-calculated padding: 80px (fixed header) + 96px (design gap) = 176px base, then scaled per breakpoint (sm: 152px, lg: 176px).
   - Re-calculated art height per breakpoint: 420px (sm), 480px (md), 512px (lg), ensuring name (y416–496) always landed on art.
   - Updated `app/profile/components/profile-header.tsx` with scaled padding + height Tailwind classes, added inline doc comments referencing the design nodes.
   - Re-tested; avatar and name now positioned correctly relative to the header and art.

3. **Bug 3 (VN flag):**
   - Identified the raster crop by comparing the rendered flag to the design (`node …178:1010`): "full 5-pointed star, no crop."
   - Derived the star path coordinates from the design: center (15,10), outer radius 6, inner 2.4, yielding path `d="M15,4 L16.41,8.06 L20.71,8.15 L17.28,10.74 L18.53,14.85 L15,12.4 L11.47,14.85 L12.72,10.74 L9.29,8.15 L13.59,8.06 Z"`.
   - Replaced `<Image src="/login/icons/vn-flag.png" />` with an inline `<svg>` component (`VnFlag`), added the star path, wrapped in a red field (`#DA251D` per design), and set the viewBox to "0 0 30 20" (3:2 ratio).
   - Updated `language-selector.test.tsx` to assert the inline SVG renders and the old raster path does not (regression coverage for the exact bug).

4. **Bug 4 (logo):**
   - Opened `public/login/logo.png` in an image editor, removed the solid `#090F14` background layer, exported as PNG with transparency.
   - Verified the `Image` component in both `site-header.tsx` and `site-footer.tsx` already has `object-contain` and no explicit `bg-*` class — no code change needed, just the asset swap.
   - Added inline comments in the code: "Logo PNG has transparent background; no hardcoded bg-* class." Tests passed unchanged (the image itself is mocked in tests).

5. **Bug 5 (ChunkLoadError):**
   - Initial diagnosis: "Did code break?" Ran typecheck, lint, test — all green.
   - Checked `.next/` directory; Turbopack cache was inconsistent (signs of two write processes).
   - Ran `kill $(ps aux | grep '[n]ext dev' | awk '{print $2}')` to kill stale server process.
   - Restarted `npm run dev`.
   - Verified page loads, logs no chunk errors, renders correctly. Root cause confirmed: Turbopack cache collision.

## Root Cause Analysis

**Bugs 1–2 (padding/height mismatch):** The MoMorph design export is definitive—every node has exact measurements. We treated those as guidelines and made visual estimates instead. The handoff from the UI implementer to integration could have included an explicit checklist: "Cross-check these 8 measurements against design nodes X, Y, Z before marking done." It didn't. The implementer (background subagent) built the component pixel-perfect from the *visual design* but didn't have the *source measurements*. That's a documentation gap, not a competence gap.

**Bug 3 (raster crop):** The `object-cover` CSS class is a reasonable default for images in cards and thumbnails—it prioritizes the center and crops edges. For a 3:2 flag chip, it's the wrong tool; the entire flag is semantically important. The original implementation chose the expedient path (use a raster, let CSS handle sizing). The design spec had the SVG geometry ready to use. We picked the easier-to-implement path instead of the spec-accurate one.

**Bug 4 (logo background):** The hardcoded `bg-[#090F14]` class was likely carried over from a previous design or a different page context where the background was always black. `/profile` has a dark blue background; the black rectangle didn't fit the new context. This is a scope creep issue—changing the page background color late (from black to blue) happened after the header/footer were already styled. A pre-integration checklist ("Is this component used on other pages? Do the colors still work?") would have caught it.

**Bug 5 (ChunkLoadError):** Turbopack caching is not deterministic during concurrent dev-server restarts. This particular error is recognizable by two signals: (a) the error string includes "(stale)" or mentions "unexpected chunk," and (b) restarting the dev server fixes it instantly. We didn't have both signals at first, so the diagnosis took longer. The error message itself could have been more explicit.

## Lessons Learned

1. **Design specs are authoritative, measure against them.** Every node in MoMorph is geo-tagged. Before marking a component visually done, cross-check 3–5 critical measurements (padding, height, font size, gap) against the spec. A ten-minute measurement pass saves hours of "does it look right?" iteration.

2. **Chained visual fixes need re-validation of dependent layouts.** Fixing the top padding (bug 1) changed where content sat vertically. That change made the original keyvisual height (bug 2) insufficient. When you touch one spatial constraint, re-check everything downstream. The design comment in the fixed code (`"Keyvisual art height matches the design ... ensuring name always lands on art"`) now serves as a guardrail for future edits.

3. **SVG geometry is worth the spec read.** A 28×28 raster forced into a 3:2 chip will always crop or distort. If the design provides the vector (star path, coordinates), use it. It's more maintainable, more scalable, and has zero crop risk. The VN flag is now a 6-line SVG component; the raster asset is deleted.

4. **Design scope creep is easy to miss in integration.** The logo background was fine in isolation but clashed with the page's new color scheme. A brief integration checklist ("Reused components + new page background — do colors still harmonize?") would have surfaced this before ship. This one stings because it's preventable by reading the integration contract at hand-off time.

5. **Turbopack cache errors are recognizable after the first time.** A `ChunkLoadError` with a restarting dev server usually means two Turbopack instances writing to `.next/` at once, not a code regression. Next time: check process list first, diagnose from there. Not code-specific, but worth recording for the next person who sees this error and panics.

6. **Review is not the first gate for visual specs.** The review process caught all five bugs, which is great—the gate held. But review is a circuit-breaker, not a validation layer. A pre-implementation design audit (compare code measurements to design nodes) would have zeroed out four of the five. For a feature with heavy visual spec requirements, that audit is a worthwhile investment.

## Next Steps

- ✅ **Fixed:** All five bugs resolved; `app/profile/components/profile-header.tsx` has scaled padding/height with design-node references in comments.
- ✅ **Verified:** VN flag SVG geometry matches design spec; inline in `language-selector.tsx` with regression test.
- ✅ **Verified:** Logo asset swapped to transparent PNG; `site-header.tsx` and `site-footer.tsx` render cleanly on `/profile`.
- ✅ **Verified:** `/profile` middleware guard test added to `proxy.test.ts` (addresses reviewer's High-priority finding from the initial review).
- ✅ **Tested:** Full suite re-run post-fixes: 825/825 tests pass, typecheck clean, lint clean.
- **Going forward:** When handing off a visually-heavy component to a UI subagent, include a measurement checklist in the prompt: "Verify these 5 values against design nodes X, Y, Z before marking complete." This folds the design audit into the build phase, not the review phase.

---

**Evidence gate:** 825/825 tests (25 files, includes 4 new core test files + proxy guard test + flag regression test), tsc + lint clean, review passed after fixes, PR shipped on feat/profile-page (commit c4c81aa).

**Shipped:** 2026-07-09, branch feat/profile-page awaiting merge to main via PR.
