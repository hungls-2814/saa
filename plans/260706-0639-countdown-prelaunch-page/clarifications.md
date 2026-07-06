# Clarifications — Countdown / Prelaunch page (F004)

Screen: Countdown - Prelaunch page — momorph 8PJQswPZmU (file 9ypp4enmFmdK3YAFJLIu6C)

## Session 2026-07-06
- Q: Before SAA launch time, which routes redirect to the countdown page? → A: All routes → `/prelaunch`, except `/auth/*` (OAuth callback) and static assets, until the countdown reaches 0.
- Q: Does the countdown/prelaunch page require authentication? → A: Public — no login required (guest and logged-in users both see it).
- Q: Where does the target datetime come from (spec said "from API" but left a TODO)? → A: Reuse existing env pattern `NEXT_PUBLIC_EVENT_DATETIME` + `DEFAULT_EVENT_DATETIME` (timezone Asia/Ho_Chi_Minh via ISO +07:00 offset). No new API/DB.
- Q: When the countdown reaches 0 (launch time), what does the page do? → A: Auto-redirect to `/` (homepage) and unlock all navigation.

## Resolved by codebase (scout, not asked)
- Q: Countdown compute logic? → A: Reuse `lib/event/countdown.ts` (`getCountdown`, `parseEventDate`, `DEFAULT_EVENT_DATETIME`).
- Q: LED countdown unit styling? → A: Reuse the existing `Countdown`/`CountdownUnit` visual from `app/(home)/components/countdown.tsx`.
- Q: i18n? → A: next-intl, messages/{en,vi}.json, default locale `vi`.
- Q: Route path? → A: `/prelaunch`.
- Q: Refresh cadence? → A: Reuse existing 60s tick (display granularity is minutes; per-second is invisible). Not spec-blocking.

## Unresolved / notes
- DAYS beyond 99: spec says 2-digit (00–99). `CountdownUnit` renders N digits without capping; acceptable (event window is <99 days). No cap added (YAGNI).
