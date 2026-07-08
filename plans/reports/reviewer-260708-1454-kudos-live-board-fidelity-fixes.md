# Review: Kudos Live Board design-fidelity fixes (working tree, pre-PR#6)

Scope: uncommitted diff only (16 files, +115/-64), branch `feat/kudos-live-board`.
Verified independently: `npx tsc -p tsconfig.json --noEmit` (clean), `npx eslint` on touched files (clean), `npx vitest run app/kudos lib/kudos` (24 files / 183 tests, all pass).

## Critical Issues
None found.

## High Priority
None found.

## Medium Priority
None found.

## Low Priority / Informational

1. **`DEFAULT_FEED_LIMIT` 20 → 10 doubles the number of "Xem thêm" round-trips to view the same total feed.** (`lib/kudos/queries.ts:18`) Purely a product/UX call, not a bug — flagging so it's a confirmed intentional design-fidelity choice (matching a spec page-size) rather than an incidental tuning value. No code depends on the old constant elsewhere (`getBoardData` at line 108 already always used `DEFAULT_FEED_LIMIT` regardless of caller `opts.limit`, unchanged by this diff).

2. **No loading/disabled state on the new "Xem thêm" button while a page fetch is in flight** (`app/kudos/components/all-kudos-feed.tsx`). The `inFlight` ref in `use-kudos-feed.ts` correctly *drops* a second concurrent call, so there's no double-fetch bug — but a user who double-clicks gets a silent no-op on the second click with no visual feedback (spinner/disabled). Minor UX polish, not a correctness issue.

3. **New divider (`<hr>` at `sidebar-stats.tsx:49`) and the two Secret-Box rows have functional test coverage (labels + values render) but no visual/style assertion** — acceptable, jsdom isn't the right tool for verifying `border-t border-[#2E3940]` renders correctly; this is normal for this codebase's testing style.

## Edge Cases Checked (Scouting)

- **Font-range consumers**: grepped all usages of `FONT_MIN_PX`/`FONT_MAX_PX` outside the two changed files. Only `spotlight-scatter-layers.ts` consumes them, and it does so by reference (not a hardcoded duplicate of 9/15), so the 6.7–11.3px tightening propagates correctly with no stale literal left behind. `FONT_DECAY_PER_REPEAT_PX = 0.6` and `Math.max(FONT_MIN_PX, ...)` clamp correctly against the new, narrower 4.6px span — no negative/inverted range possible.
- **`PerUserStats` shape change** (added `secretBoxOpened`/`secretBoxUnopened` as required, non-optional fields): grepped for every object literal typed as `PerUserStats`/`BoardData.stats` — `mock-data.ts`, `page.tsx` (`EMPTY_BOARD_DATA`), `page.test.tsx`, `queries-lookups.ts`, and the three `queries.test.ts` assertions are all updated consistently. `tsc --noEmit` independently confirms no missed call sites (per project memory: `npm test`/vitest does NOT typecheck test files, so this was checked separately rather than trusting green tests alone).
- **i18n key parity + duplicate-value check** (per known project gotcha: copy-paste bugs can appear identically in both locales): `secretBoxOpened`/`secretBoxUnopened` keys exist in both `en.json` and `vi.json`, values are distinct per key within each locale (not duplicated from `received`/`sent`/`heartsReceived` or from each other), and EN reads as a faithful translation of VI, not a copy-paste artifact.
- **IntersectionObserver removal → manual button regression check**: confirmed `sentinelRef`, the `useEffect`/`IntersectionObserver` block, and the now-unused `useEffect`/`useRef` import were all removed together (lint clean, no dangling refs). The `hasMore`/`onLoadMore` prop contract into `AllKudosFeed` is unchanged, so `KudosBoardContainer`/`kudos-board.tsx` wiring didn't need updates. The in-flight guard in `useKudosFeed` is generic enough to protect against rapid double-clicks the same way it protected against sentinel double-fire — verified via the renamed (not logic-changed) test.
- **Divergent-fallback pattern (per project memory item 5)**: N/A here — no new env var or config resolver introduced by this diff, so no duplicate-computation-of-the-same-value risk to check.

## Positive Observations

- Font range change is well-documented with the exact Figma node values it's derived from, not just a bare magic number.
- `getPerUserStats`/`PerUserStats` doc comments disclose the Secret-Box 0-fallback and *why* (no data source yet) rather than silently faking data — matches this codebase's established disclosed-fallback convention (see project memory item 3).
- Test updates are substantive (new field values, new row assertions), not just snapshot rubber-stamping.
- `DEFAULT_FEED_LIMIT` and `FONT_MIN/MAX_PX` are each defined once and consumed by reference everywhere — no duplicated magic numbers to fall out of sync.

## Unresolved Questions
- Confirm `DEFAULT_FEED_LIMIT = 10` is the intended final page size for ship (vs. a placeholder) — no blocking concern either way, just flagging for product sign-off.

**Status:** DONE
**Summary:** No critical or high-priority issues in the working-tree diff. Independently verified tsc/eslint/vitest all clean. Type, i18n key-parity, and cross-file consistency for the `PerUserStats` shape change all check out; the IntersectionObserver→button swap is a clean removal with no dangling refs or regressed guards.
**Concerns/Blockers:** None blocking. Two informational/UX notes (page-size halving intentionality, no button loading-state) — neither is a shipping blocker.
