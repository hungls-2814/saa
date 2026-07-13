# Prelaunch Auto-Preview Flag: Environment Control and Tab-Scoped Intro

**Date**: 2026-07-10 09:31
**Severity**: Medium
**Component**: Environment configuration, client-side routing, preview gating
**Status**: Resolved

## What Happened

Shipped v0.4.4 with two interconnected changes: decoupled auto-preview from `VERCEL_ENV` (now explicit `PRELAUNCH_AUTO_PREVIEW=true`), and reworked the intro splash from server session-cookie to client-side `sessionStorage`. New `IntroGate` component gates the `/` route on first visit, firing a 10-second welcome then redirecting home — and replays on every fresh/reopened tab.

## The Brutal Truth

The architectural migration here was harder than it looked. Tab-scoped state forced a move from server (where cookies are shared and sticky) to client (where `sessionStorage` is per-tab and clears on close). That meant punching a hole through the server boundary in the root layout, reading httpOnly cookies server-side, and accepting a brief flash of `/` before the client redirect kicks in. The real sting was the redirect loop: after launch the countdown timer is already ended, firing an instant redirect that stepped on `IntroGate`. Hours spent chasing why reviewers were force-bounced on every fresh tab.

## Technical Details

**What broke in testing:**
- Preview-blind client gate: `IntroGate` couldn't read the httpOnly `preview` cookie, so reviewers got force-bounced through the splash on every fresh tab open.
- Redirect loop: ended countdown (>= launch time) competed with intro gate ownership. Server redirect fired before client redirect could run.

**How we fixed it:**
- Root layout now reads the preview cookie server-side and passes `previewActive` into `IntroGate` as a prop.
- Guard on the `ended` redirect: skip if `demoSeconds != null` (intro timer owns the transition).
- `sessionStorage` replaces the session-cookie, isolated per browser tab.

**Metrics:**
- 847 tests passing; 0 failures
- Typecheck + lint clean
- Happy path verified: fresh tab → splash (10s) → home; reopen tab → splash replays

## What We Tried

1. First pass: server session-cookie with `IntroGate` client gate — failed because reviewers could not be gated (cookie invisible to client JS).
2. Second pass: move everything to client `localStorage` — failed because tabs share `localStorage` and it survives tab close (defeats tab-scoped replay).
3. Final: hybrid — server reads the preview cookie and hydrates the client, client owns the intro gate via `sessionStorage` for tab isolation.

## Root Cause Analysis

**Why tab-scoped replay is impossible with cookies:** Cookies are shared across tabs in the same browser and survive tab close (they only expire on the clock). `sessionStorage` is the only tab-scoped store in the browser — it lives only in that tab's window and clears on tab close. Server-to-client transition was forced.

**Why the redirect loop happened:** The countdown logic was unguarded. After launch (when `ended=true`), the server's `ended` redirect fired on every navigation. `IntroGate` was trying to own the transition, but the server redirect stepped in first. Adding the `demoSeconds != null` guard let the client own the handoff cleanly.

## Lessons Learned

- **Tab-scoped state needs client ownership.** Server cookies are the wrong primitive for per-tab behavior. Reach for `sessionStorage` and accept the hydration cost (read server-side, pass as prop).
- **Guard state transitions carefully.** When two pieces of logic could fire on the same navigation (server redirect + client gate), explicit guards (`demoSeconds != null`) matter more than you think.
- **Preview cookies are invisible to client JS.** httpOnly is good for security; accept the design consequence and read server-side if client logic needs it.
- **Accept the brief flash.** The `/` → `/prelaunch` redirect happens client-side after hydration. A 1-frame flash is acceptable; trying to avoid it server-side costs more complexity than it saves.

## Next Steps

1. Monitor error logs in production for any redirect loop edge cases (clock skew, timezone issues on the countdown).
2. Add client-side metrics: how many users see the splash, how many skip through all 10 seconds, how many return within 24 hours.
3. Consider preloading the prelaunch page to eliminate the flash entirely (lower priority; ship as-is for now).

---

**Status**: DONE
**Summary**: Shipped auto-preview flag decoupling and tab-scoped intro splash. Resolved redirect loop and preview-gate visibility. Clean test suite, happy path verified.
