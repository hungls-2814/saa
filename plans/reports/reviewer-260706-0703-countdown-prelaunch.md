# Review: Countdown / Prelaunch (F004)

## Scope
- Files: `lib/event/countdown.ts`, `proxy.ts`, `proxy.test.ts`, `lib/event/countdown.test.ts`, `app/prelaunch/page.tsx`, `app/prelaunch/components/prelaunch-countdown.tsx` (+ test), `app/prelaunch/fonts.ts`, `app/components/countdown-unit.tsx` (+ test), `app/(home)/components/countdown.tsx`, `messages/{en,vi}.json`, `public/prelaunch/prelaunch-bg.png`
- Verified independently: `tsc --noEmit` clean, `eslint .` 0 errors/10 pre-existing unrelated warnings, `vitest run` 279/279 pass.

## Overall Assessment
Clean, well-documented implementation with genuinely good defensive design (`isBeforeLaunch` fail-open, redirect-gate-before-session-refresh for perf, SSR-safe null-until-mount clock). The `CountdownUnit`/`useCountdownClock` extraction is a clean DRY win with no behavior drift on the homepage. However there is one CRITICAL integration gap between the Track B gate (`proxy.ts`/`resolveEventTarget`) and the Track A page (`app/prelaunch/page.tsx`) that produces a genuine infinite redirect loop under a plausible misconfiguration — not covered by any existing test, confirmed by re-tracing the actual code paths below.

## Critical Issues

### 1. `app/prelaunch/page.tsx:48-50` diverges from `resolveEventTarget()` → infinite redirect loop on empty/invalid env var
```ts
targetIso={
  process.env.NEXT_PUBLIC_EVENT_DATETIME ?? DEFAULT_EVENT_DATETIME
}
```
This only falls back to `DEFAULT_EVENT_DATETIME` when the env var is `undefined`. `resolveEventTarget()` (used by `proxy.ts`'s gate) instead falls back whenever the value fails to *parse* — i.e. also on `""` (empty string) or a malformed string.

Concrete failure sequence when `NEXT_PUBLIC_EVENT_DATETIME=""` (or any garbage string — an easy ops/CI templating mistake):
1. `proxy.ts` → `isBeforeLaunch(new Date())` → `resolveEventTarget()`: `parseEventDate("")` is `null`, `??` falls back to `parseEventDate(DEFAULT_EVENT_DATETIME)` → valid future date → gate is **active** → any route redirects to `/prelaunch`.
2. `/prelaunch` renders. `page.tsx` computes `targetIso = process.env.NEXT_PUBLIC_EVENT_DATETIME ?? DEFAULT_EVENT_DATETIME` → `""` is not nullish, so `??` does **not** fall back → `targetIso = ""`.
3. `PrelaunchCountdown` → `parseEventDate("")` → `null` → `getCountdown(null, now)` → `null` → fallback `{ ended: true, ... }` (`prelaunch-countdown.tsx:26`).
4. `useEffect` fires on `ended === true` → `router.replace("/")` (`prelaunch-countdown.tsx:29-33`).
5. Client navigates to `/`; `proxy.ts` re-evaluates the gate — still active (same broken env var) → redirects back to `/prelaunch`.
6. Repeat forever — `ERR_TOO_MANY_REDIRECTS` for every visitor, site-wide.

This directly defeats the fail-open safety net `isBeforeLaunch`'s own doc comment promises ("a misconfigured deploy never traps every visitor"): the gate itself is safe, but the page it funnels everyone into is not, so the net effect is the opposite of the intent.

The tester's report explicitly flags the gap that let this through: "`app/prelaunch/page.tsx` server component not directly tested" — `PrelaunchCountdown`'s own tests pass `targetIso` directly as a prop and never exercise the `page.tsx` env-resolution line, and `proxy.test.ts` never renders the page it redirects to. Neither suite would have caught the divergence.

Note: the identical pattern already exists in `app/(home)/components/hero-section.tsx:35-36` — pre-existing (F002), but harmless there because an "ended" homepage countdown doesn't force-redirect. It becomes a redirect loop only because F004 added the `router.replace` + middleware-gate combination on top of the same unguarded env read.

**Fix:** export a single resolver that both consumers share, e.g. add `resolveEventTargetIso(): string | undefined` to `lib/event/countdown.ts` (`resolveEventTarget()?.toISOString()`, or return `NEXT_PUBLIC_EVENT_DATETIME`/`DEFAULT_EVENT_DATETIME` verbatim if you want to preserve the original offset), and use it in `page.tsx` instead of the raw `process.env... ?? DEFAULT` expression. Ideally also fix `hero-section.tsx` for consistency, though that one is out of this feature's diff.

## High Priority

None beyond the above.

## Medium Priority

### 2. `proxy.ts` config.matcher: `auth` alternative has no path-boundary — `.claude`-flagged looseness, not exploitable today
```
matcher: ["/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
```
`auth` is a bare substring match, not `auth/` or `auth(?:/|$)`. Today the only route starting with "auth" is `app/auth/callback`, so it's fine in practice, but if a future route like `/authors` or `/author-bio` is ever added, it would silently skip **both** the prelaunch gate and the existing auth/protected-route guards (middleware wouldn't run on it at all) — easy to miss since nothing errors. Cheap fix: `auth/` (or `auth(?:/|$)`) tightens this without behavior change today.

