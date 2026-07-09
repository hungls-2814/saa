# F007: Kudos Hero Badges + Rules Modal — The Gap Review Caught

**Date**: 2026-07-09 09:12
**Severity**: High (initially) → Resolved
**Component**: Kudos cards, FAB Rules modal, hero badge data layer
**Status**: Resolved — shipped PR #10, feat/kudos-hero-badges-rules (commit 7a260f8)

## What Happened

Implemented F007 end-to-end: MoMorph two-track (background UI implementer on the Rules modal, orchestrator on data layer). Hero badges on Kudos cards now derive from distinct-sender count (New/Rising/Super/Legend tiers). The FAB "Thể lệ" pill opens a dark-navy Rules modal with 3 sections (badge tiers, 6 collectible icons, national-kudos award) and hands off to compose. 

Tester came back green: 800/800 tests, 35 new. Then reviewer opened the file—and caught a **major gap**: the Rules modal had shipped 100% hardcoded Vietnamese copy with **zero i18n wiring**, contradicting the feature's own spec (FR6/SC6) and its own plan's phase-04 exit criteria. Every other Home component uses `useTranslations`. This one didn't.

We stopped the ship, fixed it in-place, re-ran tests, pushed clean.

## The Brutal Truth

This stings. Not because the gap existed—phase-04 was ambitious—but because it walked through the planning gate untouched. The plan's own phase-04 file **explicitly scoped** this: "EDIT `messages/vi.json` + `messages/en.json` — add `Rules` namespace ... vi primary, en mirror." Success criteria SC6 required "All new visible strings resolve vi+en." 

The implementer (background UI subagent) built the modal pixel-perfect from MoMorph but treated it as presentational—plug in copy, render it. That's reasonable in isolation. But the orchestrator and reviewer were supposed to catch the "where does i18n live?" question before it landed. Didn't happen.

The tester's own report—which lists SC1–SC5 as met—silently drops SC6 and SC7 from its "Success Criteria Met" table. That's a signal the check never ran, not that it was waived.

Sitting with this: **The plan called it out. The spec called it out. The review pass found it, not the checklist.** That's both a win (review worked) and a sting (planning didn't hold the line).

## Technical Details

**The gap:** `saa-rules-modal.tsx`, `saa-rules-hero-tiers.tsx`, `saa-rules-icon-grid.tsx`, `saa-rules-national-kudos.tsx` shipped with plain-string Vietnamese copy:
- "Thể lệ" (rules)
- "NGƯỜI NHẬN KUDOS" (people who receive)
- "NGƯỜI GỬI KUDOS" (people who send)
- "KUDOS QUỐC DÂN" (national kudos award)
- 6 collectible icon names (REVIVAL, TOUCH OF LIGHT, STAY GOLD, FLOW TO HORIZON, BEYOND THE BOUNDARY, ROOT FURTHER)

All four files imported `next-intl` *in the tests only* (mocked `useTranslations`), but the components never called it. The message files (`messages/vi.json`, `messages/en.json`) were untouched—no `Rules` namespace.

**Live impact:** EN-locale users on the home page saw the entire Rules panel in Vietnamese while the rest of the page (hero-section, awards-section, kudos-section, widget-button) switched to English. A visible regression in a brand-new feature.

**Root artifact:** Reviewer's finding #1 — "`saa-rules-modal.tsx` ... hardcode all Vietnamese copy as plain strings — no `useTranslations()` call anywhere in any of the four files."

## What We Tried

1. **Initial path (failed the gate):** Built the modal as presentational components; tester ran green against hardcoded copy; reviewer caught it on read-through.

