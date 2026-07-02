# Phase 05 — Protected /todo Placeholder (Track B)

**Priority:** Medium · **Status:** done

## Files to create
- `app/todo/page.tsx` — async server component. `createClient()` → `getUser()`; if no user `redirect('/login')` (defense-in-depth; proxy already guards). Render minimal placeholder: localized `Todo.title`, the signed-in user's email, and a sign-out button (form `action={signOut}`).
- `app/todo/sign-out-button.tsx` (client or server-form) — submit button wired to `signOut` server action from `lib/auth/sign-out.ts`.

## Success
Authenticated user sees placeholder + email + working sign-out; unauthenticated redirected to /login.
