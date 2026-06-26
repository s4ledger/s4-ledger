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


# ---------------- New Wave 2 tools ----------------

LCSP_SECTIONS = [
    "Sustainment Strategy & Performance Outcomes",
    "Product Support Strategy",
    "Product Support Package (12 IPS Elements)",
    "Funding Profile",
    "Sustainment Risks",
    "Performance Measurement & Reviews",
    "Configuration & Technical Data Management",
    "Sustainment Schedule & Key Decisions",
]


def draft_lcsp_section(
    section: str = "Sustainment Strategy & Performance Outcomes",
    program: str = "PMS 325",
    platform: str = "T-AO 205 Class",
) -> Dict[str, Any]:
    """Return a structured outline + draft language for a single LCSP section."""
    section = section.strip()
    valid = section if section in LCSP_SECTIONS else LCSP_SECTIONS[0]
    skeletons: Dict[str, str] = {
        LCSP_SECTIONS[0]: (
            "Purpose: define materiel readiness outcomes (Ao, MTBR, MTBF) the "
            f"{program} {platform} sustainment strategy will deliver and the "
            "performance management cadence used to verify them.\n\n"
            "Required content:\n"
            "- Outcome metrics with thresholds/objectives traced to APB.\n"
            "- Operating profile and demand signal assumptions.\n"
            "- Reporting cadence to PM / PEO and review owners.\n"
            "- Linkage to LCSP risks and IMS milestones."
        ),
        LCSP_SECTIONS[1]: (
            "Product Support Strategy summarizing organic / contractor / hybrid "
            "elements, any PBL constructs, and the rationale tied to readiness "
            f"outcomes for {program} {platform}."
        ),
        LCSP_SECTIONS[2]: (
            "Coverage statement and maturity rating for each of the 12 IPS "
            "elements. Provide owner, current state, planned actions, and "
            "supporting documents. Highlight any element rated yellow or red "
            "with a closure plan tied to the next gate review."
        ),
        LCSP_SECTIONS[3]: (
            "Funding profile by fiscal year and appropriation (RDT&E / PMC / "
            "OMN). Map to demand signal and to sustaining engineering, "
            "DMSMS, training, and depot maintenance lines. Flag any cliffs."
        ),
        LCSP_SECTIONS[4]: (
            "Top sustainment risks from the program register, scored L x C, "
            "with owners, mitigations, triggers, and the IMS / LCSP hooks "
            "that close them."
        ),
        LCSP_SECTIONS[5]: (
            "PM / PEO reporting cadence, KPIs, and review forums. Tie to ILA "
            "schedule and to EVMS / IMS health metrics."
        ),
        LCSP_SECTIONS[6]: (
            "CM / TDP currency strategy: baseline owner, CCB cadence, "
            "TDP rights posture, and ECP processing SLAs."
        ),
        LCSP_SECTIONS[7]: (
            "Time-phased sustainment schedule with key decisions (option "
            "exercises, ILA, depot availability gates) and dependencies on "
            "the IMS and contract milestones."
        ),
    }
    return {
        "tool": "draft_lcsp_section",
        "section": valid,
        "program": program,
        "platform": platform,
        "draft": skeletons[valid],
        "supporting_docs": [
            "lcsp_overview.md",
            "ils_12_elements.md",
            "ila_process.md",
            "gate_review_evidence.md",
        ],
        "all_sections": LCSP_SECTIONS,
    }


def triage_ims_critical_path(program: str = "PMS 325") -> Dict[str, Any]:
    """Return a structured IMS critical-path triage with the 14 most common findings."""
    findings: List[Dict[str, Any]] = [
        {"finding": "ILS milestones (LCSP, ILA, provisioning) not on the critical path.", "severity": "High", "action": "Inject ILS gates into the IMS with explicit predecessors/successors."},
        {"finding": "Critical Path Length Index (CPLI) < 0.95.", "severity": "High", "action": "Re-evaluate longest path; pull-plan recovery for top 3 driving tasks."},
        {"finding": "Baseline Execution Index (BEI) < 0.95 sustained 3+ months.", "severity": "High", "action": "Root-cause statusing discipline; consider re-baseline if ≥ 6 months."},
        {"finding": "Tasks with float > 44 working days unexplained.", "severity": "Med", "action": "Flag, investigate missing successors or fictional dates."},
        {"finding": "Negative float on baseline tasks.", "severity": "High", "action": "Investigate every instance; correct logic or constraints."},
        {"finding": "Hard constraints (MFO/MSO) > 5% of tasks.", "severity": "Med", "action": "Replace with deadlines + logic where possible."},
        {"finding": "Plug durations for ILA prep / provisioning campaigns.", "severity": "Med", "action": "Decompose to ≤44-day chunks with measurable outputs."},
        {"finding": "Invalid dates (future actuals, past forecasts).", "severity": "Med", "action": "Status weekly; enforce data integrity rules in the scheduling tool."},
        {"finding": "Provisioning baseline not represented as a network of tasks.", "severity": "High", "action": "Build provisioning swimlane tied to TDP releases."},
        {"finding": "Training products lag fielding without explicit logic.", "severity": "Med", "action": "Add FS links from training release to fielding events."},
        {"finding": "Cybersecurity sustainment (STIG re-apply) missing from IMS.", "severity": "Med", "action": "Insert recurring cyber tasks tied to patch cycles."},
        {"finding": "ISEA sustaining engineering tasks shown only as LOE.", "severity": "Med", "action": "Add discrete deliverables (DR responses, ECPs) to enable EV."},
        {"finding": "DR / DMSMS resolution lacks owners on the schedule.", "severity": "Low", "action": "Assign cognizant ISEA engineer to each open case."},
        {"finding": "No explicit gate-review preparation arcs in the IMS.", "severity": "Med", "action": "Insert 60/30/14-day pre-gate tasks with required artifacts."},
    ]
    return {
        "tool": "triage_ims_critical_path",
        "program": program,
        "findings": findings,
        "primary_sources": ["dcma_14_point_ims.md", "ims_quality.md"],
    }


