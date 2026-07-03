# Permissions — forward-draft (F003)

Adds one protected route to the existing `proxy.ts` guard. No new roles/RBAC.

## Change
- `PROTECTED_PATHS` gains `/he-thong-giai` — an authenticated-only page.
  Unauthenticated request → redirect `/login` (proxy). Server page also does a
  defense-in-depth `getUser()` → `redirect("/login")`.

## Route guard matrix (delta)
| Route | Unauthenticated | Authenticated |
|---|---|---|
| `/he-thong-giai` | redirect `/login` | render |

Homepage (`/`) stays public; `/login` unchanged (authed → `/`). Roles/Admin
Dashboard still deferred (no role system). To be reconciled into
`docs/system/permissions.md` at delivery.
