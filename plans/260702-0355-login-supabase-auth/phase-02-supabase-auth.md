# Phase 02 — Supabase Client Layer + Guards + OAuth (Track B)

**Priority:** High · **Status:** done
**Reference:** `../reports/researcher-260702-0410-supabase-ssr-auth.md` (full code)

## Files to create
- `lib/supabase/client.ts` — `createBrowserClient` (browser).
- `lib/supabase/server.ts` — `createServerClient`, `await cookies()`, `getAll`/`setAll` contract.
- `lib/supabase/middleware.ts` — `updateSession(request)` refresh helper (writes req + response cookies; calls `getUser()`).
- `proxy.ts` (project root) — exported `proxy(request)`: run `updateSession`, guard `/todo` (→ /login if no user) and `/login` (→ /todo if user). `config.matcher` excludes static assets.
- `app/auth/callback/route.ts` — `GET`: read `code`, `exchangeCodeForSession`, redirect to `next` (`/todo`) or `/login?error=auth_callback_failed`.
- `lib/auth/sign-out.ts` — `'use server'` action: `signOut()` + `redirect('/login')`.

## Notes
- **Next 16:** filename is `proxy.ts` (middleware.ts deprecated). Runs nodejs runtime.
- Never run code between `createServerClient` and `getUser()` in the refresh helper.
- Authz strictly via `getUser()` (revalidates), never `getSession()`.

## Success
`npx tsc --noEmit` clean. `npm run build` shows no `middleware.ts` deprecation warning (proxy accepted). Guards verified in integration/test phase.
