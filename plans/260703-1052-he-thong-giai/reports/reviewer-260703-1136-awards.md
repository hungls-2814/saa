# Review: Awards System page (F003, `/he-thong-giai`)

Branch `feat/he-thong-giai`. Reviewed against `docs/features/F003-awards-system/overview.md` + `plans/260703-1052-he-thong-giai/clarifications.md`.

## Scope
- New: `app/he-thong-giai/**` (page + components + data + tests)
- Modified: `proxy.ts` (+test), `messages/{vi,en}.json` (AwardsPage ns), homepage rewires (award-card, hero-section, site-header, site-footer + tests)
- LOC: ~1117 across he-thong-giai (incl. tests); all source files well under 200 lines.

## Independently verified
- `tsc --noEmit`: clean.
- `next build`: succeeds (Turbopack, no ESLint step run during build in this Next version — confirms "build OK" but does **not** substitute for `npm run lint`).
- `npm test` (vitest run): 246/246 passed, re-run independently.
- `npx eslint app lib proxy.ts`: **24 errors, 10 warnings** — contradicts the "clean" premise for lint (see Major #1).
- `grep -rn "awards-information" app/ lib/ messages/`: zero hits — homepage rewire is complete.
- vi/en `AwardsPage` key sets: identical (scripted diff both directions = empty). Spot-checked EN copy — faithfully translated, not VN placeholder.
- All 6 award quantities/prizes checked field-by-field against the spec table (leading zeros, `prizeNote` presence/absence, dual-prize signature values) — exact match.

## Critical Issues
None found. Auth guard, i18n data, and homepage rewire are all correct.

## Major
1. **`npm run lint` fails (24 errors)** — all `@typescript-eslint/no-explicit-any` in the three new test files: `app/he-thong-giai/components/award-detail-section.test.tsx`, `awards-hero.test.tsx`, `use-active-section.test.ts`. The codebase's established convention for typed mocks in tests is a file-level `/* eslint-disable @typescript-eslint/no-explicit-any */` (see `app/login/components/login-toast.test.tsx:1`, `google-login-button.test.tsx:1`, `app/auth/callback/route.test.ts:1` — all clean under eslint because of this directive). The new files omit it. `development-rules.md` mandates "Lint before you commit" — this gate currently fails.
   - Fix: add the matching `/* eslint-disable @typescript-eslint/no-explicit-any */` directive to the top of the 3 files (and clean up the incidental unused-var/`<img>` warnings while there — `award-detail-section.test.tsx:7`, `awards-hero.test.tsx:6,62`, `award-detail-section.test.tsx:16,21`).

## Minor
1. **Header active-state not wired for this page** — `app/(home)/components/site-header.tsx:34-39` hardcodes the `/` link as always gold+underlined and takes no "current page" signal. On `/he-thong-giai`, spec's surface section says "header 'Awards Information' nav = active here" — this never happens; "About SAA 2025" stays active instead. Not in the bottom acceptance checklist, but explicitly promised in the narrative spec. Needs a `activePath`/`pathname` prop threaded through `SiteHeader` to fix properly — out of scope for a one-line patch, flagging for follow-up.
2. **`PROTECTED_PATHS`/`AUTH_PATHS` over-match via `startsWith`** — `proxy.ts:17-18`: `/he-thong-giai-anything` or `/he-thong-giai/x` would also be treated as protected (and `/login-x` as an auth page). Fails closed (over-protects), not a bypass, and no such route exists today, but it's a latent trap if a sibling route with a shared prefix is ever added. Consider exact match or `pathname === p || pathname.startsWith(p + "/")`.
3. **Slug/title data duplicated across two independent files with no shared source of truth**: `app/(home)/data/awards-data.ts` (`AWARD_CATEGORIES`) and `app/he-thong-giai/data/awards-detail-data.ts` (`AWARD_DETAILS`) hand-list the same 6 slugs/order/itemKeys separately. They agree today, but nothing enforces it — a future reorder/rename in one and not the other silently breaks the homepage→detail-page anchor links. Worth a cross-file identity test at minimum, ideally one array feeding the other.
4. **`use-active-section.test.ts` mutates global `window.location`** (`delete (window as any).location; window.location = {...}`) in `beforeEach` with no restore in `afterEach`. Works today because vitest gives each test file its own jsdom instance, but it's a global-state leak if pool/isolation config ever changes — restore the original `location` in `afterEach` for hygiene.
5. **Scroll-spy flicker risk**: `use-active-section.ts` — both `scrollTo()` (click) and the mount hash-effect set `active` synchronously, but the `IntersectionObserver` (`rootMargin: "-20% 0px -60% 0px"`) can re-fire mid smooth-scroll and briefly override `active` to an intermediate section before the scroll settles on the target. Self-corrects once scrolling stops (the target section is what remains in the observation band), so it's cosmetic, not a correctness bug — worth a note, not a blocker.
6. **`award-detail-section.test.tsx` is 236 lines**, over this codebase's own 200-line file guideline. Consider extracting the fixture `testCases` array or splitting per-scenario.
7. **Dead/misleading assertion**: `awards-hero.test.tsx:59-65` ("renders background key-visual with proper aspect ratio") computes `window.getComputedStyle(bgDiv)` into an unused `style` var (flagged by eslint) and then only asserts a class name — it never actually checks the aspect ratio. Either assert on `bgDiv.style.aspectRatio` / inline style, or rename the test.

## Nit
- `award-detail-section.test.tsx` mocks `t.has()` to always return `true`, so the "no `prizeNote`" branch (best-manager/mvp) is never exercised by this test file — verified correct only by manual inspection of `messages/{vi,en}.json` in this review, not by an automated assertion.
- The auth redirect to `/login` (both `proxy.ts` and `page.tsx`) doesn't carry a `?next=/he-thong-giai` return-to param, so a signed-out deep-link visitor lands on the default page after login rather than back on `/he-thong-giai`. Pre-existing gap (login page doesn't read `next` at all today) and not in the acceptance criteria — flagging for awareness only.

