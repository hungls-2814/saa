"""Tests for scripts/promote_drafts.py."""
from __future__ import annotations  # PEP 604 `X | None` at runtime on Python 3.9

import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

SCRIPTS_DIR = Path(__file__).resolve().parents[1]
SCRIPT = SCRIPTS_DIR / "promote_drafts.py"
FIXTURES = Path(__file__).resolve().parent / "fixtures" / "promote_drafts"
# promote_drafts.py resolves paths against os.getcwd(); use repo root as cwd
REPO_ROOT = Path(__file__).resolve().parents[5]

CORE_ARTIFACTS = [
    "architecture.md",
    "route-list.md",
    "data-model.md",
    "screen-list.md",
    "screen-flow.md",
    "behavior-logic.md",
    "permissions.md",
    "permissions-matrix.md",
    "user-stories.md",
    "feature-list.md",
    "business-rules.md",
]


_PROMOTE_TMP = REPO_ROOT / f"_test_promote_tmp_{os.getpid()}"


@pytest.fixture(autouse=True, scope="module")
def _cleanup_promote_tmp():
    """Remove the PID-scoped temp dir after the module finishes."""
    yield
    if _PROMOTE_TMP.exists():
        shutil.rmtree(_PROMOTE_TMP, ignore_errors=True)


def _run(args: list[str], cwd: Path) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, str(SCRIPT)] + args,
        capture_output=True,
        text=True,
        timeout=30,
        cwd=str(cwd),
    )


def _copy_fixture_plan(tmp_path: Path) -> tuple[Path, Path]:
    """Copy fixture plan-dir under REPO_ROOT/tmp_path subtree, create docs target dir.

    Returns (plan_dir, docs_root).
    """
    subdir = Path(str(tmp_path).replace("/", "_").lstrip("_"))
    work = _PROMOTE_TMP / subdir.name
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)
    plan_dir = work / "plan"
    shutil.copytree(str(FIXTURES / "plan-dir"), str(plan_dir))
    docs_root = work / "docs"
    docs_root.mkdir(parents=True)
    return plan_dir, docs_root


