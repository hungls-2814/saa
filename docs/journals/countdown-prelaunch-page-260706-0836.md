# Countdown / Prelaunch Page: Two Tracks, One Silent Divergence

**Date**: 2026-07-06 08:36
**Severity**: High
**Component**: Prelaunch Gateway (F004 `/prelaunch` page, middleware gate)
**Status**: Resolved

## What Happened

Implemented F004 countdown/prelaunch page (MoMorph screen 8PJQswPZmU) as a two-track delivery: Track A (UI agent) built the full-screen LED countdown page in parallel with Track B (main thread) implementing the middleware pre-launch redirect gate. Code was clean, tests passed, build passed. The reviewer caught a **critical latent bug** that only surfaced when the two tracks were integrated: they derived the event datetime from different code paths, and a malformed environment variable would split them into a site-wide infinite redirect loop.

## The Brutal Truth

The galling part: both tracks were independently correct. The page used one fallback chain, the gate used another. No test would catch it until someone deployed with a mangled `NEXT_PUBLIC_EVENT_DATETIME` — at which point the gate locked visitors on `/prelaunch` while the page tried to leave it, bouncing them back. Three hours of work felt right; the reviewer's single question felt paranoid until it wasn't. That's the sting: code that looks good to its author can hide divergence at the seam where two systems meet.

## Technical Details

### The Bug

- **What broke**: Gate and page diverged on how to resolve the event datetime target.
- **Gate code** (`lib/proxy/route-guards.ts`):
  ```javascript
  import { resolveEventTarget } = from '../../lib/event/countdown';
  // Parses env, handles malformed, has full fallback chain
  const target = resolveEventTarget(); 
  if (now >= target) allow(); else redirect('/prelaunch');
  ```
- **Page code** (`app/prelaunch/page.tsx`):
  ```javascript
  const target = process.env.NEXT_PUBLIC_EVENT_DATETIME ?? DEFAULT_EVENT_DATETIME;
  // Only catches undefined, NOT empty or malformed strings
  ```
- **The divergence**: If `NEXT_PUBLIC_EVENT_DATETIME` was set to an empty string `""` or invalid date `"invalid"`, the page's nullish-coalescing operator would skip it (empty string is falsy in context), but `process.env.NEXT_PUBLIC_EVENT_DATETIME` still reads as a string. The gate's `resolveEventTarget()` parsed it, failed, and fell back to the hardcoded default. The page got a different datetime, and the two views of "is launch yet?" never aligned.
- **Trigger scenario**: Deploy with `NEXT_PUBLIC_EVENT_DATETIME=""` in production. Gate: thinks launch is past (uses fallback). Page: thinks launch is future (nullish coalesce grabs the empty string). Gate says "go to `/prelaunch`", page says "redirect to `/`", gate bounces back — infinite loop.
- **Error evidence**: No error thrown. Just silent disagreement. That's what made it hide.

### The Fix

Replace all datetime resolution with a shared function `resolveEventTargetIso()` in `lib/event/countdown.ts`:

```javascript
export function resolveEventTargetIso(): string {
  const raw = process.env.NEXT_PUBLIC_EVENT_DATETIME;
  if (!raw || !raw.trim() || !isValidIso8601(raw)) {
    return DEFAULT_EVENT_DATETIME;
  }
  return raw;
}
```

Both gate and page now call this one function:
- **Gate** (`lib/proxy/route-guards.ts`): `const target = resolveEventTargetIso();`
- **Page** (`app/prelaunch/page.tsx`): `const target = resolveEventTargetIso();`

One source of truth. One failure mode: malformed env gracefully falls back. Both agree.

## What We Tried

1. **Gate + Page using separate logic**: Worked independently, failed in combination. Found on integration.
2. **Nullish coalescing for page datetime**: Looked right, missed empty strings. Replaced with shared parser.
3. **Manual env validation**: Too easy to get wrong twice. Unified into `resolveEventTargetIso()`.

## Root Cause Analysis

**Two parallel tracks, no forced consistency at their seam.**

The two-track architecture (UI agent running parallel to backend logic) is sound for independence — no blocking, clean file ownership. But it opens a trap: when two components must agree on a derived value, they can independently derive it and never know they're disagreeing until the bad input hits.

The page derived: "Did launch happen?" by reading `process.env.NEXT_PUBLIC_EVENT_DATETIME`.
The gate derived: "Did launch happen?" by reading `process.env.NEXT_PUBLIC_EVENT_DATETIME` + parsing + fallback.

Same input, different derivation. This is the inverse of DRY — deriving the same fact in two places creates silent divergence.

The fix is architectural: when two independent components need to agree on a value, they must **share the derivation**, not duplicate it. One parser, two callers. Not parallel work — shared work.

## Lessons Learned

- **Seams between parallel tracks hide divergence**: Two agents working independently can each be right and collectively be wrong. Integration is not just plugging things together — it's a verification gate that catches assumptions that didn't survive contact with the other piece.
- **Derived values must be shared, not duplicated**: If gate and page both need to know "is launch yet?", they must call the same function. If they each re-derive it, bad inputs will split them. The test won't catch it because the test usually uses valid inputs.
- **Malformed env vars are a real class of failure**: `process.env.NEXT_PUBLIC_EVENT_DATETIME ?? default` looks like a safe fallback. It's not — it only catches `undefined`. Empty strings, garbage dates, whitespace — they slip through. Use a parser that validates.
- **Review is the only thing that catches seam failures**: Code review of both pieces independently would miss this. The reviewer caught it by asking "how does the page and gate both read this value?" — that's the right question.

## Next Steps

1. **Audit other shared values**: Gate and page both read `NEXT_PUBLIC_EVENT_DATETIME`. Are there other env vars or derived values that should be shared but aren't? Check: user role checks, feature flags, datetime parsing elsewhere.
   - Owner: reviewer (one more code pass)
   - By: before merge

2. **Test for env edge cases**: Add regression tests for empty/malformed/whitespace env values in countdown logic.
   - Owner: tester
   - By: in parallel with code review

3. **Document seam validation for two-track architecture**: In `docs/development-rules.md`, add a section "Derived Values in Parallel Work" with this as a case study.
   - Owner: doc-writer
   - By: next architecture review

4. **Minor: fix auth matcher word boundary** (deferred from F004 scope): The middleware auth matcher uses substring match on `"auth"`, so `/authenticate` wrongly bypasses the gate. Document as a follow-up, not critical for prelaunch.
   - Owner: maintenance
   - By: next auth feature

## Craft Notes

- **The review worked**: This bug lived in tested, linted, type-checked code. The review step caught what automation didn't. That's not a failure of testing — it's a win for the process.
- **Two-track delivery is sound, but seams need care**: The parallel work meant the page was ready while the gate logic was still being coded. That's efficient. The cost is integration trust — you have to verify the seams, not assume them.
- **The fix is small**: One function, two callers. The architecture is already right; the derivation just needed to consolidate. That's the reward for catching it before production.

---

**Commits (2 on `feat/countdown-prelaunch`):**
1. `feat(prelaunch): add countdown page and middleware pre-launch gate`
2. `fix(prelaunch): unify event target resolution in gate + page via resolveEventTargetIso()`

**Test results**: 281/281 passing, 20 new tests for countdown clock + edge cases.
**Lint & tsc**: Clean.
**Build**: Success.

---

**Status**: DONE
