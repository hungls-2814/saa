-- F005 Kudos Live board: base schema (tables, indexes, derived views).
-- Authoritative source: plans/reports/researcher-260706-1041-supabase-data-layer.md (§2)
-- plus the self-kudos CHECK from plans/260706-1041-kudos-live-board/clarifications.md.

create extension if not exists pgcrypto; -- gen_random_uuid(); no-op if already enabled

create table departments (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text not null,
  department_id uuid references departments (id),
  avatar_url    text,
  title         text, -- "danh hiệu"
  created_at    timestamptz not null default now()
);
create index profiles_department_id_idx on profiles (department_id);

create table kudos (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references profiles (id) on delete cascade,
  receiver_id uuid not null references profiles (id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  constraint kudos_no_self_kudos check (sender_id <> receiver_id)
);
-- Keyset pagination on the feed (created_at desc, id desc tiebreak).
create index kudos_created_at_id_idx on kudos (created_at desc, id desc);
create index kudos_receiver_id_idx on kudos (receiver_id);
create index kudos_sender_id_idx on kudos (sender_id);

create table hearts (
  user_id    uuid not null references profiles (id) on delete cascade,
  kudos_id   uuid not null references kudos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, kudos_id) -- also enforces UNIQUE(user_id, kudos_id)
);
create index hearts_kudos_id_idx on hearts (kudos_id); -- PK leads with user_id; covers COUNT-by-kudos

create table hashtags (
  id    uuid primary key default gen_random_uuid(),
  label text not null unique
);

create table kudos_hashtags (
  kudos_id   uuid not null references kudos (id) on delete cascade,
  hashtag_id uuid not null references hashtags (id) on delete cascade,
  primary key (kudos_id, hashtag_id)
);
create index kudos_hashtags_hashtag_id_idx on kudos_hashtags (hashtag_id);

create table kudos_images (
  kudos_id uuid not null references kudos (id) on delete cascade,
  url      text not null,
  primary key (kudos_id, url)
);

create table gifts (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles (id) on delete cascade,
  description  text not null,
  awarded_at   timestamptz not null default now()
);
create index gifts_awarded_at_idx on gifts (awarded_at desc);
create index gifts_recipient_id_idx on gifts (recipient_id);

-- heart_count: plain VIEW, not a trigger-maintained column or materialized view.
-- Event-scale data makes a live COUNT cheap and it can never drift.
-- security_invoker=true is REQUIRED so the view runs RLS as the querying role —
-- a view owned by the table owner would otherwise bypass the base tables' RLS.
create view kudos_with_heart_count
with (security_invoker = true) as
select
  k.id,
  k.sender_id,
  k.receiver_id,
  k.content,
  k.created_at,
  count(h.kudos_id) as heart_count
from kudos k
left join hearts h on h.kudos_id = k.id
group by k.id;

-- Serves both FR5 (per-user stats) and FR11 (sender star-tier), DRY.
create view profile_kudos_stats
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
  select k.receiver_id, count(h.*) as hearts_received
  from kudos k
  join hearts h on h.kudos_id = k.id
  group by k.receiver_id
) hearts_received on hearts_received.receiver_id = p.id;

-- Defense in depth: the public anon key must never be able to
-- `GET /rest/v1/<view>` directly — the proxy.ts route guard does not protect
-- direct Supabase REST access. security_invoker (above) + this revoke are
-- both required (see researcher report §"CRITICAL").
revoke select on kudos_with_heart_count, profile_kudos_stats from anon;
