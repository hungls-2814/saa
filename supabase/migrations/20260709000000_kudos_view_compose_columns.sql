-- F006 follow-up fix: the compose columns (title, is_anonymous, anonymous_alias) were added to
-- the `kudos` TABLE in 20260708150000, but the board's card query
-- (`lib/kudos/queries-internal.ts` → buildCardSelect) reads them from the
-- `kudos_with_heart_count` VIEW, which still projected only the F005 columns.
-- Result: PostgREST 42703 ("column kudos_with_heart_count.title does not exist")
-- → getHighlights/getKudosFeed throw → getBoardData falls back to EMPTY_BOARD_DATA
-- → the /kudos board renders blank ("0 KUDOS") even though rows exist.
--
-- Recreate the view exposing the three columns. They are appended AFTER heart_count
-- so the leading columns keep their original order/type — required by CREATE OR
-- REPLACE VIEW. security_invoker is re-asserted; grants/revokes survive a replace,
-- and the anon revoke is re-issued explicitly for defense-in-depth.
create or replace view kudos_with_heart_count
with (security_invoker = true) as
select
  k.id,
  k.sender_id,
  k.receiver_id,
  k.content,
  k.created_at,
  count(h.kudos_id) as heart_count,
  k.title,
  k.is_anonymous,
  k.anonymous_alias
from kudos k
left join hearts h on h.kudos_id = k.id
group by k.id;

revoke select on kudos_with_heart_count from anon;
