# Clarifications — Kudos Live board (F005)

Screen: Sun* Kudos - Live board — momorph `MaZUn5xHXZ` (figma node 2940:13431, file `9ypp4enmFmdK3YAFJLIu6C`)
Route: `/kudos` (target of the homepage Kudos promo CTA).

## Session 2026-07-06

- Q: How is the board's data sourced (kudos, hearts, hashtags, departments, stats, gifts)? → A: Real Supabase backend — new Postgres data layer (first in this repo), not static mock.
- Q: How does `/kudos` handle authentication? → A: Auth-gated — add `/kudos` to `PROTECTED_PATHS`; unauthenticated visitors redirect to `/login` (defense-in-depth `getUser()` in the page).
- Q: How functional should the board's controls be? → A: Fully interactive client-side — hashtag/department filters, carousel, like toggle, sunner search, infinite scroll all work.
- Q: What is the scope boundary given the design shows more than the 6 requested features? → A: Exactly the 6 listed features. OUT: 2nd "rank-up" leaderboard, Secret Box "Mở quà" dialog, compose-Kudos dialog (separate screens).
- Q: Where do Sunner profiles come from (repo has only Supabase Auth, no directory)? → A: New `profiles` table + signup trigger auto-insert + seeded sample Sunners; số hoa thị star-tier derived from received-kudos count (10/20/50 → 1/2/3 stars).
- Q: How should the "Live" board reflect new data? → A: Static SSR on load — server component fetches on each load/navigation; no live push. (Realtime/polling deferred.)
- Q: How much of the like/heart rule set is in scope? → A: Persist +1 in a `hearts` table, one-per-user, block self-like; special-day +2 admin config DEFERRED.
- Q: Spec handling (SDD on, no F005 spec exists)? → A: Author spec first — draft to plan dir `spec/kudos-board/`, promoted to `docs/features/F005-kudos-live-board/` when `/tkm:takumi` runs.

## Decided by convention (not asked)

- Q: Filter semantics? → A: Single-select per dropdown (hashtag, department), AND-combined; clicking a hashtag chip in a card sets/replaces the hashtag filter; selecting a filter resets feed pagination to page 1 and re-filters BOTH Highlight and All-Kudos (per spec §B).
- Q: Sort/limits? → A: Highlight = heart_count desc, limit 5 (carousel "n/5"); Recent feed = created_at desc, infinite scroll; Top-10 gifts = awarded_at desc, limit 10; Spotlight = total kudos count + receiver-name cloud.
- Q: Content/image truncation? → A: Highlight card content max 3 lines; feed card max 5 lines; hashtags max 5/line then "…"; image gallery max 5 thumbnails (per spec).
- Q: General statistics scope (§D.1)? → A: Show the derivable per-user counters (kudos received, kudos sent, hearts received). Secret-Box counters + "Mở quà" button DEFERRED with the out-of-scope Secret Box feature.
- Q: Department filter — sender or receiver? → A: RECEIVER's department (recognition board filters by who is being celebrated). Flag for confirmation at implementation.
- Q: Carousel paginator denominator when fewer than 5 highlights? → A: min(5, total) — "n/3" if only 3 highlights exist.
