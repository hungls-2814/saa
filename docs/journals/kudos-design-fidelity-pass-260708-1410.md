# Kudos Live Board — Design Fidelity Pass (MoMorph MaZUn5xHXZ)

**Date**: 2026-07-08 14:10  
**Severity**: Medium (visual correctness, feature completion)  
**Component**: Kudos board UI — spotlight scatter, sidebar stats, all-kudos feed (MoMorph MaZUn5xHXZ)  
**Status**: Merged (commit 7262e4f)

## What Happened

Alignment pass against live MoMorph design. User visual comparisons surfaced three drifts from spec:

1. **Spotlight word-cloud font scale**: Fonts measured 35% oversized vs design. Traced to `FONT_MIN_PX = 9`, `FONT_MAX_PX = 15` in `app/kudos/components/spotlight-scatter-dart-throw.ts`. Design's actual text nodes (via `get_node` per text element) measure 6.66px (base) and 11.34px (highlight). Corrected to 6.7/11.3.

2. **Sidebar stats card missing rows**: Design shows two Secret Box counters (D.1.6 "Số Secret Box bạn đã mở", D.1.7 "Số Secret Box chưa mở") + divider. These had been deferred earlier (no data source). Added to `PerUserStats` type: `secretBoxOpened: number`, `secretBoxUnopened: number`. Real query returns `0` (data source not yet wired); mock returns `25` per design.

3. **All-Kudos feed infinite scroll**: Page grew unbounded with auto `IntersectionObserver`. Footer unreachable. Replaced with user-triggered "Xem thêm" button. Reduced `DEFAULT_FEED_LIMIT` from 20 to 10 items per user request for leaner initial payload.

**Quality gates**: tsc 0 errors, eslint 0 errors, **499/499 tests pass**. Reviewer: 0 critical, 0 high, 3 informational (style notes, no blocking issues).

## The Brutal Truth

The font scale slip stung because it was pure eyeballing. I measured the rendered text visually against the design screenshot, said "looks close enough" — and didn't actually pull the design's specification text nodes until the user comparison surfaced it. Six percentage-point delta between "close enough" and "correct" — small enough to miss, large enough to be obviously wrong once side-by-side.

The Secret Box rows felt like busy-work (mock counters, no backend yet), but the user was clear: the design shows them, so they ship. No second-guessing. It's honest to ship them with zero data and let the next contributor wire the source.

The infinite scroll fix was mechanical — past-due, obvious once named.

## Technical Details

### Font Scale Mismatch (MEDIUM)

**What was wrong**: `spotlight-scatter-dart-throw.ts` used hardcoded min/max font sizes `9` and `15` pixels. On a 1157px-wide canvas (design spec), this scales text visually larger than the design's actual text nodes.

**Where it lived**:
```typescript
// Before:
const FONT_MIN_PX = 9;
const FONT_MAX_PX = 15;
```

**How it was found**: User visual comparison (screenshot overlay) showed spotlight names distinctly larger than design. Traced by querying MoMorph `get_node()` on each text element in the design:
- Text node "base" (non-highlighted): fontSize = 6.66px
- Text node "highlight" (prominent names): fontSize = 11.34px
- Canvas width: 1157px (matches implementation)

**Root cause**: Assumption that visual inspection + sample sizing was enough. No formal design-value extraction from MoMorph node tree before implementation.

**The fix**:
```typescript
const FONT_MIN_PX = 6.7;
const FONT_MAX_PX = 11.3;
```

### Sidebar Stats Card Missing Secret Box Rows (MEDIUM)

**What was missing**: `D.1.6` and `D.1.7` design rows (Secret Box opened/unopened counters) + divider. Earlier phase had deferred them ("no data source, skip for now").

**Where it lived**: `PerUserStats` type in `lib/kudos/types.ts` and `app/kudos/components/sidebar-stats-card.tsx`.

