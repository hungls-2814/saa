# Red Team Review

Put the plan in front of parallel reviewer subagents whose only job is to break it. Each one wears a different hostile lens. You then weigh what they found, and the user calls which fixes land.

**Mindset:** like paying someone who can't stand the implementer to take their work apart.

## Plan Resolution

1. `$ARGUMENTS` given → use that path
2. Otherwise read the `## Plan Context` section → use the active plan path
3. Still nothing → ask the user for a path, or to run `/tkm:create-plan` first

## Workflow

### Step 1: Read Plan Files
Read the whole plan directory:
- `plan.md` — overview, phases, dependencies
- `phase-*.md` — every phase file, in full

### Step 2: Scale Reviewer Count

| Phase Count | Reviewers | Lenses Selected |
|-------------|-----------|-----------------|
| 1-2 phases | 2 | Security Adversary + Assumption Destroyer |
| 3-5 phases | 3 | + Failure Mode Analyst |
| 6+ phases | 4 | + Scope & Complexity Critic (all lenses) |

### Step 3: Define Adversarial Lenses
Load: `references/red-team-personas.md`

### Step 4: Spawn Reviewers
Fire the reviewers off at once through the Task tool with `subagent_type: "reviewer"`.
Every reviewer prompt has to carry the override, the persona, the plan file paths, and the hostile instructions.
Load: `references/red-team-personas.md` for the reviewer prompt template.

### Step 5: Collect, Deduplicate & Cap
1. Gather every finding
2. Merge the ones that overlap
3. Order them by severity: Critical → High → Medium
4. Stop at 15

### Step 6: Adjudicate
Take each finding and call it: **Accept** or **Reject**.

### Step 7: User Review
Put it to the user through `AskUserQuestion`:
- "Looks good, apply accepted findings"
- "Let me review each one"
- "Reject all, plan is fine"

**If "Let me review each one":**
Walk every finding you marked Accept back through `AskUserQuestion`:
- Options: "Yes, apply" | "No, reject" | "Modify suggestion"

**If "Modify suggestion":**
Ask through `AskUserQuestion`: "Describe your modification to this finding's suggested fix:"
(the user types it in via the "Other" option)
Capture their version, and mark the disposition "Accept (modified)" in the Red Team Review table.

### Step 8: Apply to Plan
For the findings that land, edit the target phase files inline and drop a marker.
Add a `## Red Team Review` section to `plan.md`.

## Output
- Findings counted by severity
- How many accepted versus rejected
- Which files changed
- The key risks you closed off

## Next Steps (MANDATORY)
Point the user at `/tkm:create-plan validate`, then `/tkm:takumi --auto`.

## Important Notes
- Reviewers stay HOSTILE — they're not here to help
- Merge duplicates without mercy
- Every adjudication rests on evidence
- Reviewers read the plan files for themselves
