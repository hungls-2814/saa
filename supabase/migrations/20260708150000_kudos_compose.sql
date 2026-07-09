-- F006 Viết Kudo (Compose Kudos): activates the compose write-path deferred by F005.
-- Authoritative source: plans/260708-1505-viet-kudo-compose/spec/F006-viet-kudo/overview.md
-- + clarifications.md (Danh hiệu title, anonymous alias, create-new hashtags, image upload).

-- 1. New kudos columns ---------------------------------------------------------
-- title           : per-kudos award title ("danh hiệu") shown as the card title.
--                   Nullable — legacy F005 rows carry none; the compose form requires it.
-- is_anonymous    : sender chose to hide their identity on the board.
-- anonymous_alias : the display name shown in place of the real sender when anonymous.
alter table kudos
  add column title           text,
  add column is_anonymous    boolean not null default false,
  add column anonymous_alias text;

-- Alias is mandatory exactly when the kudos is anonymous (blank/whitespace rejected).
alter table kudos
  add constraint kudos_anon_alias_required
  check (is_anonymous = false or (anonymous_alias is not null and length(btrim(anonymous_alias)) > 0));

-- 2. RLS insert policies -------------------------------------------------------
-- `kudos` INSERT is already governed by the (until now dormant) F005 policy
-- "insert own kudos" (sender_id = auth.uid()); self-kudos blocked by the CHECK.
-- The junction/child tables had SELECT-only policies — add author-scoped INSERT.

-- A caller may attach a hashtag only to a kudos they authored.
create policy "insert own kudos_hashtags" on kudos_hashtags for insert to authenticated
  with check (
    exists (
      select 1 from kudos k
      where k.id = kudos_id
        and k.sender_id = (select auth.uid())
    )
  );

-- A caller may attach an image only to a kudos they authored.
create policy "insert own kudos_images" on kudos_images for insert to authenticated
  with check (
    exists (
      select 1 from kudos k
      where k.id = kudos_id
        and k.sender_id = (select auth.uid())
    )
  );

-- Any authenticated user may create a hashtag (deduped app-side by the unique
-- `label`; a racing duplicate surfaces as 23505 and is resolved by re-select).
create policy "insert hashtags" on hashtags for insert to authenticated
  with check (true);

-- A user may delete their OWN kudos. This backs `createKudoAction`'s
-- compensating rollback: if the hashtag/image inserts fail after the kudos row
-- is committed, the action deletes the orphan so no zero-hashtag post lingers
-- (the ≥1-hashtag invariant holds). ON DELETE CASCADE on the junction/child FKs
-- removes any partially-written hashtag/image rows with it.
create policy "delete own kudos" on kudos for delete to authenticated
  using ( sender_id = (select auth.uid()) );

-- 3. Table privileges (GRANTs) -------------------------------------------------
-- Complements 20260706000300_kudos_grants.sql, which deliberately withheld the
-- kudos write DML while compose was out of scope. Row access stays governed by
-- the RLS policies above.
grant insert on kudos, kudos_hashtags, kudos_images, hashtags to authenticated;
grant delete on kudos to authenticated; -- own-row only (RLS "delete own kudos"); backs the rollback

-- 4. Storage bucket for kudos images ------------------------------------------
-- Public-read bucket (served via public object URLs); authenticated users upload.
-- NB: on hosted Supabase the storage.objects policies below require the migration
-- role to own storage.objects — if `supabase db push` errors here, apply this
-- block via the SQL editor. The local CLI stack (superuser) applies it directly.
insert into storage.buckets (id, name, public)
values ('kudos-images', 'kudos-images', true)
on conflict (id) do nothing;

create policy "authenticated upload kudos images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kudos-images');

create policy "public read kudos images" on storage.objects
  for select to public
  using (bucket_id = 'kudos-images');
