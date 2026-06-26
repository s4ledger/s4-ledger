"""
S4ight Agents
Domain-specialized agents (ILS, Acquisition, Programmatic) orchestrated by a
simple keyword router. Each agent:
  - retrieves grounded context
  - asks the LLM (Ollama) for a synthesis with agent-specific focus
  - optionally fires structured tools when the user asks for an artifact
  - falls back to a retrieval-only response if the LLM is unavailable
"""

from __future__ import annotations

import logging
from typing import Dict, Any, Optional, List

from retriever import build_context, get_grounded_response
from tools import AVAILABLE_TOOLS
from memory import store as memory_store, ConversationMemory
from llm_providers import get_provider
from config import REQUIRE_LLM

log = logging.getLogger("s4ight.agents")


# --- Intent / tool detection ---

ARTIFACT_TRIGGERS = {
    "generate_ils_checklist": [
        "checklist", "ils checklist", "supply support checklist",
        "provisioning checklist", "12 elements checklist",
    ],
    "generate_acquisition_outline": [
        "outline", "gate review package", "milestone package",
        "acquisition outline", "lcsp outline",
    ],
    "generate_risk_register": [
        "risk register", "risks for", "seed risks", "top risks",
    ],
    "draft_lcsp_section": [
        "draft lcsp", "lcsp section", "write lcsp", "lcsp draft",
    ],
    "triage_ims_critical_path": [
        "ims triage", "schedule triage", "critical path", "cpli", "bei",
        "schedule health",
    ],
    "triage_evms_variance": [
        "evms triage", "evms variance", "cpi variance", "spi variance",
        "earned value triage",
    ],
    "gap_analyze_ila_finding": [
        "ila gap", "ila finding", "ila corrective", "cap for ila",
    ],
}


def _detect_tool(query: str) -> Optional[str]:
    q = query.lower()
    for tool_name, triggers in ARTIFACT_TRIGGERS.items():
        if any(t in q for t in triggers):
            return tool_name
    return None


# --- Parameter extractors for tool invocation ---

import re as _re

_LCSP_SECTION_KEYWORDS = {
    "sustainment strategy": "Sustainment Strategy & Performance Outcomes",
    "performance outcomes": "Sustainment Strategy & Performance Outcomes",
    "product support strategy": "Product Support Strategy",
    "product support package": "Product Support Package (12 IPS Elements)",
    "ips elements": "Product Support Package (12 IPS Elements)",
    "funding profile": "Funding Profile",
    "sustainment risks": "Sustainment Risks",
    "performance measurement": "Performance Measurement & Reviews",
    "reviews": "Performance Measurement & Reviews",
    "configuration": "Configuration & Technical Data Management",
    "technical data management": "Configuration & Technical Data Management",
    "sustainment schedule": "Sustainment Schedule & Key Decisions",
}


def _extract_lcsp_section(query: str) -> str:
    q = query.lower()
    for k, v in _LCSP_SECTION_KEYWORDS.items():
        if k in q:
            return v
    return "Sustainment Strategy & Performance Outcomes"


_EVMS_RE = _re.compile(r"(cpi|spi)\s*[=:]?\s*(\d+(?:\.\d+)?)", _re.IGNORECASE)


def _extract_evms_metrics(query: str) -> tuple:
    cpi = 0.91
    spi = 0.93
    for m in _EVMS_RE.finditer(query):
        metric, val = m.group(1).lower(), float(m.group(2))
        if val > 5:  # tolerate "91" being typed for 0.91
            val = val / 100.0
        if metric == "cpi":
            cpi = val
        elif metric == "spi":
            spi = val
    return cpi, spi


def _extract_ila_title(query: str) -> str:
    # Cheap heuristic — first 120 chars after the trigger phrase.
    q = query.strip()
    for trig in ("ila finding", "ila gap", "cap for ila", "ila corrective"):
        i = q.lower().find(trig)
        if i >= 0:
            tail = q[i + len(trig):].strip(" -:,")
            if tail:
                return tail[:120]
    return q[:120] if q else "Provisioning data immature at MS C"


# --- Base agent ---

