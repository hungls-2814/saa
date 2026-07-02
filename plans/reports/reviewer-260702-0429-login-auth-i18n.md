# Review: Login + Supabase Google OAuth + VN/EN i18n

Scope: auth (`lib/supabase/*`, `proxy.ts`, `app/auth/callback/route.ts`, `lib/auth/sign-out.ts`), i18n
(`i18n/*`, `lib/i18n/set-locale.ts`, `messages/*.json`, `next.config.ts`), login UI
(`app/login/**`), protected route (`app/todo/**`). ~1634 LOC across 24 files (incl. tests).
117 tests passing, tsc/eslint clean (per task brief — not independently re-run here).

## Overall Assessment

Architecture follows Supabase's official Next-16 SSR pattern correctly: `getUser()` (never
`getSession()`) is used for every authorization decision, the no-code-between-createClient-and-
getUser() rule is honored in `updateSession`, `cookies()` is awaited everywhere, `proxy.ts`
replaces `middleware.ts` correctly, server/client boundaries are clean (`i18n/config.ts` split
from `i18n/request.ts` specifically to keep `next/headers` out of the client bundle — good). The
fail-closed `isSupabaseConfigured()` guard is safe. One critical finding: an open redirect in the
OAuth callback route, inherited verbatim from the research report and not caught by the (fairly
thorough) test suite because no test exercises an absolute-URL payload.

## Critical Issues

### 1. Open redirect via `next` param — `app/auth/callback/route.ts:12,18`

```ts
const next = searchParams.get("next") ?? "/todo";
...
return NextResponse.redirect(`${origin}${next}`);
```

`next` is attacker-controlled (it's a URL query param) and is concatenated into the redirect
target with no validation that it's a same-origin relative path. Nothing currently constructs a
`next` param in this codebase's own flow (`signInWithOAuth` doesn't set one, so first-party
traffic always defaults to `/todo`), which is why it survived — but the route itself is
unconditionally reachable by anyone who can get a victim to click a crafted link, since Supabase's
redirect-URL allowlist only validates the *callback* URL, not the `next` query value carried
through it.

**Failure scenario:** attacker sends `https://app.example.com/auth/callback?code=<valid-code-they-obtained-or-a-victim-completes-oauth-via-attacker-initiated-flow>&next=https://evil.com/phish` or, more practically, `.../auth/callback?next=//evil.com` (protocol-relative — `${origin}${next}` yields `https://app.example.com//evil.com` which most browsers/some proxies normalize to `//evil.com` → navigates off-origin) or `next=https://evil.com`. Since `origin` is just prepended as a string, an absolute URL in `next` completely overrides it: `${origin}https://evil.com` — wait, string concat means the literal becomes `https://app.example.comhttps://evil.com` which is not exploitable that way, but `next=//evil.com` (protocol-relative, no scheme) produces `${origin}//evil.com` = `https://app.example.com//evil.com`, which Chrome/most browsers treat as path `//evil.com` on the same origin — **not** exploitable via `Location` header the same way `NextResponse.redirect` would need an actual scheme change. Re-checking: the real exploitable case is when `next` itself is scheme-relative or the attacker controls the whole callback URL construction — since Next's `NextResponse.redirect` takes the final string as-is, an attacker who can make `next` produce a fully-qualified external URL (e.g., URL-encoding tricks, or if `next` is ever sourced from a value that itself contains a scheme after decoding) gets a post-login redirect to an attacker page. At minimum this is a **URL path injection** risk (e.g. `next=/\evil.com` or `next=/%2e%2e` style path traversal into unintended internal routes) and should not be trusted un-validated regardless of exact browser-normalization edge cases.

**Fix:** validate `next` is a same-origin relative path before use:
```ts
const rawNext = searchParams.get("next");
const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
  ? rawNext
  : "/todo";
```
Also worth an allowlist (`["/todo"]`) since nothing in the spec requires an arbitrary `next`
target at all — simplest fix per YAGNI is to drop the `next` param entirely and hardcode `/todo`,
since no caller in this codebase ever sets it.

**Test gap:** `route.test.ts` has a test "uses next parameter when provided" with `next=/dashboard`
but no test for `next=//evil.com`, `next=https://evil.com`, or `next=/\evil.com` — the vulnerable
behavior is actually asserted as correct ("uses next parameter when provided" passes for any
value). Add a negative test once fixed.

## High Priority

### 2. Proxy matcher lets `/auth/callback` through the auth-page rule but not obviously excluded from protected-route churn — `proxy.ts:34-38`

Not a bug today (matcher correctly excludes `_next/static`, `_next/image`, `favicon.ico`, and
image extensions; `/auth/callback` is not in `PROTECTED_PATHS`/`AUTH_PATHS` so it passes through
untouched), but flag for awareness: every request to `/auth/callback` still pays the cost of
`updateSession()` (a full `getUser()` round-trip to Supabase) even though the callback route
itself calls `exchangeCodeForSession` immediately after. Not a correctness issue, just a redundant
network round-trip on the hottest path of the login flow (adds latency to every login). Low-cost
optimization: exclude `/auth/callback` from proxy processing (add to matcher negative lookahead)
since the route handler manages its own session exchange and needs no pre-existing user check.