## Edge Cases Found
- Confirmed no security bypass from the `startsWith` matching (over-inclusive, not under-inclusive) — see Minor #2.
- Confirmed `isSupabaseConfigured() === false` path is treated as logged-out in `page.tsx`, exactly mirroring `app/(home)/page.tsx`'s existing pattern — fail-closed, consistent.
- Confirmed `IntersectionObserver` cleanup (`disconnect()` on unmount) is present and both `eslint-disable` comments in `use-active-section.ts` are accompanied by an inline justification, per repo convention.

## Positive Observations
- Auth guard is correctly layered (proxy + page defense-in-depth), matching the clarification decision exactly.
- All 6 award category quantities/prizes/dual-prize handling verified byte-for-byte against the spec table.
- Homepage rewire is complete and clean — zero leftover `/awards-information` references anywhere in `app/`, `lib/`, or `messages/`.
- vi/en i18n namespaces are key-complete and faithfully translated (not copy-pasted VN placeholders in EN).
- Component decomposition is sensible and DRY w.r.t. the homepage (`SiteHeader`, `SiteFooter`, `KudosSection` reused as-is; icons factored into a shared `award-icons.tsx`).
- Files are all comfortably under the 200-line guideline (except one test file, see Minor #6).

## Recommended Actions
1. Add `/* eslint-disable @typescript-eslint/no-explicit-any */` to the top of the 3 offending test files (or type the mocks) so `npm run lint` passes clean. **(Major, blocking)**
2. Follow-up ticket: thread an active-page indicator into `SiteHeader` so "Awards Information" highlights on `/he-thong-giai` per spec narrative.
3. Consider tightening `PROTECTED_PATHS`/`AUTH_PATHS` matching to avoid prefix over-match as more routes are added.
4. Consider a shared source of truth (or a cross-file consistency test) for the award slug/order data duplicated between homepage and detail page.

## Metrics
- Type Coverage: `tsc --noEmit` clean (0 errors).
- Test Coverage: 246/246 tests passing (60 in `app/he-thong-giai/**`).
- Linting Issues: 24 errors, 10 warnings (`npx eslint app lib proxy.ts`), all confined to 3 new test files.

## Unresolved Questions
- None — spec and clarifications fully cover the auth, routing, and i18n decisions needed to review this diff.

---

**Status:** DONE_WITH_CONCERNS
**Score:** 8/10
**Verdict:** CHANGES_REQUESTED (1 Major: `npm run lint` currently fails with 24 errors in new test files — trivial, mechanical fix; 0 Critical; functionality/spec-compliance is otherwise solid)