class BaseAgent:
    name = "Base Agent"
    focus = "General S4 Domain"

    def _llm_or_fallback(
        self,
        query: str,
        program: str,
        context: str,
        sources: List[str],
        history: List[Dict],
    ) -> Dict[str, Any]:
        provider = get_provider()
        if provider.available():
            try:
                text = provider.chat(
                    user_message=query,
                    program=program,
                    context=context,
                    history=history,
                    agent_focus=self.focus,
                )
                if text:
                    return {
                        "response": text,
                        "sources": sources or ["S4ight Knowledge Base"],
                        "engine": provider.name,
                    }
            except Exception as e:  # pragma: no cover - depends on env
                log.warning("%s call failed: %s", provider.name, e)
                if REQUIRE_LLM:
                    raise

        # Retrieval-only fallback.
        grounded = get_grounded_response(query, program)
        return {
            "response": grounded["response"],
            "sources": grounded["sources"],
            "engine": "retrieval-fallback",
        }

    def run(
        self,
        query: str,
        program: str,
        session_id: str = "default",
    ) -> Dict[str, Any]:
        mem: ConversationMemory = memory_store.get(session_id)
        context, sources = build_context(query)

        base = self._llm_or_fallback(
            query=query,
            program=program,
            context=context,
            sources=sources,
            history=mem.history,
        )

        output: Dict[str, Any] = {
            "agent": self.name,
            "focus": self.focus,
            "response": base["response"],
            "sources": base["sources"],
            "engine": base["engine"],
        }

        # Tool firing
        tool_name = self._tool_for(query)
        if tool_name and tool_name in AVAILABLE_TOOLS:
            try:
                result = self._invoke_tool(tool_name, query, program)
                output["tool_used"] = tool_name
                output["tool_result"] = result
            except Exception as e:  # pragma: no cover - guard
                log.warning("Tool %s failed: %s", tool_name, e)

        # Update memory
        mem.add_turn("user", query, program=program, agent=self.name)
        mem.add_turn("assistant", output["response"][:1200], program=program, agent=self.name)

        return output

    # Subclasses override these to constrain tool selection.
    def _tool_for(self, query: str) -> Optional[str]:
        return _detect_tool(query)

    def _invoke_tool(self, tool_name: str, query: str, program: str) -> Dict[str, Any]:
        fn = AVAILABLE_TOOLS[tool_name]
        if tool_name == "generate_ils_checklist":
            return fn(element="Supply Support", platform=program)
        if tool_name == "generate_acquisition_outline":
            return fn(milestone="Gate Review", program=program)
        if tool_name == "generate_risk_register":
            return fn(program=program, count=5)
        if tool_name == "draft_lcsp_section":
            section = _extract_lcsp_section(query)
            return fn(section=section, program=program)
        if tool_name == "triage_ims_critical_path":
            return fn(program=program)
        if tool_name == "triage_evms_variance":
            cpi, spi = _extract_evms_metrics(query)
            return fn(program=program, cpi=cpi, spi=spi)
        if tool_name == "gap_analyze_ila_finding":
            return fn(finding_title=_extract_ila_title(query), program=program)
        return fn()


# --- Specialized agents ---

class ILSAgent(BaseAgent):
    name = "ILS Agent"
    focus = "Integrated Logistics Support (12 elements, LCSP, ILA, provisioning, sustaining engineering)"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        if t in (
            "generate_ils_checklist",
            "generate_risk_register",
            "draft_lcsp_section",
            "gap_analyze_ila_finding",
        ):
            return t
        return None


class AcquisitionAgent(BaseAgent):
    name = "Acquisition Agent"
    focus = "Acquisition lifecycle, JCIDS, AoA, gate reviews, LCSP, CDD traceability"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        if t in (
            "generate_acquisition_outline",
            "generate_risk_register",
            "draft_lcsp_section",
        ):
            return t
        return None


class ProgrammaticAgent(BaseAgent):
    name = "Programmatic Agent"
    focus = "Risk, schedule (IMS), EVMS, cost, program controls"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        if t in (
            "generate_risk_register",
            "triage_ims_critical_path",
            "triage_evms_variance",
        ):
            return t
        return None


# --- Router / orchestrator ---

ILS_KW = (
    "ils", "supply support", "maintenance planning", "sustaining engineer",
    "12 element", "provisioning", "lcsp", "ila", "phs&t", "support equipment",
    "training and support", "facilities", "manpower", "computer resources",
    "technical data", "packaging handling", "design interface",
)
ACQ_KW = (
    "acquisition", "gate review", "milestone", "ms a", "ms b", "ms c",
    "jcids", "aoa", "cdd", "rfp", "rfp release", "source selection",
    "configuration management", "tdp", "drl", "cdrl", "contract",
)
PROG_KW = (
    "risk", "schedule", "evms", "ims", "earned value", "variance",
    "cv", "sv", "spi", "cpi", "critical path", "baseline", "ibr", "cost",
)


class Orchestrator:
    def __init__(self):
        self.ils = ILSAgent()
        self.acq = AcquisitionAgent()
        self.prog = ProgrammaticAgent()

    def _pick(self, q: str) -> BaseAgent:
        ql = q.lower()
        scores = {
            self.ils: sum(1 for k in ILS_KW if k in ql),
            self.acq: sum(1 for k in ACQ_KW if k in ql),
            self.prog: sum(1 for k in PROG_KW if k in ql),
        }
        best = max(scores, key=scores.get)
        if scores[best] == 0:
            # No keyword match -> default to ILS (most common domain).
            return self.ils
        return best

    def route(
        self,
        query: str,
        program: str = "PMS 325",
        session_id: str = "default",
    ) -> Dict[str, Any]:
        agent = self._pick(query)
        return agent.run(query=query, program=program, session_id=session_id)


orchestrator = Orchestrator()
