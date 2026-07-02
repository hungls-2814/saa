---
feature: F001
name: Login (Google OAuth via Supabase)
lang: en
screen: Login — momorph GzbNeVGJHz (file 9ypp4enmFmdK3YAFJLIu6C)
status: draft
---

# F001 — Login (Google OAuth via Supabase)

## Purpose
Entry point to SAA 2025. Unauthenticated visitors land on `/login`, authenticate with a
Google account via Supabase Auth, and are redirected to the main application (`/todo`).
All Google accounts are permitted — no domain restriction.

## User-facing surface (from MoMorph spec, screen GzbNeVGJHz)
- **Header** — Sun* Annual Awards 2025 brand logo (top-left, static, non-interactive);
  language selector (top-right): Vietnam flag + `VN` label + down chevron, opens a VN/EN dropdown.
- **Hero / main** — abstract colorful wave key visual on dark background; intro content block:
  title `ROOT FURTHER`, subtitle *"Bắt đầu hành trình của bạn cùng SAA 2025."*,
  tagline *"Đăng nhập để khám phá!"*, and the login button.
- **Login button** — pale-yellow button, Google `G` icon + `LOGIN With Google`, bold.
  Disabled + loading indicator while OAuth is in flight; shadow/elevation on hover.
- **Footer** — fixed dark bar, centered *"Bản quyền thuộc về Sun* © 2025"*.

## Behavior
1. **Guarded access** — an already-authenticated user hitting `/login` is redirected to `/todo`.
   An unauthenticated user hitting a protected route (`/todo`) is redirected to `/login`.
2. **Sign-in** — clicking the login button starts the Google OAuth flow (Supabase
   `signInWithOAuth`, PKCE). Button shows loading + disabled during the flow.
3. **Callback** — Google redirects back to the app's OAuth callback route, which exchanges
   the auth code for a Supabase session (cookie-based), then redirects to `/todo`.
4. **Success** — session established; user info available server-side; redirect to `/todo`.
5. **Failure / cancel** — if Google auth fails or the user cancels, show a toast:
   *"Đăng nhập không thành công. Vui lòng thử lại."* (localized).
6. **Sign-out** — clears the Supabase session and returns to `/login`.

## Internationalization
- Two locales: `vi` (Vietnamese, **default**) and `en` (English), no URL prefix.
- Locale persisted in the `NEXT_LOCALE` cookie, read server-side (next-intl, cookie-based).
- Language selector switches locale and re-renders the page content in the chosen language.

## Out of scope (this iteration)
- The `/todo` feature itself (only a minimal auth-guarded placeholder is created).
- Email/password or any non-Google auth methods.
- Role/permission tiers beyond "authenticated vs. not".
- Account provisioning / profile management.

## Acceptance criteria
- [ ] Unauthenticated user sees the Login screen matching the design.
- [ ] Authenticated user visiting `/login` is redirected to `/todo`.
- [ ] Unauthenticated user visiting `/todo` is redirected to `/login`.
- [ ] Google login succeeds → session set → lands on `/todo`.
- [ ] Login failure/cancel → localized toast shown, user stays on `/login`.
- [ ] Language selector toggles VN/EN; content updates; choice persists via `NEXT_LOCALE` cookie.
- [ ] Login button shows loading + disabled state during the OAuth flow.
