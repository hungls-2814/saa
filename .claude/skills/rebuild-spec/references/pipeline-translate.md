# Pipeline: Translate Pass (TR.0–TR.5) + Auto-Sync Entry

Standalone pass. Loaded when `--lang <code>` targets a secondary language (i.e. `eff_lang != primary_lang`). Also invoked automatically by the auto-sync hook after any primary pass promotes. See `pipeline.md` for dispatch block.

## Language Dispatch (preflight — runs BEFORE any pass)

```js
// Language resolution — runs in SKILL.md preflight, before any wave dispatch.
// _lang_lib.py functions are used by scripts; orchestrator mirrors the logic here.
const state = existsNonEmpty("docs/.rebuild-state.json")
  ? JSON.parse(readFile("docs/.rebuild-state.json"))
  : {}

const rawLang = flags.lang ?? null  // --lang <code> or null
const eff_lang = rawLang ? rawLang.trim().toLowerCase() : (state.primary_lang || "en")
const first_run = !state.primary_lang

if (first_run) {
  // This run becomes the primary — record it in state
  state.primary_lang = eff_lang
  // State will be persisted by build_source_to_fcode.py at W9.5 / pass cursor write
  console.log(`[INFO] first run — primary_lang set to "${eff_lang}"`)
}

const is_primary = (eff_lang === state.primary_lang)
const docs_root = (eff_lang === "en") ? "docs" : `docs/${eff_lang}`

// Unusual code warning (non-standard format)
if (rawLang && !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(eff_lang)) {
  console.log(`[WARN] unusual language code "${eff_lang}" — proceeding anyway`)
}

if (is_primary) {
  // Path A — INLINE GENERATION: run the normal pipeline with docs_root override
  // Session context carries generation-language directive (prose in eff_lang, English skeleton)
  // All promote calls use --docs-root <docs_root>
  // Continue to the requested pass (core / --feature-specs / --flows / etc.)
} else {
  // Path B — TRANSLATE FROM PRIMARY: load pipeline-translate.md (this file)
  // Run TR.0–TR.5 below
}
```

**Decision table:**

| Condition | Path | Action |
|-----------|------|--------|
| `first_run` (no `primary_lang` in state) | A (inline) | Set `primary_lang = eff_lang`; generate inline |
| `eff_lang == primary_lang` | A (inline) | Generate inline (normal pipeline + docs_root) |
| `eff_lang != primary_lang` | B (translate) | Translate from primary's docs |

---

## Translate Pass (Path B) — TR.0 through TR.5

### TR.0 — Preflight Guards

```js
// Guard 1: Missing primary
const primary_docs_root = (state.primary_lang === "en") ? "docs" : `docs/${state.primary_lang}`
if (!existsNonEmpty(`${primary_docs_root}/system/overview.md`)) {
  throw new Error(
    `ABORT — No ${state.primary_lang} primary docs to translate from. ` +
    `Run /tkm:rebuild-spec first to generate the primary, then re-run --lang ${eff_lang}.`
  )
}

// Guard 2: Outdated primary (non-blocking warning)
const translationEntry = (state.translations ?? {})[eff_lang]
if (translationEntry) {
  const primaryCursorSha = state.last_rebuild_sha || ""
  if (translationEntry.translated_from_sha && translationEntry.translated_from_sha !== primaryCursorSha) {
    console.log(
      `[WARN] primary_ahead_of_translation — Primary (${state.primary_lang}) changed since ` +
      `docs/${eff_lang}/ was last translated (translated_from_sha=${translationEntry.translated_from_sha.slice(0,7)}, ` +
      `primary cursor=${primaryCursorSha.slice(0,7)}). For an accurate mirror, run ` +
      `/tkm:rebuild-spec (primary incremental) first, then re-run --lang ${eff_lang}.`
    )
  }
}

console.log(`[INFO] TR.0: translating ${state.primary_lang} → ${eff_lang}`)
```

### TR.1 — Scope: artifacts to translate

