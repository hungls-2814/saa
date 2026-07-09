-- F006 follow-up fix: existing auth.users that predate the on_auth_user_created
-- trigger reaching an environment (e.g. real OAuth accounts created before the
-- F005 trigger migration was applied to the linked remote) have NO profiles row.
-- Composing a kudos then fails with 23503 — "insert or update on table kudos
-- violates foreign key constraint kudos_sender_id_fkey / Key is not present in
-- table profiles" — because kudos.sender_id references profiles(id).
--
-- Backfill a profile for every auth.users without one, mirroring
-- handle_new_user()'s metadata extraction (full_name: full_name → name → email;
-- avatar_url: avatar_url → picture → ''). Runs as the migration role (bypasses
-- RLS, same as the SECURITY DEFINER trigger). Idempotent: the NOT EXISTS guard
-- inserts only the missing rows, so re-running is a no-op. New signups keep
-- getting their profile from the trigger — this only closes the pre-trigger gap.
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'full_name',
    u.raw_user_meta_data ->> 'name',
    u.email
  ),
  coalesce(
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'picture',
    ''
  )
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
