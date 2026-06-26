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
}


def _detect_tool(query: str) -> Optional[str]:
    q = query.lower()
    for tool_name, triggers in ARTIFACT_TRIGGERS.items():
        if any(t in q for t in triggers):
            return tool_name
    return None


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
        return fn()


# --- Specialized agents ---

class ILSAgent(BaseAgent):
    name = "ILS Agent"
    focus = "Integrated Logistics Support (12 elements, LCSP, ILA, provisioning, sustaining engineering)"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        # ILS agent only auto-fires ILS-flavored tools.
        if t in ("generate_ils_checklist", "generate_risk_register"):
            return t
        return None


class AcquisitionAgent(BaseAgent):
    name = "Acquisition Agent"
    focus = "Acquisition lifecycle, JCIDS, AoA, gate reviews, LCSP, CDD traceability"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        if t in ("generate_acquisition_outline", "generate_risk_register"):
            return t
        return None


class ProgrammaticAgent(BaseAgent):
    name = "Programmatic Agent"
    focus = "Risk, schedule (IMS), EVMS, cost, program controls"

    def _tool_for(self, query: str) -> Optional[str]:
        t = _detect_tool(query)
        if t in ("generate_risk_register",):
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
