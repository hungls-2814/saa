# Login & OAuth Implementation: Next.js 16 Breaks Everything You Know

**Date**: 2026-07-02 05:27
**Severity**: High
**Component**: Authentication (F001 `/login` page, Google OAuth via Supabase)
**Status**: Resolved

## What Happened

Implemented F001 login page (MoMorph screen GzbNeVGJHz) with Google OAuth on Next.js 16.2.9 + React 19.2.4. Two-track delivery: UI agent coded the page from design in parallel with backend (auth flow, i18n without routing, session guards). Hit three genuine breaks in Next.js 16 that the training data doesn't warn about, caught one security regression locked into tests, and left one scaffold file untracked that breaks fresh clones.

## The Brutal Truth

The Next.js upgrade docs buried in `node_modules/dist` are inaccessible to the agent tooling on this repo. AGENTS.md *says* "read the docs," but the actual docs are locked behind defaults. Fell back to context7 + live web search — got the right answers, but it cost friction and second-guessing. And the security hole in the callback redirect was not a typo; it was inherited from research sample code *that asserts the vulnerable behavior* in tests. That's the kind of trap where good tests become a trap — and the review stage caught it, which worked, but a weaker review wouldn't have.

The feeling: relief that the critical was found, irritation that the sample pattern was never vetted, and a hard note that research code needs security review as a separate gate before it becomes canonical.

## Technical Details

### 1. Next.js 16 Middleware → Proxy (NOT Breaking, Just Gone)

- **What broke**: `middleware.ts` is deprecated in Next.js 16.
- **What we did**: Rewrote route guards in `proxy.ts` (Node.js runtime, single `proxy` export) to intercept requests before Next.js routing.
- **Why it matters**: Every article and tutorial on Next.js auth assumes `middleware.ts`. The Next.js team removed it without fanfare in favor of `proxy`, which is less documented. AGENTS.md flagged "not the next.js you know" — that was prophetic.
- **Evidence**: `/proxy.ts` handles session refresh + route guards; all auth checks run at the edge before SSR.

### 2. Cookies Are Now Async Only (Breaking)

- **What broke**: `cookies().get()` throws if called in synchronous context.
- **What we did**: Wrapped all cookie access in async functions; never call `cookies()` at the module level or in client components.
- **Why it matters**: Older Next.js had sync cookies. This one doesn't. Lesson: Supabase's auth helpers expect `getSession()` calls during layout/route handlers, not during component render.
- **Evidence**: `app/layout.tsx` calls `getSession()` server-side only; session data passed as props to the provider.

### 3. MoMorph Asset Pipeline Down (Runtime Discovery)

- **What broke**: `get_media_files` and `get_figma_image` returned 401/500/null.
- **What we did**: UI agent extracted assets directly from the rendered Figma frame screenshot, reproduced gradient overlays in Tailwind CSS.
- **Why it matters**: The design is pixel-faithful but uses cropped screenshots as substitutes for clean exports. It's correct but fragile — any design refresh needs a manual asset swap. Not a blocker, but a known future cost.
- **Evidence**: `app/login/page.tsx` has inline CSS gradients matching the design; no imported image assets.

### 4. Client-Side i18n Drag (Server-Only Imports Leak)

- **What broke**: A client component imported `i18n/request.ts`, which imported `next/headers` server-only.
- **Error text**: 
  ```
  Error: "next/headers" only works in a Server Component but was used in a Client Component
  ```
- **Root cause**: Tried to share i18n initialization config between server and client components in one file.
- **Fix**: Split into `i18n/config.ts` (shared constants, no server imports) and `i18n/request.ts` (server-only, session lookup). Client components import `config` only.
- **Why it matters**: i18n without URL routing (using cookies + Server Actions instead) is less documented. The default pattern in samples bundles everything, which doesn't work on this tech stack.
- **Evidence**: `app/i18n/` directory structure; client components import `config` only.

### 5. Open Redirect in OAuth Callback (Security Critical)

