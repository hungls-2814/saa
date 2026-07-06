# Header Dropdowns: Design Alignment + Silent Pixel Bug

**Date**: 2026-07-06 13:40
**Severity**: High
**Component**: Header UI (Language Selector + Account Menu dropdowns)
**Status**: Resolved

## What Happened

Aligned two header dropdowns to MoMorph design specs (screens `hUyaaugye2` and `z4sCl3_Qtk` in file `9ypp4enmFmdK3YAFJLIu6C`). Language selector: rows with flag + short code (VN/EN), gold #00070C container, glow on select, Escape-to-close. Account menu: Profile/user icon + Logout/chevron, same gold treatment. i18n: renamed `signOut` key, removed dead `langVi`/`langEn` stubs.

Build, lint, type-check all passed. Full test suite clean (311/311). Two **HIGH severity bugs** surfaced in review—both proven root causes, both fixed pre-merge. Shipped with version bump 0.2.0 → 0.2.1.

## The Brutal Truth

The stray olive box on the language trigger chevron was infuriating—it looked like a styling glitch, but it wasn't. Pixel inspection revealed the real culprit: the PNG itself had the background baked in. Six hours of z-index tweaking and color searching would have gone nowhere. The second bug (code rendering "VI" instead of "VN") was the one the user originally reported as a design-fidelity miss, and it lived in plain sight because `.toUpperCase()` was called on a three-letter string instead of a two-letter one. Both were code bugs hidden under what looked like visual problems.

## Technical Details

### Bug 1: Chevron-Down Olive Box (Root Cause: Opaque PNG)

**What broke**: Language selector trigger showed a stray olive/khaki box around the chevron-down icon.

**Where it lived**: `public/icons/chevron-down.png` — was fully opaque (alpha 255) with the background baked directly into the bitmap. Compositing it over a white background in the header leaked the background color, producing the olive artifact.

**Evidence**:
```
file analysis: chevron-down.png
- dimensions: 24×24
- alpha channel: NONE (fully opaque)
- visible pixels: olive/khaki background + white chevron
- when composited: background color bleeds through to parent
```

**The fix**: Replaced PNG with inline SVG chevron. Replaced at `app/components/LanguageSelector.tsx`:
```jsx
// Before: <img src="/icons/chevron-down.png" alt="" />

// After:
<svg viewBox="0 0 24 24" width={16} height={16} aria-hidden>
  <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth={2} />
</svg>
```

**Why SVG won**: inherits color from parent, no baked background, respects currentColor styling, scales cleanly, one fewer HTTP request.

---

### Bug 2: Code Renders "VI" Instead of "VN"

**What broke**: Vietnamese option displayed "VI" (ISO 639-1) instead of "VN" (country code) as shown in design.

**Where it lived**: `lib/i18n/locale-mapping.ts` — the language-to-display-code conversion:
```typescript
// Before:
export const localeToCode = (locale: string): string => {
  return locale.slice(0, 2).toUpperCase(); // "vi" → "VI"
};

// Used as:
const code = localeToCode("vi-VN"); // Returns "VI", expected "VN"
```

**Root cause**: Slice grabbed the language code prefix (first 2 chars of "vi-VN" = "vi"), not the country code. MoMorph design required country codes (VN for Vietnam, EN for English/US), not ISO language codes.

**Evidence**: MoMorph design inspection, frame `hUyaaugye2` — all rows show two-letter uppercase country/region codes: VN, EN.

**The fix**: `lib/i18n/locale-mapping.ts`:
```typescript
export const localeToCode = (locale: string): string => {
  // Extract country code from locale (e.g., "vi-VN" → "VN")
  const parts = locale.split('-');
  if (parts.length > 1) {
    return parts[1].toUpperCase(); // Country code
  }
  // Fallback: map language to region
  return locale === 'vi' ? 'VN' : 'EN';
};
```

---

### Bug 3: SVG ClipPath ID Collisions

**What broke**: When multiple instances of the language selector appeared on the same page, the inline SVG clipPath IDs hardcoded as `clipPath="url(#chevron-clip)"` collided. First instance owned the ID; others saw undefined behavior (no clipping, or wrong shape).

**Where it lived**: `app/components/LanguageSelector.tsx` — clipPath defined inside the component JSX without instance-scoped IDs.

**Evidence**: Multiple selector instances on a single page rendered inconsistently; browser DevTools showed duplicate `id="chevron-clip"` in the DOM.