class TestFullModePromotion:
    def test_exit_code_zero(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr

    def test_promotes_available_artifacts(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        # fixture has feature-list.md and route-list.md — check layered paths
        assert (docs_root / "generated" / "feature-list.md").is_file()
        assert (docs_root / "generated" / "route-list.md").is_file()

    def test_promotes_feature_specs(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "features" / "F001_Auth" / "spec.md").is_file()
        assert (docs_root / "features" / "F002_Profile" / "spec.md").is_file()

    def test_no_system_overview_at_generated_path(self, tmp_path):
        # v4.0.0+: system-overview.md goes to docs/system/overview.md, NOT docs/generated/
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert not (docs_root / "generated" / "system-overview.md").is_file()

    def test_sha256_manifest_created(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        manifest = plan_dir / "artifacts" / "_promoted-sha256.txt"
        assert manifest.is_file()

    def test_sha256_manifest_non_empty(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        manifest = (plan_dir / "artifacts" / "_promoted-sha256.txt").read_text()
        assert len(manifest.strip()) > 0


class TestLayeredPromotion:
    """v4: artifacts promoted to canonical layered docs/ paths."""

    def test_system_overview_promoted_to_layered_path(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "system" / "overview.md").is_file()

    def test_business_rules_promoted_to_layered_path(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "system" / "business-rules.md").is_file()

    def test_permissions_promoted_to_layered_path(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        (plan_dir / "artifacts" / "permissions.md").write_text("# Permissions\n")
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "system" / "permissions.md").is_file()

    def test_architecture_promoted_to_system(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        (plan_dir / "artifacts" / "architecture.md").write_text("# Architecture\n")
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "system" / "architecture.md").is_file()

    def test_permissions_matrix_promoted_to_generated(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        (plan_dir / "artifacts" / "permissions-matrix.md").write_text("# Permissions Matrix\n")
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "generated" / "permissions-matrix.md").is_file()

    def test_route_list_promoted_to_generated(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "generated" / "route-list.md").is_file()

    def test_data_model_promoted_as_entities(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        (plan_dir / "artifacts" / "data-model.md").write_text("# Data Model\n")
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        # v4: data-model.md → docs/generated/entities.md (renamed)
        assert (docs_root / "generated" / "entities.md").is_file()

    def test_feature_list_promoted_to_generated(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "generated" / "feature-list.md").is_file()

    def test_features_promoted_to_layered_path(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "features" / "F001_Auth" / "spec.md").is_file()
        assert (docs_root / "features" / "F002_Profile" / "spec.md").is_file()

    def test_flows_promoted_to_layered_path(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "flows" / "test-flow.md").is_file()

    def test_no_specs_flat_content(self, tmp_path):
        """v4: no flat copies go to docs/specs/ — content lives only at layered paths."""
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        specs_dir = docs_root / "specs"
        # docs/specs/ should either not exist or contain only archive/state files
        if specs_dir.exists():
            flat_mds = [
                f for f in specs_dir.glob("*.md")
                if not f.name.startswith("_")
            ]
            assert flat_mds == [], f"Unexpected flat content in docs/specs/: {flat_mds}"


class TestIncrementalModePromotion:
    def test_exit_code_zero(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "feature-list.md",
                "--affected-fcodes", "F001_Auth",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr

    def test_promotes_only_specified_artifact(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "feature-list.md",
                "--affected-fcodes", "",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "generated" / "feature-list.md").is_file()
        # route-list was not in affected-artifacts
        assert not (docs_root / "generated" / "route-list.md").is_file()

    def test_promotes_only_specified_fcode(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "",
                "--affected-fcodes", "F001_Auth",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "features" / "F001_Auth" / "spec.md").is_file()
        assert not (docs_root / "features" / "F002_Profile" / "spec.md").is_file()

    def test_incremental_flow_promotion(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "",
                "--affected-fcodes", "",
                "--affected-flows", "test-flow.md",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "flows" / "test-flow.md").is_file()

    def test_flows_dir_marker_in_artifacts_is_ignored(self, tmp_path):
        # Orchestrator passes "flows/" as an affected-artifact (dir marker); it must NOT
        # cause a failure or a bogus docs/generated/flows file — flows go via --affected-flows.
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "flows/,feature-list.md",
                "--affected-fcodes", "",
                "--affected-flows", "test-flow.md",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr
        assert (docs_root / "flows" / "test-flow.md").is_file()
        assert (docs_root / "generated" / "feature-list.md").is_file()
        assert not (docs_root / "generated" / "flows").exists()

    def test_incremental_permissions_matrix_promotion(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        (plan_dir / "artifacts" / "permissions-matrix.md").write_text("# Permissions Matrix\n")
        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "permissions.md,permissions-matrix.md",
                "--affected-fcodes", "",
            ],
            cwd=REPO_ROOT,
        )
        assert (docs_root / "generated" / "permissions-matrix.md").is_file()


class TestArchiveGc:
    def test_keeps_at_most_5_archive_dirs(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        # Pre-populate 6 old archive dirs — archive now lives at docs_root/.review-archive
        archive_root = docs_root / ".review-archive"
        archive_root.mkdir(parents=True)
        for i in range(6):
            tag = f"2026-01-0{i+1}T00-00-00Z"
            (archive_root / tag).mkdir()

        _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        remaining = [
            d for d in archive_root.iterdir() if d.is_dir()
        ]
        assert len(remaining) <= 5


class TestFullModeEmptyPromoteGuard:
    """Step 3.5: a full promote that copies 0 files (and skips 0) must FAIL LOUD (exit 3)."""

    def _empty_plan(self, tmp_path: Path) -> tuple[Path, Path]:
        """Build a plan-dir with an empty artifacts/ subtree (nothing to promote)."""
        subdir = Path(str(tmp_path).replace("/", "_").lstrip("_"))
        work = _PROMOTE_TMP / (subdir.name + "_empty")
        if work.exists():
            shutil.rmtree(work)
        (work / "plan" / "artifacts").mkdir(parents=True)
        (work / "docs").mkdir(parents=True)
        return work / "plan", work / "docs"

    def test_full_mode_zero_files_exits_3(self, tmp_path):
        plan_dir, docs_root = self._empty_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 3, result.stderr
        assert "0 files" in result.stderr
        assert "STOP and fix the pipeline" in result.stderr

    def test_exit_3_has_no_side_effects(self, tmp_path):
        """[T2] exit-3 fires BEFORE archive/GC/manifest — the actual contract is
        'no side effects': no timestamped archive dir under docs/, no
        _promoted-sha256.txt manifest written."""
        plan_dir, docs_root = self._empty_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 3, result.stderr
        # No manifest written
        assert not (plan_dir / "artifacts" / "_promoted-sha256.txt").exists()
        # No archive dir created under any pass-archive root
        for archive_root in (".review-archive", ".features-review-archive",
                             ".core-review-archive"):
            ar = docs_root / archive_root
            assert not ar.exists(), f"archive dir {ar} must not be created on exit-3"

    def test_incremental_mode_zero_files_stays_exit_0(self, tmp_path):
        # Incremental-empty (nothing affected this run) is legitimate — must NOT block.
        plan_dir, docs_root = self._empty_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "incremental",
                "--affected-artifacts", "",
                "--affected-fcodes", "",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr

    def test_full_mode_all_draft_protected_stays_exit_0(self, tmp_path):
        # full + 0 promoted but >0 draft-guard skips → NOT misconfigured, has work on
        # the next --force run. Guard's `not skipped_drafts` leg must keep this at exit 0.
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        draft_fm = "---\nstatus: draft\nauthored_by: takumi\n---\n# Spec\n"
        for fcode in ("F001_Auth", "F002_Profile"):
            dst = docs_root / "features" / fcode / "technical-spec.md"
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_text(draft_fm)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
                "--scope", "features",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr
        assert "SKIP" in result.stdout or "SKIP" in result.stderr

    def test_full_mode_populated_fixture_does_not_trip_guard(self, tmp_path):
        # Regression: the normal full-mode fixture promotes >0 files → exit 0, not 3.
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        result = _run(
            [
                "--plan-dir", str(plan_dir),
                "--docs-root", str(docs_root),
                "--mode", "full",
            ],
            cwd=REPO_ROOT,
        )
        assert result.returncode == 0, result.stderr


class TestSha256ManifestDeterminism:
    def test_manifest_deterministic_on_rerun(self, tmp_path):
        plan_dir, docs_root = _copy_fixture_plan(tmp_path)
        common_args = [
            "--plan-dir", str(plan_dir),
            "--docs-root", str(docs_root),
            "--mode", "full",
        ]
        _run(common_args, cwd=REPO_ROOT)
        manifest1 = (plan_dir / "artifacts" / "_promoted-sha256.txt").read_text()
        _run(common_args, cwd=REPO_ROOT)
        manifest2 = (plan_dir / "artifacts" / "_promoted-sha256.txt").read_text()
        lines1 = sorted(manifest1.strip().splitlines())
        lines2 = sorted(manifest2.strip().splitlines())
        assert lines1 == lines2