- **What broke**: The callback accepted a `?next=` query param and concatenated it directly into `redirect()`.
  ```javascript
  // VULNERABLE
  const next = searchParams.get('next') || '/dashboard';
  redirect(next);  // attacker: ?next=https://evil.com
  ```
- **Root cause**: Inherited verbatim from the researcher's sample code; tests *asserted* this behavior as correct.
- **Severity**: Critical — attackers could chain the Google OAuth flow to redirect users to phishing sites.
- **Fix**: 
  ```javascript
  function safeNext(raw: string | null): string {
    if (!raw) return '/dashboard';
    // Only allow relative same-origin paths
    if (raw.startsWith('/')) return raw;
    return '/dashboard';
  }
  ```
- **Why it stings**: The research phase produced code that was _tested_ as-is, without security review. The test suite locked in the vulnerability. Lesson: sample code from research needs a separate security gate before it becomes the source of truth. And tests can be wrong in subtle ways.
- **Evidence**: `app/login/callback/route.ts` now calls `safeNext()`; regression tests added for same-origin only + absolute URL rejection.

### 6. Unconfigured Supabase Doesn't Fail Closed (Risk, Not Critical)

- **What we did**: `isSupabaseConfigured()` checks for required env vars; if missing, the app renders but auth endpoints short-circuit to unauthenticated.
- **Why it matters**: A misconfigured deploy (missing NEXT_PUBLIC_SUPABASE_URL, etc.) won't 500 every request — it'll render the page with a login flow that fails gracefully. This is a deliberate choice: fail open with a clear signal, not fail closed and break the whole site.
- **Evidence**: `app/lib/auth/supabase.ts` exports `isSupabaseConfigured()`; proxy and callback routes check it and return early if false. Setup guide at `docs/setup/supabase-google-oauth.md` warns about this.

### 7. Build-Critical Scaffold Left Untracked (Process Failure)

- **What broke**: `app/globals.css` was not added to git during the commit that added `app/layout.tsx`.
- **Impact**: A fresh clone would fail `npm run build` with "globals.css not found."
- **Root cause**: git-manager followed a file ownership note that marked scaffold as "out of scope"; in reality, anything imported in layout.tsx is in-scope for tracking.
- **Discovery**: Post-commit status check caught it; fixed by staging and pushing `app/globals.css` separately.
- **Lesson**: "Out of scope" decisions about scaffold have to survive a fresh clone. Verify the build-critical path before closing.
- **Evidence**: `app/globals.css` now tracked; full build passes.

## What We Tried

1. **Reading Next.js 16 docs from node_modules**: Failed due to repo defaults blocking Read on node_modules. Escalated to context7 + web docs (user-approved).
2. **Syncing i18n client-side in one file**: Failed with the server-only import leak. Split into two files.
3. **Raw redirect() with query param**: Failed security review. Added `safeNext()` wrapper.
4. **Async/await on cookies in all contexts**: Worked; no further issues.
5. **Fetching MoMorph assets via API**: Failed (401/500). Cropped from screenshot, worked around in CSS.

## Root Cause Analysis

**Three roots, three lessons:**

1. **Documentation inaccessibility on Next.js 16**: The repo blocks Read/Bash on node_modules by default (via `.skignore`), so AGENTS.md's advice to "read node_modules/next/dist/docs" is unexecutable by the agent. Context7 + web works, but creates friction and hidden assumptions. **Lesson**: Either update AGENTS.md to link live docs, or adjust .skignore so critical version-specific docs are readable.

2. **i18n routing-free architecture is underspecified**: The pattern (cookie-based locale, no /en /vi segments, Server Actions for refresh) isn't well-covered in mainstream examples. The natural approach (bundle config with request) hits Node.js runtime boundaries. **Lesson**: Document the i18n pattern in `docs/` as a design decision with worked examples; include the config/request split in the style guide.

