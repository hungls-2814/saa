# Docs Canonical Mapping (kit-internal reference)

Single source of truth for which skill owns which doc topic. Loaded by `rebuild-spec`, `takumi`, `manage-docs`, and `doc-writer`. Update this file FIRST when changing layered-doc behavior — drift here counts as a breaking change (major version bump for every consumer).

## Layered Model

`docs/` has 5 namespaces: `system/` (curated narratives), `flows/` (AI-drafted cross-feature journeys; user owns post-generation), `features/{slug}/` (4 audience-aware files per feature), `generated/` (raw inventories, free regen), `decisions/` (human-only ADRs). `manage-docs` owns top-level narrative files (`project-roadmap.md`, `code-standards.md`, etc.).

Both machine-generated and human-maintained layers coexist. They MUST NOT contain duplicate authoritative content for the same topic. When two skills both have a claim, the canonical home below wins.

## Canonical Mapping

| Topic | Canonical path | Owner skill | Notes |
|---|---|---|---|
| System overview (narrative) | `docs/system/overview.md` | rebuild-spec | Full content; no stub |
| Architecture diagrams | `docs/system/architecture.md` | rebuild-spec | Mermaid + tech stack |
| Glossary | `docs/system/glossary.md` | rebuild-spec | Term:definition |
| Permissions (curated) | `docs/system/permissions.md` | rebuild-spec | Plain-lang curated view |
| Business rules (curated) | `docs/system/business-rules.md` | rebuild-spec | Plain-lang BR draft |
| Flows (cross-feature) | `docs/flows/{slug}.md` | rebuild-spec | AI draft; user may rename |
| Feature tech-spec | `docs/features/{slug}/technical-spec.md` | rebuild-spec | Per feature |
| Feature business-context | `docs/features/{slug}/business-context.md` | rebuild-spec | Per feature |
| Feature screens | `docs/features/{slug}/screens.md` | rebuild-spec | Per feature |
| Feature edge-cases | `docs/features/{slug}/edge-cases.md` | rebuild-spec | Per feature |
| Route inventory (raw) | `docs/generated/route-list.md` | rebuild-spec | Free regen |
| API map | `docs/generated/api-map.md` | rebuild-spec | Routes + bg-jobs |
| API contracts | `docs/generated/api-contracts.md` | rebuild-spec | REST/GraphQL/gRPC request-response contracts (opt-in `--api-contracts`) |
| Permissions matrix (raw) | `docs/generated/permissions-matrix.md` | rebuild-spec | PERM### codes |
| Entities | `docs/generated/entities.md` | rebuild-spec | Renamed data-model |
| User stories | `docs/generated/user-stories.md` | rebuild-spec | US### codes |
| Feature catalog | `docs/generated/feature-list.md` | rebuild-spec | F### inventory |
| ADRs | `docs/decisions/ADR-*.md` | human only | Never regenerated |
| Roadmap | `docs/project-roadmap.md` | manage-docs | Unchanged |
| Code standards | `docs/code-standards.md` | manage-docs | Unchanged |
| Deployment | `docs/deployment-guide.md` | manage-docs | Unchanged |
| System architecture (manage-docs) | `docs/system-architecture.md` | manage-docs | Coexists with `docs/system/architecture.md` — different scope |
| Feature spec DRAFT (pre-promote) | `plans/<plan_dir>/spec/<slug>/*` | takumi | Plan-local; NEVER in docs/ until promote. No `F###`. |
| Feature spec (promoted) | `docs/features/{slug}/*` | rebuild-spec | `status: implemented`; written by takumi promote at implement-start, then rebuild-spec owns. |
| Screen spec DRAFT (pre-promote) | `plans/<plan_dir>/spec/<slug>/screens/*` | takumi | Plan-local; `SCR###` allocated at promote. |
| Screen spec (promoted) | `docs/screens/{SCR###_Name}/spec.md` | rebuild-spec | Written by promote; rebuild-spec `--screen-specs` may regen if sha absent. |
| System-doc DRAFT (pre-promote) | `plans/<plan_dir>/spec/system/<name>.md` | takumi | Plan-local forward-draft (architecture/permissions); opt-in when a task touches architecture/auth. NO `F###`. |

(27 rows)

**Forward-authored system docs (Capability A):** `docs/system/architecture.md` and
`docs/system/permissions.md` are forward-authorable by `takumi` — drafted in the plan dir (single file,
`status: draft`), promoted at implement-start (single-file § Promote — SYSTEM-DOC: no `F###`, no
feature-list row), then RECONCILED to as-built by the rebuild-spec Core pass. Forward drafts write ONLY
`docs/system/*`, NEVER `docs/generated/*` (code-derived). Rationale → `docs/decisions/ADR-*` (human-owned).

