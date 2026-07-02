---
feature: F001
name: Login (Google OAuth via Supabase)
lang: en
screen: Login — momorph GzbNeVGJHz (file 9ypp4enmFmdK3YAFJLIu6C)
status: active
---

# F001 — Login (Google OAuth via Supabase)

## Purpose
Entry point to SAA 2025. Unauthenticated visitors land on `/login`, authenticate with a
Google account via Supabase Auth, and are redirected to the main application (`/todo`).
All Google accounts are permitted — no domain restriction.

## User-facing surface (from MoMorph spec, screen GzbNeVGJHz)
- **Header** — Sun* Annual Awards 2025 brand logo (top-left, static); language selector
  (top-right): flag + `VN`/`EN` + chevron, opens a VN/EN dropdown that switches locale.
- **Hero / main** — abstract colorful wave key visual on dark background; intro content block:
  `ROOT FURTHER` wordmark, subtitle, tagline, and the login button.
- **Login button** — pale-yellow, Google `G` icon + `LOGIN With Google`, bold.
  Disabled + loading spinner while OAuth is in flight; shadow/elevation on hover.
- **Footer** — fixed dark bar, centered copyright.

## Behavior
1. **Guarded access** (`proxy.ts`) — authenticated user hitting `/login` → `/todo`;
   unauthenticated user hitting `/todo` → `/login`.
2. **Sign-in** — the login button starts Google OAuth (`signInWithOAuth`, PKCE); button
   shows loading + disabled during the flow.
3. **Callback** (`app/auth/callback/route.ts`) — exchanges the auth code for a session,
   then redirects to a validated same-origin path (default `/todo`; open-redirect-safe).
4. **Failure / cancel** — localized error toast; user stays on `/login`.
5. **Sign-out** — clears the session, returns to `/login`.
6. **Unconfigured Supabase** — the app fails closed (everyone unauthenticated) and the
   login button surfaces the error toast, so the UI runs before setup. See
   `docs/setup/supabase-google-oauth.md`.

## Internationalization
- Locales `vi` (default) and `en`, no URL prefix; persisted in the `NEXT_LOCALE` cookie
  (next-intl "without i18n routing"). Language selector switches via a Server Action + refresh.

## Out of scope (this iteration)
- The `/todo` feature itself (only a minimal auth-guarded placeholder exists).
- Non-Google auth methods; roles/permissions beyond "authenticated vs. not".

## Acceptance criteria
- [x] Unauthenticated user sees the Login screen matching the design.
- [x] Authenticated user visiting `/login` is redirected to `/todo`.
- [x] Unauthenticated user visiting `/todo` is redirected to `/login`.
- [x] Google login succeeds → session set → lands on `/todo` (callback unit-tested; full round-trip requires a live Supabase project).
- [x] Login failure/cancel → localized toast shown, user stays on `/login`.
- [x] Language selector toggles VN/EN; content updates; choice persists via `NEXT_LOCALE` cookie.
- [x] Login button shows loading + disabled state during the OAuth flow.

## Key files
- Auth: `lib/supabase/{client,server,middleware,config}.ts`, `proxy.ts`, `app/auth/callback/route.ts`, `lib/auth/{sign-out,constants}.ts`
- i18n: `i18n/{request,config}.ts`, `lib/i18n/set-locale.ts`, `messages/{vi,en}.json`
- UI: `app/login/**`, `app/todo/**`, `app/layout.tsx`