3. **Research code was not security-reviewed before locking into tests**: Sample code from the researcher asserted a vulnerable redirect behavior, which the test agent tested as-is. When code becomes tested, it becomes canonical — and wrong tests are hard to unwind. **Lesson**: Add a security review gate between research and the first test. For OAuth flows, that's non-negotiable.

4. **Scaffold "out of scope" decision didn't survive the build check**: Marking files as out-of-scope is efficient until it causes a fresh-clone break. **Lesson**: Any file imported in tracked files is in-scope by definition. Make that explicit in the ownership notes.

## Lessons Learned

- **Next.js 16 is a real upgrade**: `middleware.ts` gone, `cookies()` async, patterns shifted. AGENTS.md was right to flag it. Follow the warning and assume training data is stale; lean on live docs and don't be sheepish about escalating to web search.
- **i18n without routing requires architecture care**: Split server-only from shared constants early. Don't assume the default pattern works; test client/server boundaries in the first implementation.
- **Research sample code is not pre-vetted**: It's a starting point, not a canonical pattern. Security-sensitive paths (OAuth callbacks, redirects, auth headers) need explicit review before tests lock them in. A test that asserts a vulnerability is worse than no test — it becomes institutional knowledge that the thing is correct.
- **Async/await boundaries are not forgiving**: Next.js 16 enforces Node.js runtime boundaries strictly. Leaking server-only imports into client bundles fails at build time, not runtime. That's actually good — it caught the error early.
- **MoMorph asset pipeline requires manual fallback**: When the export API fails, the design is still faithful (screenshot crops + CSS), but it's a technical debt marker. Document the asset source and plan a refresh once the API recovers.
- **Fail-open with clear signals is better than fail-closed**: Unconfigured Supabase doesn't 500 the whole app; it renders the page with a known-broken auth flow. That's the right call for a development flow.

## Next Steps

1. **Documentation gap**: Add a "Next.js 16 Migration" guide to `docs/setup/` covering middleware.ts → proxy.ts, async cookies, and cookie-based i18n. Owner: doc-writer. By: when next major version surfaces.
2. **i18n pattern codification**: Write `docs/development/i18n-architecture.md` with the config/request split as the canonical pattern. Owner: doc-writer. By: next i18n feature.
3. **Security review gate**: For future OAuth/auth work, explicitly add a security review step between research and tests. This session's findings (open redirect + tests asserting it) should be a case study. Owner: reviewer + test-agent coordination. By: next auth feature.
4. **Asset refresh**: Once MoMorph API stabilizes, export clean assets and replace the CSS gradients. Link from `app/login/page.tsx` comment. Owner: designer + UI agent. By: next design refresh.
5. **Setup guide**: The Supabase/Google OAuth setup guide is in place (`docs/setup/supabase-google-oauth.md`); keep it up to date as env-var names change. Owner: doc-writer. By: each env-var rename.

## Craft Notes

- **The work was good**: UI agent nailed the pixel-faithful page from the design; backend logic is sound; tests are thorough (119 passing). The Critical hole got caught and fixed. The process worked, even when friction surfaced.
- **Process caught what code didn't**: The security regression lived in the code _and_ in the tests. Review caught it. That's the system working as designed — not flawless, but honest.
- **Trust the warnings**: AGENTS.md flagged Next.js 16 as non-standard. It was right. When the docs warn you, read that warning as gospel.

---

**Commits (7 total on `feat/login-supabase-auth`):**
1. `feat(auth): add proxy route guard with session refresh`
2. `feat(i18n): configure next-intl without routing, split config/request`
3. `feat(login): implement login page with Google OAuth callback`
4. `fix(auth): replace vulnerable open-redirect with safeNext guard`
5. `test(auth): add regression tests for same-origin redirect + absolute URL rejection`
6. `chore(build): track app/globals.css required by layout`
7. `docs: add Supabase + Google OAuth setup guide`

**Test results**: 119 passing, 0 failing.
**Lint & tsc**: Clean.
**Build**: Success.

---

**Status**: DONE