**Draft authoring note:** `takumi` authors drafts ONLY to `plans/<plan_dir>/spec/<slug>/` (+
`plans/<plan_dir>/spec/system/` for system docs) — never to
`docs/features/` or `docs/screens/`. `docs/features/` and `docs/screens/` contain ONLY promoted,
`status: implemented` content owned by `rebuild-spec`. At implement-start, takumi's promote step copies
the plan-dir draft into `docs/` and flips `status: implemented` (see
`claude/skills/rebuild-spec/references/spec-state-registration.md` § Promote). There is no longer an
in-place `draft → implemented` flip or a `docs/.spec-reconcile-pending.json` sentinel — replaced by
`docs/.spec-promote-pending.json`.
See `claude/skills/rebuild-spec/references/spec-authoring-contract.md` for authoring rules.

**Disambiguation:** `docs/system/architecture.md` (rebuild-spec: generated diagrams + tech stack) and `docs/system-architecture.md` (manage-docs: narrative architecture doc) are SEPARATE files with different scopes. They coexist intentionally.

## Output Language — Translation Mirrors (v5.1.0)

`docs/<lang>/` directories are 1:1 prose-translated mirrors of the primary language's docs, owned exclusively by `rebuild-spec --lang`. The English skeleton (headings, code tokens, field labels, table headers, fenced code, frontmatter) is byte-identical across ALL languages.

| Aspect | Value |
|--------|-------|
| Primary docs | `docs/` (if `primary_lang=en`) or `docs/<primary_lang>/` |
| Mirror docs | `docs/<lang>/` (one per secondary language) |
| State | `docs/.rebuild-state.json` (root, language-independent) — `primary_lang` + `translations` map |
| Validator | `validate_translation_skeleton.py` enforces skeleton identity |
| Owner | `rebuild-spec` only — manage-docs/doc-writer/takumi remain English `docs/`-root (not lang-aware) |
| Auto-sync | After any primary pass promotes, mirrors re-translated for changed artifacts (env opt-out: `REBUILD_AUTO_SYNC_TRANSLATIONS=0`) |

Consumers that read `docs/` paths (e.g. `docs/generated/feature-list.md`) are unaffected — the primary's canonical paths are unchanged. Mirror paths (`docs/<lang>/`) are only consumed by the `--lang` translate pass.

## Stub Rule

None — v4.0.0+ promotes full content for all artifacts. The pre-v4 `docs/specs/system-overview.md` redirect stub is removed. `docs/system/overview.md` carries full content.

## Surgical-Edit Rule

When `doc-writer` is invoked via `tkm:takumi` Step 6 (NOT via `rebuild-spec` Wave 9):

| Path | doc-writer surgical-edit? | Notes |
|---|---|---|
| `docs/generated/*` | YES | Raw inventories |
| `docs/system/*` | YES (guardrailed prose) | Curated narratives — forward-authored (Cap. A), reconciled by Core pass |
| `docs/features/*/technical-spec.md` | YES | BR/SM/ALG/INT table edits |
| `docs/features/*/business-context.md` | YES (guardrailed prose) | Patch-within-section; preserve codes+headings |
| `docs/features/*/screens.md` | YES | `## Screen List` table + `## User Journey` |
| `docs/features/*/edge-cases.md` | YES | Edge case table rows |
| `docs/screens/*/spec.md` | YES (guardrailed prose) | Patch-within-section; UI-layer codes preserved |
| `docs/flows/*` | YES (guardrailed prose) | User owns — SKIP if `doc_lock: user`; else patch-within-section |
| `docs/decisions/*` | NEVER | Human only |

MAY (inventory/table paths): add/remove/edit rows in inventory tables; update counts; copy adjacent-row schema when inserting.
MAY (guardrailed prose paths): patch prose WITHIN an existing section; keep every heading and all 12 code families (FR/BR/SM/ALG/INT/SC/F/US/SCR/REG/BL/PERM) verbatim.
MUST NOT: rewrite section headings, change document structure, edit schema codes, or touch NEVER paths above.
MUST NOT: full-rewrite a prose file; create new per-feature/per-screen dirs; edit a file whose frontmatter has `doc_lock: user`. If new F### detected → advise `Run /tkm:rebuild-spec --features F###`.

Wave 9 promotion (full-content writes) bypasses this rule.

### User-lock marker

A prose file MAY opt out of all auto-editing with frontmatter key `doc_lock: user` (distinct from
`authored_by:` provenance — a `rebuild-spec`/`takumi`-authored file can still be user-locked without
lying about who drafted it). `doc-writer` MUST skip any file carrying `doc_lock: user` and append a
1-line advisory: `ℹ <path> is doc_lock: user — left untouched.` `docs/flows/*` is the canonical
user-owned layer where this matters most.

## Escalation Heuristic

