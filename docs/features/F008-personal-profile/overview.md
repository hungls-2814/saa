---
feature: F008
name: Personal Profile Page
lang: en
screen: Profile bản thân — momorph 3FoIx6ALVb (figma 9ypp4enmFmdK3YAFJLIu6C)
status: active
---

# F008 — Personal Profile Page (`/profile`)

## Purpose
Authenticated Sunner's own profile: identity + danh hiệu (Hero) badge, personal Kudos/hearts
statistics, a (deferred) Secret Box + icon collection, and the list of Kudos they've sent /
received. Own-profile only ("Profile bản thân") — there is no public or other-user profile route.

## Route & access
- New route `app/profile/page.tsx` → `/profile`, server component.
- Auth-gated: `/profile` added to `PROTECTED_PATHS` in `proxy.ts`, alongside `/he-thong-giai` and
  `/kudos`; the page also runs its own `getUser()` → `redirect("/login")` (defense-in-depth,
  mirrors `/kudos` and `/he-thong-giai`). Falls back to `redirect("/login")` when Supabase is
  unconfigured too.
- `account-menu.tsx`'s existing "Profile" row (previously dead) now links here.
- `SiteHeader`'s `NavKey` gains a `"profile"` value (no top-nav link highlights for it — reached
  via the account menu, not the nav bar).

## Requirements (design regions)

### FR1 — Profile header (region A)
- Full-width keyvisual band below the header, reusing the `/he-thong-giai` keyvisual art
  (`awards-hero-keyvisual.png`) + fade-to-`#00101A` cover gradient.
- Centered circular **avatar** (A.1, 200px) — reuses `Avatar` (initials fallback, no invented photo).
- **Name** (A.2) = `profiles.full_name`; star tier ("số hoa thị", via `deriveStarTier`) + department
  name + Hero badge ("danh hiệu", via `deriveHeroBadge` + `HeroBadgeImage`, hidden at tier `'none'`).
- **Icon collection** (A.3 / B2–B7, "Bộ sưu tập icon của tôi"): 6 static gray/locked circles —
  Secret Box has no backend (see FR3); no data, no click handler.

### FR2 — Statistics (region B)
- Reuses `SidebarStats` + `getPerUserStats(userId)`: Kudos received, Kudos sent, hearts received,
  Secret Box opened/unopened (both 0 — existing placeholder behavior, unchanged from F005).
- No `onOpenSecretBox` handler is passed, so the "Mở Secret Box" button renders inert.

### FR3 — Secret Box & icon collection: deferred
- No schema, no open mechanic, no migration. Counters render 0; icons render gray/locked.
- Explicitly out of scope this iteration (clarified 2026-07-09, see `clarifications.md`).

### FR4 — Awards header (region C)
- "Sun* Annual Awards 2025" eyebrow + "KUDOS" title (reused `SectionHeader`).
- Sent/Received toggle (client-side, in `ProfileKudosSection`), default **Sent** — matches the
  design's "Đã gửi (5)" default. Label shows the active direction + count; Escape closes the
  listbox (mirrors `FilterDropdown`'s interaction pattern from the Kudos board).

### FR5 — Post list (region D)
- New query `getKudosByUser({ userId, direction })` (`lib/kudos/queries-profile.ts`) — selects from
  `kudos_with_heart_count` via the existing `buildCardSelect` / `mapRowsToCards` pipeline;
  `direction: 'sent'` filters `sender_id = userId`, `'received'` filters `receiver_id = userId`;
  ordered `created_at desc, id desc`. No pagination (YAGNI — a single Sunner's own kudos volume is
  small), unlike the board's keyset-paginated feed.
- Rendered with the existing **`KudosCard` variant="feed"**, **read-only**: `onCopyLink` is passed,
  `onToggleLike` is not (no hearting from the profile page).
- The orange "Spam" tag is **omitted** — no schema backing (clarified).
- Empty state: per-direction "no kudos yet" message.

### FR6 — i18n
- New `ProfilePage` namespace in `messages/{en,vi}.json`: `title`, `awardsEyebrow`, `kudosTitle`,
  `toggle.{sent,received}` (count-interpolated), `iconCollection`, `empty.{sent,received}`.

## Non-functional
- All new files < 200 lines; toggle state lives in a small client component
  (`profile-kudos-section.tsx`) separate from the server page.
- No new dependencies, no new migration. Tailwind v4 inline palette matches existing pages
  (`bg #00101A`, gold `#FFEA9E`).
- Server component (`app/profile/page.tsx`) fetches all 4 reads (`getMyProfileHeader`,
  `getPerUserStats`, `getKudosByUser` ×2) concurrently via `Promise.all`; on any failure the page
  falls back to empty header/stats/lists rather than blanking (mirrors `/kudos`'s shell
  resilience).

## Reuse map (build vs reuse)
| Region | Reused | Built |
|---|---|---|
| A | `Avatar`, `HeroBadgeImage`, `deriveStarTier`/`deriveHeroBadge` | `profile-header.tsx`, `getMyProfileHeader` query, gray icon-collection row |
| B | `SidebarStats`, `getPerUserStats` | — (no `onOpenSecretBox` wiring) |
| C+D | `KudosCard`, `SectionHeader`, `mapRowsToCards`, `buildCardSelect` | `getKudosByUser` query, `profile-kudos-section.tsx` (sent/received toggle) |
| route | `/he-thong-giai` page template | `app/profile/page.tsx`, `proxy.ts` `+/profile`, `ProfilePage` i18n namespace |

## Key files
- `app/profile/page.tsx` — server component, auth gate, concurrent data fetch, composition.
- `app/profile/components/profile-header.tsx` — region A (presentational, no data fetching).
- `app/profile/components/profile-kudos-section.tsx` — regions C+D (client, owns the toggle).
- `lib/kudos/queries-profile.ts` — `getMyProfileHeader()`, `getKudosByUser()`; sibling of
  `lib/kudos/queries.ts`, deliberately not merged into it.
- `proxy.ts` — `PROTECTED_PATHS` gains `/profile`.
- `app/(home)/components/site-header.tsx` — `NavKey` gains `"profile"`.

## Success criteria
- **SC1** `/profile` renders the current user's own header, stats, and Sent/Received kudos lists;
  unauthenticated visitors are redirected to `/login`. (FR1, route guard)
- **SC2** Icon-collection row always renders 6 gray/locked placeholders; Secret Box counters render
  0; no click handlers wired. (FR3)
- **SC3** Toggle defaults to Sent, switches list + count label, closes on Escape/backdrop. (FR4)
- **SC4** Kudos cards on `/profile` show hearts count + copy-link but never a like control; no Spam
  tag. (FR5)
- **SC5** All new visible strings resolve from vi + en. (FR6)
- **SC6** Query/page failure falls back to empty data instead of a broken page. (non-functional)

## Out of scope
Secret Box schema/open mechanic, icon-collection data source, spam moderation, other-user (public)
profile pages, notifications, feed pagination on the profile lists (small volume, YAGNI).
