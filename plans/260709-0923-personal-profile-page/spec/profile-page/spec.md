---
feature: F008-personal-profile
lang: en
screen: 3FoIx6ALVb (Profile bản thân)
file_key: 9ypp4enmFmdK3YAFJLIu6C
status: draft
---

# F008 — Personal Profile Page (`/profile`)

## Purpose
Authenticated Sunner's own profile: identity + danh hiệu badge, personal Kudos/hearts
statistics, a (deferred) Secret-Box + icon collection, and the list of Kudos they've
sent / received. Own-profile only ("Profile bản thân") — no public/other-user route.

## Route & Access
- New route `app/profile/page.tsx` → `/profile` (server component).
- Auth-gated: add `/profile` to `PROTECTED_PATHS` in `proxy.ts`; page also `redirect("/login")`
  when no user (defense-in-depth, mirrors `/he-thong-giai`).
- `account-menu.tsx:69` already links here (currently dead) — becomes live.

## Requirements (design regions)

### FR1 — Profile header (region A)
- Full-width keyvisual band below the 80px header (reuse the `/he-thong-giai` keyvisual pattern / `banner-1440.png`).
- Centered circular **avatar** (A.1) — reuse `Avatar` (initials fallback, no invented photo).
- **Name** (A.2) = `profiles.full_name`; department code + star tier ("số hoa thị") + Hero badge
  ("danh hiệu", e.g. Legend Hero) via `deriveStarTier(received_count)` + `deriveHeroBadge(distinct_sender_count)` + `HeroBadgeImage`.
- **Icon collection** (A.3 / B2–B7, "Bộ sưu tập icon của tôi"): 6 **gray locked placeholders** —
  Secret Box deferred (see FR3). Static, no data source.

### FR2 — Statistics (region B)
- Reuse `SidebarStats` + `getPerUserStats(userId)`: Kudos received (B.1), Kudos sent (B.2),
  hearts received (B.3), Secret Box opened (B.4)=0, unopened (B.5)=0.
- "Mở Secret Box" button (B.6): stub — `onOpenSecretBox` links to `/kudos` or shows coming-soon; no mechanic.

### FR3 — Secret Box & icon collection: DEFERRED
- No schema, no open mechanic. Counters render 0 (existing behavior); icons render gray/locked.
- Explicitly out of scope this iteration (clarified 2026-07-09). No migration.

### FR4 — Awards header (region C)
- "Sun* Annual Awards 2025" (C.1) + "KUDOS" title (C.2).
- Toggle control (C.3): switch the post list between **Sent** and **Received**; default **Sent**
  (matches design "Đã gửi (5)"). Label shows the active direction + count.

### FR5 — Post list (region D)
- List the current user's Kudos, filtered by toggle direction:
  - Sent → `kudos.sender_id = userId`
  - Received → `kudos.receiver_id = userId`
- New query `getKudosByUser({ userId, direction })` selecting from `kudos_with_heart_count`
  via existing `buildCardSelect` + `mapRowsToCards`; ordered `created_at desc`.
- Render each with **`KudosCard` variant="feed"** — **read-only**: pass `onCopyLink` (copy link),
  do NOT pass `onToggleLike` (no hearting from profile). Hearts count + copy-link visible.
- **"Spam" tag: OMITTED** (no schema backing; clarified).
- Empty state: friendly "no kudos yet" message per direction.

### FR6 — i18n
- New `ProfilePage` namespace in `messages/en.json` + `messages/vi.json` (headings, toggle labels,
  icon-collection label, empty states). Reuse `KudosPage.stats` + `KudosPage.card` where they exist.

## Non-functional
- Files < 200 lines each (NFR); split toggle client component from server page.
- No new dependencies. Tailwind v4 inline palette matching existing pages (bg #00101A, gold #FFEA9E).
- Server component fetches data; one small client component owns the sent/received toggle.

## Reuse map (build vs reuse)
| Region | Reuse | Build |
|---|---|---|
| A | Avatar, HeroBadgeImage, deriveStarTier/HeroBadge | profile-header component, getMyProfileHeader query, gray icon-collection row |
| B | SidebarStats, getPerUserStats | wire onOpenSecretBox |
| C+D | KudosCard, mapRowsToCards, buildCardSelect | getKudosByUser query, sent/received toggle client component |
| route | he-thong-giai page template | app/profile/page.tsx, proxy.ts +/profile, ProfilePage i18n |

## Out of scope
Secret Box schema/mechanic, icon-collection data, spam moderation, other-user profiles,
notifications feature, feed pagination on profile (small volume, YAGNI).

## Unresolved
- None blocking. `getPerUserStats` must be extended (or a sibling added) to also return
  `distinct_sender_count` for the header Hero badge — planner to decide extend-vs-sibling.
