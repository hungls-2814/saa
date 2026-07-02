"""Tests for validate_screen_list.py (Wave 6.875 gate)."""
from __future__ import annotations
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from validate_screen_list import validate, main  # noqa: E402

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

VALID_SCREEN_LIST = """\
## Screen Index

| SCR Code | Name | Route | Auth |
|----------|------|-------|------|
| SCR001_Login | Login | /login | no |
| SCR002_Dashboard | Dashboard | /dashboard | yes |
| SCR003_UserList | User List | /users | yes |

## SCR001_Login

**Route:** /login
**Auth:** no

### Regions

| REG Code | Name | Description |
|----------|------|-------------|
| REG001 | LoginForm | Email + password form |
| REG002 | ErrorMessage | Inline validation errors |

## SCR002_Dashboard

**Route:** /dashboard
**Auth:** yes

### Regions

| REG Code | Name | Description |
|----------|------|-------------|
| REG001 | StatsPanel | Summary metrics |
| REG002 | RecentActivity | Last 10 events |

## SCR003_UserList

**Route:** /users
**Auth:** yes

### Regions

| REG Code | Name | Description |
|----------|------|-------------|
| REG001 | UserTable | Paginated user rows |
"""

DUPLICATE_SCR = """\
## Screen Index

| SCR Code | Name |
|----------|------|
| SCR001_Login | Login |
| SCR001_Login | Login Again |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | LoginForm |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | AnotherForm |
"""

DUPLICATE_REG_WITHIN_SCR = """\
## Screen Index

| SCR Code | Name |
|----------|------|
| SCR001_Login | Login |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | LoginForm |
| REG001 | DuplicateForm |
| REG002 | ErrorMessage |
"""

DUPLICATE_REG_SUFFIXED = """\
## Screen Index

| SCR Code | Name |
|----------|------|
| SCR001_Login | Login |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001_LoginForm | Login form A |
| REG001_LoginForm | Login form B (duplicate) |
| REG002_ErrorMessage | Errors |
"""

ORPHAN_REG = """\
## Screen Index

| SCR Code | Name |
|----------|------|
| SCR001_Login | Login |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | LoginForm |

## Some Other Section

### Orphaned Regions

| REG Code | Name |
|----------|------|
| REG002 | OrphanRegion |
"""

MISSING_SCREEN_INDEX = """\
## SCR001_Login

**Route:** /login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | LoginForm |
"""

MERGED_WITH_DUPLICATE_HEADER = """\
## Screen Index

| SCR Code | Name |
|----------|------|
| SCR001_Login | Login |

## SCR001_Login

### Regions

| REG Code | Name |
|----------|------|
| REG001 | LoginForm |

## Screen Index

| SCR Code | Name |
|----------|------|
| SCR002_Dashboard | Dashboard |

## SCR002_Dashboard

### Regions

| REG Code | Name |
|----------|------|
| REG001 | StatsPanel |
"""

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _setup_plan(tmp_path: Path, content: str) -> Path:
    plan = tmp_path / "test-plan"
    artifacts = plan / "artifacts"
    artifacts.mkdir(parents=True)
    (artifacts / "screen-list.md").write_text(content, encoding="utf-8")
    return plan


# ---------------------------------------------------------------------------
# Tests — PASS
# ---------------------------------------------------------------------------

def test_valid_screen_list_passes(tmp_path):
    plan = _setup_plan(tmp_path, VALID_SCREEN_LIST)
    result = validate(plan, tmp_path)
    assert result["status"] == "PASS", result["issues"]
    assert result["summary"]["critical"] == 0
    assert result["summary"]["warning"] == 0


# ---------------------------------------------------------------------------
# Tests — FAIL (critical)
# ---------------------------------------------------------------------------

def test_duplicate_scr_fails(tmp_path):
    plan = _setup_plan(tmp_path, DUPLICATE_SCR)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.no_dup_scr" in rule_ids


def test_duplicate_reg_within_scr_fails(tmp_path):
    plan = _setup_plan(tmp_path, DUPLICATE_REG_WITHIN_SCR)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.no_dup_reg" in rule_ids


def test_duplicate_suffixed_reg_fails(tmp_path):
    """Slug-suffixed REG codes (REG001_LoginForm) must dup-detect — `\\b` used to miss them."""
    plan = _setup_plan(tmp_path, DUPLICATE_REG_SUFFIXED)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.no_dup_reg" in rule_ids


def test_orphan_reg_fails(tmp_path):
    plan = _setup_plan(tmp_path, ORPHAN_REG)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.orphan_reg" in rule_ids


def test_missing_screen_index_fails(tmp_path):
    plan = _setup_plan(tmp_path, MISSING_SCREEN_INDEX)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.required_sections" in rule_ids


def test_merged_with_duplicate_header_fails(tmp_path):
    """Fragment merge producing two ## Screen Index sections must be caught."""
    plan = _setup_plan(tmp_path, MERGED_WITH_DUPLICATE_HEADER)
    result = validate(plan, tmp_path)
    assert result["status"] == "FAIL"
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "critical"]
    assert "ScreenList.single_header" in rule_ids


# ---------------------------------------------------------------------------
# Tests — WARN
# ---------------------------------------------------------------------------

def test_missing_file_warns(tmp_path):
    plan = tmp_path / "test-plan"
    (plan / "artifacts").mkdir(parents=True)
    result = validate(plan, tmp_path)
    assert result["summary"]["critical"] == 0
    rule_ids = [i["rule_id"] for i in result["issues"] if i["severity"] == "warning"]
    assert "ScreenList.completed_missing" in rule_ids


# ---------------------------------------------------------------------------
# Tests — CLI / main()
# ---------------------------------------------------------------------------

def test_main_plan_dir_pass(tmp_path, capsys):
    plan = _setup_plan(tmp_path, VALID_SCREEN_LIST)
    rc = main(["--plan-dir", str(plan), "--project-root", str(tmp_path)])
    assert rc == 0
    out = json.loads(capsys.readouterr().out)
    assert out["status"] == "PASS"


def test_main_single_file_fail(tmp_path, capsys):
    plan = _setup_plan(tmp_path, DUPLICATE_SCR)
    sl_file = plan / "artifacts" / "screen-list.md"
    rc = main(["--screen-list-file", str(sl_file), "--project-root", str(tmp_path)])
    assert rc == 1


def test_main_summary_out(tmp_path):
    plan = _setup_plan(tmp_path, VALID_SCREEN_LIST)
    summary_path = tmp_path / "validation-summary.json"
    rc = main([
        "--plan-dir", str(plan),
        "--project-root", str(tmp_path),
        "--summary-out", str(summary_path),
    ])
    assert rc == 0
    assert summary_path.is_file()
    summary = json.loads(summary_path.read_text())
    assert "screen_list" in summary["validators"]
    assert summary["validators"]["screen_list"]["status"] == "PASS"


def test_main_invalid_plan_dir(tmp_path, capsys):
    rc = main(["--plan-dir", str(tmp_path / "nonexistent"), "--project-root", str(tmp_path)])
    assert rc == 2
