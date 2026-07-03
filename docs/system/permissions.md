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
| Anonymous | No valid Supabase session | `/login`, `/` (public); `/login` stays on login |
| Authenticated | Valid Supabase session | `/` (+ future app routes); `/login` → `/` |

No finer-grained roles yet — add a roles table + policy layer when per-user authorization is needed.
There are currently no protected routes: the homepage is public for everyone, and auth only
changes header UI (notification bell + account menu), not access.

## Route guard matrix
| Route | Anonymous | Authenticated |
|-------|-----------|---------------|
| `/` | render homepage (public) | render homepage, header adds notification bell + account menu |
| `/login` | render login | redirect `/` |
| `/home` | redirect `/` (alias, unconditional) | redirect `/` (alias, unconditional) |
| `/auth/callback` | exchange code → validated redirect (default `/`) | (same) |

`/` is public — no guard in `proxy.ts` (`PROTECTED_PATHS` is currently empty). The homepage
reads the Supabase user server-side (`getUser()`) purely to toggle header UI (bell + account
menu), not to gate access. No roles/Admin-Dashboard menu item yet — deferred until a roles
layer exists (see F002 overview, `docs/features/F002-homepage/overview.md`).

## Notes
- Enforcement: `proxy.ts` (guards) + defense-in-depth `getUser()` check in protected pages.
- The callback validates the `next` redirect target to a same-origin relative path (no open redirect).
- Never rely on `getSession()` for authz — use `getUser()`.
