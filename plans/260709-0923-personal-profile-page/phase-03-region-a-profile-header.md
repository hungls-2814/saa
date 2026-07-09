# Phase 03 — Region A profile-header (Track A / UI)

**Status: done ✅**

## MoMorph refs
- Profile bản thân: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/3FoIx6ALVb
- Clarifications: /home/lesonghung/WORKSPACE/AIDD/saa/plans/260709-0923-personal-profile-page/clarifications.md

## Goal
Presentational `app/profile/components/profile-header.tsx` (region A): keyvisual band + centered `Avatar` + name + department + star tier (`starGlyph`) + `HeroBadgeImage` + gray 6-icon collection row ("Bộ sưu tập icon của tôi", static locked placeholders).

## Props (integration contract)
`{ fullName: string, avatarUrl: string, department: string, starTier: StarTier, heroBadge: HeroBadge }`

## Reuse (do not rebuild)
`Avatar`, `HeroBadgeImage`, `starGlyph` (render-helpers), keyvisual band pattern from `app/he-thong-giai/page.tsx`. i18n: `ProfilePage.iconCollection`. Palette: bg #00101A, gold #FFEA9E.

## Out of scope
Secret Box, real icon data (6 gray locked placeholders only), other-user profiles, data fetching (props only).

## Todo
- [ ] profile-header.tsx (presentational, < 200 lines)
- [ ] colocated `profile-header.test.tsx` (renders name/badge, initials fallback on empty avatar)
