"""
S4ight Tools
Concrete artifact generators agents can invoke. Each tool returns structured
JSON-friendly output so the frontend can render it nicely.
"""

from __future__ import annotations
from typing import Dict, Any, List


def generate_ils_checklist(
    element: str = "Supply Support", platform: str = "T-AO 205 Class"
) -> Dict[str, Any]:
    """Structured ILS checklist for a specific element + platform."""
    return {
        "tool": "generate_ils_checklist",
        "element": element,
        "platform": platform,
        "checklist_items": [
            f"Confirm {element} requirements aligned with {platform} CONOPS and deployment profile.",
            "Validate provisioning list against current configuration baseline.",
            "Identify long-lead items and coordinate with NSLC / NAVSUP.",
            "Ensure Technical Data Package (TDP) supports provisioning.",
            "Review and update Maintenance Requirement Cards (MRCs) if applicable.",
            "Assess support equipment and PHS&T requirements.",
            "Document risks to schedule and cost in the IMS/EVMS.",
            "Coordinate with ISEA and Program Office for ILA inputs.",
        ],
        "notes": "Template starter. Expand with platform-specific configuration and lessons learned.",
    }


def generate_acquisition_outline(
    milestone: str = "Gate Review", program: str = "PMS 325"
) -> Dict[str, Any]:
    """Structured outline for acquisition / gate review packages."""
    return {
        "tool": "generate_acquisition_outline",
        "milestone": milestone,
        "program": program,
        "recommended_sections": [
            "Executive Summary & Decision Requested",
            "Requirements Traceability (CDD → Acquisition Documents)",
            "Updated Life Cycle Sustainment Plan (LCSP) Status",
            "Integrated Logistics Assessment (ILA) Findings & Actions",
            "Risk, Opportunity & Issue Summary (with mitigation plans)",
            "Affordability & Funding Profile",
            "Schedule Health (IMS critical path items linked to ILS)",
            "Configuration Management & Technical Data Maturity",
            "Cross-Program Lessons / Dependencies",
        ],
        "s4_recommendation": (
            "Explicitly link ILS deliverables to IMS and EVMS. Pre-populate "
            "risk and sustainment sections from the S4ight knowledge base."
        ),
    }


def generate_risk_register(program: str = "PMS 325", count: int = 5) -> Dict[str, Any]:
    """Seed risk register tailored to PMS-style sustainment programs."""
    seeds: List[Dict[str, Any]] = [
        {
            "id": "R-ILS-001",
            "title": "Provisioning data immature at MS C",
            "category": "ILS / Supply Support",
            "likelihood": "M",
            "consequence": "H",
            "mitigation": "Lock provisioning baseline 90 days pre-MS C; weekly ILS sync with NAVSUP.",
        },
        {
            "id": "R-ILS-002",
            "title": "Long-lead repair parts not on contract",
            "category": "ILS / Supply Support",
            "likelihood": "M",
            "consequence": "H",
            "mitigation": "Identify LLT parts; cut provisioning POs; track in IMS critical path.",
        },
        {
            "id": "R-ACQ-001",
            "title": "LCSP not aligned with current TDP baseline",
            "category": "Acquisition",
            "likelihood": "M",
            "consequence": "M",
            "mitigation": "Configuration-managed LCSP update tied to CCB decisions.",
        },
        {
            "id": "R-PROG-001",
            "title": "EVMS variance trending unfavorable on sustainment WBS",
            "category": "Programmatic / EVMS",
            "likelihood": "M",
            "consequence": "H",
            "mitigation": "Re-baseline at next IBR; weekly CV/SV review; corrective action plan.",
        },
        {
            "id": "R-PROG-002",
            "title": "IMS critical path lacks ILS milestones",
            "category": "Programmatic / IMS",
            "likelihood": "H",
            "consequence": "M",
            "mitigation": "Inject ILS gates into IMS; assign single owner; report monthly to PM.",
        },
        {
            "id": "R-ILS-003",
            "title": "Sustaining engineering capacity below demand",
            "category": "ILS / Sustaining Eng.",
            "likelihood": "M",
            "consequence": "M",
            "mitigation": "Validate funding profile; stand up rapid-response engineering cell with ISEA.",
        },
    ]
    items = seeds[: max(1, min(count, len(seeds)))]
    return {
        "tool": "generate_risk_register",
        "program": program,
        "risks": items,
        "scoring_legend": {"L": "Low", "M": "Medium", "H": "High"},
        "notes": "Seed register — refine with program-specific cost, schedule, performance inputs.",
    }


AVAILABLE_TOOLS = {
    "generate_ils_checklist": generate_ils_checklist,
    "generate_acquisition_outline": generate_acquisition_outline,
    "generate_risk_register": generate_risk_register,
}
