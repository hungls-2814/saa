# Phase 01 — Dependencies & Config (Track B)

**Priority:** High · **Status:** done

## Steps
1. Install: `npm install @supabase/supabase-js@^2.110 @supabase/ssr@^0.12 next-intl@^4.13`
2. `next.config.ts` — wrap with `createNextIntlPlugin()` (default `./i18n/request.ts`). Keep existing config object.
3. Create `.env.local.example` with `NEXT_PUBLIC_SUPABASE_URL=` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (placeholders + comment). Do NOT commit real `.env.local`.
4. Add `.env*.local` to `.gitignore` (verify not already ignored).
5. `tsconfig.json` — confirm `@/*` path alias exists (research code uses `@/lib/...`, `@/app/...`); add if missing.

## Files
- create: `.env.local.example`
- modify: `next.config.ts`, `.gitignore`, `tsconfig.json` (if alias missing)

## Success
`npm install` clean; `npx tsc --noEmit` passes with new config.