```js
// Determine which artifacts to translate from the primary
const isFirstTranslateForLang = !translationEntry
const staleFile = `plans/<active-plan>/artifacts/translation-stale.json`
let artifactsToTranslate = []

if (isFirstTranslateForLang || flags.full) {
  // Full translate: all primary artifacts
  artifactsToTranslate = discoverAllPrimaryArtifacts(primary_docs_root)
  console.log(`[INFO] TR.1: full translate — ${artifactsToTranslate.length} artifacts`)
} else if (existsNonEmpty(staleFile)) {
  // Incremental: use the stale file from the just-completed primary pass
  const staleData = JSON.parse(readFile(staleFile))
  artifactsToTranslate = staleData.changed_artifacts ?? []
  console.log(`[INFO] TR.1: incremental translate — ${artifactsToTranslate.length} changed artifacts from ${staleData.pass} pass`)
} else {
  // Fallback: full re-translate (safe default)
  artifactsToTranslate = discoverAllPrimaryArtifacts(primary_docs_root)
  console.log(`[INFO] TR.1: no stale file — falling back to full translate`)
}

// discoverAllPrimaryArtifacts walks (ALL primary doc areas — keep in sync with the
// passPresent map in pipeline.md § Translation staleness check):
//   <primary_docs_root>/system/*.md
//   <primary_docs_root>/generated/*.md      (includes api-contracts.md)
//   <primary_docs_root>/features/*/*.md
//   <primary_docs_root>/flows/*.md
//   <primary_docs_root>/screens/*/*.md      // [lang-sync-fix] was missing — full translate skipped screen-specs
// Returns list of relative paths from primary_docs_root.
```

### TR.2 — Translation fan-out

```js
// Build session context with translate-mode directive
bash: .claude/skills/.venv/bin/python3 \
  claude/skills/rebuild-spec/scripts/build_session_context.py \
  --plan-dir plans/<active-plan> \
  --scout-report plans/<active-plan>/artifacts/scout-report.md \
  --stack-note "${stackNote}" \
  --mode translate \
  --lang ${eff_lang}

const BATCH_SIZE = parseInt(process.env.REBUILD_TRANSLATE_BATCH_SIZE ?? process.env.REBUILD_FS_BATCH_SIZE ?? '5')
// Hard cap on spawned batch sub-agents (token-cost guard): NEVER spawn more than MAX_AGENTS
// translate tasks. When artifact count would exceed the cap, grow the per-batch size so the
// number of batches stays ≤ MAX_AGENTS instead of letting ceil(N/BATCH_SIZE) run unbounded.
const MAX_AGENTS = parseInt(process.env.REBUILD_TRANSLATE_MAX_AGENTS ?? '5')
const effBatchSize = Math.max(BATCH_SIZE, Math.ceil(artifactsToTranslate.length / MAX_AGENTS))
const translateBatches = chunk(artifactsToTranslate, effBatchSize)  // translateBatches.length ≤ MAX_AGENTS
const allTranslateTaskIds = []
const draftRoot = `plans/<active-plan>/artifacts/translations/${eff_lang}`

for (const [i, batch] of translateBatches.entries()) {
  const taskId = TaskCreate({
    subject: `TR.2.batch-${pad2(i+1)}: translate ${state.primary_lang}→${eff_lang}`,
    description: `Session context: read plans/<active-plan>/artifacts/_session-context.md FIRST.

Translate ${batch.length} artifacts from ${state.primary_lang} to ${eff_lang}.
CONTRACT: references/translation-contract.md (MUST read before translating).

SOURCE (primary docs): ${primary_docs_root}/
TARGET (draft): ${draftRoot}/

Artifacts to translate:
${batch.map(a => `- ${a}`).join('\n')}

For each artifact:
1. Read the primary file at ${primary_docs_root}/<artifact-path>
2. Translate ONLY prose to ${eff_lang}; copy skeleton byte-identical (headings, code tokens, field labels, table headers, fenced code, frontmatter, paths, enums)
3. Write draft to ${draftRoot}/<artifact-path> (same relative path)

