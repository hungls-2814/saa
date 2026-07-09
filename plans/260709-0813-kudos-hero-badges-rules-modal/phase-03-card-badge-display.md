# Phase 03 (Track B) — Hero Badge on Kudos Card

**Status:** ✓ COMPLETE (2026-07-09)

**Goal:** Render the Hero badge image in the name pill, replacing `person.title`.

Depends on: phase-02 (`heroBadge` field + `HeroBadge` type).

## Files
- CREATE `app/kudos/components/hero-badge-image.tsx` (or a small map in kudos-person) — maps
  `HeroBadge` → `{ src, altKey }` for `public/kudos/badges/hero-*.png`. Returns null for `'none'`.
- EDIT `app/kudos/components/kudos-person.tsx` — replace the `person.title` pill with the Hero
  badge image (sized to the design's small pill). Keep star glyph + department layout intact.
- EDIT/ADD i18n alt text for the 4 badges (see phase-04 for namespace).

## Notes
- Badge images are ~110×20 pills; render at the design's inline size next to the department code.
- `title` field stays in the type/data (still stored) but no longer drives the pill.

## Tests
- Update `app/kudos/components/kudos-card.test.tsx` / `kudos-person` coverage: badge shown per
  tier, hidden for `'none'`, anonymous sender hidden.

## Success
SC4 (spec). Visual parity with design image 2 (badge next to CEVC10). `tsc` clean; tests pass.
