---
name: tkm:clio-artifact
description: "Generate SVN Proposal PPTX from Clio Knowledge Graph in 2 steps. `--gen md` queries KG and emits a domain-organized project_profile markdown; `--gen slide` reads that profile and fills the SVN template via role-based rendering."
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
argument-hint: "[--gen md|slide] [--project-id ID]"
metadata:
  author: takumi-agent-kit
  version: "2.0.0"
---

# Slide Proposal — SVN Proposal Generator (2-step pipeline)

This skill runs in two independent steps:

| Step | Argument | Purpose |
|------|----------|---------|
| 1 | `--gen md` | Query Clio Knowledge Graph, generate PNG images, write `project_content_{id}_{ts}.md` |
| 2 | `--gen slide` | Read the profile markdown, render the SVN PPTX via role-based template |

The profile markdown is **domain-organized**, not slide-organized — adding/removing slides only requires changing the template config, not the agent workflow.

**Requires:** Data provider configured (Clio MCP server).

---

## Data Provider

The skill uses **Clio Knowledge Graph** as the data provider.

- Query tool: `clio_query` MCP tool
- Config: `.clio.yml` (primary) / `.estimate.yml` (fallback)

### Setup

Add to `.mcp.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "clio": {
      "type": "http",
      "url": "https://clio.sun-asterisk.vn/mcp",
      "headers": { "x-api-key": "${CLIO_API_KEY}" }
    }
  }
}
```

Then add `CLIO_API_KEY=your-key` to `~/.claude/.env` and create `.clio.yml` in project root with `project_id: your-project-id`.

---

## Step A — `--gen md`

The agent queries Clio Knowledge Graph and assembles a single JSON object matching `ProjectProfile` (see `scripts/lib/profile_schema.py`). It then invokes `scripts/gen-md.py` to emit the canonical markdown form.

### Workflow

1. **Read project_id** from `.clio.yml` (fallback `.estimate.yml`; ask user if missing)
2. **Query Clio KG** for each domain section using the reference files below
3. **Generate PNG images** (Mermaid CLI for screen flow + schedule)
4. **Assemble JSON** matching `ProjectProfile.to_dict()` shape
5. **Invoke `gen-md.py`** with the JSON to write `outputs/project_content_{id}_{ts}.md`

### Profile JSON shape

The JSON the agent assembles must match the dataclass tree in `scripts/lib/profile_schema.py`. Top-level keys: `project_background`, `features`, `nfr_overview`, `screen_flow`, `business_process`, `benefits`, `approach_comparison`, `assumptions`, `infrastructure`, `software_stack`, `nfr_sections`, `nfr_detailed`, `schedule`. Omit any section the KG has no data for.

### Reference Files (what to query per section)

| Section(s) | Reference |
|------------|-----------|
| project_background, features, nfr_overview | `references/generate-content-overview.md` |
| screen_flow, business_process | `references/generate-content-flow.md` |
| benefits | `references/generate-content-benefits.md` |
| approach_comparison, assumptions | `references/generate-content-approach.md` |
| infrastructure, software_stack, nfr_sections, nfr_detailed, schedule | `references/generate-content-technical.md` |

### Invocation

```bash
VENV_PYTHON=".claude/skills/.venv/bin/python3"
SKILL_DIR="claude/skills/clio-artifact"

# Agent writes JSON to a temp file, then:
$VENV_PYTHON $SKILL_DIR/scripts/gen-md.py \
  --project-id {project_id} \
  --input /tmp/profile_{project_id}.json \
  --output-dir outputs/
```

---

## Step B — `--gen slide`

Reads the profile markdown and renders the SVN PPTX. No Clio KG access needed.

### Workflow

1. **Locate input** — find `outputs/project_content_{id}_*.md` (latest if multiple)
2. **Invoke `gen-slide.py`** — parses profile, runs role-based rendering against the SVN template
3. Output → `outputs/proposal_{id}_{ts}.pptx`

### Invocation

```bash
$VENV_PYTHON $SKILL_DIR/scripts/gen-slide.py \
  --input outputs/project_content_{project_id}_{ts}.md \
  --output-dir outputs/
```

`--template` defaults to `[SVN] Proposal Menu.pptx` (auto-resolved from `templates/`).

---

## Common Rules (Step A)

- Read `project_id` from `.clio.yml` first, fallback to `.estimate.yml`; ask user if missing
- All data queries run **SEQUENTIALLY** (not parallel)
- Use `clio_query` MCP tool for all queries
- If a query returns empty/unclear, run one broader follow-up; if still unknown, omit that field
- All outputs saved to `outputs/` in CWD (or `SLIDE_GENERATOR__OUTPUTS_PATH` env var)
- **No fabrication** — only include data from KG
- **PNG images only** — generate PNG files via Mermaid CLI; reference them as file paths in the profile (no base64)

---

## Output Files

| File | Step | Description |
|------|------|-------------|
| `outputs/project_content_{id}_{ts}.md` | A | Domain-organized profile (canonical input for Step B) |
| `outputs/screen_flow_{id}_{ts}.png` | A | Screen transition diagram (Mermaid) |
| `outputs/schedule_{id}_{ts}.png` | A | Gantt chart (Mermaid) |
| `outputs/proposal_{id}_{ts}.pptx` | B | Final PPTX |

---

## Slide Coverage

The SVN Proposal template (`[SVN] Proposal Menu.pptx`, 71 slides) currently fills 17 slides. The mapping from profile section → slide(s) lives in `scripts/lib/templates/svn.py` (`SlideRoleConfig`). To add a new slide, declare a new `SlideRoleConfig` in `svn.py` — no changes to gen-md or gen-slide are needed.

| Slide | Section consumed | Layout |
|-------|------------------|--------|
| 4 | project_background | Current issues + objectives |
| 5 | features | Description + table |
| 6 | nfr_overview | Description + table |
| 8 | screen_flow | Image overlay |
| 10, 11 | business_process | Categories + before/after |
| 12, 13 | benefits[0:2], benefits[2:4] | 2 title+body each |
| 21 | approach_comparison | Table |
| 23, 24, 25 | assumptions[0:5], [5:8], [8:9] | 2-col tables (fill col 1) |
| 33 | infrastructure | Table |
| 34 | software_stack | Table |
| 35 | nfr_sections | 4 title+body pairs |
| 36 | nfr_detailed | Table |
| 43 | schedule | Text + Gantt image |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `clio_query` not found | MCP server not configured — check Setup |
| `statusCode: 401` | Invalid API key — verify `x-api-key` header |
| No `.clio.yml` | Create in project root with `project_id` |
| Mermaid PNG fails | Install Node.js and `@mermaid-js/mermaid-cli` |
| `Template not found` | Verify `[SVN] Proposal Menu.pptx` in `claude/skills/clio-artifact/templates/` |
| gen-slide skips slides | Missing profile sections produce empty/cleared shapes — check JSON in Step A |

---

## References

| Topic | File |
|-------|------|
| Profile schema (dataclass tree) | `scripts/lib/profile_schema.py` |
| Slide → profile section mapping | `scripts/lib/templates/svn.py` |
| Overview sections (background, features, NFR overview) | `references/generate-content-overview.md` |
| Flow sections (screen flow, business process) | `references/generate-content-flow.md` |
| Benefits | `references/generate-content-benefits.md` |
| Approach + assumptions | `references/generate-content-approach.md` |
| Technical (infra, software, NFR detail, schedule) | `references/generate-content-technical.md` |
| Step B execution detail | `references/generate-pptx.md` |
| MCP config snippet | `data/mcp-config-snippet.json` |
