# Plan — Kudos Hero Badges + Thể lệ (Rules) Modal (F007)

Spec: `spec/F007-kudos-hero-badges-rules/overview.md` · Clarifications: `clarifications.md`
MoMorph: Thể lệ UPDATE — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/b1Filzi9i6

## Goal
FAB "Thể lệ" pill opens a Rules modal; Kudos cards show a Hero badge derived from distinct-sender
count (New/Rising/Super/Legend), replacing the honorific `title` pill.

## Tracks (MoMorph — Track A ⟂ Track B, no blocking; integrate as they complete)

### Track A — UI (background implementer, momorph-implement-design)
- **phase-01** — `saa-rules-modal.tsx` presentational Rules modal, pixel-perfect from b1Filzi9i6.
  Status: ✓ COMPLETE

### Track B — Backend / logic (orchestrator + implementer)
- **phase-02** — Hero badge data + derivation: `hero-badge.ts` pure fn, `heroBadge` on `KudosPerson`,
  migration adds `distinct_sender_count` to `profile_kudos_stats`, wire query (queries-internal +
  map-card), update mock-data. Status: ✓ COMPLETE
- **phase-03** — Kudos card display: `kudos-person.tsx` renders the Hero badge image (replaces
  `title` pill); badge asset map + i18n alt text. Status: ✓ COMPLETE

### Integration
- **phase-04** — Wire FAB → Rules modal in `home-compose-widget.tsx` (+ compose handoff); i18n
  `Rules` namespace (vi/en); tests (tester) + review (reviewer). Status: ✓ COMPLETE

## Key dependencies
- phase-03 depends on phase-02 (`heroBadge` type + derivation).
- phase-04 integrates phase-01 (modal) into the FAB; may start once phase-01 lands.
- Track A (phase-01) is independent of Track B.

## Assets (ready)
`public/kudos/badges/` — hero-{new,rising,super,legend}.png + icon-{revival,touch-of-light,
stay-gold,flow-to-horizon,beyond-the-boundary,root-further}.png
