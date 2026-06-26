"""
S4ight program profiles.

This file declares the *behavioural differences* between PMS 300, 325,
and 385 so that S4ight tailors its language, applicable tools,
suggested workflows, and retrieval scope per program.

Three honest principles:
  1. Each profile is treated as a STUB until a domain expert validates
     it. `stub: True` is surfaced to the user.
  2. S4ight never invents program-specific facts. The stub content
     declares operational *character* (e.g., "sustainment-execution
     dominant" vs "new-build acquisition dominant") — not specific
     contract numbers, deliverable names, or office structures.
  3. The richest content comes from the user's own uploaded documents
     (SOPs, briefs, gate decisions). The upload flow + per-session
     persistence already supports that. This file is just the floor.

Fields per profile:
  canonical_name        human-readable label
  short_summary         one-paragraph operational character
  lifecycle_focus       acquisition | sustainment | hybrid
  vocabulary_emphasis   terms the program actually uses
  vocabulary_avoid      terms that sound right but don't apply
  applicable_tools      whitelist (anything outside this is hidden)
  blocked_tools         explicit blacklist (overrides applicable)
  applicable_chains     planner intents that make sense
  applicable_presets    quick-prompt IDs that should appear
  system_prompt_extra   additional system-prompt text injected at chat time
  applicable_kb         list of curated .md files that are relevant; "*" = all
  stub                  True if this profile is a placeholder
  stub_note             user-facing explanation when stub is True

Edit this file (or override via S4IGHT_PROGRAM_PROFILES_JSON env var)
to encode the real differences.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

# ---------------- All known tools / chains / presets ----------------

ALL_TOOLS = [
    "generate_ils_checklist",
    "generate_acquisition_outline",
    "generate_risk_register",
    "draft_lcsp_section",
    "triage_ims_critical_path",
    "triage_evms_variance",
    "gap_analyze_ila_finding",
]

ALL_CHAINS = [
    "gate 4 package",
    "gate 5 package",
    "gate 6 package",
    "ila readiness",
    "program health sweep",
    "full sustainment package",
]

ALL_PRESETS = [
    # planner chains
    "preset_gate_5", "preset_gate_4", "preset_gate_6",
    "preset_ila_readiness", "preset_program_health", "preset_full_sustainment",
    # single deliverables
    "preset_ils_checklist", "preset_risk_register", "preset_ims_triage",
    "preset_evms_triage", "preset_lcsp_draft", "preset_ila_gap",
    # domain Q&A
    "preset_qa_12_ips", "preset_qa_traceability", "preset_qa_dmsms",
    "preset_qa_sustaining_eng", "preset_qa_cyber_ips7",
]


# ---------------- Default (stub) profiles ----------------

_STUB_NOTE = (
    "This program profile is a PLACEHOLDER. S4ight does not assume specific "
    "deliverable names, gate constructs, or office structures for this "
    "program. Please confirm the operational character with a domain expert "
    "or upload program-specific documents (SOPs, brief decks, gate decisions) "
    "to refine S4ight's behaviour."
)

DEFAULT_PROFILES: Dict[str, Dict[str, Any]] = {
    "PMS 300": {
        "canonical_name": "PMS 300 (in-service / sustainment-leaning)",
        "short_summary": (
            "Operational character treated as in-service execution and "
            "sustainment-leaning. Acquisition gate constructs and formal "
            "earned-value reporting are NOT assumed to apply by default. "
            "Confirm with program documentation."
        ),
        "lifecycle_focus": "sustainment",
        "vocabulary_emphasis": [
            "in-service engineering", "ISEA", "sustaining engineering",
            "availability", "depot", "maintenance", "DMSMS", "obsolescence",
            "configuration management", "TDP currency", "DR (deficiency report)",
        ],
        "vocabulary_avoid": [
            "Milestone B/C/A", "Gate 4/5/6 package", "ACAT", "JCIDS",
            "CDD/CPD", "APB threshold", "MS C readiness",
        ],
        "applicable_tools": [
            "generate_ils_checklist",
            "generate_risk_register",
            "draft_lcsp_section",
            "gap_analyze_ila_finding",
        ],
        "blocked_tools": [
            "generate_acquisition_outline",
            "triage_evms_variance",
            "triage_ims_critical_path",
        ],
        "applicable_chains": [
            "ila readiness",
            "full sustainment package",
        ],
        "applicable_presets": [
            "preset_ila_readiness",
            "preset_full_sustainment",
            "preset_ils_checklist",
            "preset_risk_register",
            "preset_lcsp_draft",
            "preset_ila_gap",
            "preset_qa_12_ips",
            "preset_qa_dmsms",
            "preset_qa_sustaining_eng",
            "preset_qa_cyber_ips7",
        ],
        "system_prompt_extra": (
            "PMS 300 context: treat questions as in-service execution / "
            "sustainment unless the user states otherwise. Do NOT volunteer "
            "Milestone B/C language, gate-package deliverables, or formal "
            "EVMS/IMS analysis unless explicitly asked or unless the user's "
            "uploaded documents indicate that contract scope. When unsure, "
            "ask the user to confirm the contract vehicle and reporting "
            "requirements before producing acquisition-style artifacts."
        ),
        "applicable_kb": [
            "ils_12_elements.md",
            "lcsp_overview.md",
            "ila_process.md",
            "dmsms_obsolescence.md",
            "sustaining_engineering_isea.md",
            "risk_management.md",
            "cybersecurity_rmf_ato.md",
            "contracting_far_dfars.md",
            "pms_300_overview.md",
            "_style_guide.md",
        ],
        "stub": True,
        "stub_note": _STUB_NOTE,
    },
    "PMS 325": {
        "canonical_name": "PMS 325 (acquisition + sustainment hybrid)",
        "short_summary": (
            "Operational character treated as a hybrid of new-build "
            "acquisition (with formal milestones / gate reviews) and "
            "downstream sustainment. EVMS / IMS / LCSP / ILA all apply "
            "depending on the contract leg in scope. Confirm with program "
            "documentation."
        ),
        "lifecycle_focus": "hybrid",
        "vocabulary_emphasis": [
            "Milestone B/C", "Gate 4/5/6", "LCSP", "ILA", "CDD/CPD", "APB",
            "TDP", "provisioning", "PSM", "EVMS", "IMS", "sustainment review",
        ],
        "vocabulary_avoid": [],
        "applicable_tools": list(ALL_TOOLS),
        "blocked_tools": [],
        "applicable_chains": list(ALL_CHAINS),
        "applicable_presets": list(ALL_PRESETS),
        "system_prompt_extra": (
            "PMS 325 context: acquisition + sustainment workstreams may "
            "coexist. Ask the user which contract / phase is in scope before "
            "producing artifacts that mix acquisition-stage deliverables "
            "with sustainment metrics. Use formal gate / milestone "
            "vocabulary when the user references it."
        ),
        "applicable_kb": ["*"],
        "stub": True,
        "stub_note": _STUB_NOTE,
    },
    "PMS 385": {
        "canonical_name": "PMS 385 (in-service engineering / support equipment)",
        "short_summary": (
            "Operational character treated as in-service engineering and "
            "support-equipment focused, with strong DMSMS and "
            "configuration-management workstreams. Acquisition gate "
            "constructs are NOT assumed by default. Confirm with program "
            "documentation."
        ),
        "lifecycle_focus": "sustainment",
        "vocabulary_emphasis": [
            "in-service engineering", "ISEA", "support equipment",
            "calibration", "DMSMS", "obsolescence", "ECP",
            "configuration management", "TDP rebuild",
        ],
        "vocabulary_avoid": [
            "Gate 4/5/6 package", "Milestone B/C", "JCIDS", "CDD/CPD",
            "APB threshold", "MS C readiness",
        ],
        "applicable_tools": [
            "generate_ils_checklist",
            "generate_risk_register",
            "draft_lcsp_section",
            "gap_analyze_ila_finding",
        ],
        "blocked_tools": [
            "generate_acquisition_outline",
            "triage_evms_variance",
            "triage_ims_critical_path",
        ],
        "applicable_chains": [
            "ila readiness",
            "full sustainment package",
        ],
        "applicable_presets": [
            "preset_ila_readiness",
            "preset_full_sustainment",
            "preset_ils_checklist",
            "preset_risk_register",
            "preset_lcsp_draft",
            "preset_ila_gap",
            "preset_qa_12_ips",
            "preset_qa_dmsms",
            "preset_qa_sustaining_eng",
            "preset_qa_cyber_ips7",
        ],
        "system_prompt_extra": (
            "PMS 385 context: treat questions as in-service engineering / "
            "support equipment sustainment unless told otherwise. DMSMS, "
            "obsolescence, TDP currency, and ECP workflow are first-class "
            "topics. Do NOT volunteer acquisition gate language."
        ),
        "applicable_kb": [
            "ils_12_elements.md",
            "lcsp_overview.md",
            "ila_process.md",
            "dmsms_obsolescence.md",
            "sustaining_engineering_isea.md",
            "risk_management.md",
            "cybersecurity_rmf_ato.md",
            "contracting_far_dfars.md",
            "pms_385_overview.md",
            "_style_guide.md",
        ],
        "stub": True,
        "stub_note": _STUB_NOTE,
    },
}


# ---------------- Optional env-var override ----------------

def _load_overrides() -> Dict[str, Dict[str, Any]]:
    raw = os.getenv("S4IGHT_PROGRAM_PROFILES_JSON", "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


_OVERRIDES = _load_overrides()
PROFILES: Dict[str, Dict[str, Any]] = {}
for name, defaults in DEFAULT_PROFILES.items():
    merged = dict(defaults)
    merged.update(_OVERRIDES.get(name, {}))
    PROFILES[name] = merged


# ---------------- Lookup helpers ----------------

def get(program: str) -> Dict[str, Any]:
    """Return a profile (may be the empty default)."""
    if program in PROFILES:
        return PROFILES[program]
    return {
        "canonical_name": program,
        "short_summary": "No profile registered.",
        "lifecycle_focus": "unknown",
        "vocabulary_emphasis": [],
        "vocabulary_avoid": [],
        "applicable_tools": list(ALL_TOOLS),
        "blocked_tools": [],
        "applicable_chains": list(ALL_CHAINS),
        "applicable_presets": list(ALL_PRESETS),
        "system_prompt_extra": "",
        "applicable_kb": ["*"],
        "stub": True,
        "stub_note": _STUB_NOTE,
    }


def public_view(program: str) -> Dict[str, Any]:
    """Strip noisy internal fields for the /health surface and the UI."""
    p = get(program)
    return {
        "program": program,
        "canonical_name": p["canonical_name"],
        "short_summary": p["short_summary"],
        "lifecycle_focus": p["lifecycle_focus"],
        "applicable_tools": list(p.get("applicable_tools") or []),
        "blocked_tools": list(p.get("blocked_tools") or []),
        "applicable_chains": list(p.get("applicable_chains") or []),
        "applicable_presets": list(p.get("applicable_presets") or []),
        "vocabulary_emphasis": list(p.get("vocabulary_emphasis") or []),
        "vocabulary_avoid": list(p.get("vocabulary_avoid") or []),
        "stub": bool(p.get("stub")),
        "stub_note": p.get("stub_note", ""),
    }


def all_public() -> Dict[str, Dict[str, Any]]:
    return {name: public_view(name) for name in PROFILES}


def tool_allowed(program: str, tool_name: str) -> bool:
    p = get(program)
    if tool_name in (p.get("blocked_tools") or []):
        return False
    allow = p.get("applicable_tools")
    if not allow:
        return True
    return tool_name in allow


def chain_allowed(program: str, chain_name: str) -> bool:
    p = get(program)
    chains = p.get("applicable_chains")
    if not chains:
        return True
    return chain_name.lower() in [c.lower() for c in chains]


def kb_allowed(program: str, source_filename: str) -> bool:
    p = get(program)
    files = p.get("applicable_kb") or ["*"]
    if "*" in files:
        return True
    return source_filename in files


def system_prompt_extra(program: str) -> str:
    return (get(program).get("system_prompt_extra") or "").strip()
