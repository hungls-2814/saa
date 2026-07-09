# Permissions & Access Control

## Authentication
- **Provider:** Google OAuth via Supabase Auth (PKCE flow).
- **Eligibility:** ALL Google accounts may sign in — no email-domain allowlist, no invite gate
  (MoMorph spec item 2.2.1).
- **Session:** stored in HTTP cookies, refreshed by `proxy.ts` → `lib/supabase/middleware.ts` on each request.
- **Fail-closed:** when Supabase env is unset (`isSupabaseConfigured()` false), every request is
  treated as unauthenticated — the guard never accidentally grants access.

## Pre-launch gate (time-based, precedes auth)
Until `now` reaches `NEXT_PUBLIC_EVENT_DATETIME` (`proxy.ts` + `lib/event/countdown.ts`), every
route below — regardless of the access tier — redirects to the public `/prelaunch` countdown
page; only `/prelaunch` itself, `/auth/*`, and static assets are exempt. This check runs before
the auth guards described in this document, so the tiers/matrix below only take effect **after**
launch. See `docs/features/F004-countdown-prelaunch/overview.md` and
`docs/system/architecture.md` for details.

## Access tiers (this iteration)
| Tier | Meaning | Routes |
|------|---------|--------|
| Anonymous | No valid Supabase session | `/login`, `/` (public); `/he-thong-giai`, `/kudos` → redirect `/login` |
| Authenticated | Valid Supabase session | `/`, `/he-thong-giai`, `/kudos` (+ future app routes); `/login` → `/` |

No finer-grained roles yet — add a roles table + policy layer when per-user authorization is needed.
The homepage (`/`) is public for everyone; `/he-thong-giai` (Awards System detail page, F003) and
`/kudos` (Sun* Kudos Live board, F005) both require authentication. `/kudos` additionally reads
from Supabase Postgres, where Row Level Security requires the `authenticated` role on every table
read (see `docs/features/F005-kudos-live-board/overview.md`).

## Route guard matrix
| Route | Anonymous | Authenticated |
|-------|-----------|---------------|
| `/` | render homepage (public) | render homepage, header adds notification bell + account menu |
| `/he-thong-giai` | redirect `/login` | render |
| `/kudos` | redirect `/login` | render |
| `/login` | render login | redirect `/` |
| `/home` | redirect `/` (alias, unconditional) | redirect `/` (alias, unconditional) |
| `/auth/callback` | exchange code → validated redirect (default `/`) | (same) |
| `/prelaunch` | render countdown page (public) | render countdown page (same, public) |

`/` is public — no guard in `proxy.ts`. `/he-thong-giai` and `/kudos` are `PROTECTED_PATHS`:
unauthenticated requests are redirected to `/login` by `proxy.ts`, with a defense-in-depth
`getUser()` → `redirect("/login")` check in each page itself (`app/he-thong-giai/page.tsx`,
`app/kudos/page.tsx`). The homepage reads the Supabase user server-side (`getUser()`) purely to
toggle header UI (bell + account menu), not to gate access. No roles/Admin-Dashboard menu item
yet — deferred until a roles layer exists (see F002 overview,
`docs/features/F002-homepage/overview.md`).

## Kudos data-layer RLS (F005 + F006)
`/kudos` reads require the `authenticated` role on every table (see
`docs/features/F005-kudos-live-board/overview.md`). F006 (compose-Kudos) activates the write
path that F005 left dormant:
- `kudos` insert — existing policy, `sender_id = auth.uid()` (self-kudos blocked by CHECK).
- `kudos_hashtags` / `kudos_images` insert (NEW, F006) — author-scoped: only for a kudos the
  caller sent (`EXISTS kudos k WHERE k.id = kudos_id AND k.sender_id = auth.uid()`).
- `hashtags` insert (NEW, F006) — any `authenticated` user, unrestricted (create-new-tag flow).
- `kudos` delete (NEW, F006) — `sender_id = auth.uid()` (own rows only). Backs
  `createKudoAction`'s compensating rollback: if the hashtag/image inserts fail after the kudos
  row commits, the action deletes the orphan; `ON DELETE CASCADE` on the junction/child FKs
  removes any partially-written hashtag/image rows with it.
- GRANTs (NEW, F006): `insert` on `kudos`, `kudos_hashtags`, `kudos_images`, `hashtags`; `delete`
  on `kudos` (own-row only, enforced by the policy above) — to `authenticated`.
- Storage bucket `kudos-images` (NEW, F006, public): `authenticated` may `insert` (upload) into
  the bucket; anyone (`public`) may `select` (read) — object URLs are served directly. On hosted
  Supabase these `storage.objects` policies may need applying via the SQL editor (ownership);
  the local CLI stack applies them directly.
- Migration: `supabase/migrations/20260708150000_kudos_compose.sql`.

**Anonymity is an application-layer guarantee, not an RLS one**: an anonymous kudos still stores
the real `sender_id` (needed for RLS ownership checks and the delete-own-kudos rollback above).
The real sender is withheld from the client in `lib/kudos/map-card.ts` — when `is_anonymous`,
the mapper substitutes the alias for the sender profile before a `KudosCard` is ever serialized
to the browser, so the real identity never leaves the server for an anonymous post.

## Notes
- Enforcement: `proxy.ts` (guards) + defense-in-depth `getUser()` check in protected pages.
- The callback validates the `next` redirect target to a same-origin relative path (no open redirect).
- Never rely on `getSession()` for authz — use `getUser()`.
