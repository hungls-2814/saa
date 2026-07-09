# Phase 04 — Region C+D profile-kudos-section (Track A / UI)

**Status: done ✅**

## MoMorph refs
- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb
- Clarifications: /home/lesonghung/WORKSPACE/AIDD/saa/plans/260709-0923-personal-profile-page/clarifications.md

## Goal
Client component `app/profile/components/profile-kudos-section.tsx` ("use client"): awards header (C: `ProfilePage.awardsEyebrow` + `ProfilePage.kudosTitle`) + Sent/Received toggle (default **sent**) + read-only `KudosCard` list (D) + empty state per direction.

## Props (integration contract)
`{ sent: KudosCard[], received: KudosCard[] }` — owns toggle state locally. Label shows active direction + count via `ProfilePage.toggle.{sent,received}` ({count}).

## Reuse (do not rebuild)
`KudosCard` variant="feed" — READ-ONLY: pass `onCopyLink` (copy link), OMIT `onToggleLike`. Empty state: `ProfilePage.empty.{sent,received}`. Spam tag OMITTED (clarified). No pagination (YAGNI).

## Out of scope
Hearting from profile, pagination, data fetching (props only), server logic.

## Todo
- [ ] profile-kudos-section.tsx (client, < 200 lines)
- [ ] colocated `profile-kudos-section.test.tsx` (toggle flips list + count, empty state, no like handler passed)
