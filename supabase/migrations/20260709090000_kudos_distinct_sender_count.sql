-- F007 Hero badges: add `distinct_sender_count` (count of DISTINCT senders who
-- sent a profile Kudos) to `profile_kudos_stats`. Distinct from `received_count`
-- (total kudos received). Source for the derived Hero badge (New/Rising/Super/
-- Legend). Additive `create or replace view` — new column appended at the end,
-- existing columns unchanged (order preserved for create-or-replace).

create or replace view profile_kudos_stats
with (security_invoker = true) as
select
  p.id as profile_id,
  coalesce(sent.sent_count, 0) as sent_count,
  coalesce(received.received_count, 0) as received_count,
  coalesce(hearts_received.hearts_received, 0) as hearts_received,
  coalesce(received.distinct_sender_count, 0) as distinct_sender_count
from profiles p
left join (
  select sender_id, count(*) as sent_count
  from kudos
  group by sender_id
) sent on sent.sender_id = p.id
left join (
  select
    receiver_id,
    count(*) as received_count,
    count(distinct sender_id) as distinct_sender_count
  from kudos
  group by receiver_id
) received on received.receiver_id = p.id
left join (
  select k.receiver_id, count(h.*) as hearts_received
  from kudos k
  join hearts h on h.kudos_id = k.id
  group by k.receiver_id
) hearts_received on hearts_received.receiver_id = p.id;

-- Re-assert the anon lockdown (idempotent; grants survive create-or-replace but
-- this keeps the guarantee explicit alongside the definition).
revoke select on profile_kudos_stats from anon;
