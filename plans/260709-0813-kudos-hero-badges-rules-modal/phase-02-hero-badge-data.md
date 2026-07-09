# Phase 02 (Track B) — Hero Badge Data + Derivation

**Status:** ✓ COMPLETE (2026-07-09)

**Goal:** Distinct-sender-count → Hero tier, wired end-to-end through the query layer.

## Files
- CREATE `lib/kudos/hero-badge.ts` — pure fn `deriveHeroBadge(distinctSenderCount): HeroBadge`
  (`'none'|'new'|'rising'|'super'|'legend'`). Thresholds: 0→none, 1–4→new, 5–9→rising, 10–20→super,
  ≥21→legend. Mirror the style of `lib/kudos/star-tier.ts`.
- EDIT `lib/kudos/types.ts` — add `export type HeroBadge = ...`; add `heroBadge: HeroBadge` to
  `KudosPerson`.
- EDIT `lib/kudos/map-card.ts` — `MapCardContext` gains `distinctSenderCounts: Map<string, number>`;
  `mapPerson` derives `heroBadge` (anonymous sender → `'none'`).
- EDIT `lib/kudos/queries-internal.ts` — batched `profile_kudos_stats` fetch also selects
  `distinct_sender_count`; build `distinctSenderCounts` map; pass into `mapKudosRowToCard` ctx.
- CREATE `supabase/migrations/<ts>_kudos_distinct_sender_count.sql` — `create or replace view
  profile_kudos_stats` adding `distinct_sender_count` = `count(distinct sender_id)` grouped by
  `receiver_id` (additive; keep existing columns + security_invoker + anon revoke).
- EDIT `lib/kudos/mock-data.ts` — `person()` takes a distinct-sender count (or heroBadge) so the
  mock renders each tier; drop reliance on `title` for badge.

## Tests
- `lib/kudos/hero-badge.test.ts` — boundaries 0/1/4/5/9/10/20/21.
- Update `lib/kudos/map-card.test.ts` + `queries.test.ts` for the new field/column.

## Success
SC3, SC5, SC7 (spec). `npx tsc --noEmit` clean; new + existing tests pass.
