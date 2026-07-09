-- F005 increment: special-day double hearts (FR7' +2).
-- A like earned on a "special day" (a date present in `special_days`) is
-- worth 2 hearts instead of 1. The weight is decided by the DB at
-- insert-time and frozen on the row — clients can never forge a +2, and a
-- like keeps the value it earned even after the day passes.
-- See plans/260709-0716-special-day-double-hearts/spec/F005-special-day-hearts.md.

alter table hearts add column weight smallint not null default 1 check (weight in (1, 2));

-- Data-driven special-day source. A day is "special" iff a row exists here.
create table special_days (
  day        date primary key,
  label      text,
  created_at timestamptz not null default now()
);

alter table special_days enable row level security;
create policy "authenticated read special_days" on special_days for select to authenticated using (true);

-- New table: the blanket grants in 20260706000300_kudos_grants.sql predate it,
-- so grant explicitly. No insert/update/delete policy for authenticated =
-- fail-closed (matches the profiles/departments pattern) — only service_role
-- may write.
grant select on special_days to authenticated;
grant select, insert, update, delete on special_days to service_role;

-- Defense-in-depth: on hosted Supabase, cluster default privileges can leave
-- `anon` a table-level SELECT even with no explicit grant, which RLS would turn
-- into a `200 []` rather than a hard deny. Every sibling base table got this
-- revoke in 20260706000400_revoke_anon_base_reads.sql; this table is new, so
-- re-issue it here. The board is auth-gated — anon gets nothing (spec FR7'-b).
revoke select on special_days from anon;

-- Weight authority: a BEFORE INSERT trigger sets `weight` unconditionally,
-- so the client insert payload can never carry a trusted weight value.
-- The calendar day is evaluated in Asia/Ho_Chi_Minh (+07:00), matching the
-- SAA audience, not server UTC.
create or replace function set_heart_weight()
returns trigger language plpgsql
security definer set search_path = public, pg_temp as $$
begin
  new.weight := case
    when exists (
      select 1 from special_days d
      where d.day = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    ) then 2 else 1 end;
  return new;
end; $$;

create trigger hearts_set_weight before insert on hearts
  for each row execute function set_heart_weight();

-- Recompute kudos_with_heart_count from its LATEST definition
-- (20260709000000_kudos_view_compose_columns.sql), changing ONLY the
-- heart_count aggregate from COUNT(*) to a weighted SUM. Column order,
-- security_invoker, and the anon revoke are all preserved.
create or replace view kudos_with_heart_count
with (security_invoker = true) as
select
  k.id,
  k.sender_id,
  k.receiver_id,
  k.content,
  k.created_at,
  coalesce(sum(h.weight), 0) as heart_count,
  k.title,
  k.is_anonymous,
  k.anonymous_alias
from kudos k
left join hearts h on h.kudos_id = k.id
group by k.id;

revoke select on kudos_with_heart_count from anon;

-- Recompute profile_kudos_stats from its LATEST definition
-- (20260706000000_kudos_schema.sql), changing ONLY the hearts_received
-- subquery from COUNT(*) to a weighted SUM.
create or replace view profile_kudos_stats
with (security_invoker = true) as
select
  p.id as profile_id,
  coalesce(sent.sent_count, 0) as sent_count,
  coalesce(received.received_count, 0) as received_count,
  coalesce(hearts_received.hearts_received, 0) as hearts_received
from profiles p
left join (
  select sender_id, count(*) as sent_count
  from kudos
  group by sender_id
) sent on sent.sender_id = p.id
left join (
  select receiver_id, count(*) as received_count
  from kudos
  group by receiver_id
) received on received.receiver_id = p.id
left join (
  select k.receiver_id, sum(h.weight) as hearts_received
  from kudos k
  join hearts h on h.kudos_id = k.id
  group by k.receiver_id
) hearts_received on hearts_received.receiver_id = p.id;

revoke select on profile_kudos_stats from anon;
