# Supabase migrations & seed data

This repo's first Postgres data layer (F005 Kudos Live board) is managed via
the Supabase CLI's timestamped-migrations workflow, hosted-only (no local
Docker required to push migrations — only `supabase link`).

## One-time setup

```bash
npm install                        # picks up the `supabase` CLI + `tsx` devDeps
npx supabase init                  # only if supabase/ isn't already present (it is, in this repo)
npx supabase link --project-ref <your-project-ref>
```

## Applying migrations

```bash
npx supabase db push
```

This applies every file in `supabase/migrations/` in order:
1. `20260706000000_kudos_schema.sql` — tables, indexes, `kudos_with_heart_count`
   and `profile_kudos_stats` views (both `security_invoker` + anon-revoked).
2. `20260706000100_kudos_rls_policies.sql` — RLS enable + read/insert/delete policies.
3. `20260706000200_handle_new_user.sql` — `handle_new_user()` signup trigger.

**Rule: migrations-only.** Do not hand-edit schema in the Supabase dashboard
SQL editor once a project is on this workflow — it desyncs `db push` (fails
with drift errors). If drift happens, `npx supabase db pull` recovers a
baseline from the remote.

## Seeding sample data

After `db push` succeeds, seed sample Sunners/kudos/gifts:

```bash
npm run db:seed
```

Requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in
`.env.local` (see `.env.local.example`). The seed script
(`scripts/seed-kudos.ts`) is idempotent — safe to run more than once, it
upserts on natural/fixed keys instead of blind-inserting.

## Verifying RLS on the two views

The anon (public) key must **not** be able to read either derived view
directly over REST — this is the real authz boundary, not the app's route
guard. After pushing, confirm both requests return an empty/forbidden result
(not the actual data) when called with the anon key:

```
GET {SUPABASE_URL}/rest/v1/kudos_with_heart_count
GET {SUPABASE_URL}/rest/v1/profile_kudos_stats
```