### 3. `isSupabaseConfigured()` duplicated client/server, correct but silent-fails without operator visibility — `lib/supabase/middleware.ts:15-17`, `app/login/components/login-hero.tsx:25-28`

Behavior is correct (fails closed: `user: null`, login button surfaces error toast instead of
crashing) — this satisfies the review focus item 4 exactly as designed. However, there is no
`console.warn`/log anywhere when the app is running unconfigured, so a misconfigured production
deploy (e.g., forgot to set env vars) silently makes login permanently fail with a generic "Login
failed" toast and zero operator signal in logs. Given this is meant to be a transitional guard
before real Supabase setup (per clarifications.md), consider a one-time server-side `console.warn`
in `updateSession` when `!isSupabaseConfigured()` so this doesn't get shipped-and-forgotten in prod
silently swallowing all logins.

## Medium Priority

### 4. `login-hero.tsx:26,37` — same literal error redirect duplicated instead of reusing the toast route contract

`window.location.href = "/login?error=auth_callback_failed"` appears twice (unconfigured guard
path and OAuth error path) and duplicates the exact string also used in
`app/auth/callback/route.ts:22`. Three independent literals for the same "auth failed" contract.
Minor DRY violation — a shared constant (e.g. `AUTH_ERROR_REDIRECT = "/login?error=auth_callback_failed"`
in `lib/supabase/config.ts` or similar) would prevent drift if the error code/copy ever changes.
Not a functional bug since all three call sites already agree.

### 5. `lib/supabase/config.ts:13-14` — configuration check via placeholder-string matching is fragile

```ts
!url.includes("your-project-ref") && key !== "your-anon-public-key"
```
This works today because it matches the exact placeholder in `.env.local.example`, but it's a
magic-string coupling between two files that isn't enforced by types or a shared constant. If
someone edits the example file's placeholder text without updating this check (or vice versa),
the guard silently stops working — e.g., if a real Supabase project ref ever legitimately
contained the substring `your-project-ref` (impossible in practice, but the point stands: this
is string-matching masquerading as validation). Low risk given real Supabase URLs are
`https://<20-char-ref>.supabase.co` and won't collide, but worth a comment noting the coupling to
`.env.local.example`, or centralizing the placeholder string as a shared constant.

### 6. `next` param default duplicated between researcher's Next.js official pattern and no allowlist — see Critical #1

Not re-listing, just noting the fix for #1 doubles as cleanup for this file being under 200 lines
either way (23 lines, no size concern).

## Low Priority

### 7. `login-toast.tsx:23` — `router.replace("/login")` clears query params app-wide, assumes only `error` param is ever present

If a future change adds another query param intended to survive the toast (e.g., a `next` deep-
link param), this unconditionally strips all search params, not just `error`. Fine for current
scope (only `error` is ever set), flagging for forward-compatibility awareness only.

### 8. `google-login-button.tsx:28` — stale TODO comment

```ts
// TODO(i18n): replace with next-intl translation key, e.g. t("login.cta")
```
This TODO is already done — `login-hero.tsx:84` passes `label={t("cta")}` from next-intl. The
default fallback value `"LOGIN With Google"` on the prop is intentionally the Vietnamese-design
literal fallback for the presentational component used outside the page (tests import it
standalone), which is reasonable, but the comment above it is now misleading/stale and should be
removed or reworded to "default fallback for standalone/test usage — page always passes t('cta')".

### 9. `language-selector.tsx` — non-vi/en locales silently render a globe icon with no visible failure mode

Defensive code (`LocaleFlag` else-branch) for locales outside `SUPPORTED_LOCALES`, which is
unreachable given `SUPPORTED_LOCALES = ["vi","en"]` is the only iteration source
(`SUPPORTED_LOCALES.map(...)`). Dead defensive branch — harmless, arguably good defensive
practice against future locale additions, not flagging as a real issue.

## Edge Cases Found

- **Race on `router.refresh()` after `setLocale`** (`language-selector.tsx:30-33`): if a user
  double-clicks between VI and EN rapidly, two `startTransition` calls could interleave — the
  Server Action writes the cookie, but there's no guard against an out-of-order `router.refresh()`
  landing after a newer choice. Low impact (worst case: UI briefly shows the wrong-but-recoverable
  language, self-heals on next interaction/refresh) — not worth fixing for a 2-locale toggle.
- **`getAll`/`setAll` cookie contract in `middleware.ts`** — correctly follows the "getAll/setAll
  only" rule from the research report (no deprecated `get`/`set`/`remove`). Verified.
