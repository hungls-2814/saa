# Surveying from Inside, with Explore Subagents

Reach for Explore subagents whenever SCALE >= 6, or when the external tools simply aren't on hand.

## How It Works

Fan out across the tree by firing several `Explore` subagents through the `Task` tool at once.

## Task Tool Configuration

```
subagent_type: "Explore"
```

## Prompt Template

```
Quickly scout {DIRECTORY} for files related to: {USER_PROMPT}

Instructions:
- Search for relevant files matching the task
- Use Glob/Grep for file discovery
- List files with brief descriptions
- Timeout: 3 minutes max
- Skip if timeout reached

Report format:
## Found Files
- `path/file.ext` - description

## Patterns
- Key patterns observed
```

## Spawning Strategy

### Directory Division
Break the tree along its natural seams:
- `src/` - Source code
- `lib/` - Libraries
- `tests/` - Test files
- `config/` - Configuration
- `api/` - API routes

### Parallel Execution
- Fire every agent inside one `Task` tool call
- Give each its own directory scope
- Keep those scopes from overlapping

## Example

User prompt: "Find authentication-related files"

```
Agent 1: Scout src/auth/, src/middleware/ for auth files
Agent 2: Scout src/api/, src/routes/ for auth endpoints
Agent 3: Scout tests/ for auth tests
Agent 4: Scout lib/, utils/ for auth utilities
Agent 5: Scout config/ for auth configuration
Agent 6: Scout types/, interfaces/ for auth types
```

## Timeout Handling

- Cap each agent at three minutes
- Let the silent ones go
- Never relaunch one that already timed out
- Work with whatever did come back

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

## Result Aggregation

Stitch every agent's findings together:
1. Drop duplicate file paths
2. Reconcile the descriptions into one
3. Flag any blind spots or timeouts
4. List unresolved questions
