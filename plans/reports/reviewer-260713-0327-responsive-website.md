# Review: feat/responsive-website (working-tree diff)

Scope: 20 modified files + 1 new file (`app/(home)/components/mobile-nav-menu.tsx`), uncommitted on `feat/responsive-website`. Verified via `git diff` (working tree), not `main...HEAD` (branch has no commits yet for this work — all changes are unstaged).

Checks run: `npx tsc --noEmit` (clean), `npx eslint` on touched files (clean), `npx vitest run` full suite (847/847 pass, no new failures).

## Overall Assessment
Solid, disciplined mobile-first pass. Near-universal pattern: shrink the base (mobile) value, restore the original at `sm:` (or `lg:` where a section intentionally also changes the tablet look) so ≥lg stays pixel-identical. Verified this holds for every touched file below. The new `MobileNavMenu` is a clean, correctly-scoped client component with proper server/client boundary. No critical issues.

## Desktop Regression Check (per file)
All confirmed **lg-identical** to pre-change values:
- `award-card.tsx`: `text-xl sm:text-2xl` — sm+ restores `text-2xl`. OK.
- `awards-section.tsx`: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — lg unchanged. OK (mobile bug fix: was `grid-cols-2` unconditionally before).
- `countdown.tsx`, `countdown-unit.tsx`, `kudos-section.tsx`, `site-header.tsx`, `sidebar-stats.tsx`: base shrunk, `sm:` restores exact original value/leading pair. OK.
- `hero-section.tsx`, `login-hero.tsx`: restore only at `lg:` (`min-h-[600px] lg:min-h-[779px]`, same for 845px). This means **tablet (640–1023px) also gets the reduced mobile height**, unlike the `sm:`-restore pattern used everywhere else. Confirmed harmless in both cases — the hero's background art is a separate `aspectRatio`-driven layer at the page level (`app/(home)/page.tsx`), not tied to this min-height, and content is `items-start` (no vertical centering that would need the taller box). Meets the stated "≥lg identical" bar, just flagging the inconsistent restore-breakpoint choice vs. sibling edits — worth a quick tablet screenshot since it's a judgment call, not a mechanical mirror.
- `award-detail-section.tsx`: `aspect-square w-full max-w-[220px] sm:max-w-[336px]` replacing fixed `h-336 w-336` — at sm+ resolves to the same 336×336 square (aspect-square + max-w cap), `sizes` attr updated to match. OK.
- `compose-kudos-modal.tsx`: full-screen dialog on `<sm` (`h-dvh`, square corners, no outer inset), `sm:` restores `h-auto`, `max-h-[calc(100dvh-2rem)]`, `rounded-3xl`, matching outer `sm:p-4` — all original sm+ values intact. OK.
- `kudos-banner.tsx`: mobile height 280→460px and `justify-center`→`justify-start` + `pt-12 sm:pt-14`; `sm:h-[360px] lg:h-auto lg:aspect-[45/16]` and `lg:pt-[184px]` untouched, so lg cascade still wins → visually identical at lg. Rationale in comments is well-documented and verifiable (heading/wordmark/pill collision at <640px). OK — this is the requested "kudos-banner top-anchor fix."
- `kudos-card.tsx`: `h-[525px]`→`min-h-[525px]` for highlight cards. On typical (non-overflowing) content this renders identically at every breakpoint; it now lets a card grow instead of clipping if names wrap past the 525px design height. Sound trade-off, no lg regression under normal data.
- `notification-button.tsx`, `login-toast.tsx`: added `max-w-[calc(100vw-2rem)]` / `max-w-[90vw]` guards — only bite below ~320px viewports, no effect at sm/lg. OK.
- `profile-header.tsx`: icon row and stat/department row now `flex-wrap` + shrunk gaps/sizes at base, restored at `sm:`. lg untouched. OK.
- `app/layout.tsx`: `overflow-x-hidden` added to `<body>`. `<html>` has no explicit `overflow`, so per CSS overflow-propagation rules this clips at the viewport level (standard, safe technique) rather than creating a new scroll container that could break `position: sticky`/`fixed` descendants. Cross-checked against `app/he-thong-giai/components/awards-sidebar.tsx` (`lg:sticky`) and the newly-added `h-dvh`/`fixed` elements (toasts, mobile drawer) — none should be affected. This is a global change outside the file list the task named as in-scope; recommend one quick visual check on the awards-sidebar sticky behavior since it wasn't touched/tested by this diff.