- **Proxy `NextResponse.next({ request })` cookie propagation**: correctly re-created after each
  `setAll` call (`supabaseResponse = NextResponse.next({ request })` inside the loop-adjacent
  callback) per Supabase's documented pattern — verified against `lib/supabase/middleware.ts:27-34`,
  matches the (unusual but required) "recreate response after mutating request cookies" idiom
  exactly.
- **`app/todo/page.tsx` defense-in-depth `getUser()` re-check**: correct and intentional per its
  own comment — proxy already guards `/todo`, but the direct `getUser()` call here is not
  redundant-as-a-bug, it's the documented belt-and-suspenders pattern from the research report.
  No issue.
- **Callback route never validates `code` shape** beyond truthiness (`if (code)`) — delegates
  fully to Supabase's `exchangeCodeForSession`, which is correct (Supabase validates the code
  against its own PKCE state); no injection surface since `code` is passed as an opaque string to
  the SDK, not interpolated into a query/URL by this app.
- **i18n cookie has no `httpOnly`/`secure` flags set** (`lib/i18n/set-locale.ts:18-22`) — this is
  an intentional, documented tradeoff per the research report (client-side optimistic UI access),
  not a security-sensitive cookie (locale preference only, not an auth token), so acceptable.
  Flagging only because CLAUDE.md focus area asked about cookie attributes — confirmed sane for
  its purpose (non-sensitive data).

## Positive Observations

- `getUser()` used exclusively for authz everywhere (`middleware.ts:45`, `todo/page.tsx:14`) —
  `getSession()` never appears in any source file. Correctly matches the Next-16/Supabase security
  requirement called out in the task brief.
- No-code-between-createClient-and-getUser rule explicitly honored and commented
  (`middleware.ts:40-42`).
- `cookies()` awaited in all four call sites (`server.ts:10`, `i18n/request.ts:16`,
  `set-locale.ts:17`, implicitly via server client in route handler) — no sync-cookie Next-15-era
  bugs.
- `proxy.ts` correctly named/shaped for Next 16 (not `middleware.ts`), matcher excludes static
  assets without excluding protected routes.
- Clean client/server boundary split: `i18n/config.ts` (client-safe constants) vs
  `i18n/request.ts` (server-only, imports `next/headers`) — explicitly commented rationale,
  exactly the right pattern to avoid leaking server-only code into client bundles.
- `isSupabaseConfigured()` fail-closed guard is correctly wired into both the middleware (denies
  access) and the login button (surfaces error instead of dead OAuth call) — no accidental
  fail-open path found.
- All files under 200-line limit (largest is `login-toast.test.tsx` at 344 lines, but that's a
  test file; largest source file is `language-selector.tsx` at 129 lines).
- Good test coverage on the trickiest logic: `middleware.test.ts`, `config.test.ts`,
  `set-locale.test.ts`, `route.test.ts` all present and reasonably thorough on happy/failure paths.
- VN default locale, fallback-to-vi-on-invalid-cookie logic in `i18n/request.ts:19-21` is correct
  and matches clarifications.md decision.

## Recommended Actions

1. **[Critical]** Fix open redirect in `app/auth/callback/route.ts` — validate `next` is a
   relative, same-origin path (reject anything starting with `//`, containing `://`, or not
   starting with `/`), or simplest per YAGNI: drop the `next` param entirely since nothing in this
   codebase sets it to anything but the default.
2. **[High]** Consider excluding `/auth/callback` from the proxy matcher to avoid a redundant
   `getUser()` round-trip on every OAuth callback.
3. **[High]** Add a `console.warn` (server-side, one-time or per-request) when
   `isSupabaseConfigured()` is false, so a misconfigured prod deploy doesn't silently and
   permanently fail logins with no operator signal.
4. **[Medium]** Extract the `"/login?error=auth_callback_failed"` literal to a shared constant to
   prevent drift across its three call sites.
5. **[Low]** Remove/update the stale TODO comment in `google-login-button.tsx:28`.

## Metrics
- Type Coverage: not independently re-run (task states tsc clean)
- Test Coverage: 117 tests passing per task brief; qualitatively strong on the files reviewed
  (route handler, middleware, config, set-locale, toast, button all have dedicated `.test.ts(x)`
  files); no test file found for `app/login/components/login-hero.tsx` or `language-selector.tsx`
  (both client components with non-trivial logic — OAuth trigger and locale-switch flow — worth
  adding)
- Linting Issues: not independently re-run (task states eslint clean)

## Unresolved Questions
- Should the `next` param be removed entirely (YAGNI — nothing sets it today) or kept with
  validation (future-proofing for deep-linking after login)? Recommend removal per YAGNI unless
  deep-linking is on the near-term roadmap.
- Is `/auth/callback` expected to ever need proxy-level auth gating (e.g., rate limiting)? If not,
  safe to exclude from the matcher for the latency win in finding #2.

**Status:** DONE
**Verdict:** changes-required — 1 Critical (open redirect in OAuth callback `next` param), 0 other Critical, 2 High (redundant proxy round-trip on callback path; silent-fail misconfiguration has no operator visibility).
