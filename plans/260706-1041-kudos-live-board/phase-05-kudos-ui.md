# Phase 05 — /kudos UI (Track A)

MoMorph: Sun* Kudos - Live board — `MaZUn5xHXZ` (file `9ypp4enmFmdK3YAFJLIu6C`)

## Status: done

## Goal
Code the `/kudos` board UI via `momorph-implement-design` from Figma design content as mock data.

## In scope (this screen)
Banner · send-Kudos pill (trigger stub) · filter bar (hashtag + department dropdowns) ·
Highlight carousel · Spotlight word-cloud board · All-Kudos feed cards · sidebar (per-user stats +
top-10 gifts) · reuse `SiteHeader`/`SiteFooter`. Extract mock data from the design — do NOT invent.

## Out of scope
Compose-Kudos dialog · Secret Box "Mở quà" dialog · 2nd rank-up leaderboard · real data / auth /
server actions (Track B + Integration) · user-profile & kudos-detail pages (link stubs only).

## Integration contract (Track B must satisfy)
- Components under `app/kudos/components/`; presentational, driven by props typed in `lib/kudos/types.ts`:
  `KudosCard`, `KudosPerson` (+`starTier`), `SpotlightNode`, `PerUserStats`, `GiftItem`, `FilterState`, `BoardData`.
- `KudosCard.hashtags` is `{ id; label }[]` — render chips keyed by `id` (NOT plain strings).
- Event props (wired at Integration): `onToggleLike(kudosId)`, `onLoadMore()`, `onFilterChange(FilterState)`,
  `onCopyLink(kudosId)`, `onSelectHashtag(id)`; carousel prev/next disabled at ends + paginator `n/min(5,total)`.
- Render rules: content 3 lines (highlight) / 5 lines (feed) then `…`; hashtags ≤5/line; images ≤5;
  time `HH:mm - MM/DD/YYYY`; empty-states + all copy via `KudosPage` i18n.

## MoMorph refs:
- Sun* Kudos - Live board: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/MaZUn5xHXZ
- Clarifications: plans/260706-1041-kudos-live-board/clarifications.md
