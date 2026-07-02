---
name: project-saa-docs-structure
description: SAA project doc layout — feature specs under docs/features/{id}-{slug}/, system docs, changelog/roadmap conventions
metadata:
  type: project
---

The `saa` repo (fresh Next.js 16.2.9 + Supabase + next-intl project) uses this
doc layout, established at F001 (Login) on 2026-07-02:

- `docs/features/F{NNN}-{slug}/overview.md` — per-feature spec with frontmatter
  (`feature`, `name`, `lang`, `screen` (MoMorph ref), `status`). Includes Purpose,
  User-facing surface, Behavior, i18n, Out of scope, Acceptance criteria, Key files.
- `docs/system/architecture.md` — stack, auth architecture, request flow, directory
  shape, env/config. Single file, updated in place as architecture evolves.
- `docs/system/permissions.md` — access tiers + route guard matrix table.
- `docs/setup/{topic}.md` — one file per external-service setup guide (e.g.
  Supabase + Google OAuth).
- `docs/project-changelog.md` + `docs/development-roadmap.md` — created once,
  then appended to per `.claude/rules/documentation-management.md`. Roadmap kept
  under ~60 lines (phase-level, not task-level detail — link out to features/).

**Why:** these conventions were set by the user's explicit task instructions when
F001 shipped, not by pre-existing repo docs (repo had no docs/ dir before this).
Future features will likely follow the same F00N-slug pattern and require both
changelog + roadmap updates.

**How to apply:** when a new feature ships in this repo, mirror the F001
overview.md structure, append a dated entry to project-changelog.md, and flip the
relevant roadmap phase status rather than creating a new roadmap file.

See also [[momorph-doc-source]] if a future feature also originates from a MoMorph
screen spec — the feature overview should cite the screen ID the same way F001 did.
