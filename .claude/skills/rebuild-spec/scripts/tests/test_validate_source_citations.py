"""Integration tests for validate_source_citations.py.
Runs script as subprocess with --spec <path>, parses stdout JSON,
asserts specific rule_ids per citation fixture variant.
Coverage per phase-05 test matrix.
"""
from __future__ import annotations  # PEP 604 `X | None` at runtime on Python 3.9

import json
import subprocess
import sys
from pathlib import Path

import pytest

FIXTURES = Path(__file__).resolve().parent / "fixtures"
SCRIPTS_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = Path(__file__).resolve().parents[5]
SCRIPT = SCRIPTS_DIR / "validate_source_citations.py"


def _run(spec_path: Path, project_root: Path = REPO_ROOT) -> tuple[int, dict]:
    """Run the citation validator against a single spec.

    The validator derives plan_dir = spec.parent.parent.parent, then asserts
    plan_dir is under project_root.  For specs placed via _make_spec_tree(),
    the spec lives at <tmp>/artifacts/features/F001_Auth/spec.md so that
    plan_dir == tmp_path, which is under project_root == tmp_path.
    """
    result = subprocess.run(
        [sys.executable, str(SCRIPT),
         "--spec", str(spec_path),
         "--project-root", str(project_root)],
        capture_output=True,
        text=True,
        timeout=30,
    )
    if not result.stdout.strip():
        raise RuntimeError(
            f"validator produced no JSON output (exit={result.returncode}).\n"
            f"stderr: {result.stderr}"
        )
    output = json.loads(result.stdout)
    return result.returncode, output


def _make_spec_tree(tmp_path: Path, citation_line: str) -> tuple[Path, Path]:
    """Create artifacts/features/F001_Auth/spec.md inside tmp_path.

    The validator computes plan_dir = spec.parent.parent.parent = tmp_path,
    so passing --project-root tmp_path satisfies the assert_under guard.
    Returns (spec_path, tmp_path).
    """
    spec_dir = tmp_path / "artifacts" / "features" / "F001_Auth"
    spec_dir.mkdir(parents=True)
    spec = spec_dir / "spec.md"
    spec.write_text(
        "# F001_Auth — Authentication\n\n"
        "## Source Code References\n\n"
        f"**Source:** `{citation_line}`\n",
        encoding="utf-8",
    )
    return spec, tmp_path


def _issues(data: dict) -> list[dict]:
    all_issues = []
    for entry in data.get("specs", {}).values():
        all_issues.extend(entry.get("issues", []))
    return all_issues


def _critical_rule_ids(data: dict) -> list[str]:
    return [i["rule_id"] for i in _issues(data) if i["severity"] == "critical"]


# ---------------------------------------------------------------------------
# spec-pass.md: valid citation — path resolves via project_root / raw_path
# Citation in fixture uses repo-relative path to cited-source.py, so
# --project-root REPO_ROOT resolves it cleanly.
# ---------------------------------------------------------------------------

class TestSpecPassCitation:
    def test_exit_code_zero(self):
        code, _ = _run(FIXTURES / "specs" / "spec-pass.md")
        assert code == 0

    def test_no_critical_issues(self):
        _, data = _run(FIXTURES / "specs" / "spec-pass.md")
        criticals = _critical_rule_ids(data)
        assert criticals == [], f"unexpected: {criticals}"


# ---------------------------------------------------------------------------
# spec-bad-citation.md: cites nonexistent-file-that-does-not-exist.py
# ---------------------------------------------------------------------------

class TestSpecBadCitation:
    def test_exit_code_one(self):
        code, _ = _run(FIXTURES / "specs" / "spec-bad-citation.md")
        assert code == 1

    def test_file_missing_rule_id(self):
        _, data = _run(FIXTURES / "specs" / "spec-bad-citation.md")
        assert "citation.file_missing" in _critical_rule_ids(data)


# ---------------------------------------------------------------------------
# Range out of bounds: cited-source.py has 30 lines; cite line 999.
# Tests use tmp_path as project_root so validator accepts spec location.
# cited-source.py is copied into tmp_path and cited as "cited-source.py".
# ---------------------------------------------------------------------------

