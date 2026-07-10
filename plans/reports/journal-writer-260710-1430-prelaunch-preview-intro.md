# Prelaunch Preview & Intro Splash: Gate Review Caught Three Criticals

**Date**: 2026-07-10 14:30  
**Severity**: High  
**Component**: Route guard (proxy.ts), prelaunch flow  
**Status**: Resolved

## What Happened

Shipped v0.4.3: prelaunch route guard gained two access paths — `?preview=1` for reviewer bypass and a first-visit intro splash (10s countdown post-launch). Full test suite passed (842 passing), end-to-end verified on production build. But the gate-review step before merge caught three critical issues, all resolved in the same PR cycle before landing.

## The Brutal Truth

This is what pre-landing review is for — and it worked. The naive implementation looked clean until someone asked "can reviewers see /prelaunch before launch?" and the answer was "no, they can't" and then "wait, they need to be able to." That unforced error would have shipped as a showstopper, because the review gate only opens when the event date hits. The i18n break was sloppy — hardcoded Vietnamese in the splash copy when we already have i18n plumbing. The redirect loop was the most teeth-gritting: a 10s client redirect colliding with server-side guards, classic "two parts of the system talking past each other."

## Technical Details

**Issue 1: No reviewer preview before launch**  
- PRE-FIX: `/prelaunch` was gated by event-date check; reviewers outside the window were locked out.
- FIX: Added `?preview=1` flag + httpOnly `saa_preview` cookie. Proxy gate honors the cookie. Auto-enabled in non-production (VERCEL_ENV check); manual opt-in works everywhere.
- TEST: Verified cookie set/cleared correctly; gate respects it even when event date has not arrived.

**Issue 2: Hardcoded copy breaks i18n**  
- PRE-FIX: `app/prelaunch/page.tsx` had Vietnamese text baked in: `"Giới thiệu"`, countdown label in Vietnamese only.
- FIX: Mapped to i18n keys in `messages/en.json` and `messages/vi.json`; used `next-intl` `useTranslations()` hook. English copy added.
- TEST: Verified both locales render correctly; no hardcoded strings remain in JSX.

**Issue 3: Client redirect + server gate cause loop**  
- PRE-FIX: First `/` hit routed to `/prelaunch?intro=1` client-side; 10s countdown then redirects to `/`. But server-side proxy re-checks and re-routes, causing bounce loop on reload.
- FIX: Server proxy strips `?intro=1` param **before** checking the gate. Session cookie `saa_intro_seen` set by the splash; proxy does NOT re-route if cookie is present.
- ROOT: Naive assumption that client-side redirect alone would satisfy both "show once per session" AND "respect the server guard." The two layers must be in sync via shared cookie state.

**Files changed:**
- `lib/prelaunch/cookies.ts` — new shared cookie key constants
- `proxy.ts` — guard logic for preview & intro flags; param stripping; cookie checks
- `app/prelaunch/page.tsx` — i18n switch; intro routing cleanup
- `app/prelaunch/components/prelaunch-countdown.tsx` — i18n switch
- `messages/en.json`, `messages/vi.json` — splash copy keys
- `proxy.test.ts` — three new test cases covering all three fixes

## What We Tried

1. **Preview bypass**: first draft locked reviewers out entirely. Added manual flag and cookie layer — worked.
2. **Intro splash copy**: looked for an existing i18n setup — found `next-intl` already in the project. Mapped keys and tested both locales.
3. **Redirect loop**: stepped through the flow manually (first visit → server routes to /prelaunch?intro=1 → client redirects to / after countdown → server re-checks → loops). Realized the guard and client redirect need shared state (cookie). Added server-side param stripping so guard does not re-trigger after the splash plays.

## Root Cause Analysis

Three root causes, all solvable with careful design:

1. **Preview access was an afterthought**: the guard was built for "launch date controls access" without considering "reviewers need to see the page before launch." Should have asked upfront: "who sees this before the event?"
2. **I18n was overlooked in sprint**: the splash was coded first, i18n second. Copy was hardcoded because the feature felt local to one language. Muscle memory — always reach for the i18n layer first.
3. **Server-client coordination was implicit**: the client redirect and server guard were designed independently. Both are necessary, but they must share state (cookie) or one sabotages the other. Lesson: when two layers control routing, make the handoff explicit.

## Lessons Learned

- **Pre-landing review is load-bearing.** Three issues that would have shipped and required hotfixes were caught before merge. The review gate caught them because it asked "why does this work?" instead of "does this pass tests?"
- **Unauthenticated bypasses need owner sign-off.** The `?preview=1` flag is an embargo bypass (reviewers can see /prelaunch before launch). The comment in the PR clarified this is accepted — the embargo relies on the route being unadvertised, not cryptographically sealed. Owner acknowledged and signed off.
- **Shared state between layers is a first-class design concern.** When client and server both control routing, make the cookie (or state) explicit in the contract. Don't assume one layer will "just not interfere" with the other.
- **i18n must be baked in from day one.** Hardcoding copy "for now" is paid back with rework. Cost of using `next-intl` is negligible; cost of retrofitting is annoying.

## Next Steps

- Monitor for any `/prelaunch` access patterns post-launch; verify intro splash fires exactly once per session (no cookie leakage).
- If reviewer bypass sees heavy use, log it to understand whether the embargo strategy is working.
- No follow-up work required; all criticals resolved.

---

**Status:** Resolved  
**Summary:** Prelaunch preview & intro splash shipped with three critical issues caught and fixed in gate review before merge. Guard now handles reviewer preview, intro splash is i18n-aware, and server-client redirect coordination is explicit via cookies.
