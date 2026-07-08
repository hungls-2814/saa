# Phase 01 — Supabase data layer (Track B)

## Context
- Research (AUTHORITATIVE): `plans/reports/researcher-260706-1041-supabase-data-layer.md`
- Spec: `spec/kudos-board/overview.md` (Data model) · Clarifications: `clarifications.md`
- Existing clients (unchanged): `lib/supabase/{server,client,middleware,config}.ts`

## Overview
- **Priority:** P1 (foundational — everything downstream reads this schema)
- **Status:** done
- **Description:** Stand up the repo's first Postgres data layer via Supabase CLI +
  timestamped migrations: tables, two views, RLS, self-kudos CHECK, signup trigger, and an
  idempotent TS seed script drawn from the design's mock content.

## Key insights
- Hosted-only team, **no local Docker** → `supabase link` + `db push`; **not** `db reset`/`seed.sql`.
- `heart_count` = plain VIEW (`kudos_with_heart_count`), never a trigger counter — event-scale
  data makes live COUNT cheap and drift-proof (research §2).
- `profile_kudos_stats` VIEW serves BOTH FR5 per-user stats and FR11 sender star-tier (DRY).
- **CRITICAL — views are the real authz boundary, not the Next route guard.** Both views MUST be
  `create view ... with (security_invoker = true)` so RLS runs as the querying role (a view owned
  by a superuser otherwise bypasses the underlying tables' RLS). ALSO an explicit
  `revoke select on kudos_with_heart_count, profile_kudos_stats from anon;` (defense in depth) —
  the public anon key must not be able to `GET /rest/v1/<view>` directly; the `proxy.ts` guard
  does NOT protect direct Supabase REST access.
- Self-like blocked in RLS `WITH CHECK NOT EXISTS`; `(user_id,kudos_id)` PK is the race backstop.
- Self-kudos blocked by CHECK `sender_id <> receiver_id` (clarifications; resolves research Q4).
- `profiles` written only by `handle_new_user()` (SECURITY DEFINER, `search_path=''`); no
  authenticated insert/update policy → fail-closed.
- Once on migrations, do NOT hand-edit schema in the dashboard SQL editor (desyncs `db push`).

## Requirements
- **Functional:** backs FR1–FR7, FR11. **Non-functional:** NFR2 (service-role key server-only), NFR3.

## Related code files
**Create**
- `supabase/config.toml`, `supabase/migrations/20260706000000_kudos_schema.sql`
  (departments, profiles, kudos [+CHECK sender_id<>receiver_id], hearts, hashtags,
  kudos_hashtags, kudos_images, gifts + indexes + `kudos_with_heart_count` +
  `profile_kudos_stats` views)
- `supabase/migrations/20260706000100_kudos_rls_policies.sql` (enable RLS + read/insert/delete policies)
- `supabase/migrations/20260706000200_handle_new_user.sql` (profile-on-signup trigger)
- `scripts/seed-kudos.ts` (idempotent seed; service-role key; seed **auth users** via
  `auth.admin.createUser()` — the `handle_new_user()` trigger creates the profile row, so seed
  then UPDATEs/upserts profile fields, never plain-inserts profiles — research §5 option a)
**Modify**
- `.env.local.example` (+ `SUPABASE_SERVICE_ROLE_KEY`, comment: secret, never `NEXT_PUBLIC_`)
- `package.json` (devDep `supabase`; `db:seed` script via `tsx`)
- `docs/setup/` (short "supabase migrations + seed" note) — light touch

## Implementation steps
1. `npx supabase init` + `link --project-ref <ref>`; `db pull` to baseline the auth-only remote.
2. Author `*_kudos_schema.sql` per research §2 DDL; add `kudos_images(kudos_id, url)` and the
   `profile_kudos_stats` view (received_count, sent_count, hearts_received per profile). BOTH
   views `with (security_invoker = true)` + `revoke select ... from anon;`.
3. Author `*_rls_policies.sql` per research §3 (wrap `auth.uid()` in `(select …)`; enable RLS on
   all 8 tables incl. `kudos_images`, read policies for `authenticated`, hearts insert/delete +
   self-like block, kudos insert `sender_id = auth.uid()`).
4. Author `*_handle_new_user.sql` per research §4; `full_name = COALESCE(->>'full_name', ->>'name')`,
   `avatar_url = COALESCE(->>'avatar_url', ->>'picture')`.
5. `supabase db push`; verify tables/views/policies in dashboard; confirm anon key cannot
   `GET /rest/v1/kudos_with_heart_count` nor `/profile_kudos_stats`.
6. Write `scripts/seed-kudos.ts` — idempotent, service-role, per seed sunner:
   (a) `auth.admin.createUser({ email, email_confirm:true, user_metadata:{ full_name, avatar_url }})`
       so the trigger's NOT-NULL `full_name` insert succeeds;
   (b) wrap each `createUser` in try/catch — on "already registered", resolve the existing id via
       `admin.listUsers()` email match and reuse it;
   (c) the trigger already created the profile row → **UPDATE/upsert** profile fields
       (department_id, title) keyed on id (do NOT plain-insert — conflicts with the trigger row);
   (d) upsert departments, hashtags, kudos (fixed seed uuid), kudos_hashtags, kudos_images (≤5),
       hearts (no self-likes), gifts — all from design mock content.
7. Run seed against dev project TWICE; confirm no dupes (idempotent).

## Todo
- [x] supabase init/link/pull baseline
- [x] schema migration (tables + indexes + 2 views `security_invoker` + `revoke ... from anon` + self-kudos CHECK)
- [x] RLS migration (reads + hearts write + self-like block + kudos insert)
- [x] handle_new_user trigger migration
- [ ] `db push` applies clean — **deferred to manual smoke**
- [ ] anon key CANNOT read either view (verify) — **deferred to manual smoke**
- [x] idempotent `scripts/seed-kudos.ts` (createUser→trigger→upsert profile; try/catch reuse) + `db:seed` script
- [x] `.env.local.example` + package.json updates

## Success criteria
- **SC12:** migrations apply clean (tables + 2 views + RLS + CHECK + trigger); seed idempotent (run twice, no dupes).
- View-backed `heart_count` + `profile_kudos_stats` queryable; self-kudos & self-like rejected.
- Anon key cannot read `kudos_with_heart_count` nor `profile_kudos_stats` (verify against dev REST).

## Risks
| Risk | L×I | Countermove |
|------|-----|-------------|
| Views expose data to anon REST callers (RLS bypass) | **M×H** | `security_invoker=true` + `revoke ... from anon`; verify anon GET blocked |
| Google OAuth metadata key mismatch (`full_name` vs `name`) | M×M | COALESCE both keys; verify one real login (research Q2) |
| Seed plain-inserts profile → conflicts with trigger row / NOT-NULL crash | **M×H** | createUser (metadata) → trigger inserts profile → seed UPDATEs fields; try/catch reuse on re-run |
| Dashboard hand-edits desync `db push` | L×M | migrations-only rule documented; `db pull` recovers |
| `.or()` keyset predicate fragile (used in Phase 02) | L×M | note simpler `.lt('created_at')` fallback (research §6) |

## Security
- RLS on every table; reads gated to `authenticated`; hearts own-row only; profiles fail-closed
  (trigger-only writes). **Views `security_invoker=true` + `revoke ... from anon`** so they inherit
  table RLS and are unreachable by the public anon key over REST (the true authz boundary).
  `SUPABASE_SERVICE_ROLE_KEY` server/tooling-only, `.gitignore`-covered, never bundled.
  `isSupabaseConfigured()` unchanged (must not gate on service-role key).

## Next
Unblocks Phase 02 (query modules read these tables/views).
