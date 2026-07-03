# Project Changelog

All notable changes to this project are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

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