## Correctness: `mobile-nav-menu.tsx`
- State: single `open` boolean, `useEffect` registers/cleans up the `keydown` listener only while open. Correct.
- Escape closes (`e.key === "Escape"` → `setOpen(false)`). Correct.
- Backdrop click closes (`e.target === e.currentTarget` guard on the overlay `onClick`). Correct — doesn't fire on clicks inside the panel.
- Each `Link` has its own `onClick={() => setOpen(false)}` — clicking a link closes the drawer. Correct.
- Accessibility: toggle button has `aria-label` + `aria-expanded`; close button has `aria-label`; drawer `<nav>` has `aria-label`; icons are `aria-hidden`. All present and correct.
- Server/client boundary: `SiteHeader` (async server component) builds `navLinks` as a plain serializable array (`{href, label, active}`) and passes it + a string `menuLabel` into the `"use client"` `MobileNavMenu`. No functions/JSX crossing the boundary. Correct.
- `md:hidden` on the wrapper matches the pre-existing desktop `<nav className="hidden ... md:flex">` breakpoint exactly (both flip at 768px, no gap/overlap range) — confirmed no custom Tailwind breakpoints are configured (`app/globals.css` `@theme inline` doesn't redefine `--breakpoint-*`).

Gaps (non-blocking):
- **No focus management**: opening the drawer doesn't move focus into it (e.g. onto the close button), and closing doesn't return focus to the toggle. Matches the existing `saa-rules-modal.tsx` convention in this codebase (same gap there, pre-existing project-wide pattern, not a regression) — worth fixing project-wide at some point, not specific to this PR.
- **No body scroll lock**: background page can still scroll behind the `bg-black/60` overlay while the drawer is open.
- **No test file** for `mobile-nav-menu.tsx`, and `site-header.test.tsx` wasn't updated to assert the hamburger toggle renders / has the right label. New stateful, interactive component shipped with zero unit coverage for open/close, Escape, backdrop-click, or link-click-closes behavior.

## i18n
`nav.menu` added to both `messages/en.json` and `messages/vi.json` as `"Menu"` in both. Checked against sibling keys in the same `nav` block (`aboutSaa`, `awardsInformation`, `sunKudos`) — those are also identical English strings in both locale files (pre-existing, intentional convention: nav/brand labels stay in English across locales). Not a newly introduced bug.

## Conventions/DRY
Nav link data (href + i18n label key) is defined **twice** in `site-header.tsx`: once inline as three `<Link>` JSX elements in the desktop `<nav>`, and again as the `navLinks` array built for `MobileNavMenu`. The comment above `navLinks` claims "DRY: one source of link data," but the desktop links aren't actually derived from that array — they're separately hardcoded literals with the same hrefs. A single `NAV_ITEMS` array (href, i18n key, `NavKey`) mapped into both the desktop `<nav>` and the `navLinks` prop would remove the duplication and the two rendering paths would always stay in sync. Medium — not a bug today (values match), but a footgun for the next nav-link change.

## Issues by Severity
- **Critical**: none.
- **High**: none.
- **Medium**:
  1. Nav link data duplicated between desktop JSX and `navLinks` array in `site-header.tsx` (see DRY section above).
  2. No test coverage for the new `MobileNavMenu` (open/close, Escape, backdrop, link-click) or for the hamburger button's presence/label in `site-header.test.tsx`.
- **Low**:
  1. `hero-section.tsx` / `login-hero.tsx` restore desktop height at `lg:` instead of `sm:` (inconsistent with the `sm:`-restore pattern used elsewhere) — confirmed harmless, but worth a tablet screenshot to be sure.
  2. No focus trap / focus return in the mobile drawer (matches existing `saa-rules-modal` gap, not new).
  3. No scroll lock on `<body>` while the drawer is open.
  4. `overflow-x-hidden` on `<body>` is a global, out-of-scope-file change; low risk (verified propagation semantics) but recommend a quick visual check of the `lg:sticky` awards sidebar.

## Positive Observations
- Every mobile-first shrink is paired with an explicit restore of the exact original value — spot-checked all 16 touched component files, all match pixel-for-pixel at lg.
- Non-obvious changes (kudos-banner height/justify-start, kudos-card min-height) carry detailed, verifiable rationale comments (measured breakpoints, collision diagnosis).
- Test files (`countdown-unit.test.tsx`, `awards-section.test.tsx`) were updated in lockstep with the implementation changes they cover, including a regression-lock assertion (`sm:h-[82px]` etc.) so the desktop value can't silently drift back.
- Clean `tsc`/`eslint`, full existing suite green (847/847).

## Metrics
- Files changed: 20 modified + 1 new (component) + 2 test files updated.
- Type check: clean.
- Lint (touched files): clean.
- Test suite: 847/847 passing (2 pre-existing unrelated jsdom "navigation" warnings, not failures).

## Unresolved Questions
- Was the `overflow-x-hidden` body change intentionally scoped into this PR, or should it be split out / accompanied by a note in the plan, since it's a global layout change rather than a per-component breakpoint addition?
- Is the missing test coverage for `MobileNavMenu` intentionally deferred, or should it block merge per this repo's "tests run against the FINAL code" rule?

**Status:** DONE_WITH_CONCERNS
**Summary:** Score 8/10. No critical/high issues; all mobile-first edits verified lg-identical to the original desktop values, and the new mobile-nav-menu.tsx is correctly implemented (state, Escape/backdrop close, link-click-closes, aria attributes, server/client boundary). Flagging two Medium items — duplicated nav-link data in site-header.tsx, and zero test coverage for the new drawer component — plus a few Low a11y/consistency notes.
**Concerns/Blockers:** Medium: (1) nav link href/label data hardcoded twice in site-header.tsx (desktop JSX vs navLinks array) despite a comment claiming single-sourcing; (2) no unit tests added for mobile-nav-menu.tsx's interactive behavior or its rendering in site-header.test.tsx.
