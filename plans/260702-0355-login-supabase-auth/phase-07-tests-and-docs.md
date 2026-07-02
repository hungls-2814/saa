# Phase 07 — Tests & Setup Docs

**Priority:** High · **Status:** done · 119 tests pass, Supabase setup doc written.

## Tests (tester agent)
- Unit: locale resolution in `i18n/request.ts` (cookie present/absent/invalid → correct locale); `setLocale`/`signOut` action validation.
- Proxy guard logic: unauth→/todo redirects /login; authed→/login redirects /todo; callback exchanges code.
- Component: login button loading/disabled state; error toast renders on `?error=`.
- Note: full Google OAuth round-trip needs a live Supabase project (external) — cover with mocked Supabase client; document manual E2E steps.
- Choose a test runner compatible with Next 16 / React 19 (e.g. vitest + testing-library) if none present.

## Docs (doc-writer agent)
- `docs/setup/supabase-google-oauth.md` — step-by-step: create Supabase project, enable Google provider, Google Cloud OAuth client, authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback`, Supabase Site URL + Redirect URLs (`http://localhost:3000/auth/callback`), fill `.env.local`.
- Promote spec system docs → `docs/system/architecture.md` + `permissions.md` (handled at delivery).

## Success
Tests pass 100%; setup doc lets a fresh dev wire real Google login.
