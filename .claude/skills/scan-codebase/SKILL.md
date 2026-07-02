---
name: tkm:scan-codebase
description: "Walk a codebase fast with parallel agents — locate files, gather context, and sweep across directories in one pass. Reach for it before any sizeable feature or investigation, so you know what's already there before you touch it."
argument-hint: "[search-target] [ext] [--level low|medium|high|max]"
metadata:
  author: takumi-agent-kit
  version: "1.0.0"
module: project-context-management
triggers: ["find files", "where is X", "what files do I need", "scan code", "map the codebase"]
---

# Reading the Workshop

Before shaping anything, the craftsman walks the workshop.
They read the layout — where materials are stored, how pieces relate, what tools are already in use.
This skill is that walk: fast, parallel, complete.

## Arguments

- Default: Survey using built-in Explore subagents in parallel (`./references/internal-scouting.md`)
- `ext`: Survey using external Gemini/OpenCode CLI tools in parallel (`./references/external-scouting.md`)

## When to Use

- A feature you're about to build reaches across several directories
- The request leans on words like "find this", "track down", or "dig up the file for X"
- A debugging pass that hinges on how files connect to one another
- Someone wants the lay of the land — the project's shape, or where a given capability actually lives
- A change whose blast radius touches more than one corner of the tree

## Processing Level

Accepts `--level low|medium|high|max` (default: `medium`).
See `_shared/processing-levels.md` for global semantics.

| Level | Parallel agents | Coverage | Cross-ref | Output |
|-------|----------------|----------|----------|--------|
| `low` | 2 | Key dirs | No | File list |
| `medium` *(default)* | 4 | Standard | Light | File + summary |
| `high` | 6 | Full | Yes | File + relationships |
| `max` | All dirs | Exhaustive | Dep graph | Full report |

## Quick Start

1. Read the prompt and name the thing you're after
2. Cast a wide net with Grep and Glob to surface candidate files and gauge how big the tree is
3. Send parallel agents out across the directory slices
4. Pull what they bring back into one tight report

## Configuration

Read from `.claude/.tkm.json`:
- `gemini.model` — Gemini model (default: `gemini-3-flash-preview`)

## Workflow

### 1. Analyze the Task

- Read the prompt and pull out what's actually being hunted for
- Note the directories in play, the patterns to match, the file kinds, the rough line counts
- Settle on how many subagents the job warrants

### 2. Divide and Survey

- Carve the tree into segments that make sense, one per agent
- Hand each agent a defined slice — its own directories or its own patterns
- Tile the slices so nothing is searched twice and nothing falls through

### 3. Register Survey Tasks

- **Skip if:** two agents or fewer — the bookkeeping costs more than it returns
- **Skip if:** the Task tools aren't present (VSCode extension); fall back to `TodoWrite`
- Run `TaskList` up front to see whether this session already carries survey tasks
- When it comes back empty, register one `TaskCreate` per agent, each tagged with its scope metadata
- Patterns and worked examples live in `references/task-management-scouting.md`

### 4. Spawn Parallel Agents

Pick the reference the decision tree points you to:
- **Internal (Default):** `references/internal-scouting.md` (Explore subagents)
- **External:** `references/external-scouting.md` (Gemini/OpenCode)

**Notes:**
- Flip each task to `in_progress` via `TaskUpdate` right before its agent goes out (skip when Task tools are absent)
- Spell out for every subagent the precise directories or files it is meant to read
- Budget tightly — a subagent's context window tops out below 200K tokens
- How many you spawn comes down to machine headroom and the size of the file set
- Every subagent owes the main agent a thorough write-up of what it found

### 5. Collect Results

**IMPORTANT:** Invoke "/tkm:organize-files" skill to organize the outputs.

- Give each agent a 3-minute leash; drop the ones that go silent
- Mark finished tasks done with `TaskUpdate`, and note any that ran out the clock in the report (skip when Task tools are absent)
- Fold every agent's findings into one report
- Close with whatever questions remain open

## Report Format

```markdown
# Workshop Survey Report

## Relevant Files
- `path/to/file.ts` - Brief description
- ...

## Unresolved Questions
- Any gaps in findings
```

## References

- `references/internal-scouting.md` — Using Explore subagents
- `references/external-scouting.md` — Using Gemini/OpenCode CLI
- `references/task-management-scouting.md` — Claude Task patterns for survey coordination
