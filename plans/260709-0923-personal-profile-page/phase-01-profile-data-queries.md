# Phase 01 — Profile data queries (Track B)

## Context
- Reuse pattern: `lib/kudos/queries.ts` (getKudosFeed), `lib/kudos/queries-internal.ts` (buildCardSelect, mapRowsToCards), `lib/kudos/queries-lookups.ts` (getPerUserStats).
- Types: `lib/kudos/types.ts` (KudosCard, StarTier, HeroBadge), `lib/kudos/star-tier.ts`, `lib/kudos/hero-badge.ts`.
- Spec: `spec/profile-page/spec.md` FR1, FR5.

## Overview
- Priority: P2 · Status: done ✅
- New server-only module `lib/kudos/queries-profile.ts` with TWO focused queries for region A (header) and region D (kudos list). Single new file → no clash with `queries.ts`.

## Key insights
- `mapRowsToCards(rows, userId, supabase)` already fetches star-tier + distinct-sender counts internally → region D cards render badges/hearts without extra work.
- `profile_kudos_stats` view ALREADY exposes `received_count` + `distinct_sender_count` (migration 20260709090000). No migration.
- Do NOT modify `getPerUserStats` (region B still uses its 3-field shape). Add a sibling header query instead.
- `profiles` columns: `full_name`, `avatar_url`, `title`, `department_id → departments(name)`.

## Requirements
### getKudosByUser({ userId, direction }): Promise<KudosCard[]>
- `from('kudos_with_heart_count').select(buildCardSelect())`.
- Filter: `direction==='sent'` → `.eq('sender_id', userId)`; `'received'` → `.eq('receiver_id', userId)`.
- `.order('created_at', { ascending: false }).order('id', { ascending: false })`. No pagination (YAGNI — small volume).
- Map via `mapRowsToCards(rows, userId, supabase)`. Throw on error (mirror getKudosFeed).

### getMyProfileHeader(userId): Promise<ProfileHeaderData>
- Return `{ fullName, avatarUrl, department, starTier, heroBadge }`.
- Query A: `profiles` join `departments(name)` filtered `id = userId` → full_name, avatar_url, department.name.
- Query B: `profile_kudos_stats` filtered `profile_id = userId` → `received_count`, `distinct_sender_count` (`.maybeSingle()`).
- `starTier = deriveStarTier(received_count ?? 0)`; `heroBadge = deriveHeroBadge(distinct_sender_count ?? 0)`.
- Null-safe: missing profile row → empty strings + 'none' tier/badge (never throw on absent stats row).
- Run the two selects with `Promise.all`.
- Define/export `ProfileHeaderData` type in this module (or `types.ts` if a Track-B owner-safe spot).

## Related code files
- CREATE `lib/kudos/queries-profile.ts` (server-only header comment like queries.ts).
- CREATE `lib/kudos/queries-profile.test.ts`.
- READ (context only, do NOT edit): queries.ts, queries-internal.ts, queries-lookups.ts, map-card.ts.

## Implementation steps
1. Add server-only file header + imports (createClient, buildCardSelect, mapRowsToCards, KudosRow, deriveStarTier, deriveHeroBadge, KudosCard type).
2. Implement `getKudosByUser` mirroring getKudosFeed's select/map, single `.eq` filter by direction.
3. Implement `getMyProfileHeader` with the two-select Promise.all + derivations.
4. Export `ProfileHeaderData`.
5. `npm run typecheck`.

## Todo
- [ ] getKudosByUser
- [ ] getMyProfileHeader + ProfileHeaderData type
- [ ] unit tests (both queries, both directions, null/empty rows)
- [ ] typecheck clean

## Success criteria
- Both queries return correctly shaped data; direction filter selects the right column.
- Empty/missing rows → `[]` / safe defaults, no throw.
- Tests cover: sent, received, empty result, missing profile, missing stats row.

## Risk assessment
- **Med/Med** — Supabase select-string join syntax for `department:departments(name)` must match buildCardSelect convention. Mitigation: copy the exact FK-hint pattern from queries-internal.ts.
- **Low** — RLS on `profile_kudos_stats` (anon revoked). Fine: authenticated userId only.

## Rollback
Delete `lib/kudos/queries-profile.ts` (+test). Nothing else imports it until phase 05.

## Next steps
Consumed by phase 05 (page composition).