2. **Recovery:** 
   - Added `Rules` namespace to `messages/vi.json` (Vietnamese primary):
     ```json
     "Rules": {
       "title": "Thể lệ",
       "receiverSection": "NGƯỜI NHẬN KUDOS",
       "senderSection": "NGƯỜI GỬI KUDOS",
       "nationalKudos": "KUDOS QUỐC DÂN",
       "newBadge": "Nhận từ 1-4 người khác nhác",
       ...
     }
     ```
   - Mirrored all keys to `messages/en.json` with English translations.
   - Refactored all four components to call `const t = useTranslations("Rules")` and replace hardcoded strings with `t("key")`.
   - Badge and icon `alt` attributes stayed static (proper nouns, identical across locales—that call was sound).
   - Tester suite updated: the three new test files (`saa-rules-modal.test.tsx`, `home-compose-widget.test.tsx`) had mocked `useTranslations`, so reconciling those mocks to the real key-echo (during mock setup, the mock now returns the key itself for assertion clarity) made tests pass cleanly.

3. **Re-test:** Full suite re-run came back 800/800 green, tsc + lint clean. No new test failures.

## Root Cause Analysis

**Immediate cause:** The Rules modal landed as Track A (background UI implementer) work. The subagent built it pixel-perfect but treated copy as data, not as a localization concern. The plan's phase-04 file flagged it, but nobody checked that flag during implementation.

**Deeper cause:** i18n scope creep. The initial forge had a hedge in the plan: "phase-01 may keep static in component OR resolve vi+en." But phase-04 (integration) tightened it: "SC6: All new visible strings resolve vi+en." That tightening should have surfaced as a clarification question or an explicit caveat in the handoff to the UI implementer. It didn't. The orchestrator assumed the implementer was surfacing all strings to the integration layer; the implementer assumed copy was a design asset, not a localization problem.

**Why review caught it:** Reviewer read the spec (FR6/SC6), read the plan (phase-04 success criteria), then read the code. Saw that the plan explicitly required it but the code skipped it. That's the job working as designed—review is supposed to catch gaps between spec/plan and code. But it shouldn't have needed to.

## Lessons Learned

1. **i18n is not a presentational detail.** When a modal ships with copy, the localization boundary lives in the handoff from UI to integration, not in the component itself. The plan called it. The component build should have surfaced the question: "where does this copy get keyed?"

2. **Hedging in the plan is a flag.** The initial "may keep static OR resolve" gave the implementer two paths. By the time we reached phase-04, we'd chosen one (resolve vi+en), but that choice didn't travel back to the implementer. Explicit routing: if phase-04 owns i18n, phase-01 needs to know that before the code lands.

3. **Review is a circuit breaker, not a first pass.** Review caught this fast and we fixed it faster. But the real lesson is: **the spec and plan were right. They weren't re-read during implementation.** Reading phase-04's own exit criteria during phase-01 would have saved the rework.

4. **Test coverage hides scope gaps.** We had 100% test coverage of the component's behavior—open, close, click, render. But the tests never checked "do strings come from i18n?" Because the components didn't call `useTranslations`, the mock setup never ran, and nobody noticed the missing import. Coverage is necessary but not sufficient; intent matters.

5. **Timing of review is worth thinking about.** Shipping the modal first, getting tester green, then hitting review—that's the standard gate. But for a component that's known to have scope (spec explicitly lists FR6/SC6), a brief design-to-i18n review *before* the implementer starts would have caught this pre-build. Not always possible, but worth considering.

## Next Steps

- ✅ **Fixed:** i18n namespace (`Rules`) added to both `messages/{vi,en}.json`; all four modal components refactored to `useTranslations("Rules")`. Tester re-run 800/800 green.
- ✅ **Verified:** PR #10 merged to origin hungls-2814/saa (feat/kudos-hero-badges-rules, commit 7a260f8).
- **Going forward:** When a plan explicitly links spec success criteria to a phase, highlight that link in the handoff to implementers. A one-line note ("SC6 requires i18n; see phase-04") in the UI subagent's prompt would have surfaced this early.

---

**Evidence gate:** 800/800 tests (35 new), tsc + lint clean, review passed after fix, PR shipped.

**Shipped:** 2026-07-09, PR #10 to origin hungls-2814/saa.
