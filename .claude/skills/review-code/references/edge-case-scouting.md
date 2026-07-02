---
name: edge-case-scouting
description: Run this in the gap between finishing code and handing it to review — let the scout skill flush out edge cases, side effects, and lurking trouble that a reviewer's eye tends to slide past
---

# Edge Case Scouting

Flush out edge cases, side effects, and quiet hazards ahead of the review, not during it.

## Purpose

A review nets the obvious problems; the subtle side effects swim right past. The scout goes after those:
- Files the change touches that a reviewer wouldn't think to open
- Data-flow paths that could snap under the change
- Boundaries and error paths
- Seams between modules where integrations break

## When to Use

**Mandatory:** Features spanning several files, refactors of shared utilities, knotty bug fixes
**Optional:** One-file edits, docs, config

## Process

### 1. Identify Changed Files
```bash
git diff --name-only HEAD~1
```

### 2. Invoke Scout
```
/tkm:scan-codebase edge cases for recent changes.

Changed: {files from git diff}

Find:
1. Anything that imports or leans on the changed modules
2. How data moves through the functions you touched
3. Error paths nobody wrote a test for
4. Boundaries — null, empty, max
5. Races hiding in the async code
6. Side effects of state changes
```

### 3. Analyze & Act

| Finding | Action |
|---------|--------|
| A touched file the review missed | Pull it into scope |
| Data-flow risk | Verify it, or write a test |
| Edge case | Cover it with a test, or confirm it's handled |
| Test gap | Fill it before review |

### 4. Document for Review
```
Scout findings:
- {issues found}
- Verified: {what checked}
- Addressed: {what fixed}
- Needs review: {remaining}
```

## Scout Prompts

**Feature:**
```
Scout edge cases for {feature}.
Changed: {files}
Find: who consumes it, the error states, the untested inputs, performance, compatibility
```

**Bug fix:**
```
Scout side effects of fix in {file}.
Bug: {description}, Fix: {approach}
Find: other paths running this logic, features that depend on it, bugs of the same shape
```

**Refactor:**
```
Scout breaking changes in {module}.
Before: {old}, After: {new}
Find: who imports it, where behavior shifts, what functionality got dropped
```

## What Scout Catches

| Issue | Why Missed | Scout Detects |
|-------|------------|---------------|
| Indirect deps | Never showed in the diff | Follows the imports |
| Race conditions | Eyes alone can't catch them | Walks the flow |
| State mutations | Side effect stays hidden | Tracks the data |
| Missing null checks | Assumed safe | Probes the boundaries |
| Integration breaks | Outside the change's scope | Searches across modules |

## Red Flags

- A shared utility changed, yet only one of its callers got tested
- An error path that dead-ends in an unhandled rejection
- State mutated in place with nobody told
- A breaking change shipped with no migration behind it

## Example

```
1. Done: Add cache to UserService.getUser()
2. Diff: src/services/user-service.ts
3. Scout: "edge cases for caching in getUser()"
4. Report:
   - ProfileComponent expects fresh data on edit
   - AdminPanel loops getUser() (memory risk)
   - No cache clear on updateUser()
5. Fix: Add invalidation, maxSize
6. Document for reviewer
```

## Bottom Line

Scout first, review second. "It's a simple change" is exactly the one to scout anyway.