If a single artifact has **more than 3 changed source files** affecting it in one takumi session, `doc-writer` SKIPS the edit and appends a non-blocking advisory to its output:

```
Run /tkm:rebuild-spec --artifact api-map
```

User decides whether to regenerate. Edits to other artifacts in the same session proceed normally.

## Absent-Layer Advisory

When the doc layer that `doc-writer` would surgically edit is **missing** AND the session changed `≥ 2` feature-surface files, `tkm:takumi` Step 6.a and `tkm:manage-docs update` Phase 2.a emit a 2-line `ℹ` advisory on **stderr only**. Two mutually-exclusive layers:

| Condition | Advisory points to |
|---|---|
| `! -d docs` AND `TRIGGER_HITS ≥ 2` | `/tkm:manage-docs init` |
| `-d docs` AND no `docs/system/`, `docs/features/`, or `docs/generated/` AND `TRIGGER_HITS ≥ 2` | `/tkm:rebuild-spec` |
| `docs/system/`, `docs/features/`, or `docs/generated/` present | *(no advisory — surgical edit proceeds)* |

**Contract:**

- Stderr only (`1>&2`); does NOT mutate the `doc-writer` prompt; does NOT block flow (fires in `--auto` mode too).
- Mutually exclusive by control flow (`if … elif …`) — `docs/` absent suppresses the specs advisory because subdirs cannot exist without the parent.
- `TRIGGER_HITS` counts session-changed files matching the trigger-pattern set **after** stripping test/mock/fixture paths (`tests/`, `__tests__/`, `mocks/`, `fixtures/`, `*.test.*`, `*.spec.*`). Pure-test sessions stay silent.
- Trigger patterns are an inline mirror of `subagent-patterns.md` → `## Documentation` → Trigger Mapping. Update both when adding patterns.

**Version policy:** adding/removing/relaxing this advisory is **patch** (additive console output, no contract change). The surgical-edit contract above and the canonical mapping table remain the breaking-change surface.

## Version Policy

This file is the contract. Any change to the mapping table, stub rule, surgical-edit rule, or escalation heuristic is **breaking** and bumps the major version of every consumer.

PR `2026-05-11` bumps:

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 2.9.1 | 3.0.0 |
| `takumi` | 2.1.1 | 3.0.0 |
| `manage-docs` | 1.0.0 | 2.0.0 |
| `doc-writer` (agent) | n/a (unversioned) | tagged "v3.0.0+" section |

PR `2026-05-26` bumps:

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 3.0.0 | 4.0.0 |
| `takumi` | — | pending consumer update |
| `manage-docs` | — | pending consumer update |
| `doc-writer` (agent) | — | pending consumer update |

NOTE: takumi, manage-docs, and doc-writer version bumps deferred to follow-up PRs. Only rebuild-spec is bumped in this revision.

PR `2026-06-11` bumps (draft-authoring contract addition — mapping table change = major bump for all consumers):

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 5.3.3 | 6.0.0 |
| `takumi` | pending | pending consumer update |
| `manage-docs` | pending | pending consumer update |
| `doc-writer` (agent) | pending | pending consumer update |

PR `2026-06-15` bumps (plan-dir draft + promote-at-implement model — breaking contract change for all
consumers; removes in-place flip & reconcile sentinel):

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 6.0.0 | 7.0.0 |
| `takumi` | 3.1.0 | 4.0.0 |
| `manage-docs` | 2.0.1 | 3.0.0 |
| `doc-writer` (agent) | tagged "v3.0.0+" | tagged "v4.0.0+" |

PR `2026-06-15` patch (promote spec at implement-start for forging disciplines — non-breaking fix):

| Skill / agent | From | To |
|---|---|---|
| `takumi` | 4.0.0 | 4.0.1 |

PR `2026-06-15` bumps (SDD doc-coverage — forward-draft system docs + post-forge gen gate +
guardrailed prose edits; the surgical-edit rule change is breaking for all consumers):

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 7.0.0 | 8.0.0 |
| `takumi` | 4.0.1 | 5.0.0 |
| `manage-docs` | 3.0.1 | 4.0.0 |
| `doc-writer` (agent) | tagged "v4.0.0+" | tagged "v5.0.0+" |

PR `rewrite-takumi-flow-to-SDD` (2026-06-16) ledger catch-up (records actual shipped versions — the route-completeness,
contiguous-IDs, artifact-sharding, and SDD spec-first pipeline / Work-Type gate PRs bumped the
owners without touching this contract; this PR edits the contract surface, so the ledger is brought
current here):

| Skill / agent | From | To |
|---|---|---|
| `rebuild-spec` | 8.0.0 | 9.0.1 |
| `takumi` | 5.0.0 | 5.4.1 |

Consumers: link this file from `## References` in each owner's SKILL.md / agent.md. Do NOT duplicate the table — link only.
