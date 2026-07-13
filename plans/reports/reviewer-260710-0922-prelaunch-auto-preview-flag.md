# Review: feat/prelaunch-auto-preview-flag → main

## Scope
- proxy.ts, proxy.test.ts
- app/components/intro-gate.tsx (new), app/components/intro-gate.test.tsx (new)
- app/prelaunch/page.tsx, app/prelaunch/components/prelaunch-countdown.{tsx,test.tsx}
- app/layout.tsx, lib/prelaunch/cookies.ts, .env.local.example
- ~163 lines changed. Compared old (server-cookie intro) vs new (client sessionStorage intro) logic line by line via `git diff origin/main`.

## Overall Assessment
The core redirect-loop fix (the `if (demoSeconds != null) return;` guard) is correct and well-reasoned — traced all four launch × preview combinations, no `/` ↔ `/prelaunch` oscillation in any of them. SSR/hydration is clean (IntroGate always renders `null`, all logic is effect-only, no server/client render mismatch). sessionStorage access is correctly try/catched on both read and write sides with a fail-open (never-trap) default. However, found one concrete functional regression versus the old code that the "no loop in browser" verification would not have caught, since it requires the preview cookie to be present.

## Critical Issues

### 1. IntroGate is preview-blind — regresses the reviewer-preview escape hatch
`IntroGate` (app/components/intro-gate.tsx) takes no props and has no way to see `previewActive` — that cookie is `httpOnly` (proxy.ts:70-74) by design, unreadable from client JS, and `app/layout.tsx` mounts `<IntroGate />` with nothing passed in.

Compare with the **old** proxy.ts (pre-diff): both the before-launch gate and the after-launch intro-redirect were wrapped in a single `if (!previewActive) { ... }` block — i.e. a preview-cookie holder was structurally exempted from ever being bounced to `/prelaunch` for the intro, in either launch state. That exemption is gone in the new design: the new proxy.ts only keeps `!previewActive` on the before-launch gate; the after-launch intro logic moved entirely into `IntroGate`, which has no equivalent check.

Concrete repro (traced, not just asserted):
- Reviewer sets `?preview=1` once → `saa_preview` cookie persists (session cookie, no `maxAge`).
- Reviewer opens a **fresh tab** and hits `/` — before OR after launch.
- Server: gate/autoPreview both skip because `previewActive` is true (or because `beforeLaunch` is false after launch) → `/` is served 200, exactly as intended.
- Client: `IntroGate` mounts, checks `sessionStorage["saa_intro_done"]` — unset in a fresh tab → `router.replace("/prelaunch")` fires **regardless of the preview cookie**.
- `/prelaunch` renders with `isPreview=true` → shows the "⚠️ Preview mode" banner for a forced 10s, then bounces back to `/`.

Net effect: every fresh tab a reviewer opens to look at the live pre-launch or post-launch homepage now eats an unavoidable ~10s detour through the wrong-copy ("preview mode", not the friendly "welcome") splash — the exact interruption the preview escape hatch exists to avoid. Not an infinite loop (sessionStorage flag gets set, so it resolves after one bounce), but it defeats the stated purpose of `?preview=1`/`PRELAUNCH_AUTO_PREVIEW` ("drops reviewers straight into preview... no need to know the flag") and isn't exercised by any test — `proxy.test.ts` only covers server routing, and `intro-gate.test.tsx` can't express this case because `IntroGate` accepts no props to model it.

**Fix:** thread preview state into `IntroGate`, e.g. read `PREVIEW_COOKIE` server-side in `app/layout.tsx` via `cookies()` (same pattern already used in `app/prelaunch/page.tsx`) and pass `<IntroGate previewActive={previewActive} />`, short-circuiting the effect when true. Add a regression test for it.

## High Priority
None beyond the above — no other correctness, type-safety, or performance issues found in the diff.

## Medium Priority

- **Test gap — privacy-mode fallback branches untested.** Neither `sessionStorage` exception path is covered:
  - `intro-gate.tsx:30` (`catch { seen = true; }`) — no test mocks `getItem` to throw and asserts `router.replace` is NOT called.
  - `prelaunch-countdown.tsx:61` (`catch {}` around `setItem`) — no test mocks `setItem` to throw and asserts the redirect still fires.
  Both are explicitly the "must not trap the visitor" safety nets called out in the code comments; they deserve direct coverage rather than relying on inspection.

- **`/prelaunch` is a permanent one-way trip after launch, for anyone, always.** `isIntro = !isPreview && !isBeforeLaunch(new Date())` (page.tsx:42) is purely time-based, not session/sessionStorage-based. Any direct hit to `/prelaunch` post-launch — bookmark, shared link, search-engine crawler, browser back button — always shows the 10s splash and force-redirects home, forever; the page can never be "just viewed" again. Likely intentional (matches "prelaunch" being repurposed as the tab-scoped welcome splash) but confirm this is the desired permanent behavior, not just an artifact of the migration off query-param state.

