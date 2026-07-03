# Doc sync — F003 Awards System page

## Verified against shipped code before writing
- `app/he-thong-giai/{page.tsx,components/*,data/awards-detail-data.ts}` — hero, sidebar,
  detail sections, `use-active-section.ts`, `getUser()` → `redirect("/login")`.
- `proxy.ts:10` — `PROTECTED_PATHS = ["/he-thong-giai"]`.
- `app/(home)/components/site-header.tsx:24,31` — `active` prop (`NavKey`), `cls()` helper.
- `app/(home)/components/{award-card,hero-section,site-footer}.tsx` — all point to
  `/he-thong-giai(#slug)`.
- `eslint.config.mjs` — `globalIgnores` includes `.claude/**`, `plans/**`.

## Files updated
1. `docs/features/F003-awards-system/overview.md` — flipped 7 acceptance-criteria checkboxes
   to done; "Key files (planned)" → "Key files (shipped)" with actual paths (components list,
   `active="awards"` note).
2. `docs/system/permissions.md` — reconciled forward-draft
   (`plans/260703-1052-he-thong-giai/spec/system/permissions.md`) in: access tiers table,
   route guard matrix gained `/he-thong-giai` row, prose updated (was "no protected routes",
   now names `/he-thong-giai` as first protected route + defense-in-depth note). `/` stays public.
3. `docs/system/architecture.md` — request-flow diagram gained `/he-thong-giai` line +
   `PROTECTED_PATHS` note; directory tree gained `he-thong-giai/` block; `SiteHeader active`
   prop documented inline; new `## Lint` section for the `.claude/**`/`plans/**` eslint ignores.
4. `docs/development-roadmap.md` — Phase 2 header date bumped to 2026-07-03, F003 line item
   checked off with one-line description.
5. `docs/project-changelog.md` — new dated entry (2026-07-03) at top: Added/Changed/Notes,
   cross-references overview.md + permissions.md + architecture.md.

## Reviewed, no change needed
- Historical F001/F002 changelog entries left as-is (accurate snapshots of their own dates;
  not rewritten to reflect F003 state).
- No `doc_lock: user` frontmatter found on any touched file.

## Not touched (per constraints)
- `plans/**` (forward-draft only read, not edited), source code, evidence/.

**Status:** DONE
**Summary:** F003 docs reconciled across overview/permissions/architecture/roadmap/changelog; all claims verified against shipped code (page.tsx, proxy.ts, site-header.tsx, eslint.config.mjs).
**Concerns/Blockers:** none.
