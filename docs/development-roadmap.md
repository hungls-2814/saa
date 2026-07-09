# Development Roadmap

Lightweight phase tracker. Detailed specs live under `docs/features/`; the running
history of changes is in `docs/project-changelog.md`.

## Phase 1 — Auth foundation — COMPLETE (2026-07-02)

**Goal:** stand up authentication so every future feature has somewhere to hang
a route guard.

- [x] F001 — Login (Google OAuth via Supabase), VN/EN i18n
- [x] Route guards (`proxy.ts`): `/login` → `/` (home) when already authenticated;
      no protected routes currently (home is public)
- [x] OAuth callback with open-redirect-safe `next` handling
- [x] Fail-closed behavior when Supabase env is unconfigured
- [x] Setup guide for Supabase + Google OAuth (`docs/setup/supabase-google-oauth.md`)

## Phase 2 — Core app features — IN PROGRESS (2026-07-03)

- [x] F002 — Public homepage (`/`) — hero/countdown, awards grid, Sun* Kudos promo,
      auth-aware header, VN/EN i18n
- [x] F003 — `/he-thong-giai` Awards System detail page — hero, scroll-spy sidebar,
      6 award detail sections, auth-gated (first protected route); homepage links
      rewired from `/awards-information` to `/he-thong-giai(#slug)`
- [x] F004 — `/prelaunch` countdown page + pre-launch redirect gate (`proxy.ts`): every
      route locks to the countdown until `NEXT_PUBLIC_EVENT_DATETIME`, then unlocks to `/`
- [x] F005 — `/kudos` Sun* Kudos Live board — auth-gated, first Supabase Postgres data layer
      (migrations + RLS + seed script); implementation + tests complete. Manual DB smoke
      (`supabase db push` + `db:seed` + anon-view REST check) still pending before production
      — no DB creds available at implementation time.
      - [x] **FR7 +2: Special-day double hearts** — shipped 2026-07-09. Weighted hearts via DB
            trigger (SECURITY DEFINER); `special_days` table + `hearts.weight` column; VN timezone
            support (Asia/Ho_Chi_Minh). Weight frozen at insert by trigger — clients cannot forge +2.
            Tests 753/753 green; live-DB verified.
- [x] F006 — Viết Kudo (Compose Kudos) — modal dialog (recipient autocomplete, title,
      markdown content with toolbar, hashtags 1–5, image upload ≤5 to Storage, anonymous alias)
      opened from FAB and board trigger; persists via server action; new kudos appear on board.
      Extends F005 schema (columns + RLS policies + Storage bucket). 695 tests passing.
- [ ] `/standards` — footer "Tiêu chuẩn chung" target page
- [ ] Real Todo feature (data model, CRUD, persistence) behind the existing guard
- [ ] Roles/permissions layer, if per-user authorization becomes necessary
      (today: authenticated vs. not, no finer tiers — see `docs/system/permissions.md`)
- [ ] Expand i18n coverage as new screens ship (catalogs already scaffolded:
      `messages/{vi,en}.json`)

## Out of scope / deferred

- Non-Google auth providers
- Any authorization tier beyond authenticated/anonymous
- Real notification data / real quick-action widget commands (both placeholder on the homepage)

---
*Update this file when a phase's status changes (see `.claude/rules/documentation-management.md`).*