## Low Priority

- **Operational parity gap.** Old auto-preview was `VERCEL_ENV !== "production"` (automatic on all non-prod deploys). New `PRELAUNCH_AUTO_PREVIEW` requires manual configuration per environment — `.github/workflows/cd.yml` sets nothing for it, and there's no `vercel.json` in the repo. Unless someone sets this in the Vercel project's environment variables for Preview deployments, auto-preview will silently stay off there (falls back to needing manual `?preview=1`), unlike before. Worth a deploy-checklist line, not a code fix.
- **Session-cookie lifetime crosses the launch boundary.** `PREVIEW_COOKIE` has no `maxAge`/`expires` (pre-existing, unchanged by this diff) — a reviewer who tested before launch and leaves the browser open past the real launch moment will still see `demoVariant="preview"` copy (not "intro") on the next fresh-tab bounce post-launch. Minor copy confusion only.
- **No-JS visitors skip the intro entirely** (client-only gate, vs. the old server-driven redirect). Presumably an accepted tradeoff of the tab-scoping requirement; flagging for awareness.

## Edge Cases Found (all traced manually, no loops confirmed except Critical #1's UX detour)
- Before-launch, autoPreview on, bare `/` hit → gate redirects to `/prelaunch` (search cleared) → autoPreview redirect appends `?preview=1` → served. Two hops, terminates, no loop.
- After-launch fresh tab happy path (`/` → `/prelaunch` welcome splash → `/`, sessionStorage set, no further bounce) — confirmed correct, matches the demoSeconds guard rationale in the code comment.
- `router.replace` (not `push`) is used on both redirect hops, so back-button history collapses to a single `/` entry — no stuck back-navigation into a stale `/prelaunch` state.
- Translation keys `previewHeading/previewNotice/introHeading/introNotice` all present in both `messages/en.json` and `messages/vi.json` — no missing-key fallback risk.

## Positive Observations
- The `demoSeconds != null` guard and its comment are exactly correct and clearly explain *why* (real target being in the past post-launch would otherwise fire `value.ended` instantly and loop with IntroGate).
- Consistent, defensive try/catch around every sessionStorage touch, with a documented "fail open" rationale each time.
- `lib/prelaunch/cookies.ts` centralizing key names (now including `INTRO_STORAGE_KEY`) keeps writer/reader in sync — good call carried over from the cookie-based design.
- Proxy tests are thorough for the auto-preview flag matrix (on/off/non-"true" value/no double-redirect).

## Recommended Actions
1. **[Critical]** Thread `previewActive` from the server into `IntroGate` (via `app/layout.tsx` reading `PREVIEW_COOKIE`) so preview-cookie holders are exempted from the intro bounce, restoring the old behavior. Add a test.
2. **[Medium]** Add tests for the two untested `catch` branches (IntroGate read failure, countdown write failure).
3. **[Medium]** Confirm with product/design whether "`/prelaunch` always splashes-then-redirects, forever, after launch" is intended permanent behavior.
4. **[Low]** Add `PRELAUNCH_AUTO_PREVIEW=true` to the Preview-environment config in Vercel (or document the manual step) to restore parity with the old automatic behavior.

## Metrics
- Type Coverage: not separately measured; typecheck reported clean per task brief (not independently re-run beyond the touched test files).
- Test Coverage: 52/52 tests pass in the three touched test files (`proxy.test.ts`, `intro-gate.test.tsx`, `prelaunch-countdown.test.tsx`), verified directly via `vitest run`. Full suite (846) not re-run in this session — trusted per task brief.
- Linting Issues: none observed in the diffed files.

## Unresolved Questions
- Is the permanent post-launch `/prelaunch` splash-and-redirect (regardless of sessionStorage) intended, or should visiting `/prelaunch` directly after the first tab-wide intro just show a no-op/redirect without the 10s wait?
- Is there a Vercel-side env var already configured for `PRELAUNCH_AUTO_PREVIEW` outside this repo (dashboard-only), making the "Low" operational-parity note moot?

**Status:** DONE_WITH_CONCERNS
**Summary:** Redirect-loop fix (demoSeconds guard) is correct, no `/`↔`/prelaunch` oscillation found, hydration is clean. Found one Critical functional regression: `IntroGate` can't see `previewActive` (httpOnly, no prop passed), so reviewer-preview-cookie holders now get force-bounced through the wrong-copy 10s splash on every fresh tab — the old code explicitly exempted them via `if (!previewActive)`. Also flagged two untested catch-branches and an operational parity gap (no CI/vercel config sets the new `PRELAUNCH_AUTO_PREVIEW` flag).
**Concerns/Blockers:** Critical #1 should be fixed (or explicitly accepted by the team) before shipping, since it silently breaks the exact reviewer-preview workflow this PR is meant to support pre-launch.
