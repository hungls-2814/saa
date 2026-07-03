# Phase 01 — Homepage UI (Track A)

MoMorph: Homepage SAA — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
Clarifications: `plans/260702-0706-homepage-saa/clarifications.md`

## Goal
Code the full homepage UI pixel-faithfully via `momorph-implement-design`: header, hero
(wordmark + countdown + event info + CTAs), Root Further content, awards grid (6 cards),
Sun* Kudos promo, footer, floating quick-action widget. Extract assets from the design.

## Out of scope
- Backend logic beyond presentational wiring (countdown math, session read come via Track B / props).
- Target pages `/awards-information`, `/kudos`, `/standards`.
- Real notification data; real widget commands (placeholder menus only).

## Integration contract
- Page is `app/(home)/page.tsx` (Server Component); passes `user` (or null) to `<SiteHeader>`.
- Countdown UI (`countdown.tsx`, client) consumes pure helper `lib/event/countdown.ts`.
- All copy via next-intl `Home` namespace (both `vi`+`en`); no hardcoded strings.
- Links use the routing map in the spec (award slugs: top-talent, top-project,
  top-project-leader, best-manager, signature-2025-creator, mvp).
- Reuse existing assets when identical; new assets under `public/home/`.

## Status
**COMPLETE**

## Implementation notes
- All sections pixel-faithful to MoMorph design; visual validation loop passed.
- Asset deviations: decorative bitmap art recreated as CSS/SVG (Figma asset URLs null,
  API 500'd). Award descriptions for Best Manager, Signature Creator, MVP use identical
  placeholder copy from design verbatim.
- 26 files delivered: components, layout, styles, i18n, utility functions, tests.
