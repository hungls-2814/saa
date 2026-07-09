# Phase 04 (Integration) — FAB wiring + i18n + Temper + Inspect

**Status:** ✓ COMPLETE (2026-07-09)

**Goal:** Wire the Rules modal into the FAB, localize, then test + review the whole feature.

Integrates: phase-01 (modal), phase-02/03 (badges).

## Files
- EDIT `app/(home)/components/home-compose-widget.tsx` — hold a second `rulesOpen` state; render
  `<SaaRulesModal isOpen={rulesOpen} onClose={...} onWriteKudos={() => { close rules; open compose }} />`.
- EDIT `app/(home)/components/widget-button.tsx` — the "Thể lệ" pill calls a new `onOpenRules` prop
  (currently just closes the menu); pass it from `HomeComposeWidget`.
- EDIT `messages/vi.json` + `messages/en.json` — add `Rules` namespace: modal title, section
  headings, tier ranges/blurbs (or keep static in component), button labels, badge alt text.
  vi primary, en mirror.

## Temper + Inspect
- `tester` — full `npx vitest run` + `npx tsc --noEmit` + `npx next lint`; verify SC1–SC7.
- `reviewer` — correctness/style/security pass on the whole feature diff.

## Success
SC1, SC2, SC6 (spec). FAB "Thể lệ" opens modal; "Viết KUDOS" opens compose; all strings resolve
vi+en; lint/type/tests green.
