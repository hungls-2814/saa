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
Browser → proxy.ts (pre-launch gate → session refresh + route guard) → route/page
  [pre-launch] while now < NEXT_PUBLIC_EVENT_DATETIME: every route except /prelaunch,
               /auth/*, and static assets → redirect /prelaunch; once launched,
               /prelaunch itself → redirect /
  /login          : authenticated → / (home) ; else render login
  /               : public homepage, renders regardless of auth (header UI adapts)
  /he-thong-giai  : unauthenticated → /login (PROTECTED_PATHS); else render (defense-in-depth getUser() in page)
  /home           : always → redirect("/") (convenience alias for older/typed links)
  /prelaunch      : public countdown "coming soon" gate (F004); no auth required
OAuth: login button → signInWithOAuth(google, redirectTo=/auth/callback)
       → Google → /auth/callback (exchangeCodeForSession) → validated same-origin redirect (default /)
```
`proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, nodejs runtime) matches all routes
except `_next/*`, static assets, and `/auth/*` (the callback runs its own code exchange). The
pre-launch gate (`isBeforeLaunch`, `lib/event/countdown.ts`) is checked FIRST, before the
Supabase session refresh — while the countdown is running it overrides every auth guard below.
`PROTECTED_PATHS = ["/he-thong-giai"]` — the first authenticated-only route (F003); see
`docs/system/permissions.md` for the full guard matrix.

## Directory shape
```
app/
  layout.tsx                  # root: NextIntlClientProvider + <html lang>
  (home)/                     # public homepage route group — renders at `/`
    page.tsx                  # reads Supabase user server-side for auth-aware header
    components/                # section components (header, hero, countdown, awards, footer, ...)
                               # SiteHeader takes an `active` NavKey prop (e.g. "home" | "awards")
                               # to mark the current nav item across pages
    data/awards-data.ts        # award category content (slugs, copy)
  he-thong-giai/              # Awards System detail page (F003) — auth-gated, renders at `/he-thong-giai`
    page.tsx                  # server component; getUser() → redirect("/login") if unauthenticated
    components/                # hero, scroll-spy sidebar (use-active-section.ts), award detail section, icons
    data/awards-detail-data.ts # per-award title/description/quantity/prize content
  prelaunch/                  # Countdown / "coming soon" gate page (F004) — public, renders at `/prelaunch`
    page.tsx                  # server component; resolves the countdown target via resolveEventTargetIso()
    components/prelaunch-countdown.tsx  # client countdown; redirects to `/` on reaching zero
  components/                 # shared cross-feature components (e.g. language-selector.tsx,
                               # countdown-unit.tsx — LED digits + minute-tick clock shared by
                               # the homepage hero and prelaunch countdowns)
  login/                      # login screen (page + components) — authed visitor redirected → /
  home/page.tsx               # convenience alias — redirect("/") for older/typed /home links
  auth/callback/route.ts      # OAuth code exchange → validated redirect
lib/supabase/{client,server,middleware,config}.ts
lib/auth/{sign-out,constants}.ts
lib/event/countdown.ts        # pure countdown calc + target-resolution helpers (homepage hero,
                               # pre-launch gate, /prelaunch page all share this)
lib/i18n/set-locale.ts        # Server Action: set NEXT_LOCALE cookie
proxy.ts                      # pre-launch gate + route guards + session refresh
i18n/{request,config}.ts      # next-intl config + client-safe constants
messages/{vi,en}.json         # translation catalogs
```

`app/components/` holds components shared across route groups (e.g. `language-selector.tsx`,
used by both the homepage header and the login header) — distinct from `app/(home)/components/`,
which is homepage-section-specific.

## Lint
`eslint.config.mjs` overrides `eslint-config-next`'s default ignores to also exclude `.claude/**`
and `plans/**` (agent-kit tooling and workspace artifacts, not application source).

## Env / config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe). Template in `.env.local.example`.
- Supabase dashboard: Google provider enabled; redirect + site URLs whitelisted. See `docs/setup/supabase-google-oauth.md`.
- `NEXT_PUBLIC_EVENT_DATETIME` (client-safe, ISO-8601) — the SAA 2025 launch moment. Drives three
  things: the homepage hero countdown, the pre-launch redirect gate (`proxy.ts`), and the
  `/prelaunch` page's own countdown. Defaults to `DEFAULT_EVENT_DATETIME`
  (`2026-12-26T18:30:00+07:00`, `lib/event/countdown.ts`) when unset.
  - Homepage hero: `env ?? DEFAULT_EVENT_DATETIME` then parsed — an invalid-but-present value
    falls back to the "ended" (hidden) display, not to the default.
  - Pre-launch gate + `/prelaunch` page: both resolve the target via `resolveEventTarget()` /
    `resolveEventTargetIso()`, which parse env first and fall through to `DEFAULT_EVENT_DATETIME`
    on ANY parse failure (missing or invalid) — kept as a single source of truth so the gate and
    the page can never disagree about whether the countdown has ended. `isBeforeLaunch()` fails
    **open** (unlocks the app) if even the default is unresolvable.