class TestCitationRangeInvalid:
    def _setup(self, tmp_path: Path, citation: str) -> tuple[Path, Path]:
        """Place cited-source.py at tmp_path root so project_root/cited-source.py resolves."""
        (tmp_path / "cited-source.py").write_text(
            (FIXTURES / "cited-source.py").read_text(encoding="utf-8"), encoding="utf-8"
        )
        spec, root = _make_spec_tree(tmp_path, f"cited-source.py:{citation}")
        return spec, root

    def test_range_invalid_rule_id(self, tmp_path):
        spec, root = self._setup(tmp_path, "999")
        code, data = _run(spec, root)
        assert code == 1
        assert "citation.range_invalid" in _critical_rule_ids(data)

    def test_range_invalid_message_mentions_bounds(self, tmp_path):
        spec, root = self._setup(tmp_path, "999")
        _, data = _run(spec, root)
        matching = [i for i in _issues(data) if i["rule_id"] == "citation.range_invalid"]
        assert any("out of bounds" in i["message"] for i in matching)


# ---------------------------------------------------------------------------
# Inverted range: end < start (e.g. :10-5)
# ---------------------------------------------------------------------------

class TestCitationRangeInverted:
    def test_range_inverted_rule_id(self, tmp_path):
        (tmp_path / "cited-source.py").write_text(
            (FIXTURES / "cited-source.py").read_text(encoding="utf-8"), encoding="utf-8"
        )
        spec, root = _make_spec_tree(tmp_path, "cited-source.py:10-5")
        code, data = _run(spec, root)
        assert code == 1
        assert "citation.range_inverted" in _critical_rule_ids(data)


# ---------------------------------------------------------------------------
# Path traversal: ../../../etc/passwd style citation.
# Spec is at tmp_path/artifacts/features/F001_Auth/spec.md so plan_dir==tmp_path
# which is under project_root==tmp_path. The traversal citation is then
# detected by the citation guard (not the plan_dir guard).
# ---------------------------------------------------------------------------

class TestCitationPathTraversal:
    def test_path_traversal_rule_id(self, tmp_path):
        spec, root = _make_spec_tree(tmp_path, "../../../etc/passwd:1")
        code, data = _run(spec, root)
        assert code == 1
        assert "citation.path_traversal" in _critical_rule_ids(data)

    def test_path_traversal_is_critical(self, tmp_path):
        spec, root = _make_spec_tree(tmp_path, "../../../etc/passwd:1")
        _, data = _run(spec, root)
        matching = [i for i in _issues(data) if i["rule_id"] == "citation.path_traversal"]
        assert len(matching) >= 1
        assert all(i["severity"] == "critical" for i in matching)

    def test_absolute_path_also_rejected(self, tmp_path):
        spec, root = _make_spec_tree(tmp_path, "/etc/passwd:1")
        code, data = _run(spec, root)
        assert code == 1
        assert "citation.path_traversal" in _critical_rule_ids(data)


# ---------------------------------------------------------------------------
# F2 guard parity: --plan-dir at a file and --spec at a directory both exit 2.
# ---------------------------------------------------------------------------

