# Validate Workflow

Sit the user down with the hard questions — test the assumptions, lock in the decisions, and drag any lurking problems into the open before a line of code gets written.

## Plan Resolution

1. `$ARGUMENTS` given → use that path
2. Otherwise read the `## Plan Context` section → use the active plan path
3. Still nothing → ask the user for a path, or to run `/tkm:create-plan --level high` first

## Configuration

Pull the validation settings from the `## Plan Context` section:
- `mode` - drives the auto/prompt/off behavior
- `questions` - a range like `3-8` (min-max)

## Workflow

### Step 1: Read Plan Files
- `plan.md` - the overview and the phases list
- `phase-*.md` - every phase file
- Hunt for decision points, assumptions, risks, and trade-offs

### Step 2: Extract Question Topics
Load: `references/validate-question-framework.md`

### Step 3: Generate Questions
Turn each topic you found into a concrete question carrying 2-4 options.
Tag the one you'd recommend with a "(Recommended)" suffix.

### Step 4: Interview User
Run the `AskUserQuestion` tool.
- Take the question count from the `## Plan Context` validation settings
- Bundle related questions together (4 to a tool call, no more)
- Aim at the assumptions, the risks, the trade-offs, the architecture

**If `--grill` is active:** ignore the steps above. Load `../../../rules/grill-loop-protocol.md`
and run the grill loop instead — one question at a time, adaptive, no `questions=` count and no
4-per-call batching. Sink = the `## Validation Log` (see Step 5). The interview stays on the main
thread even when `--parallel` fanned research out to sub-agents.

### Step 5: Document Answers
Open or extend a `## Validation Log` section inside `plan.md`.
Load: `references/validate-question-framework.md` for the recording format.
Under `--grill`, append each decision to the log **the moment it crystallizes** (one entry per
answer, as it arrives) rather than waiting for the whole interview to finish.

### Step 6: Propagate Changes to Phases
Push the validation decisions out to whichever phase files they touch.
Drop in a marker: `<!-- Updated: Validation Session N - {change} -->`

## Output
- How many questions you asked
- The key decisions now locked in
- What the phase propagation changed
- Your call: proceed or revise

## Next Steps (MANDATORY)
Remind the user, absolute path filled in:
> **Best Practice:** Run `/clear` before building so you start on a clean slate.
> Then run:
> ```
> /tkm:takumi --auto {ABSOLUTE_PATH_TO_PLAN_DIR}/plan.md
> ```
> **Why `--auto`?** The plan's already been validated, so the review gates can come off.
> **Why the absolute path?** A `/clear` wipes what the last session knew.
> A clean slate lets Claude give all its attention to building, free of planning-context noise.

## Important Notes
- Only raise the questions that hinge on a real decision
- A simple plan can land under the minimum question count — that's fine
- Lead with the questions that could swing the implementation hardest
