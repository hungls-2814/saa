-- F005 Kudos Live board: row level security.
-- Authoritative source: plans/reports/researcher-260706-1041-supabase-data-layer.md (§3).
-- auth.uid() is wrapped in (select auth.uid()) throughout — Postgres caches it
-- per-statement instead of re-evaluating per-row (Supabase RLS perf guidance).

alter table departments    enable row level security;
alter table profiles       enable row level security;
alter table kudos          enable row level security;
alter table hearts         enable row level security;
alter table hashtags       enable row level security;
alter table kudos_hashtags enable row level security;
alter table kudos_images   enable row level security;
alter table gifts          enable row level security;

-- Read: any authenticated user, all tables (board data isn't per-tenant; the
-- whole page is auth-gated via PROTECTED_PATHS + server getUser()).
create policy "authenticated read departments"    on departments    for select to authenticated using (true);
create policy "authenticated read profiles"       on profiles       for select to authenticated using (true);
create policy "authenticated read kudos"          on kudos          for select to authenticated using (true);
create policy "authenticated read hearts"         on hearts         for select to authenticated using (true);
create policy "authenticated read hashtags"       on hashtags       for select to authenticated using (true);
create policy "authenticated read kudos_hashtags" on kudos_hashtags for select to authenticated using (true);
create policy "authenticated read kudos_images"   on kudos_images   for select to authenticated using (true);
create policy "authenticated read gifts"          on gifts          for select to authenticated using (true);

-- profiles: NO insert/update policy for `authenticated`. The only writer is
-- the handle_new_user() trigger (SECURITY DEFINER, runs as table owner,
-- bypasses RLS). Absence of a policy = fail-closed: users cannot
-- self-insert/edit rows directly.

-- kudos: a user may only author kudos as themselves. (Self-kudos is also
-- blocked at the DB level by the kudos_no_self_kudos CHECK constraint.)
create policy "insert own kudos" on kudos for insert to authenticated
  with check ( sender_id = (select auth.uid()) );

-- hearts: own row only, and NOT on a kudos they sent themselves (self-like
-- block). Enforceable in RLS via a NOT EXISTS subquery in WITH CHECK — the
-- subquery references the bare column name (kudos_id), which binds to the
-- incoming row's value, not "new.kudos_id".
create policy "insert own heart, not on own kudos" on hearts for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and not exists (
      select 1 from kudos k
      where k.id = kudos_id
        and k.sender_id = (select auth.uid())
    )
  );

create policy "delete own heart" on hearts for delete to authenticated
  using ( user_id = (select auth.uid()) );

-- The (user_id, kudos_id) primary key (see 20260706000000) is a second line
-- of defense against double-hearting (race between two concurrent inserts) —
-- the RLS check alone doesn't prevent duplicate rows, the PK does.
