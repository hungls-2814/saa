# Permissions & Access Control

## Authentication
- **Provider:** Google OAuth via Supabase Auth (PKCE flow).
- **Eligibility:** ALL Google accounts may sign in — no email-domain allowlist, no invite gate
  (MoMorph spec item 2.2.1).
- **Session:** stored in HTTP cookies, refreshed by `proxy.ts` → `lib/supabase/middleware.ts` on each request.
- **Fail-closed:** when Supabase env is unset (`isSupabaseConfigured()` false), every request is
  treated as unauthenticated — the guard never accidentally grants access.

## Access tiers (this iteration)
| Tier | Meaning | Routes |
|------|---------|--------|
| Anonymous | No valid Supabase session | `/login`, `/` (public); `/he-thong-giai` → redirect `/login` |
| Authenticated | Valid Supabase session | `/`, `/he-thong-giai` (+ future app routes); `/login` → `/` |

No finer-grained roles yet — add a roles table + policy layer when per-user authorization is needed.
The homepage (`/`) is public for everyone; `/he-thong-giai` (Awards System detail page, F003) is
the first route that requires authentication.

## Route guard matrix
| Route | Anonymous | Authenticated |
|-------|-----------|---------------|
| `/` | render homepage (public) | render homepage, header adds notification bell + account menu |
| `/he-thong-giai` | redirect `/login` | render |
| `/login` | render login | redirect `/` |
| `/home` | redirect `/` (alias, unconditional) | redirect `/` (alias, unconditional) |
| `/auth/callback` | exchange code → validated redirect (default `/`) | (same) |

`/` is public — no guard in `proxy.ts`. `/he-thong-giai` is the sole entry in
`PROTECTED_PATHS`: unauthenticated requests are redirected to `/login` by `proxy.ts`, with a
defense-in-depth `getUser()` → `redirect("/login")` check in the page itself
(`app/he-thong-giai/page.tsx`). The homepage reads the Supabase user server-side (`getUser()`)
purely to toggle header UI (bell + account menu), not to gate access. No roles/Admin-Dashboard
menu item yet — deferred until a roles layer exists (see F002 overview,
`docs/features/F002-homepage/overview.md`).

## Notes
- Enforcement: `proxy.ts` (guards) + defense-in-depth `getUser()` check in protected pages.
- The callback validates the `next` redirect target to a same-origin relative path (no open redirect).
- Never rely on `getSession()` for authz — use `getUser()`.
