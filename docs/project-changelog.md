# Project Changelog

All notable changes to this project are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

## 2026-07-10 — Prelaunch: reviewer preview bypass + first-visit intro splash (0.4.3)

Made the `/prelaunch` launch gate reviewable and added a one-time intro splash, all in the
Next 16 route guard (`proxy.ts`). No change to the real launch-gate behavior for production
visitors before the event.

### Added
- **Reviewer preview bypass** (`proxy.ts`, `app/prelaunch/`) — `?preview=1` sets an httpOnly
  `saa_preview` cookie that bypasses the prelaunch launch gate, so reviewers can browse the whole
  app AND still view `/prelaunch` before the event date. Auto-enabled OUTSIDE production only
  (`VERCEL_ENV !== "production"`, i.e. local dev + Vercel Preview) by redirecting bare
  `/prelaunch` → `/prelaunch?preview=1`; the production domain never auto-previews (manual
  `?preview=1` still works). Auth guards are unaffected — preview only bypasses the launch gate.
- **First-visit intro splash** (`proxy.ts`, `app/prelaunch/`) — AFTER launch, the first hit to
  `/` in a browsing session is routed through `/prelaunch?intro=1`, which shows a 10s countdown
  then redirects home. A session cookie `saa_intro_seen` (no expiry) plays it once per session.
  Only `/` and `/prelaunch` are involved; deep/auth routes are never hijacked.

### Changed
- **Prelaunch countdown** (`app/prelaunch/components/prelaunch-countdown.tsx`) — a visible splash
  timer + prominent notice; `demoVariant` selects reviewer ("⚠️ Chế độ Preview") vs real-visitor
  ("🎉 Chào mừng") copy over the same 10s → home transition.

### Tests
- **`proxy.test.ts`** — added coverage for preview bypass, non-production auto-preview, and the
  after-launch first-visit intro (redirect chain, session-cookie stamping, no-hijack of deep
  routes). Full suite: 839 passing.

## 2026-07-10 — CI/CD pipeline restructure: PR preview + merge-triggered deploy (0.4.2)

Reworked the deploy triggers so production ships on merge, and PRs get a live preview. Config
and docs only; no application-code changes.

### Changed
- **CD trigger** (`.github/workflows/cd.yml`) — now runs on **push to `main`** (a PR merge)
  instead of chaining off CI via `workflow_run`. Runs the quality gates in-workflow (`deploy`
  `needs: test`), so main is validated on the merged commit right before the Vercel Production
  deploy. Deploy fires on merge, not merely because CI passed.
- **CI scope** (`.github/workflows/ci.yml`) — narrowed to `pull_request` only (dropped
  `push: main`), so `main` is no longer tested twice per merge.

### Added
- **PR Preview deploy** (`.github/workflows/ci.yml`) — gated `preview` job (`needs: test`) builds
  a Vercel **Preview** after the quality gates pass and posts/updates the preview URL as a PR
  comment.

### Docs
- **Vercel guide** (`docs/setup/vercel-deployment.md`) — updated flow, and noted the app env vars
  must be set for the **Preview** environment too (plus adding preview URLs to Supabase OAuth
  redirect allowlist).

## 2026-07-09 — CI/CD (Vercel) + README & environment docs (0.4.1)

Project onboarding + deployment automation. No application-code changes; docs, config, and
GitHub Actions only.

### Added
- **CI workflow** (`.github/workflows/ci.yml`) — lint · typecheck · test on every pull request
  and push to `main`.
- **CD workflow** (`.github/workflows/cd.yml`) — Vercel **Production** deploy, chained off CI via
  `workflow_run` so it deploys only when CI passes; pins the checkout to the CI-validated commit.
- **Vercel deployment guide** (`docs/setup/vercel-deployment.md`) — secrets, project link, and
  Vercel env-var setup.

### Changed
- **README** rewritten from `create-next-app` boilerplate to a real overview: stack, feature
  list (F001–F008), getting started, env vars, database, scripts, structure, deployment.
- **`.env.local.example`** reorganized and fully documented — added the previously-undocumented
  Supabase CLI vars `SUPABASE_ACCESS_TOKEN` / `SUPABASE_DB_PASSWORD`.
