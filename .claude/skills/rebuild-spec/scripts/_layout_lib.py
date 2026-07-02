"""Shared layout constants for the v4 docs layout.

Single source of truth for the draft-artifact → promoted-path map, imported by
promote_drafts.py. Stdlib only.

v4 layout:
  docs/system/      ← system-overview, permissions, glossary, business-rules
  docs/generated/   ← route-list, api-map, entities(data-model), screen-list,
                       screen-flow, behavior-logic, user-stories, feature-list
  docs/flows/       ← all flows/*.md
  docs/features/{slug}/ ← 4 per-feature files
  docs/screens/{SCR}/   ← screen specs
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# v4 canonical layered paths per docs-canonical-mapping.md
# Keys are draft artifact filenames; values are relative paths under docs/.
# ---------------------------------------------------------------------------
LAYERED_PATH_MAP: dict[str, str] = {
    "system-overview.md": "system/overview.md",
    "architecture.md": "system/architecture.md",
    "permissions.md": "system/permissions.md",
    "glossary.md": "system/glossary.md",
    "business-rules.md": "system/business-rules.md",
    "route-list.md": "generated/route-list.md",
    "api-map.md": "generated/api-map.md",
    "api-contracts.md": "generated/api-contracts.md",
    "permissions-matrix.md": "generated/permissions-matrix.md",
    "data-model.md": "generated/entities.md",
    "screen-list.md": "generated/screen-list.md",
    "screen-flow.md": "generated/screen-flow.md",
    "behavior-logic.md": "generated/behavior-logic.md",
    "user-stories.md": "generated/user-stories.md",
    "feature-list.md": "generated/feature-list.md",
}
