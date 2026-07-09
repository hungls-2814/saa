# Phase 01 — DB + server-action weighted hearts

Spec: [spec/F005-special-day-hearts.md](spec/F005-special-day-hearts.md) · Priority: high · Status: complete

## Files
- **create** `supabase/migrations/20260709070000_special_day_hearts.sql`
- **edit** `lib/kudos/actions.ts` — `toggleHeartAction` count-read → weighted view
- **edit** `lib/kudos/actions.test.ts` — update the post-mutate count mock/asserts
- **edit** `scripts/seed-kudos-data.ts` + `scripts/seed-kudos-domain.ts` — idempotent `special_days` seed
- **edit** `scripts/seed-kudos.ts` — call the new upsert
- (verify) `lib/kudos/queries-internal.ts` / `map-card.ts` already read `heart_count` from the view → weighted automatically; change only if a raw COUNT is found.

## Migration (exact shape)
1. `alter table hearts add column weight smallint not null default 1 check (weight in (1, 2));`
2. Create `special_days`:
   ```sql
   create table special_days (
     day        date primary key,
     label      text,
     created_at timestamptz not null default now()
   );
   alter table special_days enable row level security;
   create policy "authenticated read special_days" on special_days for select to authenticated using (true);
   -- new table: blanket grants in _kudos_grants.sql predate it, so grant explicitly
   grant select on special_days to authenticated;
   grant select, insert, update, delete on special_days to service_role;
   -- no insert/update/delete policy for authenticated = fail-closed (matches profiles/departments)
   ```
3. Weight trigger (sole authority; clients cannot forge +2):
   ```sql
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
   ```
4. Recompute BOTH views (replace from their LATEST definitions):
   - `kudos_with_heart_count` — copy the def from `20260709000000_kudos_view_compose_columns.sql`
     verbatim, changing ONLY `count(h.kudos_id) as heart_count` → `coalesce(sum(h.weight), 0) as heart_count`.
     Keep column order, `with (security_invoker = true)`, and re-issue `revoke select ... from anon;`.
   - `profile_kudos_stats` — copy the def from `20260706000000_kudos_schema.sql`, changing ONLY the
     hearts_received subquery `count(h.*)` → `sum(h.weight)`. Keep `security_invoker` + the anon revoke.

## Server action (lib/kudos/actions.ts)
- Insert stays `{ user_id, kudos_id }` (NO weight — trigger owns it).
- Replace the post-mutate `.from('hearts').select('*', { count: 'exact', head: true }).eq('kudos_id', …)`
  with a weighted read:
  `const { data, error } = await supabase.from('kudos_with_heart_count').select('heart_count').eq('id', kudosId).single();`
  → `heartCount: data?.heart_count ?? 0`. Preserve the existing error→`{ok:false,error:'unknown'}` path
  and the self-like / unique-violation handling exactly.

## Seed (optional but include, idempotent)
- `SPECIAL_DAYS = [{ day: '2026-12-26', label: 'SAA 2025 gala' }]` in seed-kudos-data.ts.
- `upsertSpecialDays(supabase)` in seed-kudos-domain.ts: `upsert(SPECIAL_DAYS, { onConflict: 'day' })`.
- call it in seed-kudos.ts main().

## Todo
- [x] migration file (alter + table + RLS/grants + trigger + 2 view replaces)
- [x] toggleHeartAction weighted count-read
- [x] actions.test.ts updated + green
- [x] special_days idempotent seed
- [x] `npm run typecheck` + `npm test` green

## Success criteria
SC-A..SC-E in the spec. No UI change. No file >200 lines.

## Notes
- Do NOT touch cloud DB. Migration correctness = SQL applies cleanly (validate syntax; live-apply is
  done later against a disposable/local DB during verification).
- Timezone lives in SQL (`now() at time zone 'Asia/Ho_Chi_Minh'`) — no app-side date math.