- **Docs** — `system/architecture.md` and `setup/supabase-migrations.md` now note the Supabase
  CLI env vars.

## 2026-07-09 — F008: Personal Profile Page (`/profile`)

Authenticated Sunner's own profile: identity + Hero badge, personal Kudos/hearts statistics, a
(deferred) Secret Box + icon collection, and the Sent/Received Kudos list. Built to the MoMorph
spec (screen `3FoIx6ALVb`, "Profile bản thân") — own-profile only, no public/other-user route.

### Added
- **Profile page** (`app/profile/page.tsx` + `app/profile/components/`) — server component
  composing region A (`profile-header.tsx`: keyvisual band, avatar, name, star tier, department,
  Hero badge, static gray icon-collection row), region B (reused `SidebarStats` +
  `getPerUserStats`), and regions C+D (`profile-kudos-section.tsx`: Sun* Annual Awards/KUDOS
  header, Sent/Received toggle default Sent, read-only `KudosCard` list with copy-link but no
  hearting, no Spam tag).
- **Profile queries** (`lib/kudos/queries-profile.ts`) — `getMyProfileHeader(userId)` (identity +
  `deriveStarTier`/`deriveHeroBadge` from `profile_kudos_stats`) and
  `getKudosByUser({ userId, direction })` (sent/received kudos via the existing card-select/mapper
  pipeline, no pagination — small per-user volume). Sibling of `queries.ts`, not merged into it.
- **Route guard** — `proxy.ts` `PROTECTED_PATHS` now `["/he-thong-giai", "/kudos", "/profile"]`;
  page also runs its own `getUser()` → `redirect("/login")` (defense-in-depth). The previously-dead
  "Profile" row in `account-menu.tsx` is now a live link.
- **`SiteHeader` `NavKey`** gains `"profile"` (no top-nav item highlights for it; reached via the
  account menu, not the nav bar).
- **VN/EN i18n** — new `ProfilePage` namespace in `messages/{vi,en}.json` (title, toggle labels,
  icon-collection label, empty states).

### Deferred (per clarifications, no schema/migration)
- Secret Box open mechanic + counters (render 0, existing F005 placeholder behavior unchanged).
- Icon collection (region A.3): 6 static gray/locked circles, no data source.

### Verified
- Test suite: 823/823 passing (+4 in `app/profile/page.test.tsx`; existing
  `lib/kudos/queries-profile.test.ts` (8), `profile-header.test.tsx` (6),
  `profile-kudos-section.test.tsx` (5) already green). `npm run typecheck` / `npm run lint` clean
  (0 new issues). See `plans/reports/tester-260709-0950-profile-page-temper.md`.

### Notes
- No new Supabase migration — `getMyProfileHeader` reuses the `distinct_sender_count` column F007
  added to `profile_kudos_stats`.
- See `docs/features/F008-personal-profile/overview.md` for the full feature spec, and
  `docs/system/architecture.md` / `docs/system/permissions.md` for the updated route map and guard
  matrix.

## 2026-07-09 — F007: Kudos Hero Badges + Thể lệ (Rules) Modal (release 0.4.0)

Two-track feature pairing a new Rules explanation modal with Hero badges on Kudos cards. Built to
MoMorph spec; shipped as **0.4.0** (second minor bump — F007 adds badge gamification + user guidance).

### Added
- **Thể lệ (Rules) Modal** (`app/(home)/components/saa-rules-modal.tsx` + 3 section subcomponents)
  opened via FAB "Thể lệ" pill in `home-compose-widget.tsx`. Modal presents the four Hero badge
  tiers (New/Rising/Super/Legend) with icon visuals and tier-range descriptions. Footer buttons:
  "Đóng" (close), "Viết KUDOS" (open compose modal). Pixel-perfect from MoMorph design.
- **Hero Badge Tier System** (`lib/kudos/hero-badge.ts`) — pure fn `deriveHeroBadge(distinctSenderCount)`
  returns tier: `'none'` (0), `'new'` (1–4 senders), `'rising'` (5–9), `'super'` (10–20), `'legend'`
  (≥21). Added to `KudosPerson` type; applied in `map-card` during card serialization.
