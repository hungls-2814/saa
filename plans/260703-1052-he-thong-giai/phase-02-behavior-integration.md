# Phase 02 — Behavior & Integration (Track B)

## Work items
1. **Auth guard** — add `/he-thong-giai` to `proxy.ts` PROTECTED_PATHS (unauthenticated
   → `/login`); server page also `getUser()` → `redirect("/login")` (defense-in-depth).
2. **Scroll-spy hook** — `useActiveSection(slugs)` (client): IntersectionObserver sets the
   active slug on scroll; click a sidebar item → smooth-scroll to `#slug` + set active;
   honor initial `#slug` from the URL (homepage deep-link).
3. **i18n** — `AwardsPage` namespace in `messages/{vi,en}.json`: page title/eyebrow,
   sidebar labels, and per-award {title, desc, quantityLabel, quantityValue, prizeLabel,
   prizeValue(+note)}. VN verbatim from design; EN faithful.
4. **Award detail data** — `app/he-thong-giai/data/awards-detail-data.ts`: per slug →
   i18n keys + orb image path (`/home/award-<slug>.png`) + prize variants (dual for signature).
5. **Homepage link rewire** — `/awards-information` → `/he-thong-giai` in award-card,
   site-header nav, hero CTA, site-footer; update their tests accordingly.

## Integration
Wire the sidebar + sections to the scroll-spy hook; server page passes `user` to header.

## Status: COMPLETE ✅
**Date:** 2026-07-03  
**Work Items Completed:**
1. ✅ Auth guard: `/he-thong-giai` in `proxy.ts` PROTECTED_PATHS + server page `getUser()` redirect (defense-in-depth)
2. ✅ Scroll-spy: `useActiveSection(slugs)` hook — IntersectionObserver + URL hash deep-link support + smooth-scroll via sidebar click
3. ✅ i18n: `AwardsPage` namespace in `messages/{vi,en}.json` — title/eyebrow, sidebar labels, per-award {title, desc, quantityLabel, quantityValue, prizeLabel, prizeValue+note}
4. ✅ Award data: `app/he-thong-giai/data/awards-detail-data.ts` — 6 awards with slug→i18n keys, orb paths, dual-prize Signature
5. ✅ Homepage rewire: `/awards-information` → `/he-thong-giai` in award-card, site-header nav, hero CTA, site-footer + test updates

**Deferred Minors (future work):**
- Award slug/title data duplicated between `app/(home)/data/awards-data.ts` (AWARD_CATEGORIES) and `app/he-thong-giai/data/awards-detail-data.ts` (AWARD_DETAILS) — future DRY refactor recommended; test for cross-file consistency
- Scroll-spy cosmetic flicker during smooth-scroll (IntersectionObserver fires mid-scroll) — self-corrects when settled; not a correctness bug
- Site-header active-state wiring: on `/he-thong-giai`, "Awards Information" nav should highlight (spec narrative) — requires active-page prop threading; acceptable follow-up
