# Permissions & Access Control (forward-draft)

> Forward-draft from F001. Promote to `docs/system/permissions.md` at implement-start; reconcile post-forge.

## Authentication
- **Provider:** Google OAuth via Supabase Auth (PKCE flow).
- **Eligibility:** ALL Google accounts are permitted to sign in. No email-domain allowlist,
  no invite gate (per MoMorph spec item 2.2.1).
- **Session:** Supabase session stored in HTTP cookies, refreshed by `middleware.ts` on each request.

## Access tiers (this iteration)
| Tier | Meaning | Routes |
|------|---------|--------|
| Anonymous | No valid Supabase session | `/login` only; any protected route → redirect `/login` |
| Authenticated | Valid Supabase session | `/todo` (and future app routes); `/login` → redirect `/todo` |

There are no finer-grained roles yet. Introduce a roles table + policy layer when the app
needs per-user authorization beyond "signed in".

## Route guard matrix
| Route | Anonymous | Authenticated |
|-------|-----------|---------------|
| `/login` | render login | redirect `/todo` |
| `/todo` | redirect `/login` | render |
| `/auth/callback` | exchange code → session → redirect `/todo` | (same) |

## Notes / future
- Enforcement lives in `middleware.ts` (edge) + a server-side `getUser()` check in protected pages.
- Do NOT rely on `getSession()` alone for authorization decisions — use `getUser()` which
  validates the token with Supabase.
