---
name: tkm:rebuild-spec
description: "Reverse-engineer an existing codebase into structured documentation — 11 core doc artifacts (architecture, data models, API specs, flows, etc.) plus per-feature specs (4 files/feature), process-flows, and glossary synthesis via separate standalone passes. Uses parallel agents: scanner, researcher, reviewer, doc-writer."
argument-hint: "[--feature-specs] [--features F001,..] [--flows] [--glossary]"
metadata:
  author: takumi-agent-kit
  version: "9.0.1"
module: documentation-knowledge
triggers: ["document existing codebase", "reverse engineer", "spec from code", "what does this code do"]
---

# tkm:rebuild-spec

Reverse-engineer existing codebase → structured spec artifacts by composing existing skills.
Zero third-party CLI dependencies. Output lands in layered `docs/` paths (system/, generated/, flows/, features/).

> **v5.0.0 — BREAKING CHANGE:** Default run now produces CORE artifacts only (no feature specs,
> process-flows, or glossary). Use `--feature-specs`, `--flows`, `--glossary` standalone passes
> for those outputs. `--features F###` is redefined as a scoped subset of `--feature-specs`
> (was: default-pipeline W6 narrowing). Migration: run core pass first, then the new passes in order.
>
> **v4.0.0:** per-feature specs split into 4 audience-aware files; `docs/system/architecture.md`
> and `docs/generated/permissions-matrix.md` are generated/promoted; process-flows synthesized
> at FL.1 with an FL.2 liveness validator (historical numbering: W6.8 / W6.85).

**Principles:** YAGNI, KISS, DRY | Compose, don't reinvent | Template-first.

## Usage

```
/tkm:rebuild-spec                         # Incremental if .rebuild-state.json present; full otherwise. Reconcile preflight; auto-resume. Produces CORE artifacts only (v5.0.0+).
/tkm:rebuild-spec --full                  # Force full rebuild ignoring state. Alone → core artifacts; combined with a pass flag → that pass ignores its cursor and regenerates all outputs.
/tkm:rebuild-spec --since abc123          # Override diff base SHA (custom incremental starting point)
/tkm:rebuild-spec --dry-run               # Print planner decision JSON to stdout; no file writes
/tkm:rebuild-spec --feature-specs         # Standalone pass: generate/refresh all per-feature specs (4 files/feature). Requires feature-list.md.
/tkm:rebuild-spec --features F001,F002    # [BEHAVIOR CHANGE v5] Scoped subset of --feature-specs pass (warn + proceed). Was: default-pipeline W6 narrowing.
/tkm:rebuild-spec --flows                 # Standalone pass: synthesize process-flows. Requires docs/features/* from --feature-specs pass.
/tkm:rebuild-spec --glossary              # Standalone pass: synthesize glossary. Requires docs/features/* from --feature-specs pass.
/tkm:rebuild-spec --screen-specs          # Standalone pass: generate screen specs. Requires docs/generated/screen-list.md.
/tkm:rebuild-spec --api-contracts         # Standalone pass: synthesize API contracts (REST/GraphQL/gRPC). Off by default. Requires core artifacts.
/tkm:rebuild-spec --artifact route-list   # Regenerate single core artifact (reuses upstream if present)
/tkm:rebuild-spec --resume                # Reconcile-only: sync TaskList against disk, close stale in_progress tasks whose outputs already exist. No new work dispatched.
/tkm:rebuild-spec --probe-routes          # Explicit Wave 0.4 bootability gate: AskUserQuestion → Tier-1 CLI probe → write _route-probe.json sidecar used by W1 route-list. Auto-triggered when lockfile present; this flag forces the gate even if no lockfile found.
/tkm:rebuild-spec --lang vi               # First run: vi becomes PRIMARY, generated inline at docs/vi/. Later run: translates from primary.
/tkm:rebuild-spec --lang jp               # After a vi primary: translates docs/vi/ → docs/jp/ (skeleton-identity enforced).
```

**Recommended pass sequence:**
```
1. /tkm:rebuild-spec                  # core artifacts (always first)
2. /tkm:rebuild-spec --feature-specs  # per-feature 4-file specs
3. /tkm:rebuild-spec --flows          # process-flow synthesis
4. /tkm:rebuild-spec --glossary       # glossary synthesis
5. /tkm:rebuild-spec --api-contracts  # API contracts (optional; core-tier, parallel-safe)
6. /tkm:rebuild-spec --screen-specs   # screen specs (optional)
```
> Each pass also prints an optional `/ask-expert` review line in its handoff (see "End-of-pass handoff"). The sequence above is next-pass guidance only — it intentionally omits the review step, which lives in the canonical handoff block.

**End-of-pass handoff (authoritative):** Every pass ends by printing its own "Pass-completion handoff prompt" — defined in that pass's reference file, NOT this sequence. Each handoff includes an optional `/ask-expert` review line (e.g. `/ask-expert "Is the core architecture & data-model documentation accurate and complete?"`) before the next-pass guidance. When printing the handoff, reproduce the canonical block from the pass file verbatim — do not regenerate it from the sequence above (the sequence omits the review step). Handoff sources: core → `references/pipeline-w7-w9.md`; feature-specs → `references/pipeline-feature-specs.md`; flows & glossary → `references/pipeline-flows-glossary.md`; api-contracts → `references/pipeline-api-contracts.md`; screen-specs → `references/pipeline-screen-specs.md`.

### Pass ordering & prerequisites

Single source of truth for the pass dependency chain. Each pass preflight ABORTs (see
its reference file) if its prerequisite is missing.

| Pass | Prerequisite (must exist) | Produced by |
|------|---------------------------|-------------|
| core | source code | — |
| `--feature-specs` | `docs/generated/feature-list.md` | core |
| `--flows` | `docs/features/*/technical-spec.md` + `docs/generated/entities.md` | feature-specs + core |
| `--glossary` | `docs/features/*/business-context.md` + `docs/generated/entities.md` | feature-specs + core |
| `--api-contracts` | `docs/generated/route-list.md` + `entities.md` + `api-map.md` + `docs/system/permissions.md` | core (parallel-safe w/ others) |
| `--screen-specs` | `docs/generated/screen-list.md` | core (parallel-safe w/ others) |

