# Pre-ship review — F008 follow-up visual fixes (feat/profile-page)

Scope: the 5 follow-up changes on top of the already-SEALED F008 core (profile-header
padding/keyvisual, VN flag SVG, logo transparent-bg comments, /profile proxy guard test).
Review-only, no edits made.

## Verification performed
- `npm run typecheck` — clean, 0 errors.
- `npm run lint` — 15 warnings, all pre-existing (in `award-detail-section.test.tsx`,
  `awards-hero.test.tsx`, `avatar.tsx`, `compose-kudos-modal.test.tsx`, `kudos-banner.tsx`,
  `coverage/block-navigation.js`, and one new-but-expected `<img>` warning inside
  `language-selector.test.tsx` line 32 — that's the test's own raw `<img>` mock stub, not
  new prod code). No new lint issues in the 5 follow-up files.
- Full test suite: `npx vitest run` → 67 files / 825 tests passed, 0 failures.
- Read `app/profile/components/profile-header.tsx`, `app/profile/page.tsx`,
  `app/components/language-selector.tsx`(+test), `app/(home)/components/site-header.tsx`,
  `site-footer.tsx`, `proxy.ts`(+test) in full.
- Confirmed asset paths exist: `public/home/awards-hero-keyvisual.png`,
  `public/login/logo.png`.

## Findings

### Critical: none

### High: none

### Medium: none

### Low
1. **Dead asset** — `public/login/icons/vn-flag.png` is now unreferenced by any
   production code (only appears in `language-selector.test.tsx` as a negative
   assertion `not.toBeInTheDocument`). Harmless but safe to delete in a follow-up
   cleanup; not a ship-blocker.

### Nit
1. `app/profile/components/profile-header.tsx` — the CSS layering that makes the
   gradient overlay track the keyvisual band's height (out-of-flow `absolute inset-0`
   child sized by its in-flow sibling's explicit height, inside a non-`relative`-but-
   `absolute` parent) works correctly but is a subtle pattern. Worth a one-line comment
   for future maintainers, not required for this ship.

## Per-item verification

1. **profile-header.tsx padding/keyvisual/gap** — `pt-[120px] sm:pt-[152px] lg:pt-[176px]`
   clears the 80px fixed `SiteHeader` (z-20, absolute) + design's 96px gap at each
   breakpoint; keyvisual art `h-[420/480/512px]` stays tall enough that the name
   (design y416–496) always lands on art, not solid bg, confirmed by re-deriving the
   math from the comments. Icon-row→label gap uses `gap-8` = 32px, matches the stated
   spec. Section is `overflow-hidden`, keyvisual wrapper `z-0`, content `z-10` — no
   z-index or overflow conflict with the header's own `z-20`. `profile-header.test.tsx`
   doesn't assert literal pixel values (expected — tests target behavior, not exact
   CSS), and none of its 6 tests were invalidated by the padding/height changes; all
   pass.

2. **VN flag SVG** — valid markup (`rect` + 10-vertex alternating outer/inner `path`,
   both closed). Re-derived the star geometry from the path's own coordinates: outer
   vertices sit at radius 6 from center (15,10) (e.g. `(15,4)`→ dist 6), inner vertices
   at radius ≈2.4 (e.g. `(16.41,8.06)` → dist ≈2.399) — matches the doc-comment exactly,
   a real 5-pointed star, not eyeballed. `aria-hidden` present (decorative, consistent
   with `GbFlag`). No `id` attributes at all in `VnFlag`, so no collision risk — correctly
   does NOT need `useId()` (unlike `GbFlag`, which uses `clipPath` ids and does need it
   for trigger+list dual-render). Test file updated in lockstep: old
   `renders VN flag as image` assertion replaced with an inline-SVG assertion plus an
   explicit `not.toBeInTheDocument()` check against the old raster path — good
   regression coverage for the exact bug being fixed (star cropping).

3. **site-header.tsx / site-footer.tsx logo transparent-bg** — `NavKey` union extended
   with `"profile"`; `cls()` lookup is exhaustive over the union (TS enforces this, and
   typecheck is clean), so `active="profile"` degrades safely to "no nav item
   highlighted," as intended — verified against `app/profile/page.tsx:81`
   (`<SiteHeader user={user} active="profile" />`). The `Image` elements in both header
   and footer had no `bg-*` class before or after this diff (checked against
   `git show main:.../site-header.tsx`) — the transparent look comes entirely from the
   swapped PNG binary, not a code change, so the added comments are purely explanatory
   and introduce zero behavioral risk. `site-header.test.tsx` / `site-footer.test.tsx`
   (25 tests total across both + profile page) all pass unmodified.

4. **public/login/logo.png transparent PNG** — file present, 3580 bytes, loads via
   existing `next/image` usage (`width=52 height=48 object-contain`) in both header and
   footer plus the login page (out of this diff's scope but shares the same asset) —
   no broken `<Image>` props, no missing dimensions.

5. **proxy.test.ts /profile guard** — new `describe` block asserts (a) unauthenticated
   → 307 redirect to `/login`, (b) authenticated → 200 pass-through. Matches
   `proxy.ts`'s `PROTECTED_PATHS` now including `/profile`, and matches the
   defense-in-depth redirect already in `app/profile/page.tsx:55-57`. Two-layer guard
   (proxy + page-level `getUser()` check) is consistent with `/kudos` and
   `/he-thong-giai` — no regression, no new gap.

## Unresolved questions
None — all 5 follow-up items are self-consistent with the sealed core and with each
other.

## Status: DONE

**Critical count: 0**
