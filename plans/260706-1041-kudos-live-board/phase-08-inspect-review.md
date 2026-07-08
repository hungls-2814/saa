# Phase 08 — Inspect (reviewer)

## Context
- Spec: `spec/kudos-board/overview.md` · blockedBy: Phase 07
- Standards: `docs/system/architecture.md`, `.claude/rules/development-rules.md`

## Overview
- **Priority:** P2
- **Status:** done
- **Description:** Quality gate. Review the integrated, tested feature for correctness, security,
  standards, and simplicity before delivery.

**Result:** SEALED (0 critical). 2 findings identified during inspection, both fixed with regression tests:
- Highlight-carousel activeIndex clamp (edge case at carousel boundaries)
- Cursor strict-ISO timestamp validation (security hardening)

## Review checklist
- **Correctness:** all FR met; SC1–SC12 covered; empty/loading/edge states handled.
- **Security:** RLS reads gated; hearts own-row + self-like block; self-kudos CHECK; service-role
  key never bundled; page auth-gated (proxy + server); actions re-`getUser()`; **views
  `security_invoker` + revoked from anon** (verify anon REST GET blocked); cursor validated
  before `.or()` interpolation.
- **Architecture:** server/client boundary clean (queries/actions server-only); single client
  wrapper; keyset (not offset) pagination; `heart_count`/stats via views (no drift); userId
  threaded through read actions (`likedByMe`/star-tier correct on scroll+filter).
- **Standards:** files < 200 lines; kebab-case; YAGNI/KISS/DRY (no invented data, no dead compose/
  Secret-Box code); i18n complete (vi+en); no `NEXT_PUBLIC_` on the service-role key.
- **Gate — manual smoke done:** confirm the Phase-07 dev-Supabase pass ran (migrate + seed×2 +
  self-like + keyset load-more + anon-view-block) — SC8/SC12/SC4/SC1-anon are NOT provable by the
  mocked suite alone. No sign-off without it.
- **Accepted gaps logged:** no spec error-state (try/catch + toast only); confirm it is recorded,
  not silently absent.
- **Concerns log:** correctness/scope → fix before Deliver; observational/tech-debt → log for later.

## Todo
- [x] correctness pass (FR/SC coverage)
- [x] security pass (RLS, secrets, guards, anon-view boundary, cursor validation)
- [x] architecture + standards pass
- [x] identify findings → loop back to implementer for fixes
- [x] verify fixes + regression tests pass
- [ ] confirm Phase-07 manual dev-Supabase smoke pass (migrate + seed×2 + self-like + keyset + anon-view) before production — **deferred**

## Success criteria
- Review score recorded; no unresolved correctness/security concern; standards met.

## Next
Clean review → Phase 09 (Deliver).
