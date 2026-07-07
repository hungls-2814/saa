---
title: "F005 — Sun* Kudos Live board"
description: "Auth-gated /kudos board on the first real Supabase data layer: highlights, spotlight, feed, filters, stats, gifts."
status: complete
priority: P2
effort: 20h
branch: feat/kudos-live-board
work_type: feature
spec: docs/features/F005-kudos-live-board/
blockedBy: []
blocks: []
tags: [feature, kudos, supabase, momorph, f005]
created: 2026-07-06
---

# Plan — Sun* Kudos Live board (F005)

MoMorph: **Sun* Kudos - Live board** — `MaZUn5xHXZ` (figma 2940:13431, file `9ypp4enmFmdK3YAFJLIu6C`)
Spec draft: `spec/kudos-board/overview.md` · Clarifications: `clarifications.md`
Discipline: interactive · MoMorph two-track · SDD: on · Work type: feature · Base branch: `feat/kudos-live-board`

## Goal
Ship the auth-gated `/kudos` Kudos Live board on the repo's first real Supabase Postgres
layer: top-5 Highlight carousel, receiver word-cloud Spotlight, infinite-scroll feed,
hashtag+department filters, per-user stats, top-10 gift recipients, persisted likes.
Scope = the 6 spec features only; rank-up board / Secret Box / compose dialog deferred.

## Two-track phases
Track A (UI) and Track B (data/logic) are **parallel-runnable — no cross-track blocks**.
Integration is the single join point.

| # | Track | Phase | blockedBy | Status |
|---|-------|-------|-----------|--------|
| 01 | B | Supabase data layer (migrations, views, RLS, trigger, seed) | — | done |
| 02 | B | Query modules + pure helpers | 01 | done |
| 03 | B | Server actions (heart toggle, load-more, apply-filters) | 02 | done |
| 04 | B | Auth gate (`/kudos` guard) + i18n `KudosPage` namespace | — | done |
| 05 | A | `/kudos` UI from MoMorph (minimal, mock data) | — | done |
| 06 | — | Integration (wire UI ↔ SSR data + server actions) | 03,04,05 | done |
| 07 | — | Temper (tester — full suite + coverage) | 06 | done |
| 08 | — | Inspect (reviewer) | 07 | done |
| 09 | — | Deliver (plan sync, spec promotion, docs roadmap/changelog) | 08 | in_progress |

## Key shared contracts (Track B ↔ Track A)
- **Types** (`lib/kudos/types.ts`): `StarTier 0|1|2|3`, `KudosPerson` (+`starTier`), `KudosCard`
  (id, sender, receiver, content, createdAt, heartCount, likedByMe,
  **`hashtags: { id: string; label: string }[]`**, `images: string[]` ≤5),
  `SpotlightNode`, `PerUserStats`, `GiftItem`, `FilterState{hashtagId?,departmentId?}`, `BoardData`.
  Chips render keyed by `id`; chip click → `onSelectHashtag(id)`. `FilterState.departmentId`
  matches the **receiver's** department.
- **Server actions** (`lib/kudos/actions.ts`):
  - `toggleHeartAction(kudosId) → { liked, heartCount }` (revalidatePath `/kudos`)
  - `loadMoreFeedAction({ cursor, filter }) → { items: KudosCard[], nextCursor: string|null }`
  - `applyFiltersAction(filter) → { highlights, feed, nextCursor }`
- **Page contract**: `app/kudos/page.tsx` server component fetches `BoardData` via `lib/kudos/queries`
  and passes it to the client board; passes `user` to `SiteHeader`.

## Dependencies
- Existing/shipped: Supabase auth (`lib/supabase/{server,middleware,config}.ts`), `proxy.ts`
  guard pattern (F003), next-intl (`KudosPage` new ns), `SiteHeader`/`SiteFooter` (F002).
- New infra: Supabase CLI + `supabase/migrations/*` (first in repo), `SUPABASE_SERVICE_ROLE_KEY`.

## Cross-plan links
- **F002 homepage** (shipped): Kudos promo CTA + hero/footer already point at `/kudos` — this plan
  makes that target real. No rewire needed; verify links land. Not blocking.
- **F003 awards** (shipped): reuses `SiteHeader`/`SiteFooter`/`KudosSection` pattern; `/kudos` was
  F003's out-of-scope link. Not blocking.
- No plan blocks/is-blocked-by this one (both prerequisites already merged).

## Delivered
**Implementation complete.** 461 tests pass (45 files); typecheck clean; production build succeeds.
Reviewer score: SEALED (0 critical); 2 minor findings fixed during inspection (highlight-carousel
activeIndex clamp + cursor strict-ISO validation). Both with regression tests.

**DB smoke: PASSED (local + hosted `xfpkhbnwvqwzxvhjhhba`, 2026-07-07).** 5 migrations apply clean;
`db:seed` idempotent (identical counts on re-run: 4 depts / 3 hashtags / 8 profiles / 12 kudos /
24 hearts / 10 gifts); signup trigger auto-creates profiles with `full_name`; **anon hard-blocked
(401) on all 8 tables + 2 views**; authenticated reads the board; **self-like rejected by RLS**
(SC8), liking others allowed. Two bugs the live smoke caught & fixed: missing DML grants for the
Supabase roles (`20260706000300_kudos_grants.sql`) and anon base-table SELECT via hosted default
privileges (`20260706000400_revoke_anon_base_reads.sql`). SC1/SC4/SC8/SC12 now verified live.

**Remaining:** confirm the Google OAuth metadata key (`full_name` vs `name`) at the first real
sign-in (trigger has a COALESCE fallback either way).

## Delivery gates
Compile → tester (100%) → reviewer → project-manager + doc-writer (roadmap/changelog + spec
promotion to `docs/features/F005-kudos-live-board/`) → evidence gate → commit (git-manager,
**push origin only**) → journal.