- **Distinct Sender Count Tracking** (`supabase/migrations/20260709090000_*`) — `profile_kudos_stats`
  view now includes `distinct_sender_count` = count(distinct sender_id), grouped by receiver_id.
  Additive; preserves existing columns + security_invoker + anon revoke.
- **Badge Display on Kudos Cards** (`app/kudos/components/kudos-person.tsx`) — renders Hero badge
  image (not `person.title` any longer) next to department code. Assets: `public/kudos/badges/hero-
  {new,rising,super,legend}.png` (110×20 pills). Null for `'none'` tier (no badge shown).
- **Badge Alt Text & i18n** — new `Rules` namespace in `messages/{vi,en}.json`: modal title ("Thể
  lệ"), section headings ("Các loại danh hiệu", "Huy hiệu tự hào", "Tiêu chí xếp hạng"), tier
  ranges/descriptions, button labels ("Đóng", "Viết KUDOS"), badge alt text (New/Rising/Super/Legend).

### Changed
- **FAB Wiring** (`app/(home)/components/home-compose-widget.tsx` + `widget-button.tsx`) — "Thể lệ"
  pill now calls `onOpenRules()` (from widget-button); compose widget manages `rulesOpen` state
  alongside existing `composeOpen` state. "Viết KUDOS" button in Rules modal closes the modal and
  opens the compose modal (cross-modal handoff).

### Verified (full test suite)
- All 800 tests pass (includes hero-badge thresholds, card badge rendering, modal state, i18n).
- `npx tsc --noEmit` — 0 errors.
- `npx next lint` — 0 errors.

### Notes
- Badge tier thresholds chosen for engagement: new (entry), rising (showing traction), super (expert),
  legend (cultural icon).
- `person.title` field remains in the DB/type (not removed) but no longer drives the UI pill; kept
  for future iterations or data audits.
- Anonymous senders always render `'none'` tier (no badge) per NFR4 (anonymity enforcement).
- See `plans/260709-0813-kudos-hero-badges-rules-modal/` for the full spec + implementation
  details (not yet promoted to a `docs/features/F007-*/overview.md`).

## 2026-07-09 — F006 debug + design-fidelity pass (release 0.3.0)

Post-implementation hardening of the compose-Kudos feature against live testing and the MoMorph
design. Released as **0.3.0** (first minor bump — F006 is a new user-facing feature).

### Fixed
- **Blank `/kudos` board** — the `kudos_with_heart_count` view now exposes the compose columns
  (`title`/`is_anonymous`/`anonymous_alias`); the board card query no longer 400s on them.
- **Submit failure (`kudos_sender_id_fkey`)** — backfill `profiles` for `auth.users` that predate
  the signup trigger, so composing works for pre-existing accounts.
- **Compose modal** capped to the viewport height so the footer stays reachable.
- **`db:seed`** loads `.env.local` (`tsx --env-file-if-exists`) instead of throwing on missing creds.
- **Department filter** matches the design (`CEVC2/CEVC3/CEVC4/CEVC1/OPD/Infra`) via a rename+add
  migration that preserves profile links.
- **Danh hiệu** renders as a centered card heading; seeded kudos now carry a title.

### Changed
- Hashtag picker is now a dark multi-select dropdown (design `p9zO-c4a4x`); canonical SAA hashtags seeded.
- Add-link uses a "Thêm đường dẫn" modal (design `OyDLDuSGEa`) instead of a browser prompt.
- Image thumbnails show an uploading spinner until the Storage upload completes.
- Homepage FAB uses the real red Sun\* brand mark + design-accurate pill styling.
- Storage bucket/policy block made idempotent + hosted-Supabase-safe.

## 2026-07-09 — F005: Special-day double hearts (FR7 +2)

Lift the F005 deferral: on a VN-calendar special day, a like is worth **+2** hearts instead of +1. Weight
decided at insert-time by a DB trigger, frozen on the row — clients cannot forge a +2.

### Added
- **`special_days` table** — one row per VN-calendar special day (`day` date primary key, `label` text).
  RLS grants to `authenticated` (select only) and `service_role` (full CRUD). Idempotent seed includes
  `2026-12-26` (SAA 2025 gala).
- **`hearts.weight` column** — smallint, default 1, constraint `weight in (1, 2)`. Populated by trigger.
- **Weight trigger** (`set_heart_weight()`) — SECURITY DEFINER, checks if today (VN timezone, 
  `Asia/Ho_Chi_Minh`) is in `special_days`, sets `weight := 2` if yes, else `1`. Runs before insert,
  sole authority — even a compromised client cannot bypass it.
- **Weighted views** — `kudos_with_heart_count` and `profile_kudos_stats` recomputed to sum
  `hearts.weight` instead of counting rows, so heart_count reflects weighted values. Both views keep
  `security_invoker=true` and anon revoke.
- **Server action** (`toggleHeartAction`) — reads weighted count from `kudos_with_heart_count` view
  instead of a raw COUNT, preserving all error handling + self-like block.

### Verified (live-DB smoke test)
- Forged weight=2 on normal day → stored 1 (trigger override)
- Special-day insert → stored 2 (trigger active)
- Un-like returns count to base (no orphan weight rows)

### Tests
- Full suite 753/753 passing; `actions.test.ts` 15/15 green; typecheck clean.
- Vitest mocks seed scenarios; trigger behavior verified against live Postgres.

### Notes
- No UI change; feature is transparent to the board UI.
- Timezone lives in SQL (`now() at time zone 'Asia/Ho_Chi_Minh'`) — no app-side date math.
- See `plans/260709-0716-special-day-double-hearts/` for implementation details.

## 2026-07-08 — F006: Viết Kudo (Compose Kudos) — modal compose flow

Compose-Kudos modal dialog for creating new kudos, opened from the homepage FAB ("Viết KUDOS")
and the `/kudos` board trigger. Built to the MoMorph spec. Extends the F005 Supabase data layer
with compose workflow: recipient autocomplete, Danh hiệu (award title), markdown content with
functional toolbar, hashtags (1–5, create/pick), image upload (≤5) to Storage, optional anonymous
send with alias. New kudos appear live on the board.

### Added
- **Compose Kudos modal** (`app/kudos/components/compose-kudos-modal.tsx` + splits) — recipient
  search field with autocomplete, title field, markdown editor with toolbar (bold/italic/link),
  hashtag picker (create new or select existing, 1–5 max), image upload carousel (≤5 images,
  persisted to Supabase Storage bucket `kudos-images`), anonymous toggle + alias field, submit
  button (active only when recipient + content present). Built from MoMorph design with mock data;
  integrated with real backend.
- **Schema & validation** (`lib/kudos/compose-schema.ts`) — Zod schemas for recipient, title,
  hashtags, images; validation on client and server.
- **Compose queries** (`lib/kudos/compose-queries.ts`) — `searchRecipients()` (user search),
  `listHashtags()` (all hashtags for autocomplete), `resolveOrCreateHashtags()` (batch create/link).
- **Server action** (`lib/kudos/compose-actions.ts`) — `createKudoAction(formData)` validates
  input, inserts new kudos record + hashtag links + image records, returns success/error toast
  (with anon alias displayed to sender on success), revalidates board feed cache.
- **Image upload client** (`lib/kudos/upload-kudos-images.ts`) — browser-side Supabase Storage
  client for uploading images with signed URLs; image metadata stored as kudos_images records.
- **FAB & board integration** — homepage `widget-button.tsx` expanded state redesigned (cream
  pills + red close icon); clicking "Viết KUDOS" pill opens the modal. `/kudos` board
  `onOpenCompose` handler also opens the same modal.
- **Supabase migrations** (`supabase/migrations/20260708150000_kudos_compose.sql`) — new kudos
  columns: `title` (text, 3–100 char), `is_anonymous` (bool), `anonymous_alias` (text, ≤50 char);
  `kudos_hashtags` and `kudos_images` insert/delete RLS policies; Storage bucket `kudos-images`
  with RLS (authenticated users can insert/delete own images only).
- **Types & mappers** — extend `KudosCard` (title, isAnonymous), `KudosRow` with new columns,
  `map-card()` helper ensures anon alias replaces real sender name in serialized client data.
- **VN/EN i18n** — new `ComposeKudos` namespace in `messages/{vi,en}.json`.

### Tests
- 695 tests pass; reviewer signed off (DONE_WITH_CONCERNS all addressed: compensating rollback,
  real image rendering, type-layer fix, dead-code removal, length caps).

### Known deferrals
- Interactive `@mention` picker popup (design spec has it; implementation uses plain text field).
- "Thể lệ" (Terms) FAB action (not required for MVP).
- Edit/delete-posted-kudos UI (future iteration).

### Notes
- See `docs/features/F006-compose-kudos/overview.md` for the full spec.
- Anonymity is enforced at the type layer (KudosCard never carries real sender identity when
  is_anonymous=true) and the query layer (map-card filters sender name). NFR4 (anonymity) is
  honored end-to-end.

## Unreleased — F005: Sun* Kudos Live board (`/kudos`)

Auth-gated page presenting a live-feeling board of SAA 2025 Kudos — the first feature backed
by a real Supabase Postgres data layer (previously auth-only). Built to the MoMorph spec
(screen `MaZUn5xHXZ`). Static SSR on each load (no realtime).

### Added
- **Kudos board page** (`app/kudos/**`) — top banner + filter bar, highlight carousel (top-5
  by heart count), spotlight receiver word-cloud, paged "all kudos" feed (10 cards/page via a
  manual "Xem thêm" button, keyset pagination on `created_at desc, id desc`), hashtag +
  department filters (AND-combined), per-user stats sidebar, top-10 recent-gift-recipients
  sidebar, like toggle, copy-link.
- **First Supabase Postgres data layer** (`supabase/migrations/`) — tables `departments`,
  `profiles`, `kudos`, `hashtags`, `kudos_hashtags`, `kudos_images`, `hearts`, `gifts`; views
  `kudos_with_heart_count` and `profile_kudos_stats` (`security_invoker=true`, revoked from
  `anon`); RLS on every table; self-like blocked; self-kudos blocked via CHECK; `profiles`
  populated by a `handle_new_user()` signup trigger.
- **Query/action layer** (`lib/kudos/`) — `queries.ts` (SSR board data + lookups), `actions.ts`
  (Server Actions: `toggleHeart`, `loadMoreFeed`, `applyFilters`), pure helpers (star-tier,
  cursor encode/decode, filter descriptor, card mapping), shared `types.ts`.
- **Seed script** (`scripts/seed-kudos*.ts`, `npm run db:seed`) — service-role, idempotent.
- **Route guard** — `proxy.ts` `PROTECTED_PATHS` now `["/he-thong-giai", "/kudos"]`;
  defense-in-depth `getUser()` → `redirect("/login")` in `app/kudos/page.tsx`.
- **New env** — `SUPABASE_SERVICE_ROLE_KEY` (server/tooling-only, seed script only).
- **VN/EN i18n** — new `KudosPage` namespace in `messages/{vi,en}.json`.

### Changed (design-fidelity pass)
- **Spotlight font scale** — word-cloud names resized to the design's own text nodes
  (`FONT_MIN_PX`/`FONT_MAX_PX` 9–15 → 6.7–11.3 on the 1157px canvas).
- **Sidebar stats** — added the design's two Secret Box counter rows (`D.1.6` "Số Secret Box
  bạn đã mở", `D.1.7` "Số Secret Box chưa mở") + divider; `PerUserStats` gains
  `secretBoxOpened`/`secretBoxUnopened` (0 from the real query — no Secret Box source yet).
- **All-Kudos feed** — replaced auto `IntersectionObserver` scroll-load with a user-triggered
  "Xem thêm" button so the page footer stays reachable; `DEFAULT_FEED_LIMIT` 20 → 10.

### Tests
- 499 tests pass; reviewer sealed the implementation.

### Notes
- **Deferred to a follow-up session:** live `supabase db push` + `db:seed` (×2, idempotency
  check) + an anon-role REST check against the two views — no DB credentials were available
  this session, so this is a documented manual smoke step before production deploy.
- Out of scope this iteration (present in the design): 2nd rank-up leaderboard, Secret Box
  "Mở quà" dialog, compose-Kudos dialog, special-day +2 hearts, realtime/polling,
  user-profile & kudos-detail pages (link stubs only).
- See `docs/features/F005-kudos-live-board/overview.md` for the full feature spec, and
  `docs/system/architecture.md` / `docs/system/permissions.md` for the updated stack,
  directory shape, and guard matrix.

## 0.2.1 — 2026-07-06 — Header dropdowns: language selector & account menu design alignment

Design polish to two existing header dropdowns, aligning UI presentation to MoMorph specs. All
behavior and business logic unchanged; visual and i18n label corrections only (severity: minor).

### Changed
- **Language selector** (`app/components/language-selector.tsx`) — refactored rows to show locale
  flag (VN via `vn-flag.png`, EN via inline Union Jack SVG with per-instance `useId`) and short
  code (VN / EN); selected locale now highlighted with gold-tint background (`rgba(255,234,158,0.2)`)
  and text glow (`text-shadow: 0 0 6px #FAE287`), no checkmark; gold border (`#998C5F`) and container
  redesigned; Escape-to-close added for keyboard support.
- **Account menu** (`app/(home)/components/account-menu.tsx`) — Profile row + user icon, Logout row
  + right-chevron, gold-bordered container, hover/focus highlight with glow effect to match design
  spec; improved row spacing and visual hierarchy.
- **i18n labels** (`messages/{en,vi}.json`) — fixed mistranslation: `Home.header.signOut` now
  correctly maps to "Logout" (EN) / "Đăng xuất" (VI); removed dead keys `Common.langVi` / `Common.langEn`.

### Fixed
- **Language trigger chevron background** — the `chevron-down.png` asset was fully opaque with a
  dark olive background baked in (alpha 255 on every corner), so a stray box appeared behind the
  chevron. Replaced with a transparent inline SVG chevron; the opaque PNG is now unreferenced.

### Tests
- All existing tests pass (311/311 green; `next build` clean).
- Language selector: new test file `app/components/language-selector.test.tsx` (+23 lines).
- Account menu: extended `app/(home)/components/account-menu.test.tsx` (+1 line).

### Notes
- Design tokens applied: container `bg #00070C` + border `1px solid #998C5F`, radius `8px`, padding `6px`;
  highlight `rgba(255,234,158,0.2)` for language selected, `rgba(255,234,158,0.1)` for profile;
  glow via text-shadow per spec.

## 0.2.0 — 2026-07-06 — F004: Countdown / Prelaunch page (`/prelaunch`)

Public full-screen "coming soon" gate shown before the SAA 2025 launch moment. Built to the
MoMorph spec (screen `8PJQswPZmU`).

### Added
- **Prelaunch page** (`app/prelaunch/**`) — LED-style DAYS/HOURS/MINUTES countdown over the
  design's key-visual background; the client redirects to `/` once the countdown reaches zero.
  Public, no auth required.
- **Pre-launch redirect gate** (`proxy.ts`) — while `now < NEXT_PUBLIC_EVENT_DATETIME` (or the
  `DEFAULT_EVENT_DATETIME` fallback), every route except `/prelaunch`, `/auth/*`, and static
  assets redirects to `/prelaunch`; once launched, `/prelaunch` itself redirects to `/`. This
  check runs before the Supabase session-refresh/auth-guard logic in the same middleware.
- **Shared `CountdownUnit` + `useCountdownClock`** (`app/components/countdown-unit.tsx`) —
  extracted from the homepage hero countdown so both countdowns share one LED-digit render and
  minute-tick clock implementation (DRY).
- **`lib/event/countdown.ts` additions** — `resolveEventTarget()` / `resolveEventTargetIso()`
  (env-or-default target resolution, shared by the gate and the prelaunch page) and
  `isBeforeLaunch()` (fails **open** — unlocks the app — if the target is unresolvable, so a
  misconfigured deploy never permanently locks out visitors).

### Notes
- The homepage hero countdown and the prelaunch gate resolve `NEXT_PUBLIC_EVENT_DATETIME`
  slightly differently: the hero treats an invalid-but-present env value as "ended" (hidden
  countdown), while the gate/prelaunch page fall through to `DEFAULT_EVENT_DATETIME` in that
  case. Both share the same default value and the same "missing env" behavior.
- See `docs/features/F004-countdown-prelaunch/overview.md` for the full feature spec, and
  `docs/system/architecture.md` / `docs/system/permissions.md` for the updated request flow,
  env/config reference, and route guard notes.

## 2026-07-06 — Hero key-visual design alignment (login / home / awards)

Corrected the hero background art on all three key-visual screens to match the MoMorph
design after review found each was using the wrong or truncated asset.

### Changed
- **Awards** (`/he-thong-giai`) — use the exported full-width key-visual (node `2167:5138`)
  at a fixed band height + the design's Cover gradient (fades to `#00101A`); centre the
  eyebrow/title block; correct hero top padding (`lg:pt-[184px]`).
- **Homepage** (`/`) — switch from the truncated baked mockup to the clean key-visual
  (node `2167:9028`, 1512×1392) + Cover gradient, so the art sweeps down-left into the
  intro section as designed.
- **Login** (`/login`) — replace the grainy frame-render crop with the clean art
  (node `662:14389`) beneath the design's two gradient covers (Rectangle 57 + Cover).

### Notes
- Key-visual PNGs are large (login 14.5 MB, awards 6.4 MB, home 4.5 MB); converting them
  to WebP before a production launch is recommended.

## 2026-07-03 — F003: Awards System page (`/he-thong-giai`)

Auth-gated detail page for the six SAA 2025 award categories, replacing the placeholder
`/awards-information` link on the homepage. Built to the MoMorph spec (screen `zFYDgyj_pD`).

### Added
- **Awards System page** (`app/he-thong-giai/**`) — hero banner (Root Further art +
  "Hệ thống giải thưởng SAA 2025"), sticky scroll-spy sidebar linking to the 6 award
  sections, one detail section per award (orb alternating left/right, title, description,
  quantity, prize value) each with a `#<slug>` anchor, reused Sun* Kudos promo/header/footer.
- **Scroll-spy hook** (`app/he-thong-giai/components/use-active-section.ts`) — tracks
  which award section is in view to drive sidebar active state.
- **First protected route** — `proxy.ts` `PROTECTED_PATHS` now includes `/he-thong-giai`;
  unauthenticated requests redirect to `/login`, with a defense-in-depth `getUser()` check
  in the page itself.
- **`SiteHeader` `active` prop** — marks the current nav item (`"home"` / `"awards"`) so the
  header highlights correctly on both `/` and `/he-thong-giai`.
- **VN/EN i18n** — new `AwardsPage` namespace in `messages/{vi,en}.json`.

### Changed
- **Homepage links rewired** — award cards, header nav, hero CTA, and footer now point to
  `/he-thong-giai(#slug)` instead of the placeholder `/awards-information`.
- **Lint** — `eslint.config.mjs` now also ignores `.claude/**` and `plans/**`.

### Notes
- `/kudos` and `/standards` remain linked but not yet built.
- See `docs/features/F003-awards-system/overview.md` for the full feature spec, and
  `docs/system/permissions.md` / `docs/system/architecture.md` for the updated guard matrix
  and route map.

## 2026-07-02 — Flow: post-login lands on homepage; /todo removed

Supersedes the `/todo`-centric flow described in the F001 entry below: the placeholder
`/todo` page never became the real Todo feature, so it was removed rather than kept as
dead weight.

### Changed
- **Post-login landing is now `/`** — `app/auth/callback/route.ts` `safeNext()` default
  changed from `/todo` to `/`; `proxy.ts` redirects an authenticated user hitting `/login`
  to `/` instead of `/todo`.
- **No protected routes** — `proxy.ts`'s `PROTECTED_PATHS` is now empty; the homepage is
  public for everyone, auth only toggles header UI (bell + account menu).
- **`app/layout.tsx`** — `<html>` now has `suppressHydrationWarning` (guards against
  browser-extension attribute-mismatch warnings).

### Removed
- **`/todo` route** (`app/todo/**`) — deleted along with its guard logic.

### Added
- **`/home` alias** (`app/home/page.tsx`) — server `redirect("/")`, so older or typed
  `/home` links land on the homepage instead of 404.

### Notes
- Tests updated: `proxy.test.ts` (rewritten for no-protected-routes + `/login` → `/`),
  `app/auth/callback/route.test.ts` (default redirect `/todo` → `/`). All green
  (tsc, lint, 170 tests, `next build`).
- See `docs/system/architecture.md`, `docs/system/permissions.md`, and
  `docs/features/F001-login/overview.md` for the updated flow/spec.

## 2026-07-02 — F002: Homepage SAA 2025

Public landing page at `/`, replacing the Next.js scaffold. Built to the MoMorph spec
(screen `i87tDx10uM`).

### Added
- **Homepage** (`app/(home)/**`) — auth-aware header (nav, language selector,
  notification bell + account menu for signed-in users), hero with event countdown,
  Root Further content section, awards grid (6 category cards linking to
  `/awards-information#<slug>`), Sun* Kudos promo, footer, floating quick-action widget.
- **Countdown util** (`lib/event/countdown.ts`) — pure day/hour/minute calculation
  reading `NEXT_PUBLIC_EVENT_DATETIME` (ISO-8601, defaults to `2026-12-26T18:30:00+07:00`);
  invalid/missing value falls back to the "ended" (hidden) state instead of crashing.
- **Shared `LanguageSelector`** (`app/components/language-selector.tsx`) — extracted from
  the login header so the homepage header can reuse it; login header now re-imports it.
- **VN/EN i18n** — new `Home` namespace in `messages/{vi,en}.json`.

### Known deviations
- Best Manager / Signature 2025 - Creator / MVP award cards share identical placeholder
  description copy, reproduced verbatim from the design.
- Decorative bitmap art (hero + Kudos key visuals) recreated as CSS/SVG — MoMorph asset
  URLs were `null` and the Figma-image API returned 500 at implementation time.

### Notes
- `/awards-information`, `/kudos`, `/standards` are linked but not yet built (404 for now).
- No role/permission gating on the header yet — see `docs/system/permissions.md`.

See `docs/features/F002-homepage/overview.md` for the full feature spec.

## 2026-07-02 — F001: Login (Google OAuth via Supabase)

First feature shipped on this project. Establishes the auth foundation everything
else builds on.

### Added
- **Login screen** (`app/login/**`) — Sun* Annual Awards 2025 branding, Google
  OAuth sign-in button (loading/disabled state during the flow), localized error
  toast on failure/cancel. Built to the MoMorph spec (screen `GzbNeVGJHz`).
- **Google OAuth via Supabase Auth** (PKCE flow) — `lib/supabase/{client,server,middleware,config}.ts`.
  All Google accounts permitted; no domain allowlist.
- **OAuth callback** — `app/auth/callback/route.ts` exchanges the auth code for a
  session, then redirects into the app.
- **Route guards** — `proxy.ts` (Next 16's renamed `middleware.ts`) redirects
  unauthenticated users away from `/todo` to `/login`, and authenticated users
  away from `/login` to `/todo`.
- **Protected `/todo` placeholder** (`app/todo/**`) — minimal authenticated
  landing page with sign-out (`lib/auth/sign-out.ts`); stands in until the real
  Todo feature is built.
- **VN/EN i18n** — next-intl, cookie-based (`NEXT_LOCALE`), no URL prefix;
  locale default `vi`. Language selector switches locale via a Server Action
  (`lib/i18n/set-locale.ts`) + refresh. Catalogs in `messages/{vi,en}.json`.
- **Fail-closed auth config** — `isSupabaseConfigured()` treats unset/placeholder
  Supabase env as "everyone unauthenticated" so the UI is usable before setup.
- **Setup guide** — `docs/setup/supabase-google-oauth.md` for wiring a real
  Supabase project + Google OAuth client.

### Security
- **Hardened OAuth callback redirect** — `app/auth/callback/route.ts` validates
  the `next` query param via `safeNext()`, accepting only same-origin relative
  paths (`/...`, rejecting `//host` and absolute URLs). Prevents an open-redirect
  through the callback's `next` parameter; falls back to `/todo`.

### Notes
- Authorization checks use `getUser()` (revalidated against Supabase), never
  `getSession()`, per `lib/supabase/middleware.ts` and route guards in `proxy.ts`.
- No roles/permissions beyond authenticated-vs-not in this iteration.

See `docs/features/F001-login/overview.md` for the full feature spec.
