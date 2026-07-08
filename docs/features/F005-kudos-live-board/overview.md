---
feature: F005
name: Sun* Kudos Live board
lang: en
screen: Sun* Kudos - Live board — momorph MaZUn5xHXZ (figma 2940:13431, file 9ypp4enmFmdK3YAFJLIu6C)
status: active
---

# F005 — Sun* Kudos Live board

## Purpose
Auth-gated page at `/kudos` (target of the homepage Kudos promo CTA) presenting a
live-feeling board of SAA 2025 Kudos: the most-loved kudos, a receiver word-cloud,
the full feed, per-user stats, and recent gift recipients. First feature backed by a
real Supabase Postgres data layer. Rendered as static SSR on each load (no realtime).

Scope = EXACTLY the 6 features below. OUT of scope (present in the design, deferred):
the 2nd "rank-up" leaderboard, the Secret Box "Mở quà" dialog, the compose-Kudos dialog.

## User-facing surface (MoMorph MaZUn5xHXZ)
Shared chrome: reused `SiteHeader` (active nav) + `SiteFooter`; a top banner + a
"send Kudos" pill (trigger stub only — compose dialog out of scope); a filter bar.

1. **FR1 — Highlight Kudos** — carousel of the top-5 kudos by `heart_count` over the whole
   event. Card: sender (avatar + name + department + số hoa thị + danh hiệu) → arrow →
   receiver info; time `HH:mm - MM/DD/YYYY`; content max **3 lines** then `…`; hashtags max
   5/line; action bar = like count + heart (grey/red) + Copy Link + Xem chi tiết. Prev/next
   arrows disabled at ends; paginator `n/min(5, total)` (e.g. `2/3` when only 3 highlights exist).
   Empty: "Hiện tại chưa có Kudos nào."
2. **FR2 — Spotlight Board** — header "`<N>` KUDOS" (= total kudos count) + a word-cloud of
   **receiver** names (one node per receiver, weight = kudos-received count), hover tooltip
   (name + time), click → kudos detail; a "Tìm kiếm" search (max 100 chars, optional);
   pan/zoom toggle. States: loading / empty / interactive.
