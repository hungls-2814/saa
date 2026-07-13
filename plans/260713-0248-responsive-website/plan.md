---
title: Responsive Website (Mobile + Tablet + Desktop)
status: complete
work_type: enhancement
spec_waived: cross-cutting UI-hardening pass over existing pages; no new FR/SC — behavior unchanged, only layout adapts across breakpoints
blockedBy: []
blocks: []
created: 260713-0248
level: medium
---

# Responsive Website — Mobile / Tablet / Desktop

Make every page of the SAA site adapt cleanly to mobile (~375px), tablet (~768px), and
desktop (current 1440px design). Scope confirmed: **all pages**, **full Tailwind breakpoints**,
**self-designed** responsive behavior (no Figma reference).

## Key Reality (from audit)

The site is **already substantially mobile-first** — consistent `px-6 sm:px-10 lg:px-36`
gutters, `max-w-[Npx]` caps (not forced widths), and `flex-col → lg:flex-row` collapses are
already in place across Home, Kudos, Profile, Login, Awards, and Prelaunch. This is a
**targeted hardening pass**, not a rewrite. Three genuine breaks + a set of UX-tuning fixes.

## Breakpoint Convention (project standard — reuse existing)

Mobile-first base → `sm:` 640 → `md:` 768 (tablet) → `lg:` 1024 (desktop) → `xl:`/`2xl:` large.
Padding gutter idiom already in use: `px-6 sm:px-10 lg:px-36`. Multi-column collapse idiom:
`flex-col lg:flex-row`. Widths: prefer `w-full max-w-[Npx]` over bare `w-[Npx]`.

## Phases

| # | Phase | Priority | Status | Depends |
|---|-------|----------|--------|---------|
| 01 | [Foundation & shared primitives](phase-01-foundation-shared-primitives.md) | P0 | complete | — |
| 02 | [Home & shared layout tuning](phase-02-home-shared-layout.md) | P1 | complete | 01 |
| 03 | [Kudos board](phase-03-kudos-board.md) | P1 | complete | 01 |
| 04 | [Profile / Login / Awards / Prelaunch](phase-04-profile-login-awards-prelaunch.md) | P1 | complete | 01 |
| 05 | [Visual QA & verification](phase-05-visual-qa-verification.md) | P0 | complete | 02,03,04 |

Phase 01 is the blocker: it ships shared primitives (countdown-unit, header hamburger,
site-level overflow guard) that 02/03/04 depend on. Phases 02–04 are **independent of each
other** and can run in parallel. Phase 05 verifies the whole result at all three widths.

## Hard breaks fixed (must-do)

1. `countdown-unit.tsx` fixed `h-[82px] w-[51px]` → responsive (fixes prelaunch **and** home hero) — Phase 01
2. `site-header.tsx` nav `hidden md:flex` with no mobile fallback → hamburger drawer — Phase 01
3. `profile-header.tsx` 6-icon row overflow + `size-[200px]` avatar → wrap/shrink — Phase 04

## Out of Scope

- New features, content, or copy changes
- Desktop redesign (desktop layout stays as-is)
- Touch-swipe gestures on carousel (buttons already work) — optional, not required
- `app/home/page.tsx` (leftover 308-redirect to `/`, no UI)

## Success Criteria

- No horizontal scroll at 375 / 768 / 1440px on any page
- Primary navigation reachable on mobile (hamburger)
- All interactive overlays (menus, modals, drawers) stay within viewport
- No regression in existing vitest suite; typecheck + lint clean
