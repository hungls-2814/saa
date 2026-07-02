#!/usr/bin/env python3
"""Write plans/<active>/artifacts/_session-context.md — shared context for all W1-W9 subagents.

Exit codes: 0 = success, 2 = arg/IO error.
Stdlib only.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import os
import re
import sys
import tempfile


def _resolve_guarded(path: str, base: str) -> str:
    """Resolve path and verify it stays under base. Raises ValueError if not."""
    resolved = os.path.realpath(os.path.abspath(path))
    base_resolved = os.path.realpath(os.path.abspath(base))
    if os.path.commonpath([resolved, base_resolved]) != base_resolved:
        raise ValueError(f"Path traversal detected: {path!r} escapes {base!r}")
    return resolved


def _extract_detected_stack(content: str) -> str:
    m = re.search(r"^## Detected Language\s*\n\s*(\S[^\n]*)", content, re.MULTILINE)
    return m.group(1).strip() if m else "JS/TS"


def _atomic_write(path: str, content: str) -> None:
    dir_ = os.path.dirname(path) or "."
    fd, tmp = tempfile.mkstemp(dir=dir_, prefix=".sc_tmp_")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.rename(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def _patch_feature_count(existing: str, count: int) -> str:
    return re.sub(r"(?m)^(- feature_count: ).*$", rf"\g<1>{count}", existing)


def build(args: argparse.Namespace) -> None:
    cwd = os.getcwd()

    scout_path = _resolve_guarded(args.scout_report, cwd)
    plan_dir = _resolve_guarded(args.plan_dir, cwd)

    out_path = (
        _resolve_guarded(args.out, cwd)
        if args.out
        else os.path.join(plan_dir, "artifacts", "_session-context.md")
    )

    try:
        with open(scout_path, encoding="utf-8") as f:
            scout_content = f.read()
    except OSError as e:
        print(f"error: cannot read scout-report: {e}", file=sys.stderr)
        sys.exit(2)

    detected_stack = _extract_detected_stack(scout_content)
    is_multi_stack = "[MULTI_STACK]" in scout_content
    feature_count = args.feature_count if args.feature_count is not None else "<pending-W5>"

    plan_basename = os.path.basename(plan_dir.rstrip("/"))
    iso_now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Patch-only mode: file exists and --feature-count supplied
    if args.feature_count is not None and os.path.exists(out_path):
        try:
            with open(out_path, encoding="utf-8") as f:
                existing = f.read()
            patched = _patch_feature_count(existing, args.feature_count)
            _atomic_write(out_path, patched)
            return
        except OSError as e:
            print(f"error: patch failed: {e}", file=sys.stderr)
            sys.exit(2)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    # Language directive (v5.1.0)
    lang_directive = ""
    ctx_mode = getattr(args, "mode", None) or "generate"
    ctx_lang = getattr(args, "lang", None) or ""
    if ctx_mode == "translate" and ctx_lang:
        lang_directive = f"""
## Language Directive (translate mode)
- mode: translate
- target_lang: {ctx_lang}
- rule: Translate ONLY prose from the source's language to {ctx_lang}. Copy headings, code tokens, field labels, table-column headers, fenced code, frontmatter, paths, status enums BYTE-IDENTICAL from the source. Preserve line/section order.
- contract: claude/skills/rebuild-spec/references/translation-contract.md
"""
    elif ctx_mode == "generate" and ctx_lang and ctx_lang != "en":
        lang_directive = f"""
## Language Directive (generation mode)
- mode: generate
- prose_lang: {ctx_lang}
- rule: Write all prose in {ctx_lang}. Keep ALL headings, code tokens (F###/US###/SCR###/BL###/PERM###/DEC-###/DISC-###/MODEL###), field labels, table-column headers, fenced code blocks, frontmatter, file paths, and status enums in English (canonical skeleton).
"""

    body = f"""# Session Context — rebuild-spec

<!-- Generated: {iso_now}  | Plan: {plan_dir} -->
<!-- All subagents in this session MUST read this file before any other artifact read. -->

## Stack
- detectedStack: {detected_stack}
- isMultiStack: {is_multi_stack}
- stackNote: {args.stack_note}

## Counts
- feature_count: {feature_count}
{lang_directive}
## Always-read pointers (use Read tool, not Grep)
- plans/{plan_basename}/artifacts/system-overview.md  — global narrative (small)
- claude/skills/rebuild-spec/references/code-formats.md  — code schemas

## Grep-only pointers (DO NOT load in full)
- plans/{plan_basename}/artifacts/scout-report.md  — file inventory + BL inventory; section-scoped reads only
- plans/{plan_basename}/artifacts/feature-list.md  — per-F### entries; grep by code
- plans/{plan_basename}/artifacts/user-stories.md  — per-US### sections
- plans/{plan_basename}/artifacts/screen-list.md, screen-flow.md, behavior-logic.md, permissions.md, route-list.md, data-model.md

## Templates (read once per task, not per check)
- claude/skills/rebuild-spec/templates/feature-spec-template.md
- claude/skills/rebuild-spec/templates/review-report-template.md
- claude/skills/rebuild-spec/templates/scout-report-template.md

## Contracts
- claude/skills/rebuild-spec/references/feature-spec-researcher-contract.md
- claude/skills/rebuild-spec/references/verification-checklist-universal.md
- claude/skills/rebuild-spec/references/verification-checklist-core-artifacts.md (W7a)
- claude/skills/rebuild-spec/references/verification-checklist-feature-spec.md (W7b)
- claude/skills/rebuild-spec/references/verification-checklist-screen-spec.md (SS.2)
- claude/skills/rebuild-spec/references/verification-checklist-quality-gates.md (W4.5/W5.6)
- claude/skills/rebuild-spec/references/canonical-fcode-schema.md

## Reminders (avoid these wastes)
1. Do NOT re-derive detectedStack from scout-report; it's above.
2. Do NOT load scout-report.md in full — Grep `## Background Logic Source Inventory` section if you need BL inventory.
3. Do NOT re-summarize system-overview.md across multiple steps — read once.
4. Do NOT write multi-line PASS evidence — see review-report-template.md § Passed Checks rule.
5. On successful primary output write (spec.md / review-report.md), call `TaskUpdate(status=completed)` on your own task id (see phase-06 self-close rule).
"""

    try:
        _atomic_write(out_path, body)
    except OSError as e:
        print(f"error: cannot write output: {e}", file=sys.stderr)
        sys.exit(2)


def main() -> None:
    p = argparse.ArgumentParser(
        description="Write _session-context.md for rebuild-spec subagents."
    )
    p.add_argument("--plan-dir", required=True, help="Path to active plan directory")
    p.add_argument("--scout-report", required=True, help="Path to scout-report.md")
    p.add_argument("--stack-note", required=True, help="Stack note string (pre-computed by orchestrator)")
    p.add_argument("--feature-count", type=int, default=None, help="Feature count (optional)")
    p.add_argument("--mode", default="generate", choices=["generate", "translate"],
                   help="Language mode: 'generate' (inline prose in --lang, English skeleton) or 'translate' (prose-only translation)")
    p.add_argument("--lang", default=None, help="Target language code (e.g. vi, jp). Omit for English default.")
    p.add_argument("--out", default=None, help="Output path (default: <plan-dir>/artifacts/_session-context.md)")
    args = p.parse_args()
    build(args)


if __name__ == "__main__":
    main()