Call TaskUpdate(status=completed) BEFORE returning.`,
    addBlockedBy: i > 0 ? [allTranslateTaskIds.at(-1)] : []
  })
  allTranslateTaskIds.push(taskId)
}
```

### TR.3 — Skeleton-identity gate

```js
// After all TR.2 batches complete, validate each translated draft
const translationIssues = []

for (const artifact of artifactsToTranslate) {
  const primaryFile = `${primary_docs_root}/${artifact}`
  const mirrorFile = `${draftRoot}/${artifact}`

  if (!existsNonEmpty(mirrorFile)) {
    translationIssues.push({ artifact, issue: "draft missing" })
    continue
  }

  const result = bash(`.claude/skills/.venv/bin/python3 \
    claude/skills/rebuild-spec/scripts/validate_translation_skeleton.py \
    --primary ${primaryFile} \
    --mirror ${mirrorFile}`)

  if (result.exitCode !== 0) {
    translationIssues.push({ artifact, issue: result.stderr })
  }
}

// Retry failed translations (max 3 attempts per artifact)
const MAX_RETRIES = 3
for (const failed of translationIssues) {
  let retries = 0
  let resolved = false
  while (retries < MAX_RETRIES && !resolved) {
    retries++
    console.log(`[INFO] TR.3: re-translating ${failed.artifact} (attempt ${retries}/${MAX_RETRIES})`)
    // Spawn single-artifact re-translate task
    const retryId = TaskCreate({
      subject: `TR.3.retry: ${failed.artifact}`,
      description: `Re-translate ${failed.artifact}: skeleton drift detected.
Read references/translation-contract.md. Source: ${primary_docs_root}/${failed.artifact}
Previous issue: ${failed.issue}
Output: ${draftRoot}/${failed.artifact}
PAY EXTRA ATTENTION to preserving headings, code tokens, and table headers byte-identical.`
    })
    // Re-validate
    const recheck = bash(`.claude/skills/.venv/bin/python3 \
      claude/skills/rebuild-spec/scripts/validate_translation_skeleton.py \
      --primary ${primary_docs_root}/${failed.artifact} \
      --mirror ${draftRoot}/${failed.artifact}`)
    if (recheck.exitCode === 0) resolved = true
  }
  if (!resolved) {
    throw new Error(`TR.3 ESCALATE — skeleton drift unresolved for ${failed.artifact} after ${MAX_RETRIES} retries.`)
  }
}

console.log(`[INFO] TR.3: all ${artifactsToTranslate.length} translations pass skeleton-identity check`)
```

### TR.4 — Promote translations

```js
// Promote translation drafts to docs/<eff_lang>/
const targetDocsRoot = `docs/${eff_lang}`

bash: .claude/skills/.venv/bin/python3 \
  claude/skills/rebuild-spec/scripts/promote_drafts.py \
  --plan-dir plans/<active-plan> \
  --docs-root ${targetDocsRoot} \
  --scope all \
  --mode full
```

### TR.5 — Update translation state

```js
// Write translation cursor into .rebuild-state.json
// State file stays at docs/.rebuild-state.json (language-independent location)
const currentState = JSON.parse(readFile("docs/.rebuild-state.json"))
if (!currentState.translations) currentState.translations = {}

const primaryCursorSha = currentState.last_rebuild_sha || ""

// [lang-sync-fix] Derive passes_translated from what the PRIMARY actually has on disk —
// NOT a hardcoded all-4 list. A hardcoded list falsely claims passes the primary lacks,
// which would defeat the reconcile staleness detector (pipeline.md § Translation staleness check).
// Keep this map identical to passPresent there.
const passPresent = {
  "core":          () => existsNonEmpty(`${primary_docs_root}/system/overview.md`),
  "feature-specs": () => dirHasChildren(`${primary_docs_root}/features`),
  "flows":         () => dirHasChildren(`${primary_docs_root}/flows`),
  "glossary":      () => existsNonEmpty(`${primary_docs_root}/system/glossary.md`),
  "api-contracts": () => existsNonEmpty(`${primary_docs_root}/generated/api-contracts.md`),
  "screen-specs":  () => dirHasChildren(`${primary_docs_root}/screens`),
}
const passesTranslated = Object.keys(passPresent).filter(p => passPresent[p]())

currentState.translations[eff_lang] = {
  translated_from_sha: primaryCursorSha,
  last_translate_run_sha: primaryCursorSha,
  passes_translated: passesTranslated  // reflects primary's actual doc areas at translate time
}

atomicWriteJson("docs/.rebuild-state.json", currentState)
console.log(`[INFO] TR.5: translations.${eff_lang} cursor updated (translated_from_sha=${primaryCursorSha.slice(0,7)})`)
```

