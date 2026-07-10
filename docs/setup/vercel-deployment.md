# Vercel Deployment (CI/CD)

Two GitHub Actions workflows split the pipeline:

- [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) — **CI**: `lint`, `typecheck`,
  `test` on every **pull request** targeting `main`, plus a gated **Preview** deploy — the
  `preview` job `needs: test`, so a Vercel preview is built only after the quality gates pass,
  then the preview URL is posted (and updated) as a PR comment.
- [`.github/workflows/cd.yml`](../../.github/workflows/cd.yml) — **CD**: runs on **push to
  `main`** (i.e. a PR merge). It runs the quality gates first, then deploys to Vercel
  **Production** — the `deploy` job `needs: test`, so a failing check never reaches production.
  Main is validated once, on the merged commit, right before deploy.

Flow:

```
PR → main:    CI (lint · typecheck · test)  →  (pass)  →  Vercel Preview  →  URL commented on PR
merge → main: CD (lint · typecheck · test)  →  (pass)  →  Vercel Production
```

## One-time setup

### 1. Create / link the Vercel project

```bash
npm i -g vercel
vercel link          # links this repo to a Vercel project (creates .vercel/ locally)
```

This writes `.vercel/project.json` with the **org ID** and **project ID** you need below.
(`.vercel/` is gitignored — that's fine, we only need the IDs for the secrets.)

### 2. Get the values

| Value                | Where to find it                                                        |
| -------------------- | ----------------------------------------------------------------------- |
| `VERCEL_TOKEN`       | Vercel → **Account Settings → Tokens** → *Create Token*                  |
| `VERCEL_ORG_ID`      | `.vercel/project.json` → `orgId` (or Vercel team settings)              |
| `VERCEL_PROJECT_ID`  | `.vercel/project.json` → `projectId` (or Vercel project settings)      |

### 3. Add them as GitHub repository secrets

**GitHub repo → Settings → Secrets and variables → Actions → New repository secret**, add:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### 4. Configure the app's environment variables in Vercel

The build reads env vars **from the Vercel project** (pulled by `vercel pull`), not from GitHub.
In **Vercel → Project → Settings → Environment Variables**, add these for **both** the
**Production** and **Preview** environments (the PR preview build pulls the `preview` env):

| Variable                        | Environment          | Notes                    |
| ------------------------------- | -------------------- | ------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Production + Preview | Supabase project URL     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | Supabase anon/public key |
| `NEXT_PUBLIC_EVENT_DATETIME`    | Production + Preview | Launch moment (ISO-8601) |

> Preview deployments get their own URL (e.g. `https://saa-git-<branch>-<team>.vercel.app`). Add
> that pattern to the Supabase Google OAuth **redirect URLs** allowlist too, or Google login on a
> preview will fall back to the Site URL (see `docs/setup/supabase-google-oauth.md`).

> `SUPABASE_SERVICE_ROLE_KEY` is **not** needed at runtime — it's only used by the local
> `npm run db:seed` tooling. Do not add it to Vercel unless you seed from CI.

Also add your Vercel deployment URLs to the Supabase Google OAuth **redirect / site URLs**
(see `docs/setup/supabase-google-oauth.md`).

## Notes

- The workflow uses the official Vercel CLI flow (`vercel pull` → `vercel build` →
  `vercel deploy --prebuilt`), so the exact Vercel build environment is reproduced in CI.
- The deployment URL is printed to the job log and the run summary.
- Prefer this GitHub Actions pipeline over Vercel's native Git integration to avoid
  double-deploys — if you connect the repo directly in Vercel too, disable its Git
  auto-deploys (Vercel → Project → Settings → Git) so only this workflow deploys.
