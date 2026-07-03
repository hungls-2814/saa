# Review — F002 Homepage SAA 2025

Scope: `app/(home)/**`, `app/components/language-selector.tsx`, `lib/event/countdown.ts`, `messages/{vi,en}.json` (Home ns), `.env.local.example`, login-header import switch, removal of scaffold `app/page.tsx` + `app/login/components/language-selector.tsx`. ~1686 LOC across 22 files, all <200 lines.

Verified independently (not taking the ticket's claims on faith):
- `npx vitest run` → 176/176 pass.
- `npx eslint` on changed paths → clean.
- `npx tsc -p tsconfig.json --noEmit` → **2 errors**, contradicting the "tsc clean" claim (see Critical-adjacent finding below).
- `next build` not re-run (trusted per task) — no build-affecting changes found in review.

## Critical

None that block runtime/security. The type errors below are elevated to Major rather than Critical because they don't affect the compiled JS (Next's build uses SWC, not full `tsc`, so `next build` can succeed while `tsc --noEmit` fails) — but they are real, verifiable falsehoods in the task's "tsc clean" premise.

## Major

1. **"tsc clean" claim is false.** `npx tsc -p tsconfig.json --noEmit` reports:
   ```
   app/(home)/components/account-menu.test.tsx(22,5): error TS2322: Type 'null' is not assignable to type 'string | undefined'.
   app/(home)/components/site-header.test.tsx(33,5): error TS2322: Type 'null' is not assignable to type 'string | undefined'.
   ```
   Both mock a Supabase `User` with `phone: null` (account-menu.test.tsx:22, site-header.test.tsx:33). The real `@supabase/supabase-js` `User.phone` type is `string | undefined`, not nullable. Vitest doesn't typecheck by default, so this slipped through the green test run. Fix: use `phone: undefined` (or omit the field) in both mocks.
   **Fix:** `phone: undefined` instead of `phone: null` in both files.

2. **Award category description copy-paste bug** — `messages/vi.json` and `messages/en.json`, `Home.awards.items.{signatureCreator,mvp}.desc` are byte-identical to `bestManager.desc` ("Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm" / "Honoring managers with strong management skills who lead their teams well"). This is nonsensical for an MVP or "Creator" award — reads as if MVP/Signature-Creator winners are being honored for *management* skills. Present in both locales identically, so it's a content/data bug, not a translation-drift issue. Spec (`docs/features/F002-homepage/overview.md` award list) doesn't give per-category copy, so this was authored/invented, but the invention duplicated the wrong category three times over.
   **Fix:** author distinct, category-appropriate descriptions for `signatureCreator` and `mvp` in both `messages/vi.json` and `messages/en.json`.

3. **Dangling font-variable reference** — `app/(home)/components/countdown.tsx:55` uses `font-[family-name:var(--font-digital-numbers)]`, but `--font-digital-numbers` is never defined anywhere (`app/(home)/fonts.ts` only exports `--font-montserrat` / `--font-montserrat-alternates`; confirmed via grep across the repo — no other definition exists). This is not a crash, but a silent visual regression: the CSS custom property resolves to nothing, so the browser falls back to the inherited font stack (Montserrat, per the page wrapper), not whatever monospace/digital face the design intended for the countdown tiles. Given the design explicitly calls out countdown numeral tiles as a styled element, this is a real visual miss, not a shrug-worthy nit.
   **Fix:** either import a digital/mono font in `fonts.ts` and export `--font-digital-numbers`, or drop the dead class and let it inherit Montserrat intentionally (with a comment saying so).

## Minor

