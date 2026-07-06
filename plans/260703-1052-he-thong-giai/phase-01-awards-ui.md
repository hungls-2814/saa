# Phase 01 — Awards page UI (Track A)

MoMorph: Hệ thống giải — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/zFYDgyj_pD
Clarifications: `plans/260703-1052-he-thong-giai/clarifications.md`

## Goal
Code the `/he-thong-giai` UI via `momorph-implement-design`, bám sát design:
hero banner (art + ROOT FURTHER + title), sticky left sidebar (6 items), and 6
award detail sections (orb image alternating L/R, title, description, quantity,
prize) each with `id="<slug>"`. Reuse the homepage's SiteHeader, SiteFooter,
KudosSection, `public/home/award-*.png` orbs, and the hero art.

## Out of scope
- Auth guard, scroll-spy logic, i18n wiring, homepage link rewire (Track B).
- `/kudos`, `/standards` target pages.

## Integration contract
- Page `app/he-thong-giai/page.tsx` (Server Component) receives `user`; components in
  `app/he-thong-giai/components/`; award detail data in `data/awards-detail-data.ts`.
- All copy via next-intl `AwardsPage` namespace (vi+en); descriptions VERBATIM from design.
- Slugs: top-talent, top-project, top-project-leader, best-manager, signature-2025-creator, mvp.
- Sidebar active state + scroll target consume the Track-B scroll-spy hook.

## Status: COMPLETE ✅
**Date:** 2026-07-03  
**Files Delivered:**
- `app/he-thong-giai/page.tsx` — server page with auth guard
- `app/he-thong-giai/components/{awards-hero, awards-sidebar, award-detail-section, award-icons}.tsx` — UI components
- `app/he-thong-giai/data/awards-detail-data.ts` — award data structure
- `app/he-thong-giai/components/use-active-section.ts` — scroll-spy hook
- 12 hero tests + 9 data integrity tests co-located

**Outcome:** Hero banner (art + ROOT FURTHER + title), sidebar (6 items, active = gold+underline), 6 detail sections (orb L/R alternating, title/desc/quantity/prize, dual-prize Signature) all match design pixel-perfect. Integration fully wired to Track B (auth, scroll-spy, i18n, homepage links).
