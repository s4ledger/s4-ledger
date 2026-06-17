"""HORIZON — agent core.

The agent loop is provider-agnostic. Today it runs a deterministic
stub LLM that:

  1. Heuristically chooses a tool (or none) based on the user message.
  2. Calls the tool through `tools.call_tool`.
  3. Formats the tool result into a HORIZON-style brief.

Swap the `LLM` adapter for OpenAI/Anthropic later — every other piece
(memory, tools, audit, routing) stays unchanged.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from . import memory
from .audit import record_audit
from .config import settings
from .tools import call_tool, list_tools


# ──────────────────────────────────────────────────────────────────
#  LLM adapter — stub today, real later
# ──────────────────────────────────────────────────────────────────

class LLM:
    """Pluggable LLM adapter. The stub returns a deterministic brief
    that exercises the tool pipeline end-to-end without a network call.
    """

    def __init__(self, provider: str = "stub") -> None:
        self.provider = provider

    def plan(self, user_text: str) -> dict[str, Any]:
        """Decide whether to call a tool. Returns {"tool": str|None, "args": dict}."""
        text = user_text.lower()

        # PR-##### → forecast_slip
        m = re.search(r"\bpr[- ]?(\d{3,6})\b", text)
        if m:
            return {"tool": "forecast_slip",
                    "args": {"pr_number": f"PR-{int(m.group(1)):05d}"}}

        # Hull mentions → get_hull_status
        m = re.search(r"\b(t-ao[- ]?\d+|yrbm[- ]?\d+|lsv[- ]?\d+|lcu[- ]?\d+)\b", text)
        if m:
            raw = m.group(1).upper().replace(" ", "-")
            return {"tool": "get_hull_status", "args": {"hull": raw}}

        if any(k in text for k in ("snapshot", "overview", "pipeline", "summary", "brief")):
            return {"tool": "summarize_pipeline", "args": {}}

        if any(k in text for k in ("overdue",)):
            return {"tool": "search_records", "args": {"status": "Overdue"}}

        if any(k in text for k in ("at risk", "at-risk", "risk", "slip", "behind")):
            return {"tool": "search_records", "args": {"status": "At Risk"}}

        if any(k in text for k in ("search", "find", "show me", "list")):
            qm = re.search(r"['\"]([^'\"]+)['\"]", user_text)
            query = qm.group(1) if qm else user_text.split()[-1]
            return {"tool": "search_records", "args": {"query": query, "limit": 10}}

        return {"tool": None, "args": {}}

    def compose(
        self,
        user_text: str,
        tool_payload: dict[str, Any] | None,
        retrieved: list[dict[str, Any]],
    ) -> str:
        if tool_payload and "result" in tool_payload:
            return _format_brief(tool_payload["tool"], tool_payload["result"])
        if tool_payload and "error" in tool_payload:
            return (
                f"HORIZON · tool error\n"
                f"Tool: `{tool_payload.get('tool', '?')}`\n"
                f"Detail: {tool_payload['error']}\n"
                f"Action: rephrase or call a different tool."
            )
        if retrieved:
            top = retrieved[0]
            return (
                f"HORIZON · reference\n"
                f"Source: `{top['path']}` — *{top['title']}*\n\n"
                f"{top['excerpt'].strip()}\n\n"
                f"_(For pipeline data, ask about a specific PR #, hull, or for a snapshot.)_"
            )
        return (
            "HORIZON · ready\n"
            "Ask me about a pipeline record (e.g. `PR-00042`), a hull (e.g. `T-AO 209`), "
            "or request a `pipeline snapshot`."
        )


def _format_brief(tool_name: str, result: Any) -> str:
    """Compose the HORIZON-style markdown brief from a tool result."""
    if tool_name == "summarize_pipeline":
        lines = ["HORIZON · pipeline brief", ""]
        lines.append(f"Total records: **{result['total_records']}**")
        lines.append("")
        lines.append("By status:")
        for row in result["by_status"]:
            lines.append(f"- `{row['status'].upper()}` — {row['n']}")
        if result["top_attention"]:
            lines.append("")
            lines.append("Top attention:")
            for r in result["top_attention"]:
                lines.append(_pr_line(r))
        return "\n".join(lines)

    if tool_name == "forecast_slip":
        if result.get("error") == "not_found":
            return f"HORIZON · {result['pr_number']} not found in the pipeline."
        sign = "+" if result["projected_variance_days"] >= 0 else ""
        return (
            f"HORIZON · slip forecast — `{result['pr_number']}`\n"
            f"- Hull: {result['hull_id']}\n"
            f"- Phase: {result['phase']} · Status: `{result['status'].upper()}`\n"
            f"- Current variance: `{result['current_variance_days']:+d}d`\n"
            f"- Projected variance: `{sign}{result['projected_variance_days']}d`\n"
            f"- Confidence: **{result['confidence']}**\n\n"
            f"_{result['rationale']}_"
        )

    if tool_name == "get_hull_status":
        if result.get("error") == "not_found":
            return f"HORIZON · hull `{result['hull']}` not found."
        h = result["hull"]
        sc = result["status_counts"]
        lines = [
            f"HORIZON · hull brief — **{h['display_name']}**",
            f"- COAR: `{h.get('coar') or '—'}`  · Class: `{h.get('class_letter') or '—'}`",
            f"- Records tracked: {result['record_count']}",
            f"- Status mix: `ON TRACK` {sc['On Track']} · `AT RISK` {sc['At Risk']} · "
            f"`OVERDUE` {sc['Overdue']} · `COMPLETE` {sc['Complete']}",
            "",
        ]
        if result["records"]:
            lines.append("Top by RIY:")
            for r in result["records"][:5]:
                lines.append(_pr_line(r))
        return "\n".join(lines)

    if tool_name == "get_pipeline_snapshot":
        lines = ["HORIZON · snapshot", ""]
        if result.get("hull"):
            lines.append(f"Hull scope: {result['hull']}")
            lines.append("")
        lines.append("By phase:")
        for row in result["by_phase"]:
            lines.append(f"- {row['phase']}: {row['n']}")
        lines.append("")
        lines.append("By status:")
        for row in result["by_status"]:
            lines.append(f"- `{row['status'].upper()}`: {row['n']}")
        if result["top_risk"]:
            lines.append("")
            lines.append("Top risk:")
            for r in result["top_risk"]:
                lines.append(_pr_line(r))
        return "\n".join(lines)

    if tool_name == "search_records":
        if not result:
            return "HORIZON · no pipeline records matched."
        lines = [f"HORIZON · {len(result)} match(es)", ""]
        for r in result:
            lines.append(_pr_line(r))
        return "\n".join(lines)

    return f"HORIZON · {tool_name} →\n```\n{json.dumps(result, indent=2)}\n```"


def _pr_line(r: dict[str, Any]) -> str:
    return (
        f"- `{r['pr_number']}` · {r.get('hull_id', '—')} · "
        f"{r['phase']} · `{r['status'].upper()}` · "
        f"RIY {r['riy']} · {r['variance_days']:+d}d · {r['title']}"
    )


# ──────────────────────────────────────────────────────────────────
#  Agent loop
# ──────────────────────────────────────────────────────────────────

@dataclass
class AgentResponse:
    session_id: str
    reply: str
    tool: str | None
    tool_args: dict[str, Any]
    tool_result: Any
    retrieved: list[dict[str, Any]]


_llm = LLM(provider=settings.raw["model"].get("provider", "stub"))


def run_turn(
    user_handle: str,
    message: str,
    session_id: str | None = None,
) -> AgentResponse:
    if not message or not message.strip():
        raise ValueError("empty_message")
    if len(message) > settings.raw["limits"]["max_input_chars"]:
        raise ValueError("input_too_long")

    sid = memory.ensure_session(user_handle, session_id)
    memory.append_message(sid, "user", message)
    record_audit(sid, "chat", user_handle, {"direction": "in", "chars": len(message)})

    plan = _llm.plan(message)
    tool_payload: dict[str, Any] | None = None
    if plan["tool"]:
        tool_payload = call_tool(plan["tool"], plan["args"])
        memory.append_message(
            sid, "tool", json.dumps(tool_payload),
            tool_name=plan["tool"], tool_args=plan["args"],
            tool_result=tool_payload.get("result"),
        )
        record_audit(
            sid, "tool_call", user_handle,
            {"tool": plan["tool"], "args": plan["args"],
             "ok": "result" in tool_payload},
        )

    retrieved = memory.retrieve_context(message)
    reply = _llm.compose(message, tool_payload, retrieved)
    reply = reply[: settings.raw["limits"]["max_response_chars"]]

    memory.append_message(sid, "assistant", reply)
    record_audit(sid, "chat", user_handle, {"direction": "out", "chars": len(reply)})

    return AgentResponse(
        session_id=sid,
        reply=reply,
        tool=plan["tool"],
        tool_args=plan["args"],
        tool_result=(tool_payload or {}).get("result"),
        retrieved=retrieved,
    )


def available_tools() -> list[dict[str, Any]]:
    return list_tools()
