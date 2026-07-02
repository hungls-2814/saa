# Parallel Review Workflow

**Ultrathink** to exhaustively list ALL potential edge cases, then dispatch parallel `reviewer` agents to verify: <scope>$ARGUMENTS</scope>

**IMPORTANT:** Turn on whatever skills the job needs. Spend tokens sparingly. Trade grammar for brevity.

## Workflow

### 1. Ultrathink Edge Cases

The main agent digs into the scope and LISTS every edge case FIRST, before any reviewer is spawned:
- Pull context from `codebase-summary.md`
- Run `/tkm:scan-codebase` to locate the files that matter
- **Think it through to the end** — every way this could go wrong:
  - Null and undefined slipping through
  - Boundaries: off-by-one, empty, max
  - Gaps in error handling
  - Races and async edge cases
  - Holes in input validation
  - Security weaknesses
  - Leaked resources
  - Code paths nobody tested

**Output format:**
```markdown
## Edge Cases Identified

### Category: [scope-area]
1. [edge case description] → files: [file1, file2]
```

### 2. Categorize & Assign

Bundle edge cases by shared scope so they can be checked in parallel:
- Each category → one `reviewer` agent
- Max 6 categories (merge small ones)
- Hand each reviewer a fixed set of edge cases to VERIFY — not to go discover more

### 3. Parallel Verification

Launch N `reviewer` subagents simultaneously:
- Give each one: the category name, its list of edge cases, the files in play
- Their job: **VERIFY** that each edge case is actually handled in the code
- Their report: which ones hold, which ones don't

### 4. Aggregate Results

```markdown
## Edge Case Verification Report

### Summary
- Total edge cases: X
- Handled: Y
- Unhandled: Z
- Partial: W

### Unhandled Edge Cases (Need Fix)
| # | Edge Case | File | Status |
|---|-----------|------|--------|
```

### 5. Adversarial Review (Always-On)

Once the results are in, set the adversarial reviewer (see `adversarial-review.md`) loose on the whole scope:
- It gets the aggregated findings plus the unhandled edge cases as context
- It goes after the code harder than edge-case verification did, looking for new breaks
- Each finding earns a verdict: Accept / Reject / Defer

### 6. Auto-Fix Pipeline

**IF** unhandled/partial edge cases found:
- Ask: "Found N unhandled edge cases. Fix with /tkm:fix-bug --parallel? [Y/n]"

### 7. Final Report
- Summary of verification
- Ask: "Commit? [Y/n]" → use `git-manager`
