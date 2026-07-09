# Phase 05 — Page composition / integration (INT)

## Context
- Template: `app/he-thong-giai/page.tsx` (auth guard + SiteHeader/SiteFooter + keyvisual band).
- Consumes: phase 01 (getKudosByUser, getMyProfileHeader), phase 03 (ProfileHeader), phase 04 (ProfileKudosSection), phase 02 (guard + i18n).
- Region B: `app/kudos/components/sidebar-stats.tsx` (SidebarStats) + `getPerUserStats`.
- Spec: `spec/profile-page/spec.md`.

## Overview
- Priority: P2 · Status: done ✅ · Depends on: 01, 02, 03, 04 (single merge point).
- `app/profile/page.tsx` server component composing regions A/B/C/D. < 200 lines.

## Requirements
1. `import { montserrat, montserratAlternates } from '@/app/(home)/fonts'`, SiteHeader, SiteFooter.
2. Auth: `const user = isSupabaseConfigured() ? (await (await createClient()).auth.getUser()).data.user : null; if (!user) redirect('/login');` (mirror he-thong-giai).
3. Fetch in parallel (`Promise.all`): `getMyProfileHeader(user.id)`, `getPerUserStats(user.id)`, `getKudosByUser({userId, direction:'sent'})`, `getKudosByUser({userId, direction:'received'})`.
4. Compose top→bottom: `<ProfileHeader {...header} />` (A) → `<SidebarStats stats={stats} onOpenSecretBox={...} />` (B) → `<ProfileKudosSection sent={sent} received={received} />` (C+D).
5. Region B `onOpenSecretBox`: SidebarStats callback is client-triggered but page is a server component → wrap region B usage so the stub is a no-op/coming-soon. If SidebarStats requires a client handler, render it inside a tiny client wrapper OR pass no handler (button becomes inert). Prefer: omit handler (button inert) — Secret Box deferred, KISS.
6. `export const metadata` title from a static string (server) — i18n page title optional.

## Related code files
- CREATE `app/profile/page.tsx`.
- CREATE `app/profile/page.test.tsx` (optional integration-level render).

## Data flow
```
proxy guard ─▶ page.tsx getUser ─▶ Promise.all(header, stats, sent, received)
   header ─▶ ProfileHeader (A)
   stats  ─▶ SidebarStats  (B)
   sent+received ─▶ ProfileKudosSection (C+D, client toggle)
```

## Todo
- [ ] auth guard + redirect
- [ ] parallel data fetch
- [ ] compose A/B/C/D with correct props
- [ ] Secret Box button inert (deferred)
- [ ] typecheck + lint clean

## Success criteria
- Authenticated → 200 renders all 4 regions with real data; unauthenticated → 302 /login.
- Toggle works end-to-end (client component receives both arrays).
- File < 200 lines; no `onToggleLike` reaches cards.

## Risk assessment
- **Med/High** — server/client boundary: SidebarStats is `"use client"` with an optional callback; passing a function from a server component is illegal. Mitigation: pass NO handler (button inert, Secret Box deferred) — verified simplest path.
- **Low/Med** — `getMyProfileHeader` + `getPerUserStats` double-hit `profile_kudos_stats`. Acceptable (2 light reads); optimize later only if measured (YAGNI).

## Rollback
Delete `app/profile/page.tsx`; route 404s; account-menu link dead again (pre-existing state). No data/schema impact.

## Next steps
Phase 06 verification.
