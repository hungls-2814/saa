# System Architecture

## Stack
- **Framework:** Next.js 16.2.9 (App Router), React 19.2.4, TypeScript 5.
- **Styling:** Tailwind CSS v4 (`@import "tailwindcss"`).
- **Auth / backend:** Supabase Auth (Google OAuth), via `@supabase/ssr`.
- **Data layer:** Supabase Postgres (first real data layer — F005) — migrations in
  `supabase/migrations/`, RLS on every table, seeded via `scripts/seed-kudos*.ts`
  (service-role, `npm run db:seed`).
- **File storage:** Supabase Storage — `kudos-images` bucket (F006, public read /
  authenticated insert), for compose-Kudos image uploads.
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
  /kudos          : unauthenticated → /login (PROTECTED_PATHS); else render (defense-in-depth getUser() in page)
  /home           : always → redirect("/") (convenience alias for older/typed links)
  /prelaunch      : public countdown "coming soon" gate (F004); no auth required
OAuth: login button → signInWithOAuth(google, redirectTo=/auth/callback)
       → Google → /auth/callback (exchangeCodeForSession) → validated same-origin redirect (default /)
```
`proxy.ts` (Next 16 renamed `middleware.ts` → `proxy.ts`, nodejs runtime) matches all routes
except `_next/*`, static assets, and `/auth/*` (the callback runs its own code exchange). The
pre-launch gate (`isBeforeLaunch`, `lib/event/countdown.ts`) is checked FIRST, before the
Supabase session refresh — while the countdown is running it overrides every auth guard below.
`PROTECTED_PATHS = ["/he-thong-giai", "/kudos"]` — `/kudos` (F005) is the second authenticated-only
route; see `docs/system/permissions.md` for the full guard matrix.

## Directory shape
```
app/
  layout.tsx                  # root: NextIntlClientProvider + <html lang>
  (home)/                     # public homepage route group — renders at `/`
    page.tsx                  # reads Supabase user server-side for auth-aware header
    components/                # section components (header, hero, countdown, awards, footer, ...)
                               # SiteHeader takes an `active` NavKey prop (e.g. "home" | "awards")
                               # to mark the current nav item across pages
                               # home-compose-widget.tsx (FAB): opens the compose-Kudos modal, or
                               # saa-rules-modal.tsx (F007) — the "Thể lệ" (Rules) panel covering
                               # Hero-badge tiers, the 6-icon collectible reward, and "Kudos Quốc
                               # Dân"; its own "Viết KUDOS" footer button hands off to compose
    data/awards-data.ts        # award category content (slugs, copy)
  he-thong-giai/              # Awards System detail page (F003) — auth-gated, renders at `/he-thong-giai`
    page.tsx                  # server component; getUser() → redirect("/login") if unauthenticated
    components/                # hero, scroll-spy sidebar (use-active-section.ts), award detail section, icons
    data/awards-detail-data.ts # per-award title/description/quantity/prize content
  prelaunch/                  # Countdown / "coming soon" gate page (F004) — public, renders at `/prelaunch`
    page.tsx                  # server component; resolves the countdown target via resolveEventTargetIso()
    components/prelaunch-countdown.tsx  # client countdown; redirects to `/` on reaching zero
  kudos/                      # Sun* Kudos Live board (F005) — auth-gated, renders at `/kudos`
    page.tsx                  # server component; getUser() → redirect("/login") if unauthenticated;
                               # fetches BoardData server-side, hands to the client container
    components/                # highlight carousel, spotlight word-cloud, infinite-scroll feed,
                               # filter bar, per-user stats sidebar, top-10 gifts sidebar;
                               # compose-kudos-* (F006): modal + fields (recipient, title,
                               # markdown content/toolbar, hashtag, image, anonymous) opened from
                               # this board's compose trigger and from the homepage FAB
                               # (`app/(home)/components/home-compose-widget.tsx`)
                               # hero-badge-image.tsx (F007): renders the Hero badge (New/Rising/
                               # Super/Legend) on kudos-person.tsx's name pill, replacing the
                               # honorific `title` pill
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
lib/kudos/                    # F005 query/logic layer: queries.ts (SSR board data + lookups),
                               # actions.ts (Server Actions: toggleHeart, loadMoreFeed, applyFilters),
                               # pure helpers (star-tier, cursor encode/decode, filter, map-card), types.ts
                               # F007: hero-badge.ts (pure fn: distinct-sender-count → New/Rising/
                               # Super/Legend tier), wired via queries-internal.ts + map-card.ts
                               # F006 compose write-path: compose-actions.ts (Server Action
                               # `createKudoAction` — inserts kudos + hashtags + images, compensating
                               # delete-own-kudos rollback on partial failure, revalidatePath('/kudos'));
                               # compose-data.ts (client-side reads — recipient/hashtag list via the
                               # browser Supabase client — plus `uploadKudosImages()` to the
                               # `kudos-images` Storage bucket); compose-schema.ts (pure validation:
                               # required fields, 1-5 hashtags, image type/size <=5MB); markdown-format.ts
                               # (pure toolbar markdown insert/wrap helpers). Anonymity is enforced
                               # server-side in map-card.ts: the real sender profile is swapped for
                               # the alias before a `KudosCard` ever reaches the client.
proxy.ts                      # pre-launch gate + route guards + session refresh
i18n/{request,config}.ts      # next-intl config + client-safe constants
messages/{vi,en}.json         # translation catalogs
supabase/migrations/          # Postgres schema (F005): tables + 2 views + RLS + signup trigger;
                               # (F006): compose columns (title, is_anonymous, anonymous_alias) +
                               # insert/delete RLS + `kudos-images` Storage bucket + policies;
                               # (F005 FR7 +2): `hearts.weight` smallint(1|2) + `special_days`
                               # table + BEFORE INSERT trigger `set_heart_weight()` (decides the
                               # weight server-side, Asia/Ho_Chi_Minh calendar day) + both views
                               # recomputed to SUM(weight) instead of COUNT;
                               # (F007): `profile_kudos_stats` gains `distinct_sender_count`
                               # (count(distinct sender_id) per receiver) — additive, view-only —
                               # migrations-only; never hand-edit the DB
scripts/seed-kudos*.ts        # service-role seed script (npm run db:seed) for the kudos data layer
```

`app/components/` holds components shared across route groups (e.g. `language-selector.tsx`,
used by both the homepage header and the login header) — distinct from `app/(home)/components/`,
which is homepage-section-specific.

## Lint
`eslint.config.mjs` overrides `eslint-config-next`'s default ignores to also exclude `.claude/**`
and `plans/**` (agent-kit tooling and workspace artifacts, not application source).

## Env / config
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-safe). Template in `.env.local.example`.
- `SUPABASE_SERVICE_ROLE_KEY` (server/tooling-only — **never** `NEXT_PUBLIC_`) — used solely by
  `scripts/seed-kudos*.ts` to seed the Postgres data layer; the app itself never reads it at runtime.
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