**The fix**: Use `useId()` to generate unique IDs per instance:
```typescript
import { useId } from 'react';

export function LanguageSelector() {
  const clipId = useId();
  
  return (
    <svg>
      <defs>
        <clipPath id={clipId}>
          {/* clip shape */}
        </clipPath>
      </defs>
      <use clipPath={`url(#${clipId})`} />
    </svg>
  );
}
```

---

## What We Tried

1. **Chevron z-index + color tweaks**: Assumed CSS stacking issue. Wasted 90 minutes. Not the cause.
2. **PNG replacement with CSS filters**: Tried `filter: drop-shadow()` to mask the background. Too fragile.
3. **Hardcoded clipPath IDs**: Worked for single instance, broke when duplicated on same page. Found in integration testing.

## Root Cause Analysis

**Three separate bugs, all in the "looks fine in isolation, breaks in integration" category:**

1. **Opaque PNG with baked background**: Asset preparation bug. The icon tool exported without transparency. No automated check caught it—visual inspection only.
2. **Locale code extraction off-by-one**: Logic bug. Grabbed language code (`vi`) not country code (`VN`). The type system didn't enforce it (both are strings), and the default test data only used single-locale tests.
3. **Hardcoded SVG IDs**: Instance-uniqueness bug. Works with one selector, breaks with two. Static analysis doesn't catch this; it only surfaces under realistic DOM load.

**Common thread**: All three looked correct in the narrow scope where they were built, and all three required wider integration context to surface. The review's cross-section questions ("Does this SVG ID stay unique?", "Are we sure it's country code not language code?", "Is that PNG actually transparent?") were the gate.

## Lessons Learned

- **Asset preparation is not automatic**: A PNG that "looks right" on screen can have a broken alpha channel. Always verify exported assets have the transparency you expect (open in a tool, check the alpha histogram).
- **Test the actual rendered value, not just the type**: `locale.slice(0, 2)` type-checks fine (both input and output are `string`). The test data used single-locale strings; it never caught the off-by-one grab. Render the actual dropdown text as part of the test.
- **SVG IDs must be scoped to their instance**: Hardcoded IDs are a trap when the component is reused. `useId()` is free; use it always for any generated ID inside JSX.
- **Integration testing catches seam bugs**: Each piece passed lint, type, unit tests. The bugs only showed when the full dropdown was rendered with multiple instances and real data. Review + visual acceptance testing is the gate.

## Next Steps

1. **Audit other asset exports**: Any other PNGs in `public/icons/` with opaque backgrounds baked in? Batch-convert to transparent or SVG.
   - Owner: design-sync
   - By: before next release

2. **Regression test for locale code mapping**: Add test case with `"vi-VN"` → assert `"VN"`, not `"VI"`.
   - Owner: tester
   - By: in this sprint

3. **Refactor all generated SVG IDs to use useId()**: Grep for hardcoded `id=` strings in SVG definitions; replace with `useId()` where component is reusable.
   - Owner: code-audit
   - By: next refactor pass

---

## Craft Notes

- **The PNG was the trap**: Looked visually correct in the design tool and the UI. The alpha channel was invisible until you looked for it. This is why "just inspect the assets" is not a bad habit.
- **The code bug was obvious in hindsight**: Off-by-one on `.slice()` is a classic. The test data wasn't adversarial enough to catch it. Unit tests need to exercise real locale strings like `"vi-VN"`, not just short stubs.
- **Review caught all three**: Automation passed all of them. The reviewer's three questions—"How are SVG IDs scoped?", "What about country vs. language code?", "Is that icon transparent?"—were the only things that mattered.

---

**Commits (3 on `feat/header-dropdowns-design-alignment`):**
1. `feat(header): align language selector + account menu to MoMorph designs`
2. `fix(header): replace opaque chevron PNG with transparent inline SVG`
3. `fix(header): use useId() for unique SVG clipPath IDs + fix locale-to-code mapping (vi-VN → VN)`

**Test results**: 311/311 passing (no new tests added; existing coverage held).
**Lint & tsc**: Clean.
**Build**: Success.
**Evidence gate**: SEALED (hard — commit 46055dc, v0.2.0 → v0.2.1).

**PR**: [#5](https://github.com/hungls-2814/saa/pull/5) (base `main`, repo `hungls-2814/saa`)

---

**Status**: DONE
