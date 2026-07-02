---
name: tkm:review-code
description: "Put a change under hostile scrutiny before it lands — hunt the security holes, the unspoken assumptions, and the ways it quietly breaks. Works on a staged diff, a named PR, a single commit, or a sweep of the whole tree. The red-team pass is what stops trouble from reaching main."
argument-hint: "[#PR|commit|--pending|codebase] [--level low|medium|high|max]"
metadata:
  author: takumi-agent-kit
  version: "2.0.0"
module: testing-code-quality
triggers: ["review code", "code review", "check my PR", "before merging", "is this safe"]
---

# The Master's Inspection

A master craftsman does not admire finished work — they interrogate it.
Every joint is pressed. Every surface is checked against the light.
The piece must hold not just under ideal conditions, but under every force that will ever touch it.

This skill is that interrogation: structured, adversarial, evidence-based.
Praise is not inspection. Discomfort is the point.

## What to Inspect

Read the target off the arguments. When they are unclear, or there are none, fall back to `AskUserQuestion` rather than guessing.

| Input | Mode | What Gets Reviewed |
|-------|------|--------------------|
| `#123` or PR URL | **PR** | Full PR diff fetched via `gh pr diff` |
| `abc1234` (7+ hex chars) | **Commit** | Single commit diff via `git show` |
| `--pending` | **Pending** | Staged + unstaged changes via `git diff` |
| *(no args, recent changes)* | **Default** | Recent changes in context |
| `codebase` | **Codebase** | Full codebase scan |
| `codebase parallel` | **Codebase+** | Parallel multi-reviewer audit |

**Resolution details:** `references/input-mode-resolution.md`

### When Called Without Arguments

With nothing passed in and no recent changes to lean on, ask the user directly — `AskUserQuestion`, header "Review Target", question "What would you like to review?":

| Option | Description |
|--------|-------------|
| Pending changes | Review staged/unstaged git diff |
| Enter PR number | Fetch and review a specific PR |
| Enter commit hash | Review a specific commit |
| Full codebase scan | Deep codebase analysis |
| Parallel codebase audit | Multi-reviewer codebase scan |

## Processing Level

Accepts `--level low|medium|high|max` (default: `medium`).
See `_shared/processing-levels.md` for global semantics.

| Level | Stage 1 spec | Stage 2 quality | Stage 3 adversarial |
|-------|-------------|----------------|---------------------|
| `low` | Skip | Quick pass | No |
| `medium` *(default)* | Yes | Standard | Scope gate applies |
| `high` | Yes | Deep | Forced |
| `max` | Yes | Deep | Parallel multi-reviewer |

> `--level max` is equivalent to `codebase parallel` + full 3-stage pipeline.
> `--level high` overrides the Stage 3 scope gate (skips the `≤2 files, ≤30 lines` exemption).
> At `--level low`, Stage 1 spec compliance is skipped *unless* the review runs from a plan (plan context forces spec compliance back on); the quick pass is Stage 2 quality — this is review-code's "quick-pass equivalent" per `_shared/processing-levels.md`.

## The Inspection Law

**YAGNI**, **KISS**, **DRY** — every time. When correctness and comfort pull against each other, correctness wins.
Say the true thing, not the easy one. No padding, no hedging.

Confirm it before you state it. Ask before you assume. Let the evidence lead, not the conclusion.

## Inspection Disciplines

| Discipline | When | Reference |
|----------|------|-----------|
| **Spec compliance** | After implementing from plan/spec, BEFORE quality review | `references/spec-compliance-review.md` |
| **Adversarial review** | Always-on Stage 3 — actively tries to break the code | `references/adversarial-review.md` |
| Receiving feedback | Unclear feedback, external reviewers, needs prioritization | `references/code-review-reception.md` |
| Requesting review | After tasks, before merge, stuck on problem | `references/requesting-code-review.md` |
| Verification gates | Before any completion claim, commit, PR | `references/verification-before-completion.md` |
| Edge case scouting | After implementation, before review | `references/edge-case-scouting.md` |
| **Checklist review** | Pre-landing, `/tkm:ship` pipeline, security audit | `references/checklist-workflow.md` |
| **Task-managed reviews** | Multi-file features (3+ files), parallel reviewers, fix cycles | `references/task-management-reviews.md` |

