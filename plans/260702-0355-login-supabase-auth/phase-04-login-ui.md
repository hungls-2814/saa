# Phase 04 — Login Screen UI (Track A)

**Priority:** High · **Status:** done
**Screen:** https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/GzbNeVGJHz
**Clarifications:** `clarifications.md`

## Goal
Pixel-perfect presentational Login screen from Figma: header (logo + language trigger), hero + intro
(ROOT FURTHER, subtitle, tagline), yellow Google login button (loading/disabled/hover props), fixed footer.

## Out of scope (handled in integration, phase 06)
- Real Supabase auth wiring, next-intl translation keys, functional locale switching.

## Integration contract (props the UI must expose)
- Login button: `{ onClick, loading, disabled }`.
- Language selector: presentational trigger; swap for functional `LocaleSwitcher` in phase 06.
- User-facing strings structured for easy swap to `useTranslations('Login')`.