### 3. Doc-comment slightly overstates the fail-open guarantee
`isBeforeLaunch`'s comment ("An unresolvable target fails OPEN … so a misconfigured deploy never traps every visitor") is true for `isBeforeLaunch` in isolation, but as shown in Critical #1 the guarantee doesn't hold end-to-end because a sibling piece of code (`page.tsx`) doesn't share the same resolution logic. Once #1 is fixed via a shared resolver, this comment becomes accurate again — flagging so the fix and the doc-comment's promise are reconciled together.

## Minor / Nits

- `proxy.ts:24-34`: the `if (isBeforeLaunch) {...} else if (pathname === PRELAUNCH_PATH) {...}` correctly handles the exact-path case, but a trailing-slash visit to `/prelaunch/` (pathname `"/prelaunch/"`, distinct string) would not match `PRELAUNCH_PATH` and would bounce through one extra redirect back to `/prelaunch`. Not a loop (single hop), and no nested route exists under `/prelaunch` today, so low priority — just noting it's an exact-string comparison, not a normalized one.
- `resolveEventTarget()`'s "Returns `null` only when neither value parses" branch is currently unreachable in practice since `DEFAULT_EVENT_DATETIME` is a hardcoded valid literal — fine as defensive code, just noting it's effectively dead unless that constant itself is ever hand-edited into something invalid.

## Edge Cases Found
- Clock skew between client and server: if the client's local clock runs fast, `PrelaunchCountdown` could locally compute `ended: true` slightly before the server does, causing one redirect bounce (client → `/` → gate still active → back to `/prelaunch`) until real time catches up. Self-healing, not a loop, not worth fixing (YAGNI) — noting only because it looks superficially similar to Critical #1 but is bounded and resolves itself within a tick.
- `/auth/callback` and `public/prelaunch/prelaunch-bg.png` are both correctly excluded by `config.matcher` (extension match for the PNG, `auth` prefix for the callback) — verified no route currently defeats the looseness in Medium #2.
- Locale routing: confirmed via grep that this app has no path-prefixed i18n middleware (`next-intl` runs without `localePrefix`), so the exact-string `pathname === "/prelaunch"` check in `proxy.ts` isn't at risk of a `/vi/prelaunch`-style mismatch.

## Positive Observations
- `isBeforeLaunch`'s fail-open design and the "check gate before `updateSession`" ordering (skips the Supabase round-trip on the redirect hot path) are both good calls, and both are actually exercised by tests (`proxy.test.ts:189-194`).
- `useCountdownClock`'s null-until-mount pattern is correctly SSR-hydration-safe and is shared cleanly between the homepage and prelaunch countdowns with zero behavior drift on the homepage (verified `countdown.tsx` diff is a pure extraction).
- i18n: `Prelaunch.title` is independently and correctly translated in both `en.json`/`vi.json` (not a copy-paste duplicate — checked per this project's recurring i18n-copy-bug pattern from F002).
- Font setup (`app/prelaunch/fonts.ts`) follows the established per-route convention and the `--font-montserrat` variable is actually referenced in `page.tsx` — no dangling var (checked per this project's recurring F002 dangling-font-var pattern).

## Recommended Actions
1. **[Critical]** Fix `app/prelaunch/page.tsx` to derive `targetIso` from a shared resolver (`resolveEventTarget()` / new `resolveEventTargetIso()`) instead of the raw `process.env... ?? DEFAULT` expression, so the page's fallback semantics match the gate's. Add a regression test that renders the page (or the resolution helper) with `NEXT_PUBLIC_EVENT_DATETIME=""` and asserts it does NOT enter an ended/redirect state.
2. **[Medium]** Tighten `config.matcher`'s `auth` alternative to `auth/` or `auth(?:/|$)`.
3. **[Nit]** Optional: normalize trailing-slash on `/prelaunch/` comparisons, or leave as YAGNI given no nested route exists.

## Metrics
- Type Coverage: tsc clean (0 errors)
- Test Coverage: 279/279 passing; new-code paths mostly covered except the exact page.tsx env-resolution line (see Critical #1)
- Linting Issues: 0 errors, 10 pre-existing unrelated warnings

## Unresolved Questions
- None — Critical #1 is concrete and reproducible from the code as written; recommend fixing before merge.

**Status:** DONE_WITH_CONCERNS
**Summary:** Solid implementation and good defensive design overall, but `app/prelaunch/page.tsx` computes its countdown target independently of `resolveEventTarget()`, and an empty/invalid `NEXT_PUBLIC_EVENT_DATETIME` produces a genuine site-wide infinite redirect loop between the middleware gate and the prelaunch page's own redirect-on-ended logic. Fix before merge.
**Concerns/Blockers:** Critical #1 (redirect loop) should block merge until the target-resolution logic is unified between `proxy.ts` and `app/prelaunch/page.tsx`.
