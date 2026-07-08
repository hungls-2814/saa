-- F005 — table privileges (GRANTs) for the Supabase API roles.
--
-- Supabase's default privileges do NOT grant DML on migration-created tables to
-- the API roles (anon / authenticated / service_role) — they inherit only
-- TRUNCATE/REFERENCES/TRIGGER. So even `service_role`, which bypasses RLS, was
-- denied at the table-privilege layer ("permission denied for table ..."). Grant
-- the DML explicitly here.
--
-- Row access for `authenticated` is still governed by the RLS policies in
-- 20260706000100_kudos_rls_policies.sql (SELECT `using (true)`, hearts own-row
-- writes, self-like block). `service_role` bypasses RLS and needs full DML for
-- the seed/admin path (scripts/seed-kudos*.ts).
--
-- The board is AUTH-GATED: `anon` is intentionally granted nothing here — it
-- keeps only the inherited non-DML defaults plus the explicit revoke on the two
-- views (20260706000000_kudos_schema.sql), so the public anon key cannot read
-- any Kudos data over REST. This GRANT set is the DB-level half of that gate.

-- service_role: full DML on every Kudos table (seed script + tooling).
grant select, insert, update, delete on all tables in schema public to service_role;

-- authenticated: read the whole board (RLS `using (true)` governs which rows);
-- toggle its own hearts (RLS restricts to own rows + blocks self-like).
grant select on all tables in schema public to authenticated;
grant insert, delete on hearts to authenticated;

-- NB: no INSERT grant on `kudos` for `authenticated` — composing kudos is out of
-- scope this iteration (the dormant insert policy stays until the compose flow
-- ships). `anon` is deliberately omitted entirely.