def triage_evms_variance(program: str = "PMS 325", cpi: float = 0.91, spi: float = 0.93) -> Dict[str, Any]:
    """Return a structured EVMS variance triage given headline CPI/SPI."""

    def verdict(metric: str, value: float) -> str:
        if metric in ("cpi", "spi"):
            if value >= 0.97:
                return "Green"
            if value >= 0.90:
                return "Yellow"
            return "Red"
        return "Unknown"

    findings = [
        {
            "metric": "CPI (cumulative)",
            "value": f"{cpi:.2f}",
            "verdict": verdict("cpi", cpi),
            "action": "If Yellow/Red: identify the WBS legs driving > 80% of CV; require VAR with root cause and recovery curve.",
        },
        {
            "metric": "SPI (cumulative)",
            "value": f"{spi:.2f}",
            "verdict": verdict("spi", spi),
            "action": "If Yellow/Red: pulse-test critical path; correct schedule logic before adjusting performance.",
        },
        {
            "metric": "ILS WBS visibility",
            "value": "—",
            "verdict": "Diagnostic",
            "action": "Climb above Level 3 on the WBS to surface ILS legs; many sustainment variances hide there.",
        },
        {
            "metric": "Re-baseline pressure",
            "value": "—",
            "verdict": "Diagnostic",
            "action": "If CPI/SPI sustained < 0.95 for 6+ months with no credible recovery, recommend formal re-baseline.",
        },
        {
            "metric": "LCSP impact",
            "value": "—",
            "verdict": "Diagnostic",
            "action": "Translate each material VAR into a specific LCSP section update at the next sustainment review.",
        },
    ]
    return {
        "tool": "triage_evms_variance",
        "program": program,
        "cpi": cpi,
        "spi": spi,
        "findings": findings,
        "primary_sources": ["evms_basics.md", "evms_variance_triage.md"],
    }


def gap_analyze_ila_finding(
    finding_title: str = "Provisioning data immature at MS C",
    program: str = "PMS 325",
) -> Dict[str, Any]:
    """Decompose an ILA finding into per-IPS-element gaps and corrective actions."""
    gaps = [
        {
            "ips_element": "Supply Support",
            "gap": "Provisioning baseline incomplete; no allowance list freeze.",
            "owner": "PSM + NAVSUP WSS",
            "due": "MS C minus 90 days",
            "success_criteria": "Provisioning baseline frozen; allowance lists delivered.",
        },
        {
            "ips_element": "Technical Data",
            "gap": "TDP gaps blocking provisioning sourcing.",
            "owner": "Lead Engineer + CM",
            "due": "MS C minus 120 days",
            "success_criteria": "TDP CDRLs delivered and accepted; CM baseline matches as-built.",
        },
        {
            "ips_element": "Sustaining Engineering",
            "gap": "ISEA SOW lags configuration changes; DR backlog rising.",
            "owner": "PSM + ISEA Lead",
            "due": "Within 60 days",
            "success_criteria": "ISEA SOW updated; DR median closure age < 90 days.",
        },
        {
            "ips_element": "Training",
            "gap": "Training products keyed to obsolete configuration.",
            "owner": "PSM + Training Lead",
            "due": "Within 90 days",
            "success_criteria": "Course materials updated to current baseline; instructor refresh executed.",
        },
        {
            "ips_element": "Maintenance Planning",
            "gap": "Maintenance concept not validated against fleet operating profile.",
            "owner": "PSM + Fleet Liaison",
            "due": "Within 60 days",
            "success_criteria": "Updated maintenance concept signed by sponsor and fleet.",
        },
    ]
    return {
        "tool": "gap_analyze_ila_finding",
        "program": program,
        "finding_title": finding_title,
        "gaps": gaps,
        "primary_sources": ["ila_process.md", "ils_12_elements.md", "gate_review_evidence.md"],
    }


AVAILABLE_TOOLS.update(
    {
        "draft_lcsp_section": draft_lcsp_section,
        "triage_ims_critical_path": triage_ims_critical_path,
        "triage_evms_variance": triage_evms_variance,
        "gap_analyze_ila_finding": gap_analyze_ila_finding,
    }
)