## How to Route the Work

```
SITUATION?
│
├─ Input mode? → Resolve diff (references/input-mode-resolution.md)
│   ├─ #PR / URL → fetch PR diff
│   ├─ commit hash → git show
│   ├─ --pending → git diff (staged + unstaged)
│   ├─ codebase → full scan (references/codebase-scan-workflow.md)
│   ├─ codebase parallel → parallel audit (references/parallel-review-workflow.md)
│   └─ default → recent changes in context
│
├─ Received feedback → STOP if unclear, verify if external, implement if human partner
├─ Completed work from plan/spec:
│   ├─ Stage 1: Spec compliance review (references/spec-compliance-review.md)
│   │   └─ PASS? → Stage 2 │ FAIL? → Fix → Re-review Stage 1
│   ├─ Stage 2: Code quality review (reviewer subagent)
│   │   └─ Scout edge cases → Review standards, performance
│   └─ Stage 3: Adversarial review (references/adversarial-review.md) [ALWAYS-ON]
│       └─ Red-team the code → Adjudicate → Accept/Reject findings
├─ Completed work (no plan) → Scout → Code quality → Adversarial review
├─ Pre-landing / ship → Load checklists → Two-pass review → Adversarial review
├─ Multi-file feature (3+ files) → Create review pipeline tasks (scout→review→adversarial→fix→verify)
└─ About to claim status → RUN verification command FIRST
```

### Three-Stage Inspection Protocol

**Stage 1 — Spec Compliance** (load `references/spec-compliance-review.md`)
- Did the code build what was actually asked for?
- Anything the spec called for but the code skipped? Anything it grew that nobody asked for?
- This gate has to clear before Stage 2 begins

**Stage 2 — Code Quality** (reviewer subagent)
- Held back until spec compliance signs off
- Standards, security, performance, edge cases

**Stage 3 — Adversarial Review** (load `references/adversarial-review.md`)
- Fires once Stage 2 clears, gated by scope (skipped when <=2 files, <=30 lines, no security files)
- Hand the adversarial reviewer its bearings up front — runtime, framework, context files — then let it loose
- Hunt for: security holes, false assumptions, resource exhaustion, race conditions, supply chain, observability gaps
- Each finding lands a verdict: Accept (must fix) / Reject (false positive) / Defer (GitHub issue)
- A Critical blocks the merge; re-runs feed only the fix diff back through

## The Inspection Verdict (Evidence Artifact)

This inspection is the **emitter** of `inspection-verdict.json` — the artifact the evidence gate reads when takumi/ship/fix-bug seal their work. When a plan or evidence dir backs the review, write the merged Stage-2 + Stage-3 result as a **single** verdict into `{plan}/evidence/inspection-verdict.json`:

```json
{ "score": 9, "criticalCount": 0, "decision": "SEALED",
  "acceptanceCovered": [], "regressionChecked": [], "contractStatus": "OK",
  "refuted": [], "unproven": [], "reachableRegressions": [] }
```

- **Single writer** — one file, written once; a partial write is rejected by the validator.
- `decision` is `SEALED` only when `criticalCount == 0` AND `refuted`/`unproven`/`reachableRegressions` are empty AND `contractStatus != UNKNOWN`. Otherwise `REWORK` (fixable) or `BLOCKED`. The `score` is advisory — it never seals on its own.
- Map Stage 3 outcomes: rejected-as-false-positive claims you actively disproved → `refuted`; claims you could not demonstrate → `unproven`; regressions you showed reachable → `reachableRegressions`.
- **This skill does NOT call the gate.** It is the emitter, not a gated consumer — gating an inspection against its own verdict would be circular. The gate runs in the *consuming* skills (takumi/ship/fix-bug). Shape + intent: `_shared/references/evidence-artifacts.md`.

## When Feedback Arrives

**Pattern:** READ → UNDERSTAND → VERIFY → EVALUATE → RESPOND → IMPLEMENT
Skip the reflexive "good point." Check it against the code before you act on it. When the note is wrong, say so.

