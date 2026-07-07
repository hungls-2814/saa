-- F005 — defense-in-depth: hard-block the public `anon` role from the Kudos
-- base tables.
--
-- The board is auth-gated and RLS already returns ZERO rows to `anon`
-- (SELECT policies are `to authenticated`). But on hosted Supabase, cluster
-- default privileges grant `anon` table-level SELECT, so an anon read returns
-- `200 []` (empty) rather than a hard denial — the block rests solely on RLS
-- being correct. Revoke SELECT from `anon` so it is denied at the privilege
-- layer (401) on every Kudos object, matching the two views (already revoked in
-- 20260706000000) and the local stack. `authenticated` keeps its SELECT grant
-- (20260706000300); the app only ever reads as an authenticated user.
revoke select on
  departments, profiles, kudos, hashtags, kudos_hashtags, kudos_images, hearts, gifts
  from anon;