4. **Hydration-mismatch risk in `Countdown`** (`app/(home)/components/countdown.tsx:15`) — `useState(() => new Date())` runs once during SSR (using the server's clock) and again as the initial client render before `useEffect` fires (using the client's clock). If server-render and client-hydration straddle a minute boundary, `getCountdown` produces different digit values between the SSR HTML and the first client paint, triggering a React hydration-mismatch warning (React auto-recovers by re-rendering client-side, so no crash, but it's a real dev-console warning and a very brief visible flicker in prod). Low practical impact (1-in-60-seconds window, digits differ by at most 1), but avoidable.
   **Fix:** seed with `null`/a server-computed prop and render a stable placeholder until first client tick, or accept via comment that this is a known, intentionally-tolerated flicker. Currently there's no comment acknowledging the tradeoff — worth one line either way.

5. **`comingSoon` i18n typo** — `messages/vi.json` and `messages/en.json` both have `"comingSoon": "Comming soon"` (double-m typo), and it's baked verbatim into `countdown.test.tsx:10,35,48,57` as the expected string. Cosmetic, user-visible, present in both locales (copy-paste, not translation error).
   **Fix:** correct to `"Coming soon"` in both message files and update the 4 test assertions.

6. **Dead `containerRef` in `AccountMenu` and `NotificationButton`** (`app/(home)/components/account-menu.tsx:17,40` and `notification-button.tsx:15,27`) — both declare and attach `containerRef` but never read `.current`; outside-click is instead handled by a separate fixed full-screen overlay `<div onClick=...>`. This differs from `WidgetButton` (`widget-button.tsx:14,21-23`), which uses the ref correctly for a `mousedown` listener. Not a bug (the overlay approach works), but the unused ref reads as leftover/copy-paste from the `WidgetButton` pattern and is confusing for a future maintainer wondering why outside-click doesn't fire off the ref.
   **Fix:** either remove the unused ref from both components, or switch them to the same `mousedown`+ref pattern as `WidgetButton` for consistency (three near-identical dropdown components should share one implementation, per DRY — see Suggestion below).

## Suggestions (Nit / DRY)

7. `AccountMenu`, `NotificationButton`, `WidgetButton`, and `LanguageSelector` (`app/components/language-selector.tsx`) all hand-roll the same open/close/Escape/outside-click dropdown state machine with minor inconsistencies (two use overlay-div, one uses ref+mousedown listener). Four independent implementations of the same interaction pattern is a DRY smell waiting to drift further. Consider extracting a `useDismissableMenu` hook once a third consumer shows up outside this feature (YAGNI-respecting: not blocking now, but flag for the next touch).
8. `hero-section.tsx`, `award-card.tsx`, `kudos-section.tsx`, `root-further-section.tsx` all carry honest, well-written comments disclosing that decorative bitmap art was recreated as CSS/SVG gradients because MoMorph image URLs were null/the Figma image API 500'd. This is good practice — the fallback is documented in-place rather than silently diverging from spec. No objection to the approach; flagged only because the task asked me to assess it. The CSS/SVG approximations are reasonable stand-ins and don't block ship; a follow-up ticket to swap in real assets once available would close the loop.

## Correctness deep-dive (per task focus)

- **Countdown math** — `lib/event/countdown.ts` is pure, well-isolated, and correctly floors partial minutes (verified via `countdown.test.ts`: exact-equal boundary, post-target, sub-minute-remaining, invalid/undefined input). Matches spec's 0-pad / hide-"Coming soon"-at-target / graceful-fallback requirements. No bugs found in the math itself.
- **Auth-aware header** — `page.tsx:23-25` fail-closed: `isSupabaseConfigured()` short-circuits to `null` user (treated as logged-out) when Supabase env vars are placeholder/unset, avoiding a crash on `createClient()` with empty URL/key. `cookies()` correctly awaited per Next 16 async contract (`lib/supabase/server.ts:10`). `SiteHeader` correctly branches bell+account-menu only when `user` is truthy (`site-header.tsx:55,57` / spec acceptance criterion 2). No unhandled rejection path if `auth.getUser()` itself throws (e.g. network failure to Supabase) — it isn't wrapped in try/catch, so a transient Supabase outage would 500 the whole homepage rather than degrading to logged-out. Given `isSupabaseConfigured()` already treats "not configured" as safe-to-render, the equivalent care wasn't extended to "configured but momentarily unreachable." Minor-severity since Supabase SSR client calls are normally resilient/cached, but worth a `.catch()` fallback for production hardening — not blocking this review.
- **Routing hrefs / slugs** — cross-checked every link against spec section "Navigation" and "Award category slugs": logo→`/` (site-header.tsx:21, site-footer.tsx:22), nav Awards Information→`/awards-information`, Sun* Kudos→`/kudos`, hero CTAs→`/awards-information`/`/kudos`, footer Tiêu chuẩn chung→`/standards`, all 6 award cards→`/awards-information#<slug>` with slugs matching spec exactly (`awards-data.ts`). All correct.
- **No data leakage** — `page.tsx` only forwards `user` (the Supabase `User` object) to `SiteHeader`→`AccountMenu`; `AccountMenu` renders nothing from `user` except gating on truthiness (no email/id ever rendered to DOM). No PII leak.
- **Secrets** — `.env.local.example` only adds a public countdown-target var (`NEXT_PUBLIC_EVENT_DATETIME`), no real secrets; correctly a "-example" file with placeholder Supabase values already in place pre-existing.

## i18n completeness

Verified programmatically: `Home` namespace key sets in `vi.json` and `en.json` are identical (no missing/extra keys either direction). EN is a faithful, non-machine-feeling translation (spot-checked `hero` and `rootFurther` — long paragraphs genuinely re-authored in English, not left in Vietnamese). The two real defects are the `comingSoon` typo (Minor #5) and the copy-pasted award descriptions (Major #2) — both are content bugs replicated identically across locales, not localization gaps.

## Convention adherence

- Kebab-case file naming: consistent (`site-header.tsx`, `award-card.tsx`, etc.).
- File size: all under 200 lines (largest is `account-menu.test.tsx` at 169).
- `LanguageSelector` extraction to `app/components/` is clean: `login-header.tsx` now imports from `@/app/components/language-selector`, old `app/login/components/language-selector.tsx` deleted, no other reference to the old path remains (confirmed no stale imports). Both consumers (`login-header.tsx`, `site-header.tsx`) work off the same shared component — good DRY, matches instruction "do not fork a per-route copy" in the component's own doc-comment.
- Matches login-feature idiom: per-route `fonts.ts`, server components for static sections + `getTranslations`/`getTranslations` from `next-intl/server`, client components only where interactivity is required (`"use client"` correctly scoped to `Countdown`, `AccountMenu`, `NotificationButton`, `WidgetButton`, `LanguageSelector`).
- No hardcoded UI strings found outside i18n — spot-checked every `.tsx`; the only literal English string is the stylized `"KUDOS"` wordmark (`kudos-section.tsx:51`), which is a brand mark, not copy, and appears identically in the design regardless of locale (acceptable).

## Metrics

- Type coverage: TS strict mode on, but **2 type errors present** (test files) — see Major #1.
- Test coverage: 176/176 passing (15 files); every new component/util has a co-located test file except the presentational-only sections (`hero-section`, `kudos-section`, `root-further-section`, `page.tsx` itself) — acceptable given they're server components with no branching logic beyond translation lookups.
- Lint: 0 issues on changed paths.

## Score & Verdict

**Score: 8/10**
**Verdict: CHANGES_REQUESTED**

Rationale: no security holes, no auth bypass, no data leakage, correct fail-closed Supabase handling, correct routing, solid countdown logic and tests, clean i18n key parity. But the "tests pass / tsc clean" premise is only half true — real `tsc` errors exist — and there's a genuine content bug (3 award categories sharing one wrong description, identically in both locales) that a user will see immediately on the awards grid. Neither is a security or architecture problem, but both are concretely wrong and cheap to fix. Not a 9.5+/APPROVE until: (a) the two `phone: null` type errors are fixed, (b) MVP/Signature-Creator descriptions are corrected, (c) the `--font-digital-numbers` dangling reference is either wired up or intentionally dropped with a comment.

## Unresolved questions

- Was `tsc --noEmit` actually run before the "tsc clean" claim, or was a narrower/older command used that excludes test files? Worth checking whether CI has a `typecheck` script at all — none exists in `package.json` today (only `lint`, `test`, `build`). Recommend adding one (`"typecheck": "tsc --noEmit"`) so this class of gap can't recur silently.
- Is `--font-digital-numbers` a leftover from an earlier draft that intended a real digital-clock font import, or dead from the start? Only the original author can say whether the visual intent was "use a special face" or "matches Montserrat is fine."

**Status:** DONE_WITH_CONCERNS