**Force restart:** delete `plans/<active>/artifacts/` → next no-args invocation starts fresh.

**`--artifact route-list` and probe manifest:** When re-running `--artifact route-list` after a prior probe (status `passed` or `skipped`), the orchestrator reuses the existing `_route-probe.json` sidecar without re-prompting. The probe gate is only re-issued when `probe_gate.status == "awaiting_user"` (resumed from halt) or when `--full` is combined with a bootable stack or `--probe-routes` flag. This ensures the Tier-1 manifest enriches W1 route-list even on partial re-runs.

## Preflight

1. Detect project root = CWD (must be under git control).
2. Verify source code present: non-empty working tree AND has at least one of `package.json`, `composer.json`, `pom.xml`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `Gemfile`. Empty → ABORT with clear hint.
3. Resolve active plan path from `## Plan Context` hook; if none, fallback to `plans/<timestamp>-rebuild-spec/`.
3.5. **Bootstrap detection (v2.x upgrade):** If `.rebuild-state.json` absent AND `docs/specs/system-overview.md` or `feature-list.md` present AND `git log -1 -- docs/specs/` returns a SHA ≠ HEAD → prompt user to bootstrap state from git history or force full rebuild. See `references/pipeline.md` § Wave -2.
4. Ensure output dirs exist: `docs/system/`, `docs/generated/`, `docs/flows/`, `docs/features/`, `plans/<active>/artifacts/`.

## Pipeline

Load on demand (not inlined here):
- `references/pipeline.md` — wave graph + always-loaded core. Load on-demand: pipeline-w0-w5.md, pipeline-w5x-w6.md, pipeline-w7-w9.md, pipeline-screen-specs.md, pipeline-feature-specs.md, pipeline-flows-glossary.md
- `references/artifact-sharding.md` — descriptor table, merge recipe, fragment contract, ID contiguity gate (renumber + validate after every sharded merge). Loaded when pre-gen estimate exceeds threshold for any artifact.
- `references/code-formats.md` — shared schema; pass to researcher
- `references/verification-checklist-universal.md` — universal rules + Pending Marker Rule (always load with any checklist file)
- `references/verification-checklist-core-artifacts.md` — W7a: 11 core artifact sections + Composite Detection + Failure Trap
- `references/verification-checklist-feature-spec.md` — FS.5: FeatureSpec + Deterministic Validator Coverage + Failure Trap
- `references/verification-checklist-screen-spec.md` — SS.2: ScreenSpec + Composite Detection + Failure Trap
- `references/verification-checklist-quality-gates.md` — W4.5 / W5.6 targeted gates only

### On-demand pipeline loading
Before dispatching W0–W5: Read `references/pipeline-w0-w5.md`.
Before dispatching W5.5 (feature existence gate): Read `references/pipeline-w5x-w6.md`.
Before dispatching W7a/W7.5/W8/W9 (core review/fix/promote): Read `references/pipeline-w7-w9.md`.
When `--feature-specs` or `--features` flag is set: Read `references/pipeline-feature-specs.md`.
When `--flows` flag is set: Read `references/pipeline-flows-glossary.md`.
When `--glossary` flag is set: Read `references/pipeline-flows-glossary.md`.
When `--api-contracts` flag is set: Read `references/pipeline-api-contracts.md`.
When `--screen-specs` flag is set: Read `references/pipeline-screen-specs.md`.
When `--lang <code>` targets a secondary language (translate path): Read `references/pipeline-translate.md`.
**[lang-sync-fix] ALSO read `references/pipeline-translate.md` on ANY primary pass when `docs/.rebuild-state.json` has a non-empty `translations` object** — primary passes run `translation_sync_gate.py` (plan + finalize) in their post-promote steps, echo the finalize stdout `Secondary languages:` line VERBATIM in their completion handoff, and MUST run `check_translation_gate.py --pass <name>` before writing the completion flag (exit 1 blocks completion). Without loading pipeline-translate.md, the invocation contract is missing and secondary mirrors silently stay primary-only. Check: `translations = JSON.parse(readFile("docs/.rebuild-state.json")).translations ?? {}`; if `Object.keys(translations).length > 0`, load the file before the pass's promote step.

Composite screen detection is automatic. See `references/composite-screen-detection.md` for the H1-H6 rules, execution order, 2-of-3 gate, tab short-circuit, and wizard sub-classification.

BehaviorLogic stability enforced via scout BL inventory (Wave 0) + 1-BL-per-file cardinality contract (Wave 2b) + reviewer cardinality cross-check (Wave 7a). See `references/bl-source-patterns.md`.

