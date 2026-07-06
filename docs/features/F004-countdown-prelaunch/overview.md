---
feature: F004
name: Countdown / Prelaunch page
lang: en
screen: Countdown - Prelaunch page — momorph 8PJQswPZmU (file 9ypp4enmFmdK3YAFJLIu6C)
status: active
---

# F004 — Countdown / Prelaunch page

## Purpose
A public full-screen "coming soon" gate at `/prelaunch` showing a live countdown
(DAYS / HOURS / MINUTES) to the SAA 2025 launch moment. Before launch time the
system redirects **all** routes here; at launch (countdown = 0) it unlocks and
sends users to the homepage.

## User-facing surface (MoMorph 8PJQswPZmU)
- **Background (0.1):** full-viewport dark organic multicolour key-visual
  (`MM_MEDIA_BG Image` 2268:35129, 1512×1077), `cover` / `no-repeat`, with a
  dark overlay for text contrast. Static.
- **Title (0.2):** centred label "Sự kiện sẽ bắt đầu sau" (vi) / "Event starts
  in" (en), white, above the countdown blocks. i18n.
- **Countdown blocks (1–3):** three LED-style units — DAYS (00–99), HOURS
  (00–23), MINUTES (00–59) — each two zero-padded digit boxes with an uppercase
  white label underneath. Auto-updates as time decreases; all units show `00`
  at/after zero.

## Behaviour & logic
- **Datetime source:** `NEXT_PUBLIC_EVENT_DATETIME` (ISO-8601, +07:00) resolved via
  `resolveEventTarget()` / `resolveEventTargetIso()` (`lib/event/countdown.ts`), which fall
  through to `DEFAULT_EVENT_DATETIME` on any parse failure (missing or invalid) so the gate and
  the page always agree on the target. `isBeforeLaunch()` fails **open** (unlocks the app) if
  even the default is unresolvable, so a misconfigured deploy never permanently traps visitors.
- **Pre-launch redirect (middleware `proxy.ts`):** while `now < target`, every
  request except `/prelaunch` itself, `/auth/*`, and static assets → redirect to
  `/prelaunch`. Once `now >= target`, requests to `/prelaunch` → redirect to `/`
  and normal routing resumes.
- **On reaching zero (client):** the page detects `ended` and redirects to `/`.
- **Access:** public — no authentication required; guests and logged-in users
  alike see the page.
- **Formatting:** each unit two digits, leading zero (`05`, `09`, `00`); invalid
  / out-of-range values clamp to `00`.

## Reuse (DRY)
- `lib/event/countdown.ts` — `getCountdown`, `parseEventDate`, `DEFAULT_EVENT_DATETIME`, plus new
  `resolveEventTarget`, `resolveEventTargetIso`, `isBeforeLaunch` (added for this feature; shared
  by the middleware gate and this page).
- LED `CountdownUnit` + `useCountdownClock` (`app/components/countdown-unit.tsx`) — extracted
  from the homepage hero countdown for this feature so both share one implementation.
- next-intl messages (`Prelaunch.*` namespace, new keys).

## Out of scope
- No new API/DB endpoint for the datetime (env-var pattern reused).
- No per-second tick (display granularity is minutes).
- No responsive redesign beyond the existing key-visual scaling approach.

## Testcase coverage (momorph, 17 cases)
- ACCESSING: page is public; direct URL + nav both render; invalid URL handled by
  framework 404.
- GUI/Initialize: LED units + uppercase white labels; two-digit padding across
  0/9/10/max per unit.
- FUNCTION: real-time auto-update; DAYS `00` under 1 day; HOURS 00–23 &
  MINUTES 00–59 range clamp to `00`; all `00` on completion; two-digit enforcement.
