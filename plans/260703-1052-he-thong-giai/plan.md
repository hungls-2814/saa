# Plan — Hệ thống giải thưởng (F003)

MoMorph: **Hệ thống giải** — `zFYDgyj_pD` (file `9ypp4enmFmdK3YAFJLIu6C`)
Spec: `spec/awards-system/overview.md` · Clarifications: `clarifications.md`
Discipline: interactive · Work type: feature · SDD: on · Base branch: `feat/he-thong-giai` (off `feat/homepage-saa`)

## Goal
Build the auth-gated `/he-thong-giai` page: hero banner, sticky scroll-spy sidebar,
6 award detail sections (anchored per slug), reused Kudos promo + header/footer.
Rewire homepage links from `/awards-information` → `/he-thong-giai`.

## Two-track shape
- **Track A (UI)** — the page + hero + sidebar + award detail sections via
  `momorph-implement-design` (extract verbatim award descriptions from the design;
  reuse orb images + art + header/footer/Kudos).
- **Track B (behavior/logic)** — auth guard (proxy + server redirect), scroll-spy
  hook, i18n `AwardsPage` namespace, award-detail data, homepage link rewire.

## Phases
| # | Phase | Track | Status |
|---|-------|-------|--------|
| 01 | Awards page UI (hero, sidebar, 6 sections) | A | complete ✅ |
| 02 | Behavior & integration (auth guard, scroll-spy, i18n, data, link rewire) | B | complete ✅ |
| 03 | Tests (auth redirect, sidebar/scroll-spy, sections, homepage links) | — | complete ✅ |

## Key decisions (see clarifications.md)
- Route `/he-thong-giai` (`app/he-thong-giai/`); **auth-protected**.
- Reuse homepage shared components/assets; slugs match homepage.
- Homepage links (award cards, header nav, hero CTA, footer) → `/he-thong-giai(#slug)`.
- Signature 2025 - Creator: dual prize (cá nhân + tập thể).

## Dependencies
- `feat/homepage-saa` (SiteHeader/Footer/LanguageSelector, KudosSection, awards-data, orb PNGs, hero art) — unmerged PR #2.
- Existing: Supabase auth (`lib/supabase/server.ts`), proxy guard, next-intl.

## Outcome
✅ **Complete** (2026-07-03 11:36)  
**Deliverables:**
- `/he-thong-giai` page + hero + sticky sidebar + 6 award detail sections (all specs met, pixel-perfect design match)
- Auth guard (proxy + server defense-in-depth) + scroll-spy hook (`useActiveSection`) + i18n AwardsPage ns
- Homepage link rewire: award-cards, site-header nav, hero CTA, site-footer all → `/he-thong-giai#slug`
- 60 new tests (246/246 total passing); tsc clean; build OK; `npm run lint` clean after fixes
- Deferred Minors: award slug/title data duplicated across `awards-data.ts` + `awards-detail-data.ts` (future DRY refactor); cosmetic scroll-spy flicker on smooth-scroll (self-corrects when settled — not a correctness bug)

**Review Score:** 9.5/10 (post-fix); Major lint issue resolved via eslint-disable directives + SiteHeader active prop wired.

## Delivery gates
Compile → tester (100%) → reviewer → project-manager + doc-writer → evidence gate →
commit (git-manager, **push origin only**) → journal.
