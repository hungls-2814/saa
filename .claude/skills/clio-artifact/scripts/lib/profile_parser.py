"""Profile markdown parser — converts project_content_{id}_{ts}.md into ProjectProfile.

Markdown structure:
  # Project Profile: {id}
  Generated: {ts}

  ## Section Heading
  ### Subsection Heading      (optional)
  free text / bullet list / numbered list / table / `Image: path`
  ...

Tolerant: unknown sections logged + skipped; missing sections leave defaults.
"""
from __future__ import annotations

import re
from typing import Optional

from lib.profile_schema import (
    AfterBlock,
    AssumptionSection,
    BackgroundSection,
    BenefitSection,
    BusinessProcessSection,
    FeaturesSection,
    NFROverviewSection,
    NFRSection,
    ProjectProfile,
    ScheduleSection,
    ScreenFlowSection,
)

# Map normalized section heading -> handler name
_SECTION_MAP = {
    'project background': 'background',
    'features': 'features',
    'non-functional requirements (overview)': 'nfr_overview',
    'nfr overview': 'nfr_overview',
    'screen flow': 'screen_flow',
    'business process': 'business_process',
    'benefits': 'benefits',
    'approach comparison': 'approach_comparison',
    'assumptions': 'assumptions',
    'infrastructure': 'infrastructure',
    'software stack': 'software_stack',
    'nfr sections': 'nfr_sections',
    'nfr detailed': 'nfr_detailed',
    'schedule': 'schedule',
}


def parse_profile(markdown: str) -> ProjectProfile:
    """Top-level: parse markdown text into a ProjectProfile."""
    project_id, timestamp = _parse_header(markdown)
    profile = ProjectProfile.empty(project_id=project_id, timestamp=timestamp)

    for heading, content in _split_sections(markdown).items():
        key = _SECTION_MAP.get(heading.lower().strip())
        if not key:
            print(f'[profile-parser] WARN: unknown section "{heading}" — skipping')
            continue
        handler = globals().get(f'_handle_{key}')
        if handler:
            handler(profile, content)
    return profile


# ---------------------------------------------------------------------------
# Header + section splitting
# ---------------------------------------------------------------------------

def _parse_header(md: str) -> tuple[str, str]:
    """Extract project_id from `# Project Profile: X` and timestamp from `Generated: X`."""
    pid_match = re.search(r'^#\s*Project Profile:\s*(\S+)', md, re.MULTILINE)
    ts_match = re.search(r'^Generated:\s*(\S+)', md, re.MULTILINE)
    return (pid_match.group(1) if pid_match else '',
            ts_match.group(1) if ts_match else '')


def _split_sections(md: str) -> dict[str, str]:
    """Split markdown by `^## ` headings. Returns {heading_text: content}."""
    parts: dict[str, str] = {}
    current_heading = None
    current_lines: list[str] = []
    for line in md.splitlines():
        m = re.match(r'^##\s+(.+?)\s*$', line)
        if m and not line.startswith('###'):
            if current_heading is not None:
                parts[current_heading] = '\n'.join(current_lines).strip()
            current_heading = m.group(1).strip()
            current_lines = []
        else:
            if current_heading is not None:
                current_lines.append(line)
    if current_heading is not None:
        parts[current_heading] = '\n'.join(current_lines).strip()
    return parts


def _split_subsections(content: str) -> dict[str, str]:
    """Split section content by `^### ` headings. Returns {heading_text: content}."""
    parts: dict[str, str] = {}
    current = None
    buf: list[str] = []
    for line in content.splitlines():
        m = re.match(r'^###\s+(.+?)\s*$', line)
        if m:
            if current is not None:
                parts[current] = '\n'.join(buf).strip()
            current = m.group(1).strip()
            buf = []
        else:
            if current is not None:
                buf.append(line)
    if current is not None:
        parts[current] = '\n'.join(buf).strip()
    return parts


# ---------------------------------------------------------------------------
# Content primitives
# ---------------------------------------------------------------------------

def _parse_table(content: str) -> list[dict]:
    """Parse a markdown pipe table into a list of dicts (keys = header row)."""
    lines = [l.strip() for l in content.splitlines() if l.strip().startswith('|')]
    if len(lines) < 2:
        return []

    def split_row(line: str) -> list[str]:
        cells = [c.strip() for c in line.split('|')]
        # Strip empty leading/trailing cells from outer pipes
        if cells and cells[0] == '':
            cells = cells[1:]
        if cells and cells[-1] == '':
            cells = cells[:-1]
        return cells

    header = split_row(lines[0])
    rows = []
    for line in lines[1:]:
        # Skip separator |---|---|
        if all(c in '|-: \t' for c in line):
            continue
        cells = split_row(line)
        if not cells:
            continue
        row = {header[i] if i < len(header) else f'col{i}': cells[i] for i in range(len(cells))}
        rows.append(row)
    return rows


