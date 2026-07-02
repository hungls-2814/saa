#!/usr/bin/env python3
"""gen-slide: render a PPTX from a project_profile.md.

Reads a profile markdown (produced by gen-md.py) and renders it into the
SVN proposal PPTX template via the role-based renderer pipeline.
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from lib.profile_parser import parse_profile
from lib.renderer import PPTXRenderer


def main():
    ap = argparse.ArgumentParser(description='Render PPTX from project_profile markdown')
    ap.add_argument('--input', required=True, help='Path to project_content_{id}_{ts}.md')
    ap.add_argument('--output', help='Output file name without .pptx (default: derived from input)')
    ap.add_argument('--output-dir', help='Output directory (default: env SLIDE_GENERATOR__OUTPUTS_PATH or ./outputs)')
    ap.add_argument('--template', default='[SVN] Proposal Menu.pptx', help='Template PPTX name or path')
    args = ap.parse_args()

    md_path = Path(args.input)
    if not md_path.exists():
        sys.exit(f'Input not found: {md_path}')

    md = md_path.read_text(encoding='utf-8')
    profile = parse_profile(md)

    # Resolve template path: absolute > scripts/templates > clio-artifact/templates
    tpl = Path(args.template)
    if not tpl.is_absolute():
        candidates = [
            Path(__file__).parent / 'templates' / args.template,
            Path(__file__).parent.parent / 'templates' / args.template,
        ]
        for c in candidates:
            if c.exists():
                tpl = c
                break
        else:
            sys.exit(f'Template not found: {args.template}')

    # Derive output name from project_id+timestamp when not given
    output_name = args.output or f'proposal_{profile.project_id}_{profile.timestamp}'

    renderer = PPTXRenderer()
    out_file = renderer.render_from_profile(
        profile, str(tpl), output_name, args.output_dir,
    )
    print(f'Done: {out_file}')


if __name__ == '__main__':
    main()
