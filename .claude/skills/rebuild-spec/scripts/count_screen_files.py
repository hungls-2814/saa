#!/usr/bin/env python3
"""Count screen-tagged lines in scout-report's File Inventory section.

Counts lines matching a tab followed by "screen" — File Inventory entries tagged as screens.
Prints the integer count to stdout.

Exit codes: 0 = success, 2 = file missing or path traversal.
Stdlib only.
"""
from __future__ import annotations

import argparse
import os
import re
import sys


def main() -> None:
    p = argparse.ArgumentParser(
        description="Count screen-tagged lines in scout-report File Inventory."
    )
    p.add_argument("--scout-report", required=True, help="Path to scout-report.md")
    args = p.parse_args()

    cwd = os.getcwd()
    resolved = os.path.realpath(os.path.abspath(args.scout_report))
    base = os.path.realpath(os.path.abspath(cwd))
    if os.path.commonpath([resolved, base]) != base:
        print(f"error: path traversal detected: {args.scout_report!r}", file=sys.stderr)
        sys.exit(2)

    try:
        with open(resolved, encoding="utf-8") as f:
            content = f.read()
    except OSError as e:
        print(f"error: cannot read scout-report: {e}", file=sys.stderr)
        sys.exit(2)

    count = sum(1 for line in content.splitlines() if re.search(r"\tscreen", line))
    print(count)


if __name__ == "__main__":
    main()