### Translate Pass-completion handoff prompt

```
─── translate pass complete ───
Promoted: docs/${eff_lang}/ (translated mirror of ${state.primary_lang} primary)
Skeleton-identity: PASS (all artifacts verified)
Next:
  /tkm:rebuild-spec --lang <another-code>   # Add another language mirror
  /tkm:write-journal                        # Record this milestone
```

---

## Auto-Sync Secondary Languages (reusable block)

Invoked by each primary pass's post-promote step. DRY: defined once here, referenced from pipeline-w7-w9.md, pipeline-feature-specs.md, pipeline-flows-glossary.md, pipeline-screen-specs.md, pipeline-api-contracts.md.

**Single source of truth:** the logic, report writing, and handoff-line rendering are fully implemented in `claude/skills/rebuild-spec/scripts/translation_sync_gate.py`. The LLM does NOT compose the `Secondary languages:` line — it runs the script and echoes stdout verbatim.

### Auto-sync flow (plan → translate → finalize)

**[v5.3.3 / lang-sync-fix] MANDATORY, NOT optional.** The script MUST run and MUST write `translation-sync-report.json` BEFORE the pass prints its completion handoff. A skipped auto-sync surfaces as a visible ⚠ instead of silently shipping primary-only docs.

#### Step 1 — Plan (get worklist)

```
bash: .claude/skills/.venv/bin/python3 \
  claude/skills/rebuild-spec/scripts/translation_sync_gate.py \
  --mode plan \
  --pass <name> \
  --plan-dir plans/<active-plan>
```

Emits a JSON worklist to stdout: `{"lang": "<code>", "artifacts_to_translate": [...]}` for each secondary language that needs syncing. If `REBUILD_AUTO_SYNC_TRANSLATIONS=0`, the script emits a deferred-only worklist (no artifacts) and records that in the report.

#### Step 2 — Translate + promote (LLM work — TR.2 fan-out + TR.4 promote per lang)

For each lang in the worklist, translate the listed artifacts (TR.2 fan-out) and promote to `docs/<lang>/` (TR.4). This is the only LLM-driven step. Parallelism cap: `REBUILD_TRANSLATE_MAX_PARALLEL` (default 3) langs; `REBUILD_TRANSLATE_BATCH_SIZE` (default 5) artifacts/batch. Per-lang batch sub-agents are hard-capped at `REBUILD_TRANSLATE_MAX_AGENTS` (default 5) — past that, batch size grows so the spawned-agent count never exceeds the cap (token-cost guard).

#### Step 3 — Finalize (verify, update cursors, write report)

```
bash: .claude/skills/.venv/bin/python3 \
  claude/skills/rebuild-spec/scripts/translation_sync_gate.py \
  --mode finalize \
  --pass <name> \
  --plan-dir plans/<active-plan> \
  --lang-status <lang>:<status>[:<reason>] ...
```

The script verifies `docs/<lang>/` on disk, atomically updates `translations[lang]` cursors in `docs/.rebuild-state.json`, writes `translation-sync-report.json`, and prints the canonical `Secondary languages:` line as its **last stdout line**.

#### Step 4 — Echo handoff line VERBATIM