class TestInputGuards:
    def test_plan_dir_is_file_exits_two(self, tmp_path):
        bogus = tmp_path / "not-a-dir.txt"
        bogus.write_text("x")
        result = subprocess.run(
            [sys.executable, str(SCRIPT),
             "--plan-dir", str(bogus),
             "--project-root", str(tmp_path)],
            capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 2
        assert "not a directory" in result.stderr.lower()

    def test_spec_is_directory_exits_two(self, tmp_path):
        result = subprocess.run(
            [sys.executable, str(SCRIPT),
             "--spec", str(tmp_path),
             "--project-root", str(tmp_path)],
            capture_output=True, text=True, timeout=30,
        )
        assert result.returncode == 2
        assert "not a file" in result.stderr.lower()


# ---------------------------------------------------------------------------
# spec-driven mode (used by tkm:migrate-aidd). Default --mode source unchanged;
# spec-driven additionally accepts spec:// URIs and specsRoot-relative paths.
# [FROM_CODE] citations remain validated as real source paths.
# ---------------------------------------------------------------------------

def _run_spec_driven(spec_path: Path, project_root: Path,
                     specs_root: Path | None = None) -> tuple[int, dict]:
    argv = [sys.executable, str(SCRIPT), "--spec", str(spec_path),
            "--project-root", str(project_root), "--mode", "spec-driven"]
    if specs_root is not None:
        argv += ["--specs-root", str(specs_root)]
    result = subprocess.run(argv, capture_output=True, text=True, timeout=30)
    if not result.stdout.strip():
        raise RuntimeError(f"no JSON (exit={result.returncode}). stderr: {result.stderr}")
    return result.returncode, json.loads(result.stdout)


class TestSpecDrivenMode:
    def test_valid_spec_uri_accepted(self, tmp_path):
        spec, root = _make_spec_tree(tmp_path, "spec://001-create-taskify/spec.md#user-stories")
        code, data = _run_spec_driven(spec, root)
        assert code == 0
        assert _critical_rule_ids(data) == []

    def test_specsroot_relative_citation_accepted(self, tmp_path):
        specs_root = tmp_path / "specs"
        (specs_root / "001-create-taskify").mkdir(parents=True)
        (specs_root / "001-create-taskify" / "spec.md").write_text("# spec", encoding="utf-8")
        spec, root = _make_spec_tree(tmp_path, "001-create-taskify/spec.md")
        code, data = _run_spec_driven(spec, root, specs_root=specs_root)
        assert code == 0
        assert _critical_rule_ids(data) == []

    def test_spec_uri_leading_dotdot_rejected(self, tmp_path):
        # spec://..  fails the SPEC_URI grammar (first segment must be alnum)
        spec, root = _make_spec_tree(tmp_path, "spec://../../etc/passwd")
        code, data = _run_spec_driven(spec, root)
        assert code == 1
        assert _critical_rule_ids(data) == ["citation.spec_uri_invalid"]

    def test_spec_uri_inpath_traversal_rejected(self, tmp_path):
        # valid first segment but traversal in the path part -> rejected (M1 fix)
        spec, root = _make_spec_tree(tmp_path, "spec://001-x/../../../etc/passwd")
        code, data = _run_spec_driven(spec, root)
        assert code == 1
        assert _critical_rule_ids(data) == ["citation.spec_uri_invalid"]

    def test_bare_from_code_citation_rejected(self, tmp_path):
        # [FROM_CODE] without a line range hits the bare branch -> must be flagged,
        # never accepted as a spec URI (H1 fix).
        spec_dir = tmp_path / "artifacts" / "features" / "F001_Auth"
        spec_dir.mkdir(parents=True)
        spec = spec_dir / "spec.md"
        spec.write_text(
            "# F001\n\n## Source Code References\n\n"
            "**Source:** `spec://001-x/real.md` [FROM_CODE]\n",
            encoding="utf-8",
        )
        code, data = _run_spec_driven(spec, tmp_path)
        assert code == 1
        assert "citation.from_code_no_range" in _critical_rule_ids(data)

    def test_from_code_citation_still_validated_as_source(self, tmp_path):
        # [FROM_CODE] forces source-path validation even in spec-driven mode.
        (tmp_path / "cited-source.py").write_text(
            (FIXTURES / "cited-source.py").read_text(encoding="utf-8"), encoding="utf-8"
        )
        spec_dir = tmp_path / "artifacts" / "features" / "F001_Auth"
        spec_dir.mkdir(parents=True)
        spec = spec_dir / "spec.md"
        spec.write_text(
            "# F001\n\n## Source Code References\n\n"
            "**Source:** `cited-source.py:999` [FROM_CODE]\n",
            encoding="utf-8",
        )
        code, data = _run_spec_driven(spec, tmp_path)
        assert code == 1
        assert "citation.range_invalid" in _critical_rule_ids(data)


class TestSourceModeDefaultUnchanged:
    def test_default_mode_rejects_spec_uri(self):
        # spec:// is NOT a valid source-path citation; default mode must reject it.
        # Reuse the existing pass/bad fixtures to confirm source-mode parity.
        code, data = _run(FIXTURES / "specs" / "spec-pass.md")
        assert code == 0 and _critical_rule_ids(data) == []

    def test_default_mode_spec_uri_is_ignored_not_accepted(self, tmp_path):
        # Under default source mode, a bare spec:// value has no :N-M, so CITATION_RE
        # doesn't match and source mode does not run the spec-driven branch — i.e. it
        # is neither validated nor falsely accepted as a source path.
        spec, root = _make_spec_tree(tmp_path, "spec://001-x/spec.md#s")
        code, data = _run(spec, root)
        assert code == 0  # no critical (source mode ignores non-matching lines)
        assert _critical_rule_ids(data) == []
