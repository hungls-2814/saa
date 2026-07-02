# System Architecture (forward-draft) — Auth foundation

> Forward-draft from F001. Promote to `docs/system/architecture.md` at implement-start; reconcile post-forge.

## Stack
- **Framework:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`).
- **Auth / backend:** Supabase (Auth with Google OAuth provider), accessed via `@supabase/ssr`.
- **i18n:** next-intl, cookie-based (`NEXT_LOCALE`), no locale URL prefix. Locales: `vi` (default), `en`.

## Auth architecture (Supabase SSR)
Three Supabase client surfaces (per `@supabase/ssr` App Router pattern):
- **Browser client** — used in client components (login button) to start `signInWithOAuth`.
- **Server client** — used in server components / route handlers, reads/writes auth cookies via `next/headers`.
- **Middleware client** — `middleware.ts` refreshes the session cookie on each request and enforces route guards.

### Request flow
```
Browser → middleware.ts (refresh session + route guard) → route/page
  /login  : authenticated → redirect /todo ; else render login
  /todo   : authenticated → render ; else redirect /login
OAuth: login button → Supabase signInWithOAuth(google, redirectTo=/auth/callback)
       → Google → /auth/callback (route handler) exchangeCodeForSession → redirect /todo
```

## Directory shape (planned)
```
app/
  layout.tsx                  # root: NextIntlClientProvider + <html lang>
  login/page.tsx              # login screen (guarded: auth → /todo)
  todo/page.tsx               # protected placeholder (guarded: !auth → /login)
  auth/callback/route.ts      # OAuth code exchange → session → redirect
lib/supabase/
  client.ts                   # browser client
  server.ts                   # server client (async cookies)
  middleware.ts               # session refresh helper
middleware.ts                 # route guards + session refresh
i18n/request.ts               # next-intl getRequestConfig (reads NEXT_LOCALE)
messages/{vi,en}.json         # translation catalogs
```

## Env / config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe).
- Supabase dashboard: Google provider enabled; redirect + site URLs whitelisted for `http://localhost:3000`.
