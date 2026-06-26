"""
S4ight multi-step planner.

For complex prompts ("prepare my Gate 5 package", "do a full ILA-readiness
sweep", etc.), the planner asks the LLM to produce a structured JSON
plan listing tool calls, then executes them in order and stitches the
results into a single response.

Design choices:
- Plans are intentionally small (≤ 4 steps) so we keep latency low and
  cost predictable.
- The planner only schedules tools from `AVAILABLE_TOOLS` — invalid tool
  names are dropped.
- If planning fails or returns nothing, callers should fall back to the
  normal single-step agent.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from llm_providers import get_provider, _build_messages  # _build_messages is fine to reuse
from tools import AVAILABLE_TOOLS

log = logging.getLogger("s4ight.planner")

MAX_STEPS = 4

ALLOWED_TOOL_PARAMS: Dict[str, List[str]] = {
    "generate_ils_checklist": ["element", "platform"],
    "generate_acquisition_outline": ["milestone", "program"],
    "generate_risk_register": ["program", "count"],
    "draft_lcsp_section": ["section", "program", "platform"],
    "triage_ims_critical_path": ["program"],
    "triage_evms_variance": ["program", "cpi", "spi"],
    "gap_analyze_ila_finding": ["finding_title", "program"],
}

# Plain-text intent → suggested chain. Used both as a heuristic shortcut
# AND in the system prompt as exemplars.
INTENT_TEMPLATES: Dict[str, List[str]] = {
    "gate 5 package": [
        "generate_acquisition_outline",
        "draft_lcsp_section",
        "generate_risk_register",
        "gap_analyze_ila_finding",
    ],
    "gate 4 package": [
        "generate_acquisition_outline",
        "draft_lcsp_section",
        "generate_risk_register",
    ],
    "gate 6 package": [
        "generate_acquisition_outline",
        "draft_lcsp_section",
        "generate_risk_register",
        "triage_ims_critical_path",
    ],
    "ila readiness": [
        "gap_analyze_ila_finding",
        "draft_lcsp_section",
        "generate_risk_register",
    ],
    "program health sweep": [
        "triage_evms_variance",
        "triage_ims_critical_path",
        "generate_risk_register",
    ],
    "full sustainment package": [
        "draft_lcsp_section",
        "generate_ils_checklist",
        "generate_risk_register",
        "gap_analyze_ila_finding",
    ],
}


PLANNER_SYSTEM_PROMPT = """You are S4ight's planner. Given a user request and
the program in scope, return a strict JSON plan describing which structured
tools to run, in order. Only use tools the user clearly asked for via a
multi-deliverable phrase like "prepare my Gate 5 package", "full ILA
readiness", "program health sweep", or "draft my sustainment package".

Schema (return ONLY this JSON, no prose):
{
  "is_multi_step": <bool>,
  "steps": [
    { "tool": "<tool_name>", "args": { ... }, "reason": "<short>" }
  ]
}

Allowed tool names:
- generate_ils_checklist {element, platform}
- generate_acquisition_outline {milestone, program}
- generate_risk_register {program, count}
- draft_lcsp_section {section, program, platform}
- triage_ims_critical_path {program}
- triage_evms_variance {program, cpi, spi}
- gap_analyze_ila_finding {finding_title, program}

Rules:
- If the user asks a normal single-topic question, set is_multi_step=false
  and return empty steps.
