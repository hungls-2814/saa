# Surveying from Outside, with Gemini/OpenCode

Hand the search to external agentic tools when you want speed and a roomy context window — these stretch past a million tokens.

## Tool Selection

```
SCALE <= 3  → gemini CLI
SCALE 4-5   → opencode CLI
SCALE >= 6  → Use internal scouting instead
```

## Configuration

Read from `.claude/.tkm.json`:
```json
{
  "gemini": {
    "model": "gemini-3-flash-preview"
  }
}
```

Default model: `gemini-3-flash-preview`

## Gemini CLI (SCALE <= 3)

### Command
```bash
gemini -y -m <model> "[prompt]"
```

### Example
```bash
gemini -y -m gemini-3-flash-preview "Search src/ for authentication files. List paths with brief descriptions."
```

## OpenCode CLI (SCALE 4-5)

### Command
```bash
opencode run "[prompt]" --model opencode/grok-code
```

### Example
```bash
opencode run "Find all payment-related files in lib/ and api/" --model opencode/grok-code
```

## Installation Check

Confirm the tools are actually on the machine before you lean on them:
```bash
which gemini
which opencode
```

When they're missing, put it to the user:
1. **Yes** - Hand over the install steps (a manual auth pass may be needed)
2. **No** - Drop back to the Explore subagents in `internal-scouting.md`

## Spawning Parallel Bash Agents

Lean on the `Task` tool with `subagent_type: "Bash"` to launch agents in parallel:

```
Task 1: subagent_type="Bash", prompt="Run: gemini -y -m gemini-3-flash-preview '[prompt1]'"
Task 2: subagent_type="Bash", prompt="Run: gemini -y -m gemini-3-flash-preview '[prompt2]'"
Task 3: subagent_type="Bash", prompt="Run: gemini -y -m gemini-3-flash-preview '[prompt3]'"
```

Put them all in one message so they run side by side.

## Prompt Guidelines

- Name the exact directories the tool should comb through
- Ask it back for paths, each with a line of description
- Draw the scope boundaries plainly
- Where it matters, ask it to surface patterns and how things relate

## Example Workflow

User: "Find database migration files"

Send out 3 Bash agents in parallel through the Task tool:
```
Task 1 (Bash): "Run: gemini -y -m gemini-3-flash-preview 'Search db/, migrations/ for migration files'"
Task 2 (Bash): "Run: gemini -y -m gemini-3-flash-preview 'Search lib/, src/ for database schema files'"
Task 3 (Bash): "Run: gemini -y -m gemini-3-flash-preview 'Search config/ for database configuration'"
```

## Reading File Content

To read file bodies without blowing the context budget, slice them into chunks and stay under the ~150K-token safe zone.

### Step 1: Get Line Counts
```bash
wc -l path/to/file1.ts path/to/file2.ts path/to/file3.ts
```

### Step 2: Calculate Chunks
- **Aim for:** roughly 500 lines a chunk — comfortable for nearly any file
- **Per agent, cap it at:** three to five small files, or a single big one cut into pieces

**Chunking formula:**
```
chunks = ceil(total_lines / 500)
lines_per_chunk = ceil(total_lines / chunks)
```

### Step 3: Spawn Parallel Bash Agents

**For small files, under 500 lines apiece:**
```
Task 1: subagent_type="Bash", prompt="cat file1.ts file2.ts"
Task 2: subagent_type="Bash", prompt="cat file3.ts file4.ts"
```

**For one large file over 500 lines, walk it in ranges with `sed`:**
```
Task 1: subagent_type="Bash", prompt="sed -n '1,500p' large-file.ts"
Task 2: subagent_type="Bash", prompt="sed -n '501,1000p' large-file.ts"
Task 3: subagent_type="Bash", prompt="sed -n '1001,1500p' large-file.ts"
```

### Chunking Decision Tree
```
File < 500 lines     → Read entire file
File 500-1500 lines  → Split into 2-3 chunks
File > 1500 lines    → Split into ceil(lines/500) chunks
```

Put them all in one message so they run side by side.

## Timeout and Error Handling

- Hold each bash call to a three-minute ceiling
- Walk away from the ones that time out
- Leave a failed agent down — no relaunching
- If failures keep coming, retreat to internal scouting