def _parse_list(content: str) -> list[str]:
    """Parse bulleted (`- item`) or numbered (`1. item`) list. Other lines ignored."""
    items: list[str] = []
    for line in content.splitlines():
        s = line.strip()
        m = re.match(r'^(?:-|\*|\d+\.)\s+(.+)$', s)
        if m:
            items.append(m.group(1).strip())
    return items


def _parse_image_ref(content: str) -> str:
    """Extract path from `Image: path` line. Returns empty string if not found."""
    m = re.search(r'^Image:\s*(.+)$', content, re.MULTILINE)
    return m.group(1).strip() if m else ''


def _parse_text(content: str) -> str:
    """Strip and return text content (multi-line preserved)."""
    return content.strip()


# ---------------------------------------------------------------------------
# Section handlers — one per top-level section
# ---------------------------------------------------------------------------

def _handle_background(profile: ProjectProfile, content: str):
    subs = _split_subsections(content)
    profile.project_background = BackgroundSection(
        current_issues=_parse_text(subs.get('Current Issues', '')),
        objectives=_parse_text(subs.get('Objectives', '')),
    )


def _handle_features(profile: ProjectProfile, content: str):
    subs = _split_subsections(content)
    profile.features = FeaturesSection(
        description=_parse_text(subs.get('Description', '')),
        table=_parse_table(subs.get('Feature Table', '')),
    )


def _handle_nfr_overview(profile: ProjectProfile, content: str):
    subs = _split_subsections(content)
    profile.nfr_overview = NFROverviewSection(
        description=_parse_text(subs.get('Description', '')),
        table=_parse_table(subs.get('Requirements Table', '')),
    )


def _handle_screen_flow(profile: ProjectProfile, content: str):
    profile.screen_flow = ScreenFlowSection(image_path=_parse_image_ref(content))


def _handle_business_process(profile: ProjectProfile, content: str):
    subs = _split_subsections(content)
    after_blocks = []
    after_content = subs.get('After (Post-Introduction)') or subs.get('After', '')
    # Each `#### title` followed by body
    for m in re.finditer(r'^####\s+(.+?)\s*$\n(.*?)(?=^####\s|\Z)', after_content, re.MULTILINE | re.DOTALL):
        after_blocks.append(AfterBlock(title=m.group(1).strip(), body=m.group(2).strip()))
    profile.business_process = BusinessProcessSection(
        categories=_parse_list(subs.get('Categories', '')),
        before_steps=_parse_list(subs.get('Before (Current Process)') or subs.get('Before', '')),
        after_blocks=after_blocks,
    )


def _handle_benefits(profile: ProjectProfile, content: str):
    benefits = []
    for m in re.finditer(r'^###\s+(.+?)\s*$\n(.*?)(?=^###\s|\Z)', content, re.MULTILINE | re.DOTALL):
        benefits.append(BenefitSection(title=m.group(1).strip(), content=m.group(2).strip()))
    profile.benefits = benefits


def _handle_approach_comparison(profile: ProjectProfile, content: str):
    profile.approach_comparison = _parse_table(content)


def _handle_assumptions(profile: ProjectProfile, content: str):
    assumptions = []
    for m in re.finditer(r'^###\s+(.+?)\s*$\n(.*?)(?=^###\s|\Z)', content, re.MULTILINE | re.DOTALL):
        assumptions.append(AssumptionSection(label=m.group(1).strip(), content=m.group(2).strip()))
    profile.assumptions = assumptions


def _handle_infrastructure(profile: ProjectProfile, content: str):
    profile.infrastructure = _parse_table(content)


def _handle_software_stack(profile: ProjectProfile, content: str):
    profile.software_stack = _parse_table(content)


def _handle_nfr_sections(profile: ProjectProfile, content: str):
    sections = []
    for m in re.finditer(r'^###\s+(.+?)\s*$\n(.*?)(?=^###\s|\Z)', content, re.MULTILINE | re.DOTALL):
        sections.append(NFRSection(title=m.group(1).strip(), body=m.group(2).strip()))
    profile.nfr_sections = sections


def _handle_nfr_detailed(profile: ProjectProfile, content: str):
    profile.nfr_detailed = _parse_table(content)


def _handle_schedule(profile: ProjectProfile, content: str):
    subs = _split_subsections(content)
    profile.schedule = ScheduleSection(
        description=_parse_text(subs.get('Description', '')),
        image_path=_parse_image_ref(subs.get('Chart', '')),
    )