3. **FR3 — Recent Kudos (ALL KUDOS)** — feed of kudos cards, `created_at` desc, **infinite
   scroll** (keyset pagination on `(created_at desc, id desc)`). Card fields as FR1 but content
   max **5 lines**, image gallery max 5 thumbnails, action = like + Copy Link (no "Xem chi
   tiết"). Empty: "Hiện tại chưa có Kudos nào."
4. **FR4 — Filter by hashtag & department** — two single-select dropdowns (hashtag list,
   department list, both from DB), **AND**-combined. Department filter matches the **RECEIVER's**
   department (recognition board filters by who is celebrated). Selecting a filter resets the feed
   to page 1 and re-filters **both** Highlight + All-Kudos. Clicking a hashtag chip inside a card
   sets/replaces the hashtag filter. (Chips carry `{id,label}`; filter keys on hashtag id.)
5. **FR5 — General statistics (Thống kê chung)** — per-current-user sidebar counters: Số Kudos
   bạn nhận được, Số Kudos bạn đã gửi, Số tim bạn nhận được. Secret-Box counters + "Mở quà"
   button DEFERRED (out of scope).
6. **FR6 — Top 10 sunners nhận quà mới nhất** — sidebar list, gifts ordered `awarded_at` desc,
   limit 10; row = avatar + name (gold) + gift description. Empty: "Chưa có dữ liệu".

Cross-cutting:
- **FR7 — Like toggle** — persisted +1, one-per-user, self-like blocked; heart grey↔red +
  count updates. (Special-day +2 DEFERRED.)
- **FR8 — Copy Link** — copies kudos link → toast "Link copied — ready to share!".
- **FR9 — Auth gate** — `/kudos` in `PROTECTED_PATHS` (proxy) + server-page `getUser()` →
  `redirect('/login')` (defense-in-depth).
- **FR10 — i18n** — new `KudosPage` namespace in `messages/{vi,en}.json` (vi primary, en mirror);
  all visible strings translatable.
- **FR11 — Card render rules** — content truncation (3 / 5 lines), hashtags max 5/line then `…`,
  images max 5 thumbnails, time `HH:mm - MM/DD/YYYY`; số hoa thị star-tier DERIVED (pure fn:
  received-kudos count 10 / 20 / 50 → 1 / 2 / 3 stars), never stored.
- Navigation stubs: avatar/name click → user profile (route stub OK); card / spotlight-node
  click → kudos detail (route stub OK).

## User stories
- **US1** As a Sunner I see the most-loved kudos highlighted so I know what resonated. (FR1)
- **US2** I explore who received kudos via a searchable word-cloud. (FR2, FR4)
- **US3** I browse every kudos newest-first with endless scrolling. (FR3)
- **US4** I filter kudos by hashtag and/or department to focus the board. (FR4)
- **US5** I see my own kudos-received / kudos-sent / hearts-received counts. (FR5)
- **US6** I see the 10 sunners who most recently received gifts. (FR6)
- **US7** I like a kudos once (not my own) and my like persists. (FR7)
- **US8** I copy a kudos link to share it. (FR8)

## Data model (Supabase Postgres — first data layer in repo)
Tables: `departments(id, name)`, `profiles(id → auth.users, full_name, department_id → departments,
avatar_url, title, created_at)`, `kudos(id, sender_id → profiles, receiver_id → profiles, content,
created_at)` with CHECK `sender_id <> receiver_id` (no self-kudos), `hashtags(id, label)`,
`kudos_hashtags(kudos_id, hashtag_id)` join, `kudos_images(kudos_id, url)` (client caps at 5),
`hearts(user_id, kudos_id, created_at)` PK`(user_id,kudos_id)`, `gifts(id, recipient_id, description,
awarded_at)`.

Derived (not stored):
- **`kudos_with_heart_count`** VIEW — `kudos` LEFT JOIN `hearts`, `COUNT` → `heart_count`.
- **`profile_kudos_stats`** VIEW — per profile: `received_count`, `sent_count`, `hearts_received`
  (serves both FR5 per-user stats and FR11 sender star-tier).
- star-tier = pure fn of `received_count` (10 / 20 / 50 → 1 / 2 / 3).

RLS: reads require `authenticated` (board isn't per-tenant); `hearts` insert/delete only own rows,
insert blocked on own kudos via `WITH CHECK NOT EXISTS`; `profiles` written only by
`handle_new_user()` trigger (SECURITY DEFINER) on `auth.users` insert.

Pagination: keyset on `(created_at desc, id desc)` — never `.range()` offset (drifts mid-scroll).

## Requirements
### Functional
FR1–FR11 above.

### Non-functional
- **NFR1** Query/action modules pure-testable: pure helpers (star-tier, cursor encode/decode,
  filter descriptor) extracted; DB access mocked via `@/lib/supabase/server` chainable stub.
- **NFR2** `SUPABASE_SERVICE_ROLE_KEY` server/tooling-only (seed script) — never `NEXT_PUBLIC_`.
- **NFR3** Files < 200 lines, kebab-case, YAGNI/KISS/DRY.
- **NFR4** No realtime/polling (static SSR); Server Actions `revalidatePath('/kudos')` on mutate.

## Success criteria
- **SC1** `/kudos` renders for authenticated users; unauthenticated → `/login` (proxy + page). (FR9)
- **SC2** Highlight carousel shows top-5 by heart_count; arrows disable at ends; `n/5`; empty msg. (FR1)
- **SC3** Spotlight shows total-kudos header + receiver word-cloud; search filters nodes; empty/loading. (FR2)
- **SC4** Feed lists kudos newest-first, loads more via keyset without dup/skip; empty msg. (FR3)
- **SC5** Selecting hashtag/department (AND) re-filters both Highlight + feed and resets feed page 1;
  card chip click sets hashtag filter. (FR4)
- **SC6** Sidebar shows current user's received / sent / hearts-received counts. (FR5)
- **SC7** Sidebar lists ≤10 gift recipients newest-first; empty msg. (FR6)
- **SC8** Like toggles persist (one-per-user), self-like rejected; count + heart color update. (FR7)
- **SC9** Copy Link copies URL and shows the toast. (FR8)
- **SC10** star-tier derives correctly at thresholds 0/9/10/19/20/49/50 (pure-fn unit tests). (FR11)
- **SC11** All visible strings resolve from `KudosPage` vi + en. (FR10)
- **SC12** DB migrations apply cleanly (tables + 2 views + RLS + CHECK + trigger); seed idempotent.

## Out of scope (this iteration)
2nd rank-up leaderboard · Secret Box counters + "Mở quà" dialog · compose-Kudos dialog ·
special-day +2 hearts · realtime/polling · user-profile & kudos-detail pages (link stubs only).