**Default flow (no flags) — CORE artifacts only (v5.0.0+):**
1. Wave 0 — `/tkm:scan-codebase` discovery (parallel per target dir).
1.4. Wave 0.4 — route probe gate (orchestrator, before W1 dispatch): AskUserQuestion confirming app bootability; runs Tier-1 CLI probe when bootable stack detected or `--probe-routes` passed; writes `_route-probe.json` sidecar and `probe_gate` state. Skipped when no bootable stack and no `--probe-routes`. `--full` re-probes only when the trigger condition is met.
1.5. Wave 0.5 — emit `_session-context.md` shared context (`scripts/build_session_context.py`) + extract BL inventory fragment (`scripts/extract_scout_section.py`). All W1-W9 subagents read `_session-context.md` FIRST.
2. Waves 1–5 — `researcher` chain, one per doc artifact, `blockedBy` per dep graph. Inputs: scout report + template + `code-formats.md`. After W5 completes, the orchestrator post-step (not the W5 task itself) derives `_canonical-fcodes.json` and per-feature `artifacts/features/{slug}/.pending` markers — see `references/canonical-fcode-schema.md`. After W5: update `_session-context.md` feature_count.
2.5. Wave 1.5 — DataModel structural gate: entity completeness, DISC-### scope (enum ≥2 values, no boolean DISC), MODEL### uniqueness, orphan DISC-### check. W2 dispatches only after W1.5 passes. Token-efficient: loads DataModel only. Skipped in incremental mode when data-model not re-generated.
2.6. Wave 1.1 — RouteList completeness halt gate (`validate_route_list.py`): checks `no_approximation_marker`, `no_resource_summary_table`, `no_unexpanded_macro`. HALTS before W2 dispatch on critical violations. Skipped in incremental when route-list not re-generated.
2.7. Wave 2a.1 — ScreenList composite guard (`validate_screen_list.py`): checks `no_wildcard_route` + composite-screen rules. HALTS before W2b/W3 dispatch on critical violations. Skipped in incremental when screen-list not re-generated.
3. Wave 5.5 — deterministic existence validator (`scripts/validate_feature_existence.py`); halts pipeline on FAIL before core review. Unconditional (no opt-in flag).
3.5. Wave 4.5 — UserStories quality gate before W5 dispatch. 5 checks: single intent per story, human actor clarity, outcome presence, overly broad scope, US### uniqueness. Halts on critical (checks 1, 2, 5). W5 dispatches only after `passed: true`. Skipped in incremental when user-stories not re-generated.
3.6. Wave 5.6 — FeatureList quality gate. 8 checks across 3 groups: (A) structural — US###/SCR### coverage completeness, orphan codes, F-code uniqueness; (B) quality — single intent per F###, clear flow, vague naming, scope overlap; (C) grouping coherence. Halts on critical. Core review (W7a) dispatches only after `passed: true`. Skipped in incremental mode when W5 not re-run.
4. Wave 7a — `reviewer` pass on 11 core artifacts using `verification-checklist-core-artifacts.md` + pre-extracted BL inventory fragment (runs **parallel** with W5 completion).
5. Wave 7.5 — `structural_fixer.py` inserts missing `**Linked FR:**` placeholders in BR/SM/ALG/INT blocks (edge-case safety net). **Wave 7.6 removed** — FS.2 `FeatureSpec.linked_fr_missing` gate eliminates the need for placeholder resolution.

**Review zone (W7a-core):** LLM semantic checks on 11 core artifacts.
**Pre-fix zone (W7.5):** Deterministic structural safety net.
6. Wave 8 — per-cycle fix fan-out: orchestrator extracts issues grouped by file from review-report.md, spawns one implementer per affected file in parallel (cap: `REBUILD_W8_MAX_PARALLEL`, default 5, each with explicit issue list). Single re-reviewer verifies all fixes. Repeats up to `MAX_FIX_CYCLES=3`; escalates to user if still failing.
7. Wave 9 — pre-flight gate reads `validation-summary.json` (core) + review frontmatter (`review-report.md`); HALTS if `overall_status == FAIL` OR `failed > 0` OR `missing > 0`. Gate checks `allCoreDocsPromoted` (core docs in layered paths) — does NOT require feature dirs (v5.0.0+). On pass: `promote_drafts.py` handles all file-ops (cp drafts → layered `docs/` paths per `docs-canonical-mapping.md`, archive, GC, sha256 manifest); **Wave 9.5 runs immediately after in the orchestrator context** (`build_source_to_fcode.py` — reverse-index refresh; runs before the flag so flag existence ↔ both W9 + W9.5 done); `doc-writer` writes `wave9-complete.flag` + **self-closes via `TaskUpdate(status=completed)` before returning**. After the flag is confirmed, the orchestrator prints the **Core Pass-completion handoff prompt** (next-pass guidance + stale-marker nudges) — see `references/pipeline-w7-w9.md` § "Core Pass-completion handoff prompt".

**Standalone passes (separate invocations — NOT part of the default flow):**
- **`--feature-specs`:** FS.1–FS.7 fan-out, per-feature 4-file specs. Requires feature-list.md. See `references/pipeline-feature-specs.md`.
- **`--flows`:** FL.1–FL.5 process-flow synthesis. Requires `docs/features/*`. See `references/pipeline-flows-glossary.md`.
- **`--glossary`:** GL.1–GL.3 glossary synthesis. Requires `docs/features/*`. See `references/pipeline-flows-glossary.md`.
- **`--screen-specs`:** SS.1–SS.3 screen specs. Requires `docs/generated/screen-list.md`. See `references/pipeline-screen-specs.md`.

**Flag overrides:**

