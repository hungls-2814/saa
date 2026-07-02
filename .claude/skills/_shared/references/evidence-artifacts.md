# Evidence Artifacts — the Takumi Quality Gate

A craftsman does not say *"it is done."* He shows the grain, the joint, the
finish under light. Takumi's Deliver/ship/fix-bug flows make "done" mean
**evidence, not a promise**: each stage leaves a structured artifact, and a
deterministic validator reads those artifacts before any commit or push.

This document is the **contract** for the three artifacts. It is descriptive —
the **single source of truth is the validator code** at
`claude/hooks/lib/evidence-validator.cjs`. There is no `ajv`, no standalone
`.json` schema file, nothing to drift out of sync. If the doc and the code ever
disagree, the code wins, and the doc is the bug.

## Where the artifacts live

Every artifact is written into the **plan's own evidence directory**:

```
{plan}/evidence/
├── study-context.json        # what we set out to build (the brief)
├── temper-results.json       # what survived the fire (commands + outcomes)
└── inspection-verdict.json   # the master's inspection (review + adversarial)
```

The calling skill already knows `{plan}` from its plan context. It resolves the
absolute `{plan}/evidence/` path **once** and passes it explicitly to every
subagent. Nothing re-resolves a plan from the session or the branch — there is
no resolution to bypass, and no two subagents can race to a different directory.

When stages run in parallel, each instance writes a per-instance file
(`temper-results-<label>.json`); the validator aggregates every
`temper-results*.json` it finds.

---

## `study-context.json` — the brief

**Emitter:** the gated skill, at its scoping step (takumi `Study`; ship/fix-bug
at the equivalent "what am I changing and why" point), once the work is scoped.

```json
{
  "task": "Add a code-enforced evidence gate to takumi Deliver",
  "mode": "auto",
  "acceptanceCriteria": [
    "gate blocks a faked-evidence ship",
    "gate passes a real SEALED ship"
  ],
  "touchpoints": [
    "claude/hooks/lib/evidence-validator.cjs",
    "claude/skills/takumi/SKILL.md"
  ],
  "blastRadius": ["takumi Deliver", "ship pre-push", "fix-bug commit"],
  "contracts": [
    "node claude/skills/_shared/lib/evidence-gate.cjs --evidence-dir <abs> --stage hard"
  ]
}
```

| Field | Anti-faking intent |
|-------|--------------------|
| `task` | One sentence of what is being built. An empty brief = nothing to inspect against. |
| `mode` | The workflow mode (`auto`, `interactive`, …) — records how much human gating applied. |
| `acceptanceCriteria` | The list the inspection must later prove **covered**. Empty ⇒ "done" is unfalsifiable ⇒ rejected. |
| `touchpoints` | The files actually touched. Grounds the regression check in real blast radius. |
| `blastRadius` | The behaviors that could break — the reviewer must walk these. |
| `contracts` | Public surfaces (commands, signatures, schemas) that must stay stable unless called out. |

---

## `temper-results.json` — what survived the fire

**Emitter:** the `tester` subagent supplies **raw command runs** (the command,
its real exit code, a one-line summary) into the evidence dir. The **validator
code** (`buildTemperResults`) assembles the strict JSON — a small model is never
asked to hand-write schema-valid JSON, so `exitCode` is always a real integer,
never a string the agent typed.

```json
{
  "commands": [
    {
      "command": "node --test claude/hooks/lib/__tests__/evidence-validator.test.cjs",
      "exitCode": 0,
      "status": "pass",
      "summary": "evidence-validator matrix green",
      "ts": "2026-06-16T05:00:00.000Z"
    }
  ]
}
```

| Field | Anti-faking intent |
|-------|--------------------|
| `command` | The exact command run. No command ⇒ no proof a test was run at all. |
| `exitCode` | Must be a real **integer**. A string `"0"` is the classic fake — the validator blocks it (the code that constructs the file guarantees an int). |
| `status` | `pass` \| `fail` \| `skipped`. Any `fail` at a hard stage blocks — you cannot ship over a red test. |
| `summary` | A one-line human-readable outcome. Empty/missing ⇒ blocks (a blank summary hides a failure). |
| `ts` | ISO timestamp of the run — records *when* the fire was lit. |

A hard stage requires **at least one** command with `status: "pass"`. An empty
`commands` array is not "all green" — it is "nothing was tempered" ⇒ block.

---

## `inspection-verdict.json` — the master's inspection

**Emitter:** the `reviewer` subagent (and the `review-code` skill) — a **single
writer**. It merges the ordinary review dimension and the adversarial dimension
into one verdict. A partial write is rejected.

