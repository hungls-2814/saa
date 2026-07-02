"""Shared spec structure constants. Stdlib only — zero imports.

Single source of truth for required H2 sections and skeleton content.
Referenced by validate_feature_spec.py and scaffold_spec.py.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Required H2 sections — ORDER IS LOAD-BEARING (validator checks exact order)
# ---------------------------------------------------------------------------

REQUIRED_H2_TECH = [
    "## Overview",
    "## Polymorphic Behavior",
    "## Cross-Cutting Logic",
    "## User Stories",
    "## Key Entities",
    "## Artifact References",
    "## Assumptions",
    "## Source Code References",
    "## Unresolved Questions",
]

REQUIRED_H2_BC = [
    "## Why It Matters",
    "## Who Uses It",
    "## What They Do",
]

REQUIRED_H2_SCR = [
    "## Screen List",
    "## User Journey",
]

# ---------------------------------------------------------------------------
# CCL H3 sections (used by scaffold to pre-populate the CCL body)
# ---------------------------------------------------------------------------

REQUIRED_CCL_H3 = [
    "### Requirements",
    "### Business Rules",
    "### Decision Logic",
    "### State Machines",
    "### Algorithms",
    "### External Integrations",
    "### Verification",
]

# ---------------------------------------------------------------------------
# Edge-cases skeleton — markdown table with ≥1 placeholder data row.
# Must pass _check_edge_cases with no warning (needs ≥1 non-separator,
# non-header data row, i.e. a line starting with `|` that is NOT `|---|`
# and does NOT start with `| Scenario`).
# ---------------------------------------------------------------------------

EDGE_CASES_SKELETON = """\
| Scenario | Input | Expected | Severity |
|----------|-------|----------|----------|
| (placeholder — replace with real edge case) | — | — | low |
"""
