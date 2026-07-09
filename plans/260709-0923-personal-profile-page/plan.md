---
title: "Personal Profile Page (/profile)"
description: "Auth-gated own-profile page: identity header, stats, kudos sent/received list"
status: done
priority: P2
effort: 5h
branch: feat/profile-page
tags: [profile, kudos, next16, supabase, i18n]
created: 2026-07-09
completed: 2026-07-09
---

# F008 — Personal Profile Page (`/profile`)

Own-profile only, auth-gated server component composing 4 regions (A header, B stats,
C awards header, D kudos list). Heavy reuse of the `/kudos` board + `/he-thong-giai`
template. Secret Box + icon collection DEFERRED (static placeholders, 0 counts, no schema).

Full input: `spec/profile-page/spec.md` · Decisions: `clarifications.md`

## Verified facts (no re-research)
- `profile_kudos_stats` view ALREADY has `distinct_sender_count` (migration 20260709090000) → **no migration**.
- `account-menu.tsx:69` already links `/profile` → goes live automatically, **no edit**.
- `mapRowsToCards` internally fetches star + distinct-sender counts → region D cards get badges for free.
- `getPerUserStats` selects only sent/received/hearts → header needs a **sibling** query (do NOT change its shape).

## Two-track shape
Track A (UI, presentational) and Track B (data/route/i18n) are parallel-runnable — NO blocks between them.
Integration happens only in the page composition phase (05).

## Phases

| # | Phase | Track | Status | Depends on | File ownership |
|---|-------|-------|--------|-----------|----------------|
| 01 | Profile data queries | B | done | — | `lib/kudos/queries-profile.ts` (+test) |
| 02 | Route guard + i18n | B | done | — | `proxy.ts`, `messages/en.json`, `messages/vi.json` |
| 03 | Region A — profile-header | A | done | — | `app/profile/components/profile-header.tsx` (+test) |
| 04 | Region C+D — profile-kudos-section | A | done | — | `app/profile/components/profile-kudos-section.tsx` (+test) |
| 05 | Page composition (integration) | INT | done | 01,02,03,04 | `app/profile/page.tsx` (+test) |
| 06 | Verification (typecheck/lint/test) | QA | done | 05 | — (tester, read-only on src) |

## Dependency graph
```
01 ─┐
02 ─┤
03 ─┼─→ 05 ─→ 06
04 ─┘
```
01·02·03·04 fully parallel. 05 is the single merge point. 06 validates the whole.

## Integration contract (shared across tracks)
- **i18n namespace** `ProfilePage` keys (Track B creates in 02; Track A consumes in 03/04):
  `title`, `awardsEyebrow` ("Sun* Annual Awards 2025"), `kudosTitle` ("KUDOS"),
  `toggle.sent`, `toggle.received`, `iconCollection`, `empty.sent`, `empty.received`.
  Reuse existing `KudosPage.stats` (region B) and `KudosPage.card` (region D cards).
- **ProfileHeader props** (03): `{ fullName, avatarUrl, department, starTier, heroBadge }`.
- **ProfileKudosSection props** (04): `{ sent: KudosCard[], received: KudosCard[] }` — owns toggle state,
  default "sent"; renders read-only `KudosCard` (pass `onCopyLink`, OMIT `onToggleLike`).
- **getKudosByUser** (01): `({ userId, direction: 'sent'|'received' }) => Promise<KudosCard[]>`.
- **getMyProfileHeader** (01): `(userId) => Promise<{ fullName, avatarUrl, department, starTier, heroBadge }>`.

## Success (observable)
- `/profile` unauthenticated → 302 `/login`; authenticated → 200 renders A/B/C/D.
- Toggle flips list between sent/received with correct counts; empty state per direction.
- Cards show hearts count + copy-link, no like button. `npm run typecheck && lint && test` green.
- No new migration, no new dependency, every file < 200 lines.
- **Delivery (2026-07-09)**: All 6 phases shipped on `feat/profile-page`. Tests: 825/825 pass. Reviewer cleared with nits accepted (double-query YAGNI documented).
