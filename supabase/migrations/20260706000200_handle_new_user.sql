-- F005 Kudos Live board: profile-on-signup trigger.
-- Authoritative source: plans/reports/researcher-260706-1041-supabase-data-layer.md (§4).
-- SECURITY DEFINER + empty search_path avoids search-path-hijack (Supabase's
-- canonical pattern for triggers on auth.users). Reads Google OAuth's
-- raw_user_meta_data; falls back across the known key variants Google/Supabase
-- populate ('full_name'/'name', 'avatar_url'/'picture') and finally the email,
-- since profiles.full_name is NOT NULL.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.email
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      ''
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