- Never schedule the same tool twice.
- Maximum 4 steps.
- Use args sparingly; omit args you can't infer.
"""


def _heuristic_plan(query: str, program: str = "PMS 325") -> Optional[List[str]]:
    q = query.lower()
    try:
        from program_profiles import chain_allowed, tool_allowed  # noqa: WPS433
    except Exception:
        chain_allowed = lambda *a, **kw: True  # type: ignore
        tool_allowed = lambda *a, **kw: True  # type: ignore

    def _filter_chain(chain: List[str]) -> List[str]:
        return [t for t in chain if tool_allowed(program, t)]

    def _consider(trigger: str, chain: List[str]) -> Optional[List[str]]:
        if not chain_allowed(program, trigger):
            return None
        filtered = _filter_chain(chain)
        return filtered if filtered else None

    for trigger, chain in INTENT_TEMPLATES.items():
        if trigger in q:
            result = _consider(trigger, chain)
            if result:
                return result
    if "gate 5" in q and "package" in q:
        return _consider("gate 5 package", INTENT_TEMPLATES["gate 5 package"])
    if "gate 4" in q and "package" in q:
        return _consider("gate 4 package", INTENT_TEMPLATES["gate 4 package"])
    if "gate 6" in q and "package" in q:
        return _consider("gate 6 package", INTENT_TEMPLATES["gate 6 package"])
    if "sustainment package" in q or "full sustainment" in q:
        return _consider("full sustainment package", INTENT_TEMPLATES["full sustainment package"])
    return None


def _clean_step(step: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    name = (step.get("tool") or "").strip()
    if name not in AVAILABLE_TOOLS:
        return None
    args = step.get("args") or {}
    if not isinstance(args, dict):
        args = {}
    allowed = ALLOWED_TOOL_PARAMS.get(name, [])
    args = {k: v for k, v in args.items() if k in allowed}
    return {"tool": name, "args": args, "reason": str(step.get("reason") or "")[:200]}


def _plan_via_llm(query: str, program: str) -> Optional[List[Dict[str, Any]]]:
    provider = get_provider()
    if not provider.available():
        return None
    try:
        # Reuse the provider's chat method with a planner-specific system prompt.
        # We build messages by hand since _build_messages adds the production
        # system prompt — for planning we want only the planner's prompt.
        messages = [
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "system", "content": f"Program in scope: {program}."},
            {"role": "user", "content": query},
        ]
        from openai import OpenAI  # type: ignore
        from config import OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_TIMEOUT_S
        if not OPENAI_API_KEY:
            return None
        kwargs = {"api_key": OPENAI_API_KEY, "timeout": OPENAI_TIMEOUT_S}
        if OPENAI_BASE_URL:
            kwargs["base_url"] = OPENAI_BASE_URL
        client = OpenAI(**kwargs)
        resp = client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,  # type: ignore[arg-type]
            temperature=0,
            response_format={"type": "json_object"},
        )
        text = (resp.choices[0].message.content or "").strip()
        if not text:
            return None
        data = json.loads(text)
        if not data.get("is_multi_step"):
            return []
        raw_steps = data.get("steps") or []
        if not isinstance(raw_steps, list):
            return []
        cleaned: List[Dict[str, Any]] = []
        seen = set()
        for step in raw_steps[:MAX_STEPS]:
            if not isinstance(step, dict):
                continue
            cs = _clean_step(step)
            if cs and cs["tool"] not in seen:
                cleaned.append(cs)
                seen.add(cs["tool"])
        return cleaned
    except Exception as e:  # pragma: no cover
        log.warning("Planner LLM call failed: %s", e)
        return None


def plan(query: str, program: str) -> List[Dict[str, Any]]:
    """Return the (possibly empty) ordered step list."""
    # 1. Heuristic shortcut for the most common phrases — no LLM cost.
    heur = _heuristic_plan(query, program=program)
    if heur:
        out: List[Dict[str, Any]] = []
        for name in heur:
            out.append({
                "tool": name,
                "args": {"program": program} if "program" in ALLOWED_TOOL_PARAMS.get(name, []) else {},
                "reason": "heuristic",
            })
        return out
    # 2. LLM-backed plan.
    via_llm = _plan_via_llm(query, program)
    if not via_llm:
        return []
    # 3. Final filter: drop steps the program profile blocks.
    try:
        from program_profiles import tool_allowed  # noqa: WPS433
        via_llm = [s for s in via_llm if tool_allowed(program, s["tool"])]
    except Exception:
        pass
    return via_llm


def execute(steps: List[Dict[str, Any]], program: str) -> List[Dict[str, Any]]:
    """Run the plan and return per-step outputs."""
    results: List[Dict[str, Any]] = []
    for step in steps:
        name = step["tool"]
        fn = AVAILABLE_TOOLS.get(name)
        if not fn:
            continue
        args = dict(step.get("args") or {})
        # Default program for any step that takes one
        if "program" in ALLOWED_TOOL_PARAMS.get(name, []) and "program" not in args:
            args["program"] = program
        try:
            import inspect
            sig = inspect.signature(fn)
            kwargs = {k: v for k, v in args.items() if k in sig.parameters}
            output = fn(**kwargs)
            results.append({"tool": name, "args": kwargs, "output": output, "reason": step.get("reason", "")})
        except Exception as e:  # pragma: no cover
            log.warning("Plan step %s failed: %s", name, e)
            results.append({"tool": name, "args": args, "error": str(e), "reason": step.get("reason", "")})
    return results