Echo the finalize stdout `Secondary languages:` line byte-for-byte in the pass completion handoff.

**DO NOT compose, paraphrase, or invent this line yourself.** The script is the only permitted source of this line. The re-sync command is always `/tkm:rebuild-spec --lang <code>` — never append a pass suffix like `--flows`, `--feature-specs`, etc.

### Report schema (for reference — written by script, not by LLM)

`translation-sync-report.json` (`schema_version: 1`):
```json
{
  "schema_version": 1,
  "pass": "<name>",
  "primary_cursor_sha": "<sha>",
  "auto_sync_enabled": true,
  "languages": [
    { "lang": "vi", "status": "synced" },
    { "lang": "jp", "status": "failed", "reason": "..." },
    { "lang": "fr", "status": "deferred", "reason": "REBUILD_AUTO_SYNC_TRANSLATIONS=0" }
  ]
}
```

### 5 canonical output cases (emitted by script — reference only)

The finalize script always emits exactly one of these 5 lines as its last stdout line:

1. `Secondary languages: ⚠ auto-sync did NOT run (no translation-sync-report.json) — secondary mirrors may be stale. Re-run the pass, or sync manually with /tkm:rebuild-spec --lang <code>.`
2. `Secondary languages: none registered`
3. `Secondary languages: synced <pass> → vi, jp (2/2)`
4. `Secondary languages: ⚠ synced: vi | STALE (failed): jp — re-sync stale with /tkm:rebuild-spec --lang jp`
5. `Secondary languages: ⚠ synced: vi | STALE (auto-sync off): jp — re-sync stale with /tkm:rebuild-spec --lang jp`

### Wiring into primary passes

Each primary pass's post-promote step runs `translation_sync_gate.py` with the pass name. The pass file specifies which artifacts changed; the script determines what to sync.

- **Core (W9):** `--pass core` — see `references/pipeline-w7-w9.md`
- **Feature-specs (FS.7):** `--pass feature-specs` — see `references/pipeline-feature-specs.md`
- **Flows (FL.5):** `--pass flows` — see `references/pipeline-flows-glossary.md`
- **Glossary (GL.3):** `--pass glossary` — see `references/pipeline-flows-glossary.md`
- **Screen-specs (SS.3):** `--pass screen-specs` — see `references/pipeline-screen-specs.md`
- **API-contracts (AC.5):** `--pass api-contracts` — see `references/pipeline-api-contracts.md`

### [v5.3.3 / lang-sync-fix] Completion gate (DRY — applies to ALL 6 passes)

**BEFORE a pass prints its final completion handoff**, run the translation completion gate:

```
bash: .claude/skills/.venv/bin/python3 \
  claude/skills/rebuild-spec/scripts/check_translation_gate.py \
  --plan-dir plans/<active-plan> \
  --pass <name>
```

**Exit 1 BLOCKS completion — do NOT write the completion flag or print the handoff.**

This gate enforces the auto-sync contract: if secondary langs are registered, auto-sync is enabled, and `translation-sync-report.json` is missing or stale for this pass, the gate exits 1 with a `gate.report_missing` or `gate.lang_behind_cursor` issue explaining exactly what to fix. A skipped auto-sync that silently ships primary-only docs now breaks the completion contract instead of slipping through.

Enforcement class: same as the W9 promotion gate (`check_promotion_gate.py`). Same pattern: run gate → non-zero exit → halt.

Fix for a gate FAIL: re-run the pass (triggers auto-sync) or sync each stale lang manually with `/tkm:rebuild-spec --lang <code>`.

Each pass file contains a short callout referencing this section — the full gate-run command is defined here once (DRY).

## Per-pass artifact isolation

| Artifact | Path |
|----------|------|
| Translation drafts | `plans/<active-plan>/artifacts/translations/<lang>/...` |
| Stale file (transient) | `plans/<active-plan>/artifacts/translation-stale.json` |
| State cursors | `docs/.rebuild-state.json → translations.<lang>` |
