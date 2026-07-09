# Plan — Special-day double hearts (F005 FR7 +2)

Lift the F005 deferral: on a special day (VN calendar date present in a `special_days` DB table),
a like is worth **+2** hearts. Weight decided by a DB trigger, frozen on the row. No UI change.

Spec: [spec/F005-special-day-hearts.md](spec/F005-special-day-hearts.md)

## Phases
| # | Phase | Status |
|---|-------|--------|
| 01 | [DB + server-action weighted hearts](phase-01-special-day-double-hearts.md) | complete |

Single phase — the change is one migration + one server-action edit + tests + seed.

## Key dependencies / risks
- Views must be replaced from their **latest** definitions (compose-columns migration already
  redefined `kudos_with_heart_count`). Preserve all columns + `security_invoker` + anon revoke.
- New table `special_days` needs an EXPLICIT `grant select ... to authenticated` +
  `grant ... to service_role` (blanket grants in `..._kudos_grants.sql` predate the table).
- Trigger is the sole weight authority (SECURITY DEFINER) — clients cannot forge +2.
- Live-DB verification needs a working Postgres (local stack currently unhealthy) — unit tests are
  vitest-mocked; the +2 trigger path is verified against a live DB separately.

## Definition of done
SC-A..SC-E in the spec. `npm run typecheck` + `npm test` green.

**Status: DoD MET** — migration applied cleanly · trigger (SECURITY DEFINER) verified to freeze weight on
insert · weighted views `kudos_with_heart_count` + `profile_kudos_stats` updated · `toggleHeartAction`
reads weighted count from view · tests 753/753 green, actions.test 15/15 · live-DB verified (special day +2
frozen at insert, normal day +1, un-like restores base) · special_days seed idempotent · typecheck/lint clean.
