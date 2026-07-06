---
title: "F005 — Sun* Kudos Live board"
description: "Auth-gated /kudos board on the first real Supabase data layer: highlights, spotlight, feed, filters, stats, gifts."
status: near_complete
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

**Outstanding manual smoke item (deferred to pre-production):** Phase 01 `db push` + `db:seed` ×2
(idempotency) + anon-key view block verification. SC8 (self-like rejection), SC12 (migrations
apply), SC4 (keyset load-more), SC1-anon (RLS boundary) require live Supabase. Recommend running
dev smoke pass before production deployment.

## Delivery gates
Compile → tester (100%) → reviewer → project-manager + doc-writer (roadmap/changelog + spec
promotion to `docs/features/F005-kudos-live-board/`) → evidence gate → commit (git-manager,
**push origin only**) → journal.