```json
{
  "score": 9,
  "criticalCount": 0,
  "decision": "SEALED",
  "acceptanceCovered": ["gate blocks faked ship", "gate passes SEALED ship"],
  "regressionChecked": ["takumi Deliver unaffected", "hook suite green"],
  "contractStatus": "OK",
  "refuted": [],
  "unproven": [],
  "reachableRegressions": []
}
```

| Field | Anti-faking intent |
|-------|--------------------|
| `score` | Advisory only. A high score **never** seals by itself — `decision` does. Score 10 + `decision: BLOCKED` still blocks. |
| `criticalCount` | Open critical issues. `SEALED` requires this to be `0`. |
| `decision` | `SEALED` \| `REWORK` \| `BLOCKED`. Only `SEALED` passes a hard stage. |
| `acceptanceCovered` | Which acceptance criteria the inspection actually proved. Must be non-empty at a hard stage, and must **cover every criterion in the brief** — each `study-context.json` `acceptanceCriteria` entry has to be echoed (its text contained) by some `acceptanceCovered` entry, or the gate blocks and names the uncovered criterion. |
| `regressionChecked` | The blast-radius items the reviewer walked. Must be non-empty at a hard stage — empty means nothing was verified, and blocks. |
| `contractStatus` | `OK` \| `CHANGED` \| `BROKEN` \| `UNKNOWN`. `UNKNOWN` at a hard stage blocks — an unexamined contract is not a passed one. |
| `refuted` | Claims the adversarial pass **disproved**. Non-empty ⇒ block. |
| `unproven` | Claims asserted but not demonstrated. Non-empty at a hard stage ⇒ block. |
| `reachableRegressions` | Regressions shown to be reachable. Non-empty ⇒ block. |

`SEALED` is earned only when `criticalCount == 0` **and** `refuted`, `unproven`,
`reachableRegressions` are all empty **and** `contractStatus != UNKNOWN` **and**
`acceptanceCovered` and `regressionChecked` are both non-empty (something was
actually proven and the blast radius was actually walked).

---

## Coverage — every claudekit dimension has a takumi home

Takumi merges claudekit's five review dimensions into **three** artifacts. This
table proves nothing was dropped in the merge (it is also why the de-copy check
below is about *originality of authorship*, not pretending the work covers less):

| claudekit dimension (reference only) | Takumi artifact | Takumi field(s) |
|--------------------------------------|-----------------|-----------------|
| context / brief | `study-context.json` | `task`, `acceptanceCriteria`, `touchpoints`, `blastRadius`, `contracts` |
| command verification | `temper-results.json` | `commands[].{command,exitCode,status,summary,ts}` |
| review decision | `inspection-verdict.json` | `score`, `criticalCount`, `decision`, `acceptanceCovered`, `regressionChecked`, `contractStatus` |
| adversarial validation | `inspection-verdict.json` | `refuted`, `unproven`, `reachableRegressions` |
| risk gate | *intentionally cut* | takumi already gates risk via `predict-risks` + Delivery anti-rationalization (YAGNI here) |

---

## De-copy policy (takumi is self-authored)

Takumi's gate is **self-authored** — own schema, own validator logic, own voice.
The de-copy check (Phase 1 step 2 / Phase 6 step 3) greps the takumi artifacts
against claudekit's `workflow-artifacts.md` and asserts **0 shared distinctive
identifiers**, and **fails loud** if the claudekit reference is absent (a missing
reference must not pass the check vacuously).

"Distinctive identifier" means a claudekit-specific name — its **file names**
(`context-snippets`, `risk-gate`, `verification`, `review-decision`,
`adversarial-validation`) and its **structurally-distinctive fields**
(`scoutSummary`, `publicContracts`, `highRisk`, `autoStopRequired`,
`humanApproved`, `largeDiff`, `beforeAfter`, `acceptanceCoverage`,
`regressionProof`, `blockingReasons`, `disprovenClaims`, `unverifiedClaims`,
`missingProof`). Takumi shares none of these — it deliberately chose
`acceptanceCovered`/`regressionChecked`/`refuted`/`unproven` and the
`SEALED`/`REWORK`/`BLOCKED` vocabulary instead.

**Generic JSON primitives are allowed and not counted as copying** — you cannot
author a command-result artifact without them, and they carry no authorship:
`command`, `exitCode`, `status`, `summary`, `score`, `decision`, `task`, `mode`,
`ts`, `criticalCount`, `contractStatus`, `reachableRegressions`,
`acceptanceCriteria`, `touchpoints`, `blastRadius`. These are conventional field
names found across countless tools; sharing them with claudekit is coincidence
of convention, not copied work.

---

## Single source of truth

The validator code at `claude/hooks/lib/evidence-validator.cjs` is authoritative.
No `ajv`. No standalone `.json` schema files. This document follows the code; the
code does not follow this document.
