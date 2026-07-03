# System Architecture

## Stack
- **Framework:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`).
- **Auth / backend:** Supabase Auth (Google OAuth), via `@supabase/ssr`.
- **i18n:** next-intl, cookie-based (`NEXT_LOCALE`), no locale URL prefix. Locales: `vi` (default), `en`.
- **Tests:** vitest + @testing-library/react (jsdom).

## Auth architecture (Supabase SSR)
Three Supabase client surfaces (`@supabase/ssr` App Router pattern):
- **Browser client** (`lib/supabase/client.ts`) — client components (login button) start `signInWithOAuth`.
- **Server client** (`lib/supabase/server.ts`) — server components / route handlers; reads/writes auth cookies via `next/headers` (async `cookies()`).
- **Session-refresh helper** (`lib/supabase/middleware.ts`) — invoked from `proxy.ts` to refresh the session cookie and enforce guards.

Authorization decisions always use `getUser()` (revalidated against Supabase), never `getSession()`.
When Supabase env is unset, `isSupabaseConfigured()` makes the app fail closed (all unauthenticated).

### Request flow
```
Browser → proxy.ts (session refresh + route guard) → route/page
  /login : authenticated → / (home) ; else render login
  /      : public homepage, renders regardless of auth (header UI adapts)
  /home  : always → redirect("/") (convenience alias for older/typed links)
OAuth: login button → signInWithOAuth(google, redirectTo=/auth/callback)
       → Google → /auth/callback (exchangeCodeForSession) → validated same-origin redirect (default /)
```
`proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, nodejs runtime) matches all routes
except `_next/*`, static assets, and `/auth/*` (the callback runs its own code exchange).

## Directory shape
```
app/
  layout.tsx                  # root: NextIntlClientProvider + <html lang>
  (home)/                     # public homepage route group — renders at `/`
    page.tsx                  # reads Supabase user server-side for auth-aware header
    components/                # section components (header, hero, countdown, awards, footer, ...)
    data/awards-data.ts        # award category content (slugs, copy)
  components/                 # shared cross-feature components (e.g. language-selector.tsx)
  login/                      # login screen (page + components) — authed visitor redirected → /
  home/page.tsx               # convenience alias — redirect("/") for older/typed /home links
  auth/callback/route.ts      # OAuth code exchange → validated redirect
lib/supabase/{client,server,middleware,config}.ts
lib/auth/{sign-out,constants}.ts
lib/event/countdown.ts        # pure countdown calc helpers (homepage hero timer)
lib/i18n/set-locale.ts        # Server Action: set NEXT_LOCALE cookie
proxy.ts                      # route guards + session refresh
i18n/{request,config}.ts      # next-intl config + client-safe constants
messages/{vi,en}.json         # translation catalogs
```

`app/components/` holds components shared across route groups (e.g. `language-selector.tsx`,
used by both the homepage header and the login header) — distinct from `app/(home)/components/`,
which is homepage-section-specific.

## Env / config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe). Template in `.env.local.example`.
- Supabase dashboard: Google provider enabled; redirect + site URLs whitelisted. See `docs/setup/supabase-google-oauth.md`.
- `NEXT_PUBLIC_EVENT_DATETIME` (client-safe, ISO-8601) — homepage hero countdown target;
  defaults to `2026-12-26T18:30:00+07:00` in code when unset. Invalid values fall back to the
  "ended" (hidden) display via `lib/event/countdown.ts#parseEventDate`.
