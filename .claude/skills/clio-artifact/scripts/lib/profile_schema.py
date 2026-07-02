"""Canonical ProjectProfile dataclass — the contract between gen-md and gen-slide.

The profile is domain-organized (not slide-organized). Each section maps to
one `## Heading` in the project_profile markdown.
"""
from __future__ import annotations

from dataclasses import dataclass, field, asdict
from typing import Optional


# ---------------------------------------------------------------------------
# Compound sub-blocks
# ---------------------------------------------------------------------------

@dataclass
class AfterBlock:
    """One business_process 'after' block: category benefit title + body."""
    title: str = ''
    body: str = ''


@dataclass
class BenefitSection:
    """One benefit (title + multi-line content). Slides 12+13 fill 2 each."""
    title: str = ''
    content: str = ''


@dataclass
class AssumptionSection:
    """One assumption row: label (fixed in template) + content (filled)."""
    label: str = ''
    content: str = ''


@dataclass
class NFRSection:
    """One non-functional requirement section: title + body (5 bullets)."""
    title: str = ''
    body: str = ''


# ---------------------------------------------------------------------------
# Top-level section wrappers (for sections with multiple subfields)
# ---------------------------------------------------------------------------

@dataclass
class BackgroundSection:
    current_issues: str = ''
    objectives: str = ''


@dataclass
class FeaturesSection:
    description: str = ''
    table: list[dict] = field(default_factory=list)


@dataclass
class NFROverviewSection:
    description: str = ''
    table: list[dict] = field(default_factory=list)


@dataclass
class ScreenFlowSection:
    image_path: str = ''


@dataclass
class BusinessProcessSection:
    categories: list[str] = field(default_factory=list)
    before_steps: list[str] = field(default_factory=list)
    after_blocks: list[AfterBlock] = field(default_factory=list)


@dataclass
class ScheduleSection:
    description: str = ''
    image_path: str = ''


# ---------------------------------------------------------------------------
# Root ProjectProfile
# ---------------------------------------------------------------------------

@dataclass
class ProjectProfile:
    """Root project profile, organized by business domain."""
    project_id: str = ''
    timestamp: str = ''

    project_background: BackgroundSection = field(default_factory=BackgroundSection)
    features: FeaturesSection = field(default_factory=FeaturesSection)
    nfr_overview: NFROverviewSection = field(default_factory=NFROverviewSection)
    screen_flow: ScreenFlowSection = field(default_factory=ScreenFlowSection)
    business_process: BusinessProcessSection = field(default_factory=BusinessProcessSection)

    # Variable-length collections (no fixed structure beyond sub-block)
    benefits: list[BenefitSection] = field(default_factory=list)
    approach_comparison: list[dict] = field(default_factory=list)
    assumptions: list[AssumptionSection] = field(default_factory=list)
    infrastructure: list[dict] = field(default_factory=list)
    software_stack: list[dict] = field(default_factory=list)
    nfr_sections: list[NFRSection] = field(default_factory=list)
    nfr_detailed: list[dict] = field(default_factory=list)

    schedule: ScheduleSection = field(default_factory=ScheduleSection)

    @classmethod
    def empty(cls, project_id: str = '', timestamp: str = '') -> 'ProjectProfile':
        """Factory returning an instance with all fields defaulted."""
        return cls(project_id=project_id, timestamp=timestamp)

    @classmethod
    def from_dict(cls, data: dict) -> 'ProjectProfile':
        """Build a ProjectProfile from a plain dict (e.g. JSON input from agent).

        Tolerant: unknown keys ignored, missing keys use defaults.
        """
        def _section(cls_, payload):
            if not isinstance(payload, dict):
                return cls_()
            valid = {f for f in cls_.__dataclass_fields__}
            return cls_(**{k: v for k, v in payload.items() if k in valid})

        def _list_of(cls_, payload):
            if not isinstance(payload, list):
                return []
            return [_section(cls_, item) for item in payload]

        return cls(
            project_id=data.get('project_id', ''),
            timestamp=data.get('timestamp', ''),
            project_background=_section(BackgroundSection, data.get('project_background')),
            features=_section(FeaturesSection, data.get('features')),
            nfr_overview=_section(NFROverviewSection, data.get('nfr_overview')),
            screen_flow=_section(ScreenFlowSection, data.get('screen_flow')),
            business_process=BusinessProcessSection(
                categories=data.get('business_process', {}).get('categories', []) or [],
                before_steps=data.get('business_process', {}).get('before_steps', []) or [],
                after_blocks=_list_of(AfterBlock, data.get('business_process', {}).get('after_blocks')),
            ),
            benefits=_list_of(BenefitSection, data.get('benefits')),
            approach_comparison=data.get('approach_comparison', []) or [],
            assumptions=_list_of(AssumptionSection, data.get('assumptions')),
            infrastructure=data.get('infrastructure', []) or [],
            software_stack=data.get('software_stack', []) or [],
            nfr_sections=_list_of(NFRSection, data.get('nfr_sections')),
            nfr_detailed=data.get('nfr_detailed', []) or [],
            schedule=_section(ScheduleSection, data.get('schedule')),
        )

    def to_dict(self) -> dict:
        """Serialize to a plain dict (round-trippable through from_dict)."""
        return asdict(self)