| Flag | Effect |
|------|--------|
| _(none)_ | Core pass only: incremental if `docs/.rebuild-state.json` present; full otherwise. Reconcile preflight runs first; auto-resume if `TaskList` has pending tasks. Terminates at W7a-core + W9-core (no feature specs, flows, or glossary). |
| `--full` | Force full rebuild ignoring state. Alone → all 11 core artifacts. Combined with a pass flag (`--feature-specs` / `--flows` / `--glossary` / `--screen-specs`) → forces that pass to regenerate ALL its outputs, ignoring its incremental cursor. Mutually exclusive with `--since`. |
| `--since <sha>` | Override diff base SHA for incremental (custom starting point). Mutually exclusive with `--full` |
| `--dry-run` | Print planner decision JSON to stdout; no file writes, no wave dispatch |
| `--artifact NAME` | Skip to the wave owning NAME; reuse existing upstream artifacts if present. ABORT if upstream missing |
| `--feature-specs` | **[NEW v5]** Run standalone feature-specs pass (FS.1–FS.7). Generates 4 files per F###. Requires `docs/generated/feature-list.md`. Incremental: regenerates only F### whose source changed since last pass. Loads `references/pipeline-feature-specs.md`. |
| `--features F###,...` | **[BEHAVIOR CHANGE v5]** Scoped subset of `--feature-specs` pass (was: default-pipeline W6 narrowing). Emits one-time notice `[BEHAVIOR CHANGE v5]`. Warn + proceed. Loads `references/pipeline-feature-specs.md`. |
| `--flows` | **[NEW v5]** Run standalone flows pass (FL.1–FL.5). Requires `docs/features/*/technical-spec.md`. Re-synths ALL flows if source changed since cursor. Loads `references/pipeline-flows-glossary.md`. |
| `--glossary` | **[NEW v5]** Run standalone glossary pass (GL.1–GL.3). Requires `docs/features/*/business-context.md`. Loads `references/pipeline-flows-glossary.md`. |
| `--resume` | Run reconcile preflight only — no new waves dispatched. Use after a killed session to sync TaskList with disk |
| `--probe-routes` | Wave 0.4 only: force bootability gate prompt → run Tier-1 CLI route lister → write `_route-probe.json` sidecar consumed by W1 route-list. Auto-triggered when a bootable stack lockfile is detected; use this flag to force the gate even on non-lockfile projects. If user chooses "Need to set up app first", pipeline halts with a checkpoint written to `probe_gate` in `.rebuild-state.json`; re-run `--artifact route-list` to resume. No-op if scout-report absent. |
| `--screen-specs` | Run standalone ScreenSpec pass (SS.1–SS.3). Requires `docs/generated/screen-list.md`. Incremental: regenerates only screens changed since last pass. Loads `references/pipeline-screen-specs.md`. |
| `--api-contracts` | Run the standalone api-contracts pass (AC.1 synthesis + AC.2 validator + AC.3 review + AC.5 promotion; historical numbering: W6.87 / W6.875). Off by default (token cost; not all projects need API contracts). Produces `docs/generated/api-contracts.md` capturing REST/GraphQL/gRPC request-response contracts. Loads `references/pipeline-api-contracts.md`. |
| `--lang <code>` | **[NEW v5.1]** Output language selection. Accepts any code (lowercase-normalized; warns on non-standard). Dispatch: if `code == primary_lang` (or first run) → **inline generation** (prose in `<code>`, English skeleton); else → **translate-from-primary** (prose translated, skeleton byte-identical). First run sets `primary_lang` in state. `en` → `docs/`; else → `docs/<code>/`. Loads `references/pipeline-translate.md` for translate path. Auto-syncs all existing secondary languages after any primary pass promotes (unless `REBUILD_AUTO_SYNC_TRANSLATIONS=0`). |
| `--system-flow` | **[DEPRECATED v5.x]** Exact no-op alias for --flows (identical output contract). system-flow.md is now emitted by --flows automatically. Emits a one-time notice `[DEPRECATED] --system-flow folded into --flows` then proceeds exactly as --flows. |

**Artifact → wave lookup (for `--artifact NAME` — core artifacts only):**

| NAME | Wave | Upstream required | Pass |
|------|------|-------------------|------|
| `system-overview` | W1 | scout-report.md | core |
| `route-list` | W1 | scout-report.md | core |
| `data-model` | W1 | scout-report.md | core |
| `screen-list` / `screen-flow` | W2 | route-list.md + data-model.md | core |
| `behavior-logic` | W2 | screen-list.md + screen-flow.md | core |
| `permissions` | W3 | screen-list.md + behavior-logic.md | core |
| `user-stories` | W4 | permissions.md | core |
| `feature-list` | W5 | user-stories.md | core |
| `api-map` | W1+W2 | route-list.md + behavior-logic.md | core |
| `entities` / `overview` / `architecture` | W1 | scout-report.md | core |
| `api-contracts` | AC.1 | data-model.md + permissions.md + route-list.md + api-map.md + scout-report.md (run `--api-contracts`) | `--api-contracts` pass |
| `permissions-matrix` / `business-rules` | W3 | behavior-logic.md | core |
| `technical-spec` / `business-context` / `screens` / `edge-cases` | FS.1 | feature-list.md (run `--feature-specs`) | `--feature-specs` pass |
| `process-flow` | FL.1 | docs/features/*/technical-spec.md (run `--flows`) | `--flows` pass |
| `system-flow` | FL.1 | all Tier-1 process-flows (≥2) | `--flows` pass |
| `glossary` | GL.1 | docs/generated/entities.md + docs/features/*/business-context.md (run `--glossary`) | `--glossary` pass |

## Subagent contracts

**Core pass subagents:**

| Wave | Subagent | Input | Output |
|------|----------|-------|--------|
| 0 | `/tkm:scan-codebase` | target dirs | `plans/<active>/artifacts/scout-report.md` |
| 0.4 | orchestrator (AskUserQuestion + probe_routes.py) | bootable lockfiles + `probe_gate` state | `_route-probe.json` sidecar + `probe_gate` in `.rebuild-state.json`; HALTS on `awaiting_user` |
| 0.5 | orchestrator (scripts) | scout-report.md + stackNote | `_session-context.md` + `_scout-bl-inventory.md` |
| 1–5 | `researcher` | scout report + template + `code-formats.md` | `plans/<active>/artifacts/<artifact>.md` |
| 1.1 | orchestrator (`validate_route_list.py`) | `route-list.md` | `validation-summary.json`; HALTS before W2 on critical |
| 1.5 | `reviewer` | `data-model.md` only | `data-model-review.md` (frontmatter: `passed`, `issues`, `warnings`); halts W2 on critical |
| 2a.1 | orchestrator (`validate_screen_list.py`) | `screen-list.md` | `validation-summary.json`; HALTS before W2b/W3 on critical |
| 4.5 | `reviewer` | `user-stories.md` only | `user-stories-review.md` (frontmatter: `passed`, `issues`, `warnings`); halts W5 on critical |
| 5.6 | `reviewer` | `feature-list.md` + US### headers + SCR### index | `feature-list-review.md` (frontmatter: `passed`, `issues`, `warnings`); halts core review on critical |
| 7a | `reviewer` | 11 core artifacts + `_scout-bl-inventory.md` + `verification-checklist-core-artifacts.md` | `core-review-report.md` → merged into `review-report.md` + `TaskUpdate(status=completed)` |
| 7.5 | orchestrator (`structural_fixer.py`) | core artifacts + review-report.md | fixed artifacts + `structural-fix-report.json` + decremented review-report |
| 8 | `implementer` | review-report.md + affected core drafts | updated drafts |
| 9 | `promote_drafts.py` + `doc-writer` | approved core drafts | layered paths per `docs-canonical-mapping.md` + `_promoted-sha256.txt` + `wave9-complete.flag`; calls `TaskUpdate(status=completed)` |

