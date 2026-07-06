# Plan — Align Language & Profile Dropdowns with Design

**Status:** Complete · **Discipline:** interactive · **Work type:** feature (UI re-alignment)

Refine two existing, already-functional header dropdowns to match their MoMorph
designs. Behavior/logic untouched — visual + label alignment only.

- Spec: `spec/header-dropdowns/spec.md`
- Clarifications: `clarifications.md`
- MoMorph: Dropdown-ngôn ngữ `hUyaaugye2`, Dropdown-profile `z4sCl3_Qtk` (file `9ypp4enmFmdK3YAFJLIu6C`)

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | i18n label fix (`Logout` / `Đăng xuất`) | done |
| 2 | Language selector → codes + gold highlight + inline GB flag | done |
| 3 | Account menu → row icons + gold highlight/glow + gold container | done |
| 4 | Temper (tests) + Inspect (review) | done |

## Files
- `messages/en.json`, `messages/vi.json` — `Home.header.signOut` label
- `app/components/language-selector.tsx` — rows, highlight, GB flag SVG, container
- `app/(home)/components/account-menu.tsx` — icons, highlight/glow, container
- Tests: `app/(home)/components/account-menu.test.tsx` (+ language-selector test if warranted)

## Design tokens (authoritative)
- Container: bg `#00070C`, border `1px solid #998C5F`, radius `8px`, padding `6px`
- Highlight: `rgba(255,234,158,0.2)` (lang selected) / `rgba(255,234,158,0.1)` (profile)
- Glow: `text-shadow:0 4px 4px rgba(0,0,0,.25),0 0 6px #FAE287`
- Row text: white, Montserrat 700, 16px/24px, tracking 0.15px

## Dependencies
- Track A (UI, phases 2–3) and Track B (i18n, phase 1) are parallel-runnable; phase 4 integrates.
