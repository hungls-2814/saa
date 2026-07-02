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
| Anonymous | No valid Supabase session | `/login` only; protected routes → `/login` |
| Authenticated | Valid Supabase session | `/todo` (+ future app routes); `/login` → `/todo` |

No finer-grained roles yet — add a roles table + policy layer when per-user authorization is needed.

## Route guard matrix
| Route | Anonymous | Authenticated |
|-------|-----------|---------------|
| `/login` | render login | redirect `/todo` |
| `/todo` | redirect `/login` | render |
| `/auth/callback` | exchange code → validated redirect (default `/todo`) | (same) |

## Notes
- Enforcement: `proxy.ts` (guards) + defense-in-depth `getUser()` check in protected pages.
- The callback validates the `next` redirect target to a same-origin relative path (no open redirect).
- Never rely on `getSession()` for authz — use `getUser()`.