**Feature-specs pass subagents (`--feature-specs` / `--features`; see `references/pipeline-feature-specs.md`):**

| Wave | Subagent | Input | Output |
|------|----------|-------|--------|
| FS.1 | `researcher` (1/feature or 5/batch) | scoped artifact sections (Grep per F###) + `feature-spec-researcher-contract.md` + 4 audience templates + canonical upstreams from `docs/` | `plans/<active>/artifacts/features/{slug}/{technical-spec,business-context,screens,edge-cases}.md` (4 files) + `TaskUpdate(status=completed)` |
| FS.1.5 | orchestrator | `_feature-entry-points/` fragments | updated `## Feature Entry Points` section in screen-flow.md |
| FS.2 | orchestrator (`validate_feature_spec.py` + `validate_source_citations.py`) | feature spec drafts | `fs-validation-summary.json` |
| FS.5 | `reviewer` (5/batch) | feature spec batches + `verification-checklist-feature-spec.md` | `feature-review-batch-NN.md` → merged into `feature-review-report.md` |
| FS.6 | `implementer` (per-file, max 3 cycles) | `feature-review-report.md` + affected feature spec drafts | updated drafts → re-reviewer |
| FS.7 | `promote_drafts.py` + orchestrator | approved feature spec drafts | `docs/features/{slug}/*` + `fs7-complete.flag` + state update (`last_feature_spec_run_sha`) |

**Flows pass subagents (`--flows`; see `references/pipeline-flows-glossary.md`):**

| Wave | Subagent | Input | Output |
|------|----------|-------|--------|
| FL.1 | `researcher` | `docs/generated/entities.md` + `docs/generated/screen-flow.md` + `docs/system/business-rules.md` + `docs/features/*/technical-spec.md` + `process-flow-researcher-contract.md` + `process-flow-template.md` | `plans/<active>/artifacts/flows/*.md` (FLOW### per qualifying entity) + `flows/.completed` + `flows/system-flow.md` (Tier-2, when ≥2 Tier-1 flows) |
| FL.2 | orchestrator (`validate_process_flow.py`) | `flows/*.md` | `flow-validation-summary.json`; exit 0/1 |
| FL.3 | `reviewer` | `flows/*.md` + PF-S1..PF-S6 rules (in `pipeline-flows-glossary.md`) | `flow-review-report.md` |
| FL.4 | `implementer` (per-file, max 3 cycles) | `flow-review-report.md` + affected flow drafts | updated flow drafts → re-reviewer |
| FL.5 | `promote_drafts.py` + orchestrator | approved flow drafts | `docs/flows/*.md` + `flows-complete.flag` + state update (`last_flows_run_sha`) |

**Glossary pass subagents (`--glossary`; see `references/pipeline-flows-glossary.md`):**

| Wave | Subagent | Input | Output |
|------|----------|-------|--------|
| GL.1 | `researcher` | `docs/generated/entities.md` + `docs/features/*/business-context.md` | `plans/<active>/artifacts/glossary.md` + `TaskUpdate(status=completed)` |
| GL.2 | `reviewer` | `glossary.md` + GL-R1..GL-R6 rules (in `pipeline-flows-glossary.md`) | `glossary-review-report.md` |
| GL.3 | orchestrator | approved `glossary.md` | `docs/system/glossary.md` + `glossary-complete.flag` + state update (`last_glossary_run_sha`) |

**Screen-specs pass subagents (`--screen-specs`; see `references/pipeline-screen-specs.md`):**

| Wave | Subagent | Input | Output |
|------|----------|-------|--------|
| SS.1 | `researcher` (5/batch; standalone) | screen-list.md + data-model.md + screen-spec-template.md + contract | `plans/<active>/artifacts/screens/SCR###_Name/spec.md` |
| SS.2 | `reviewer` (5/batch; standalone) | ScreenSpec batches + `verification-checklist-screen-spec.md` | `screen-review-batch-NN.md` + `TaskUpdate(status=completed)` |

All subagents read `_session-context.md` first; only artifact-specific reads listed in Input column happen afterward.

## Task management

Plan files = persistent. Tasks = session-scoped. Hydrate waves as Task chain.
Fallback: if Task tools unavailable (VSCode extension) → use `TodoWrite`.
See `references/pipeline-w0-w5.md` for `TaskCreate` examples.

## Resume & Reconcile

Three defenses against mid-pipeline context loss: (1) **Self-closing subagents** (FS.1, FL.1, GL.1, W7a, W9) call `TaskUpdate(status=completed)` before returning. (2) **Completion sentinels** — `wave9-complete.flag` (core), `fs7-complete.flag` (feature-specs), `flows-complete.flag` (flows), `glossary-complete.flag` (glossary) are disk-level truth per pass. (3) **Reconcile preflight** — on every invocation, closes `in_progress` tasks whose expected output already exists on disk. For Wave 9 (core): checks flag OR all core docs promoted (no feature dirs required — v5.0.0). `--resume` runs preflight only. For FS.1 per-feature tasks, reconcile checks 4-file completeness + no `.pending`; partial output stays `in_progress`.
See `references/pipeline.md` → "Reconcile pattern" for `TaskList`/`TaskUpdate` examples.

## Edge Cases

- **Route probe requires user-confirmed bootability (Known Limitation):** The Tier-1 CLI probe cannot run autonomously — it requires the user to confirm the app is bootable. If the user must install dependencies first, the pipeline halts with a checkpoint (`probe_gate.status = "awaiting_user"` written to `docs/.rebuild-state.json`). Re-run `/tkm:rebuild-spec --artifact route-list` to resume at the gate; scout output is reused, no re-scan. WARNING: do NOT commit lockfile/dep churn from local setup to the repository.
- **`probe_gate` persists in `.rebuild-state.json`:** The `probe_gate` field survives session end. On `--artifact route-list` re-runs with a prior `passed`/`skipped` probe_gate, the sidecar manifest is reused without re-prompting. `--full` re-prompts and re-probes fresh **only when a bootable stack is detected or `--probe-routes` is passed** (pipeline condition: `(hasBootableStack || explicitProbeRoutes) && (!priorProbeGate || --full)`). On a non-bootable, non-flagged repo `--full` does not trigger the probe gate. A stale `awaiting_user` gate is cleared automatically on successful or declined probe.
- **Orphan `.pending` marker** → FS.1 partial: 4-file write incomplete OR researcher did not remove the marker on success. FS.5 emits `MISSING` for that fcode, FS.7 pre-flight gate blocks promotion. Recovery: rerun FS.1 for the affected fcode OR (after manually verifying all 4 files are complete) remove `.pending` and rerun FS.5. See `references/canonical-fcode-schema.md § Folder Lifecycle` + `references/verification-checklist-universal.md § Pending Marker Rule`.
- **Validator FAIL at W5.5** → orchestrator HALTS before core review (folder/slug drift). Unconditional — no env var, no opt-in.
- **Validator FAIL at FS.2** → orchestrator spawns `implementer` fix per failed F###; after 2 failed cycles escalate to fresh `researcher` re-draft. Unconditional.
- **Empty codebase** → ABORT at preflight; no placeholder docs.
- **Scaffold-only repo** (lockfile present but no source files) → preflight passes lockfile check but Wave 0 scout returns near-empty report. Researcher MUST write "No data" markers per artifact rather than fabricate content.
- **FeatureList has 0 F### codes** → core pass proceeds; `--feature-specs` warns and exits with 0 features.
- **Reviewer fails after 3 cycles** → escalate, leave drafts in `plans/<active>/artifacts/`, do NOT promote.
- **Subagent timeout (>15 min)** → re-run pre-gen estimate (`estimate_artifact_loc.py`); if `shard:true`, retry via chunked path (shell→fan-out→merge) instead of monolithic re-run. If a chunked run had a partial fragment timeout, re-dispatch ONLY the missing fragment then re-merge (idempotent — rebuilds whole file, no dup sections). Non-shardable artifact: retry once, then `TaskUpdate` failed; user decides resume.
- **Session context exhausted mid-pipeline** → tasks may remain `in_progress` despite output files existing on disk. Next invocation runs reconcile preflight (see Resume & Reconcile) to close them. Subagents self-close on the critical final wave to minimise orchestrator-liveness dependency.
- **Small codebase (screens < 30)** — W2a + W2b merged into single Wave 2 task (env: `REBUILD_W2_MERGE_THRESHOLD`; default 30).
- **Large codebase (F### count > 20)** → FS.1 fan-out split into batches of 5 (env: `REBUILD_FS_BATCH_SIZE`; default 5; legacy `REBUILD_W6_BATCH_SIZE` honored as a deprecated alias) to bound peak context and rate-limit pressure. FS.5 reviews feature specs in batches of 5 after all FS.1 batches complete. Core W7a reviews core artifacts independently.
- **W8 parallel cap:** `REBUILD_W8_MAX_PARALLEL=5` — max parallel W8 implementer tasks per fix cycle (default 5).
- **Shard parallel cap:** `REBUILD_SHARD_MAX_PARALLEL=5` — max parallel fragment researchers per shard batch (default 5). Mirrors `REBUILD_FS_BATCH_SIZE` / `REBUILD_W8_MAX_PARALLEL` conventions. Used when pre-gen estimate triggers chunked artifact generation (`--api-contracts` may shard for large API surfaces; core artifacts shard when exceeding `docs.maxLoc`).
- **PASS one-liner format** — reviewer reports use `✓ <rule_id> @ <fcode>` line format under `## Passed Checks`. W7-merge rolls up consecutive same-rule fcodes into ranges.
- **Incremental mode (v3.1.0+)** — auto-engaged when `docs/.rebuild-state.json` present. Diffs source since last SHA; maps changed files to cascade chain (route/model → full W1→W5; screen/bg/perm → truncated chain; other → core review only). Only affected core waves dispatched. Feature-specs, flows, and glossary passes have their own per-pass cursors. Override: `--full`.
- **First-run guard** — incremental on fresh repo (no `docs/.rebuild-state.json`) → auto-fallback to full silently (no abort).
- **Manifest change** (package.json, composer.json, etc.) → auto-fallback to full.
- **Diff threshold** — diff > 30% of source files → auto-fallback to full (env: `REBUILD_INCREMENTAL_THRESHOLD`).
- **Unowned new source file** — new file not in scout-report → fallback full (FeatureList may be stale).
- **OOB edit detected** — a layered `docs/` artifact (`docs/generated/<artifact>.md`, `docs/system/<artifact>.md`) hand-edited between runs → `[OUT_OF_BAND_EDIT]` warning (non-blocking).
- **Empty cascade** (all `other`-type files) → no core waves dispatched (only affected feature specs via reverse-index on `--feature-specs` pass).
- **v2.x upgrade** — `docs/specs/` present without `.rebuild-state.json` → orchestrator offers bootstrap prompt (Wave -2); user can pick fast-incremental (with hand-edit caveat) or safe-full path. If `git log` returns no SHA for `docs/specs/` or derived SHA = HEAD, bootstrap is skipped silently.
- **`--full` + `--since` mutually exclusive** → exit 2 with error.
- **Wave -1 hydrate** — copies non-affected artifacts from the layered `docs/` paths (`docs/system/`, `docs/generated/`, `docs/features/`, `docs/flows/`) to `plans/<active>/artifacts/` so downstream waves (reconcile, reviewer) see complete context.
- **Language-adaptive scanning scope**: Wave 0 scout detects project language from manifest files and outputs flat file inventory + scanned dirs. Wave 2 follows imports one level deep using language-specific mechanisms (see `references/pipeline-w0-w5.md` W2 task for full rules). Reviewer cross-validates via scout-report.md inventory — no hardcoded extension globs. If scout-report.md absent (`--artifact` entry point), content-completeness check is skipped with a warning. Pure UI/presentational components with no service calls are automatically compliant. Known limitation: barrel/re-export files (e.g. `index.ts`) re-exporting at depth 2 are not followed — flagged `[BARREL_IMPORT]` advisory.
- **REG### scoping**: every REG must have parent SCR in same ScreenList. Orphan REG (no parent SCR) → critical.
- **REG nesting**: forbidden. REG inside REG → critical.
- **Mutually-exclusive tab content** → SCR variants (SCR###a/b), NOT REG (H4 short-circuit; hard rule).
- **Wizard/stepper content** → H5 sub-classification: Case A (distinct UI+validation+action per step) → SCR variants. Case B (shared state/endpoint, visual phases) → composite SCR + child REGs. Default for ≥3-step wizards: Case B. Case A requires cited evidence. 2-step wizards: always Case B.
- **W1 researchers (SystemOverview, RouteList, DataModel) MUST NOT emit REG###.** REG### first appears in W2 ScreenList.
- **Partial-screen ownership**: F### with SCR###/REG### ref owns REG only, not the parent SCR. Screen shell must be owned by a separate F### with bare SCR### ref.
- **Region independence signals**: REG### is justified by any ≥1 of — distinct API endpoint (read or write), independent loading state, independent scroll container, independent auth / permission gate, distinct business workflow, distinct mutation surface / API cluster (distinct write endpoints or POST/PUT/DELETE namespace — even if the initial GET payload is shared), distinct validation / action path. Shared initial payload alone does NOT disqualify a split (see verification-checklist Trap 1 + Trap 3).
- **Feature specs (v4.0.0 — 4 audience-aware files per feature):** `technical-spec.md` (FR/BR/SM/ALG/INT/SC codes under `## Cross-Cutting Logic`; `## Polymorphic Behavior`; `## Key Entities`; `## Artifact References`); `business-context.md` (plain-language: `## Why It Matters`, `## Who Uses It`, `## What They Do` — no technical tokens); `screens.md` (`## Screen List`, `## User Journey`); `edge-cases.md` (table with Scenario/What Happens/User-Facing Message). `## Artifact References` replaces legacy two-section format — CRITICAL immediately on legacy. See `templates/technical-spec-template.md` + `templates/business-context-template.md`.
- **Decision Logic (DEC-###, v3.2.4+):** `feature-spec.md` now includes `## Cross-Cutting Logic > ### Decision Logic` — captures user-facing decisions with business-outcome scope (source-location-agnostic: component, saga, controller all valid Sources). 3 subtypes: `render`, `interaction`, `flow`. `user_visible_outcome` field required per DEC. Lazy-N/A and structural correctness enforced by `validate_feature_spec.py`. W7h reviewer rule covers semantic validation.
- **Flow slug collision (FL.1):** researcher emits slug matching existing `flows/` file → suffix `-2`; emit `[WARN] flow_slug_suffixed`. If existing file has `status: human-curated`, skip with `[INFO] flow_preserved`.
- **Partial FS.1 output (1-3 of 4 files missing):** treated as orphan `.pending` — researcher MUST NOT remove `.pending` until all 4 files (`technical-spec`, `business-context`, `screens`, `edge-cases`) exist and are non-empty.
- **DISC-### scope (v3.2.4+ updated D6):** DISC-### is for enum discriminators only — ≥2 distinct values with different behavioral outcomes. Boolean fields (`true`/`false` only) belong in Business Rules, NOT DISC. `validate_feature_spec.py` warns on boolean DISC entries (`FeatureSpec.disc_boolean`). Clean boundary: multi-value enum → DISC; boolean flag → BR; multi-predicate / interaction / flow → DEC.
- **Legacy plan layout (pre-v4.0.0):** `artifacts/features/{slug}/spec.md` detected → emit `[INFO] legacy_plan_detected`. Recommend `rm -rf artifacts/features/ && --features <all F###>` to regenerate. No auto-migration.
- **Output language — first run sets primary (v5.1.0):** `--lang vi` on a fresh repo → vi IS the primary, generated inline from source (no "run English first" step). A later `--lang jp` translates FROM vi. The primary language is recorded in `state.primary_lang` (set once, first run). Default (no `--lang`) → primary=en. Dispatch: `eff_lang == primary_lang` → inline generation (Path A); else → translate-from-primary (Path B). Location: `en`→`docs/`, else→`docs/<lang>/`. English skeleton (headings, code tokens, field labels, table headers, fenced code, frontmatter) preserved in ALL languages so existing validators run unchanged.
- **Auto-sync secondary languages (v5.1.0):** After ANY primary pass promotes, orchestrator automatically re-translates changed artifacts into every existing secondary mirror (`state.translations` keys). Scoped to the pass's changed artifacts only (not full re-translate). Failure of one language's sync is isolated: warn + leave stale + continue others; primary pass stays success. Env opt-out: `REBUILD_AUTO_SYNC_TRANSLATIONS=0` (writes `translation-stale.json` + handoff instead).
- **Outdated translation guard:** `--lang L` (secondary) when primary SHA moved ahead of `translations[L].translated_from_sha` → `[WARN] primary_ahead_of_translation` + recommendation. Proceeds (non-blocking).
- **Missing primary guard:** `--lang L` (secondary) but no primary docs exist → `"No <primary_lang> primary to translate from; run /tkm:rebuild-spec first"` + stop. Defensive; should be unreachable via normal dispatch.
- **Skeleton-identity validator:** `validate_translation_skeleton.py` checks that mirrors preserve the English skeleton byte-identical (headings, code tokens, field labels, table headers, fenced code, frontmatter). CRITICAL on any drift. Replaces re-running full validators on mirrors.
- **Translation scope = rebuild-spec only:** manage-docs/doc-writer/takumi keep writing English `docs/` root; NOT modified by `--lang`.

## Output

- Persistent:
  - `docs/system/{overview,architecture,glossary,permissions,business-rules}.md` — curated
  - `docs/generated/{route-list,api-map,permissions-matrix,entities,user-stories,feature-list}.md` — raw
  - `docs/flows/<slug>.md` — AI-drafted cross-feature flows
  - `docs/features/<slug>/{technical-spec,business-context,screens,edge-cases}.md` — per feature (4 files)
  - `docs/decisions/ADR-*.md` — human only
- Drafts + reports: `plans/<active-plan>/artifacts/` (kept for audit).
- Journal: auto-invoke `/tkm:write-journal` on completion (optional — skip silently if skill unavailable).

## References

- `references/code-formats.md` — F###/US###/SCR###/BL###/PERM### schema + valid criteria
- `references/verification-checklist-universal.md` — universal rules + Pending Marker Rule
- `references/verification-checklist-core-artifacts.md` — W7a core artifact rules (11 artifacts + Composite Detection)
- `references/verification-checklist-feature-spec.md` — FS.5 feature spec rules (Deterministic Validator Coverage + Failure Trap)
- `references/verification-checklist-screen-spec.md` — SS.2 screen spec rules
- `references/verification-checklist-quality-gates.md` — W4.5 / W5.6 targeted gates
- `references/pipeline.md` — wave dep graph, wave -2/planner/branch-on-mode, reconcile pattern, artifact paths (always loaded)
- `references/pipeline-w0-w5.md` — W0–W5 dispatch bodies (load before W0–W5)
- `references/pipeline-w5x-w6.md` — W5.5 feature existence gate + W5.6 FeatureList quality gate (load before those waves)
- `references/pipeline-w7-w9.md` — W7a/W7.5/W8/W9 core review/fix/promote dispatch bodies (load before those waves)
- `references/pipeline-feature-specs.md` — **[NEW v5]** Feature-specs pass FS.1–FS.7 (load when `--feature-specs` or `--features` flag set)
- `references/pipeline-flows-glossary.md` — **[NEW v5]** Flows pass FL.1–FL.5 + Glossary pass GL.1–GL.3 (load when `--flows` or `--glossary` flag set)
- `references/pipeline-screen-specs.md` — Screen-Specs pass SS.1–SS.3 (load when `--screen-specs` flag set)
- `references/feature-spec-researcher-contract.md` — FS.1 mandatory rules; `references/bl-source-patterns.md` — per-stack BL file patterns (9 stacks, Mode A+B)
- `references/spec-authoring-contract.md` — takumi greenfield spec authoring rules (draft frontmatter, authoring-mode inputs, gap schema, screen-spec scope, state-registration handoff)
- `references/spec-stage-procedure.md` — shared Stage 1.5 spec-authoring orchestration; consumed by takumi Stage 1.5 + tkm-plan spec gate. Step 0: enumerate-first scope assessment — (B) CLOSED conjunction smell-flag (ALWAYS-fire → force SYSTEM; NEVER-fire CRUD pairs → enumerate; gray zone → enumerate) then (A) intent enumeration (count ≥2 → SYSTEM default; =1 → SINGLE; `--fast` → always SINGLE). Emits `plans/<plan_dir>/spec/.intent-enum.json` as chokepoint artifact. Steps 0a–0b: feature-list draft + quality gate (SYSTEM only). Rest Point 1.5a: confirm feature set (BLOCKING incl. `--auto`). Steps 1–2.5: slug resolution, researcher fan-out, shape verification. Step 3: gap clarification + approval gate.
- `references/process-flow-researcher-contract.md` — FL.1 process-flow synthesis contract
- `references/canonical-fcode-schema.md` — fcode JSON schema + slug grammar + folder lifecycle; `references/incremental-state-schema.md` — state/index/plan JSON schemas
- `scripts/incremental_planner.py` — cascade-aware incremental planner (decision oracle for selective dispatch)
- `scripts/build_source_to_fcode.py` — per-pass reverse-index + state emitter; `--cursor` arg controls which state cursor is advanced (core: `last_rebuild_sha`; feature-specs: `last_feature_spec_run_sha`; flows: `last_flows_run_sha`; glossary: `last_glossary_run_sha`)
- `references/pipeline-translate.md` — **[NEW v5.1]** Translate pass TR.0–TR.5 + auto-sync entry. Auto-sync now driven by `scripts/translation_sync_gate.py` (plan + finalize modes); handoff line emitted by script, not LLM. Load when `--lang` targets a secondary language, OR on any primary pass when `translations` in state is non-empty — see On-demand pipeline loading.
- `references/translation-contract.md` — **[NEW v5.1]** Subagent rules for prose-only translation with skeleton preservation
- `scripts/validate_translation_skeleton.py` — **[NEW v5.1]** Skeleton-identity validator for translation mirrors
- `scripts/_lang_lib.py` — **[NEW v5.1]** Language resolution helpers (`normalize_lang`, `resolve_docs_root`, `looks_unusual`)
- `scripts/` — deterministic validators (`validate_feature_existence.py`, `validate_feature_spec.py`, `validate_source_citations.py`, `validate_process_flow.py`); shared libs (`_slug_lib.py`, `_summary_lib.py`, `_layout_lib.py`); migration: `migrate-behavior-logic-rename.py`; stdlib-only, no pip
- Canonical docs mapping: `claude/skills/_shared/docs-canonical-mapping.md` — single source of truth for topic → file ownership, stub rule, surgical-edit policy
