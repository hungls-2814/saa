-- F006 follow-up: seed the canonical SAA Kudos hashtags so the compose dropdown
-- offers the full list (design "Dropdown list hashtag" p9zO-c4a4x). The hashtag
-- list is loaded dynamically from this table; before this it held only the F005
-- seed's throwaway tags, so the dropdown was missing the real options.
--
-- Idempotent: ON CONFLICT (label) DO NOTHING — labels are UNIQUE, so re-running
-- (or a user having already created one of these via compose) is a no-op. Labels
-- are stored WITHOUT the '#'; the UI renders the prefix. Order/casing mirror the
-- design exactly.
insert into hashtags (label) values
  ('High-perorming'),
  ('BE PROFESSIONAL'),
  ('BE OPTIMISTIC'),
  ('BE A TEAM'),
  ('THINK OUTSIDE THE BOX'),
  ('GET RISKY'),
  ('GO FAST'),
  ('WASSHOI')
on conflict (label) do nothing;
