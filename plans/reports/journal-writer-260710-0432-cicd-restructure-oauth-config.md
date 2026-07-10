# GitHub Actions Restructure: Decoupling CI from CD, OAuth Config Misdirection

**Date**: 2026-07-10 04:32
**Severity**: Medium
**Component**: CI/CD (GitHub Actions), Supabase OAuth configuration
**Status**: Resolved

## What Happened

Spent the session on two fronts: (1) diagnosing a post-login redirect bug where users bounced to `localhost:3000/?code=...` instead of landing on the dashboard, and (2) restructuring the GitHub Actions pipeline to decouple CI validation from production deployment.

OAuth investigation initially looked like a client-side auth bug — user lands on `/auth/callback`, exchanges the code, but gets redirected to the wrong URL. After tracing the flow: client correctly calls `window.location.origin` when redirecting post-exchange. The real culprit was the Supabase Dashboard: Site URL still pointed to `http://localhost:3000` and production `/auth/callback` was missing from the Redirect URLs allowlist. Supabase fell back to Site URL. **No code change was needed.**

CI/CD restructure split the monolithic `workflow_run` chain into two independent workflows:
- **CI**: Triggered on every PR, runs linting + typecheck + test + deploys a Vercel Preview (posts URL as PR comment).
- **CD**: Triggered on merge to main (`push: branches: [main]`), runs test again + deploys to production.

This kills the indirect coupling — main now gets validated exactly once, on the merged commit, not by a ghost-run after CI passes elsewhere.

## The Brutal Truth

The OAuth detour was maddening because the symptom pointed at the client. Forty minutes digging through auth logic before realizing Supabase config is a dashboard knob, not something the code controls. The real frustration: the test environments work fine because I had already whitelisted preview URLs, so local testing never caught the gap. Production config and local setup diverged silently.

The workflow restructure itself felt cleaner — the old `workflow_run` chaining was fragile, a chain of defaults that happened to work rather than a design choice. Pulling it apart and making main-merge the sole CD trigger feels like the right lever.

## Technical Details

**OAuth redirect flow:**
- Client: `POST /auth/callback?code=...` → calls `supabase.auth.exchangeCodeForSession()` → redirects to `window.location.origin` ✓
- Supabase config issue: Site URL = `http://localhost:3000`; Redirect URLs allowlist missing `https://saa.vercel.app/auth/callback`
- Fix: Updated Supabase Dashboard Site URL + allowlisted production callback URL + allowlisted preview URL for preview deploys

**CI/CD files changed:**
- `.github/workflows/ci.yml`: narrowed trigger to `pull_request` only; added `preview` job that needs `test`; removed `push: main`
- `.github/workflows/cd.yml`: changed trigger from `workflow_run` (depends on CI) to direct `push: branches: [main]`; added in-workflow `test` job; `deploy` now `needs: test`
- `docs/setup/vercel-deployment.md`: added Preview env-var setup + Supabase allowlist sections
- `package.json`: bumped version 0.4.1 → 0.4.2
- `docs/project-changelog.md`: logged the changes

**Test results:**
- 825 tests passed, 0 failed
- Lint: 0 errors
- Typecheck: clean

## What We Tried

1. Traced OAuth client code end-to-end — intercepted the code exchange, confirmed client-side logic correct
2. Stepped through Supabase auth session flow — no issues there
3. **Checked Supabase Dashboard configuration** — found the real culprit: Site URL + Redirect URLs mismatch

## Root Cause Analysis

**OAuth issue:** Configuration drift between environments. Local dev silently worked because the Supabase preview URL was already in the allowlist from earlier setup. Production hadn't been configured yet. Testing only against local meant the gap never surfaced. The fix was never "code" — it was dashboard configuration.

**CI/CD chaining weakness:** `workflow_run` is a default-based coupling — CI passes → CD fires automatically. No explicit dependency graph. This works until it doesn't: if CI gets slow or a job order changes, the entire chain becomes implicit and hard to reason about. The direct `push: branches: [main]` trigger is explicit and reviewable.

## Lessons Learned

1. **Configuration drifts between environments silently.** Production config and local setup were both "correct" in isolation but never compared. Next time: document environment-specific config (Site URL, allowlists, etc.) alongside the code, or use a tool to sync them.

2. **Indirect coupling through workflow events is fragile.** Naming a dependency explicitly (`push: branches: [main]`) is clearer than waiting for another workflow to finish. If a link needs to break, it breaks obviously rather than mysteriously.

3. **Test against production config locally when possible.** The OAuth issue would have surfaced in a local dry-run if we'd set Site URL to a production domain during testing. Configuration testing ≠ code testing.

## Next Steps

1. **Add a configuration checklist** to the Vercel deployment guide: Site URL, Redirect URLs for prod + preview, env vars. Make it explicit rather than implicit.
2. **Consider a pre-deploy validation step** that checks Supabase config against expected values — catch drift before it hits production.
3. Monitor the new CI/CD flow for a week to confirm the split doesn't introduce hidden race conditions or ordering issues.

---

**Artifacts:**
- `.github/workflows/ci.yml` (narrowed to PR, added preview job)
- `.github/workflows/cd.yml` (explicit main-branch trigger, added test gate)
- `docs/setup/vercel-deployment.md` (updated with Supabase preview setup)
- Supabase Dashboard config (Site URL + Redirect URLs updated)