**Full protocol:** `references/code-review-reception.md`

## Commissioning an Inspection

**When:** At the close of each task, on sizable features, ahead of any merge

**Process:**
1. **Walk the edges first** (see below)
2. Capture SHAs: `BASE_SHA=$(git rev-parse HEAD~1)` and `HEAD_SHA=$(git rev-parse HEAD)`
3. Hand the reviewer subagent the full brief: WHAT, PLAN, BASE_SHA, HEAD_SHA, DESCRIPTION
4. Critical gets fixed on the spot; Important gets fixed before you move on

**Full protocol:** `references/requesting-code-review.md`

## Scouting the Edges

**When:** After implementation, before commissioning a reviewer

**Process:**
1. Run `/tkm:scan-codebase` aimed squarely at edge cases
2. The scout maps it out: which files the change touches, how data moves, where errors travel, what sits at the boundaries
3. Sift the scout's findings for anything that could bite
4. Close the critical gaps before the reviewer ever sees the code

**Full protocol:** `references/edge-case-scouting.md`

## Inspection Pipeline (Task-Managed)

**When:** Multi-file features (3+ changed files), parallel reviewer scopes, review cycles with Critical fix iterations.

**Fallback:** Task tools (`TaskCreate`/`TaskUpdate`/`TaskGet`/`TaskList`) are CLI-only — unavailable in VSCode extension. If they error, use `TodoWrite` for tracking and run pipeline sequentially. Inspection quality is identical.

**Pipeline:** scout → review → adversarial → fix → verify (each a Task with dependency chain)

```
TaskCreate: "Scout edge cases"         → pending
TaskCreate: "Review implementation"    → pending, blockedBy: [scout]
TaskCreate: "Adversarial review"       → pending, blockedBy: [review]
TaskCreate: "Fix critical issues"      → pending, blockedBy: [adversarial]
TaskCreate: "Verify fixes pass"        → pending, blockedBy: [fix]
```

**Parallel reviews:** Spawn scoped reviewer subagents for independent file groups (e.g., backend + frontend). Fix task blocks on all reviewers completing.

**Re-review cycles:** When a fix breaks something new, open a cycle-2 review task. Cap it at 3 cycles; past that, hand it to the user.

**Full protocol:** `references/task-management-reviews.md`

## The Verification Gate

**Iron Law:** NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE

**Gate:** IDENTIFY command → RUN full → READ output → VERIFY confirms → THEN claim

**Requirements:**
- Tests pass: Output shows 0 failures
- Build succeeds: Exit 0
- Bug fixed: Original symptom passes
- Requirements met: Checklist verified

**Warning signs:** "should"/"probably"/"seems to", satisfaction before verification, trusting agent reports without running commands

**Full protocol:** `references/verification-before-completion.md`

## Where This Fits

- **Subagent-Driven:** Scout → Review → Adversarial → Verify before next task
- **Pull Requests:** Scout → Code quality → Adversarial → Merge
- **Task Pipeline:** Create review tasks with dependencies → auto-unblock through chain
- **Takumi Handoff:** Takumi completes phase → review pipeline tasks (incl. adversarial) → all complete → takumi proceeds
- **PR Review:** `/code-review #123` → fetch diff → full 3-stage review on PR changes
- **Commit Review:** `/code-review abc1234` → review specific commit with full pipeline

## Codebase Analysis Subcommands

| Subcommand | Reference | Purpose |
|------------|-----------|---------|
| `/tkm:review-code codebase` | `references/codebase-scan-workflow.md` | Scan & analyze the codebase |
| `/tkm:review-code codebase parallel` | `references/parallel-review-workflow.md` | Ultrathink edge cases, then parallel verify |

## The Master's Standard

1. Know what you are inspecting before touching it — resolve input mode first
2. Technical truth over social ease
3. Scout the edges before calling in the inspector
4. Adversarial review on EVERY piece — no exceptions
5. Evidence first. Conclusions after.

Inspect. Probe. Break. Question. Verify. Then — and only then — sign off.
