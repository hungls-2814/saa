# SAA — Sun* Awards App

Internal platform for the **Sun\* Awards (SAA)** program: a public launch countdown, the
awards system overview, and the **Sun\* Kudos** live board where people send and celebrate
Kudos. Built with the Next.js App Router, Supabase, and full VN/EN internationalization.

## Tech stack

| Area          | Choice                                                              |
| ------------- | ------------------------------------------------------------------- |
| Framework     | Next.js 16 (App Router), React 19, TypeScript 5                     |
| Styling       | Tailwind CSS v4                                                     |
| Auth          | Supabase Auth — Google OAuth via `@supabase/ssr`                    |
| Data / storage| Supabase Postgres (RLS on every table) + Supabase Storage           |
| i18n          | `next-intl` — cookie-based (`NEXT_LOCALE`), locales `vi` (default), `en` |
| Tests         | Vitest + Testing Library (jsdom)                                    |

## Features

| Code | Feature                                                                            |
| ---- | ---------------------------------------------------------------------------------- |
| F001 | Login — Google OAuth via Supabase, VN/EN                                            |
| F002 | Public homepage — hero/countdown, awards grid, Kudos promo, auth-aware header       |
| F003 | `/he-thong-giai` — Awards System detail page (auth-gated)                           |
| F004 | `/prelaunch` — countdown "coming soon" gate; locks the app until launch             |
| F005 | `/kudos` — Sun\* Kudos live board (auth-gated), including special-day double hearts |
| F006 | Viết Kudo — compose-Kudos modal (recipient, markdown, hashtags, image upload)       |
| F007 | Kudos Hero badges + Thể lệ (Rules) modal                                            |
| F008 | `/profile` — personal profile page (auth-gated)                                     |

See `docs/features/` for per-feature specs and `docs/development-roadmap.md` for status.

## Getting started

**Prerequisites:** Node.js `>= 22.9.0`, a Supabase project (Google OAuth enabled).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local   # then fill in your Supabase values

# 3. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.local.example` → `.env.local` and set:

| Variable                        | Scope           | Purpose                                                            |
| ------------------------------- | --------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | client-safe     | Supabase project URL                                               |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client-safe     | Supabase anon/public key                                           |
| `NEXT_PUBLIC_EVENT_DATETIME`    | client-safe     | Launch moment (ISO-8601); drives the countdowns & pre-launch gate  |
| `SUPABASE_SERVICE_ROLE_KEY`     | **server-only** | Seed tooling (`npm run db:seed`) — bypasses RLS, never expose      |
| `SUPABASE_ACCESS_TOKEN`         | **CLI-only**    | Supabase CLI auth — non-interactive `supabase link` / `db push`    |
| `SUPABASE_DB_PASSWORD`          | **CLI-only**    | Supabase CLI DB password — non-interactive `supabase db push`      |

> Never prefix a secret with `NEXT_PUBLIC_` — it would be bundled into client JS. The three
> non-public vars are for local tooling only; the app never reads them at runtime.
> Full auth setup: `docs/setup/supabase-google-oauth.md`.

### Database

Schema is migration-driven — never hand-edit the DB.

```bash
supabase db push      # apply migrations in supabase/migrations/
npm run db:seed       # seed the Kudos data layer (needs SUPABASE_SERVICE_ROLE_KEY)
```

See `docs/setup/supabase-migrations.md`.

## Scripts

| Command                 | What it does                          |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start the dev server                  |
| `npm run build`         | Production build                      |
| `npm run start`         | Serve the production build            |
| `npm run lint`          | ESLint                                |
| `npm run typecheck`     | `tsc --noEmit`                        |
| `npm test`              | Run the Vitest suite once             |
| `npm run test:watch`    | Vitest in watch mode                  |
| `npm run test:coverage` | Vitest with coverage                  |
| `npm run db:seed`       | Seed the Supabase Kudos data          |

## Project structure

```
app/            # App Router — route groups, pages, per-feature components
lib/            # supabase clients, auth, kudos data/logic, event countdown, i18n
i18n/           # next-intl config
messages/       # vi/en translation catalogs
supabase/       # migrations + config
proxy.ts        # pre-launch gate + route guards + Supabase session refresh
docs/           # architecture, features, setup, roadmap, changelog
```

> Next 16 renamed `middleware.ts` → `proxy.ts`. See `docs/system/architecture.md` for the
> full request-flow and guard matrix.

## Deployment

Deploys to **Vercel** via two GitHub Actions workflows in [`.github/workflows/`](.github/workflows/):

- **`ci.yml`** — runs the quality gates (lint · typecheck · test) on every PR and push to `main`.
- **`cd.yml`** — deploys to Vercel **Production** after CI succeeds on `main` (chained via
  `workflow_run`, so a failing check never reaches production).

Setup notes (secrets, Vercel env vars): `docs/setup/vercel-deployment.md`.
