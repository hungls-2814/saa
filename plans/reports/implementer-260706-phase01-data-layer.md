# Implementer report — Phase 01 Supabase data layer (F005 Kudos, Track B)

## Files created
- `supabase/config.toml` (18 lines) — minimal CLI config, `project_id` placeholder.
- `supabase/migrations/20260706000000_kudos_schema.sql` (108 lines) — 8 tables
  (departments, profiles, kudos [+CHECK `sender_id<>receiver_id`], hearts,
  hashtags, kudos_hashtags, kudos_images, gifts), all indexes incl.
  `kudos(created_at desc, id desc)` keyset index + FK indexes, both views.
- `supabase/migrations/20260706000100_kudos_rls_policies.sql` (49 lines) — RLS
  enabled on all 8 tables; read policies; hearts insert/delete + self-like
  block; kudos insert; no profiles write policy.
- `supabase/migrations/20260706000200_handle_new_user.sql` (32 lines) — signup
  trigger.
- `scripts/seed-kudos-data.ts` (46 lines), `scripts/seed-kudos-auth.ts` (66
  lines), `scripts/seed-kudos-domain.ts` (111 lines), `scripts/seed-kudos.ts`
  (73 lines) — idempotent seed, split into 4 files to respect the 200-line
  file-size rule (single-file draft was 247 lines).
- `docs/setup/supabase-migrations.md` (52 lines) — link/push/seed instructions
  + migrations-only rule + anon-block verification steps.
- `plans/reports/implementer-260706-phase01-data-layer.md` (this file).

## Files modified
- `.env.local.example` (+4 lines) — added `SUPABASE_SERVICE_ROLE_KEY` with a
  "secret, server/tooling-only, never NEXT_PUBLIC_" comment.
- `package.json` (+2 lines) — devDeps `supabase` (`^2`) and `tsx` (`^4`);
  script `"db:seed": "tsx scripts/seed-kudos.ts"`. **Did not run `npm
  install`** — new deps are declared but not yet present in `node_modules`;
  typecheck still passed because `tsx`/`supabase` aren't imported by any `.ts`
  file (tsx is a runner, supabase is a CLI).

## Red-team fixes confirmed present
- `security_invoker = true` on both `kudos_with_heart_count` and
  `profile_kudos_stats` views (schema migration).
- `revoke select on kudos_with_heart_count, profile_kudos_stats from anon;`
  (schema migration, last line).
- Self-like block: `hearts` insert policy `WITH CHECK ... NOT EXISTS (select 1
  from kudos k where k.id = kudos_id and k.sender_id = (select auth.uid()))`.
- Self-kudos block: `kudos_no_self_kudos CHECK (sender_id <> receiver_id)`.
- `handle_new_user()`: `SECURITY DEFINER set search_path = ''`; `full_name`
  COALESCEs `full_name` → `name` → `email` (extra fallback beyond the research
  doc, since `profiles.full_name` is NOT NULL and email is always present);
  `avatar_url` COALESCEs `avatar_url` → `picture` → `''`.
- `auth.uid()` wrapped in `(select auth.uid())` throughout RLS (perf pattern).
- Seed: `admin.createUser()` with `user_metadata` → trigger creates the
  profile row → seed only ever `UPDATE`s it (`upsertSunnerProfile` errors
  loudly if 0 rows updated, i.e. trigger row missing) — never plain-inserts.
  `resolveOrCreateAuthUser` catches "already registered"/"already exists" and
  resolves the existing id via `admin.listUsers()` email match.
- Hearts seed data explicitly skips any `(hearter, kudos)` pair where the
  hearter is the kudos sender (`if (hearter.email === senderEmail) continue`).
- `(user_id, kudos_id)` PK on `hearts` present as the race backstop.

## Seed content provenance
Fetched the live MoMorph screen (`MaZUn5xHXZ`, figma `2940:13431`) via
`get_frame`/`query_by_type`/`list_design_items` to source real placeholder
text instead of inventing data: sender/receiver name "Huỳnh Dương Xuân",
spotlight names (Đỗ Hoàng Hiệp, Dương Thúy An, Mai Phương Thúy, Nguyễn Văn Quy,
Lê Kiều Trang, Nguyễn Bá Chức, Nguyễn Hoàng Linh), department codes
(CECV2, CEVC10 — 2 more synthesized in the same naming pattern for filter
variety: DXC1, QAQC2), hashtags (`Dedicated`, `Inspring`, `IDOL GIỚI TRẺ`),
the thank-you message body, hero titles (New/Rising/Super/Legend Hero), and
the gift description ("Nhận được 1 áo phông SAA") all come from the design.
12 kudos / 10 gifts / hearts are generated deterministically by cycling these
8 sunners with fixed offsets — no per-item invented content beyond
reusing/rotating what the design shows (the design itself repeats the same
placeholder content across multiple cards).

## Typecheck
`npm run typecheck` → **pass**, exit 0, no errors.

## Deferred manual steps (require live project — explicitly out of scope this session)
1. `npx supabase link --project-ref <real-project-ref>` (no ref available in
   this session).
2. `npx supabase db push` — apply the 3 migrations to the hosted dev project.
3. `npm run db:seed` run **twice** — confirm the second run produces zero
   duplicate rows (idempotency check named in phase-01 Todo/SC12).
4. Anon-key REST check: `GET {url}/rest/v1/kudos_with_heart_count` and
   `.../profile_kudos_stats` with the anon key must NOT return data (confirms
   `security_invoker` + `revoke ... from anon` actually block it in the live
   project, not just on paper).
5. `npm install` to materialize the new `supabase`/`tsx` devDependencies.

## Unresolved / flag for follow-up
- Real Google OAuth `raw_user_meta_data` key for name/avatar is still
  unverified against a live login (research Q2) — trigger now falls back
  `full_name → name → email` and `avatar_url → picture → ''`, which is safe
  either way but the exact key actually populated by this repo's Google
  provider config should be confirmed once after a real sign-in.
- Department set (`CECV2`, `CEVC10`, `DXC1`, `QAQC2`) includes 2 codes not
  literally seen in the design (only `CECV2`/`CEVC10` appear in the mockup) —
  added for filter-dropdown variety per the seed task's "few departments"
  ask; flag if the real Sun* department list should replace these before
  first live seed.

**Status:** DONE
**Summary:** All Phase 01 files authored per spec (schema/RLS/trigger
migrations, split 4-file idempotent seed script, env/package.json/docs
updates); typecheck passes; no live DB access performed as instructed —
link/push/seed×2/anon-block verification are the deferred manual steps.