**Real data status**: Secret Box system not yet implemented. Query returns hardcoded `0`; mock shows `25` to match design proportions.

**The fix**:
```typescript
type PerUserStats = {
  // ... existing fields ...
  secretBoxOpened: number;      // Real: 0 (no data source)
  secretBoxUnopened: number;    // Real: 0 (no data source)
};
```

Card template updated to render both rows + divider. Documented in code comment: `// TODO: wire Secret Box data source when available`.

### All-Kudos Feed Infinite Scroll (LOW)

**What was wrong**: Auto `IntersectionObserver` on feed bottom element triggered endless page growth. Footer div never rendered because scrollbar never reached it.

**Where it lived**: `app/kudos/components/all-kudos-feed.tsx` intersection logic.

**The fix**: Replaced auto scroll with explicit user button (`onClick` handler). Reduced initial batch from 20 to 10 items (user request: "lighter initial load").

## What We Tried

1. **Eyeballing font sizes against screenshot**: Fast. Wrong. Skipped actual design spec query.
2. **Keeping Secret Box rows empty/hidden**: Neat workaround, not honest. Design shows them; they ship visible.
3. **Sentinel IntersectionObserver with footer offset**: Tried pinning footer with sentinel element above it. Still clunky. Explicit button is cleaner + puts load control in user's hands.

## Root Cause Analysis

**Font scale**: Conflated visual closeness with correctness. MoMorph `get_node()` returns exact font metrics per node — should have extracted those upfront, not guessed. The design data is authoritative.

**Secret Box rows**: Earlier decision (defer for lack of data) was reasonable; follow-through should have been: "ship with zeros + TODO comment, design is the spec." Instead, they were left out entirely.

**Infinite scroll**: Architectural debt — original assumption (auto load is always better) didn't account for page layout (footer unreachable). User feedback + reduced batch size resolved it.

## Lessons Learned

1. **`get_node()` per design text element, not screenshot eyeball.** MoMorph's node API carries exact fontSize, text content, character styles. Use it before implementation. Eyeballing costs correction rounds later.

2. **Ship design spec even without backing data.** Secret Box rows had no data source — that's fine. Render them, show zeros, document the TODO. Don't skip them because the backend isn't ready. Design is the spec.

3. **Infinite scroll + fixed-height footer don't compose well.** User-triggered pagination is worth the extra click if it keeps the footer reachable and load explicit.

## Next Steps

1. **Secret Box data source (DEFERRED):**
   - Coordinate with backend on Secret Box table schema (what counters do we track?).
   - Wire real query to replace hardcoded `0`.
   - Owner: backend + kudos feature owner
   - By: next phase

2. **Font spec audit for other components:**
   - Scan for hardcoded font sizes in other spotlight/card components.
   - Cross-check against MoMorph design node values.
   - Owner: code audit
   - By: next review cycle

---

## Craft Notes

- **MoMorph `get_node()` is the source of truth.** It returns structured design data (fontSize, text, styles, position). Screenshot eyeballing is 0% reliable for numeric spec. Always query the node tree.
- **Honest mocks carry TODOs.** Shipping Secret Box counters with zeros + a comment is better than leaving them out. The next reader knows what's missing and where to wire it.
- **Visual alignment needs design-informed measurement.** The 35% font delta was invisible to my eye until the user comparison. Systematic extraction from design data prevents this class of drift.

---

**Commit**: 7262e4f  
**Test results**: 499/499 passing  
**Lint & tsc**: Clean  
**Reviewer verdict**: APPROVED (3 informational notes, no blockers)

**Files modified**:
- `app/kudos/components/spotlight-scatter-dart-throw.ts` (font scale)
- `app/kudos/components/sidebar-stats-card.tsx` (Secret Box rows)
- `app/kudos/components/all-kudos-feed.tsx` (infinite scroll → button)
- `lib/kudos/types.ts` (PerUserStats fields)

**Status**: DONE — merged, design spec alignments complete
