# Project Changelog

All notable changes to this project are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); dates are `YYYY-MM-DD`.

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
