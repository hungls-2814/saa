# Phase 03 — Tests

## Goal
Temper the work with the existing Vitest + Testing Library setup (`vitest.config.ts`).

## Coverage
1. **`lib/event/countdown.ts`** (unit) — parse valid/invalid ISO; days/hours/minutes math;
   `ended` at and after target; boundary (exactly target); pre-event values.
2. **Countdown component** — renders 2-digit 0-padded values + labels; hides "Coming soon"
   when ended (map test IDs 12, 40, 41, 42, 43).
3. **SiteHeader** — auth vs anonymous (notification bell + account menu present only when
   `user` set); active nav styling on `About SAA 2025` (IDs 0,1,9,11,36,38).
4. **Award card / grid** — renders 6 cards; each links to `/awards-information#<slug>`
   (IDs 15,47–50).
5. **Footer** — logo + links + copyright present (ID 17).

## Success
- `npm run test` → 100% pass. Error/edge paths (invalid datetime) covered.
- No fake data or stubs to force green.

## Status
**COMPLETE**

## Results
- 176/176 tests passing.
- Full coverage: countdown util (parse, math, boundaries), Countdown component (2-digit formatting, ended state), SiteHeader (auth variants, active nav), award grid (6 cards, routing), footer.
- All error paths and edge cases validated.
