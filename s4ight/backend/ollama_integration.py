"""
S4ight Ollama Integration
Thin client around the local Ollama runtime with strict prompts that keep
S4ight grounded in the retrieved knowledge base.
"""

from __future__ import annotations

from typing import Optional, List, Dict
import logging

from config import (
    OLLAMA_HOST,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT_S,
    OLLAMA_TEMPERATURE,
)

log = logging.getLogger("s4ight.ollama")

try:
    import ollama  # type: ignore
    _OLLAMA_AVAILABLE = True
except Exception:  # pragma: no cover - dep optional at dev time
    ollama = None  # type: ignore
    _OLLAMA_AVAILABLE = False


SYSTEM_PROMPT = """You are S4ight, the specialized AI assistant for S4 Systems, LLC.
Your domain: US Navy Program Management Offices PMS 300, PMS 325, and PMS 385.
You serve Integrated Logistics Support (ILS), Acquisition Management, and
Programmatic / Risk / Schedule / EVMS / IMS workstreams.

Operating rules:
1. Stay strictly grounded in the supplied CONTEXT. If the context lacks the
   answer, say so plainly and recommend what document or data is needed.
2. Be concrete and actionable. Prefer checklists, numbered steps, tables,
   and gate-aligned outputs over prose.
3. Cite the source filename when you quote or paraphrase context. Format:
   (Source: filename.md).
4. Use DoD / Navy ILS vocabulary precisely (12 ILS elements, LCSP, ILA,
   LCSP, JCIDS, AoA, CDD, EVMS, IMS, NSLC, NAVSUP, ISEA, TDP, PHS&T, MRC).
5. Never invent regulations, MIL-STDs, or program facts. If unsure, label
   it clearly as "assumption to validate".
6. Always close with a "Next actions" block (3-5 bullets) the user can do.

You are not a general assistant. Decline politely if asked for content
outside this domain and redirect to a relevant ILS/Acquisition/Programmatic
question.
"""


def is_available() -> bool:
    return _OLLAMA_AVAILABLE


def _client():
    if not _OLLAMA_AVAILABLE:
        raise RuntimeError("ollama python package not installed")
    # ollama.Client honors OLLAMA_HOST env var, but be explicit.
    return ollama.Client(host=OLLAMA_HOST, timeout=OLLAMA_TIMEOUT_S)


def health_check() -> Dict[str, object]:
    """Quick reachability/model check. Never raises."""
    info: Dict[str, object] = {
        "package_installed": _OLLAMA_AVAILABLE,
        "host": OLLAMA_HOST,
        "model": OLLAMA_MODEL,
        "reachable": False,
        "model_present": False,
        "error": None,
    }
    if not _OLLAMA_AVAILABLE:
        info["error"] = "ollama python package not installed"
        return info
    try:
        client = _client()
        listing = client.list()
        info["reachable"] = True
        names = []
        for m in listing.get("models", []) or []:
            name = m.get("name") or m.get("model") or ""
            if name:
                names.append(name)
        info["model_present"] = any(
            n == OLLAMA_MODEL or n.startswith(f"{OLLAMA_MODEL}:") for n in names
        )
        info["available_models"] = names
    except Exception as e:  # pragma: no cover - depends on local env
        info["error"] = str(e)
    return info


def get_ollama_response_with_context(
    user_message: str,
    program: str = "PMS 325",
    context: str = "",
    history: Optional[List[Dict]] = None,
    agent_focus: Optional[str] = None,
) -> str:
    """Single-shot chat completion with strict grounding."""
    if not _OLLAMA_AVAILABLE:
        raise RuntimeError("ollama package not available")

    system_extra = ""
    if agent_focus:
        system_extra = f"\nActive specialized agent: {agent_focus}."

    program_line = f"Program in scope: {program}."
    context_block = (
        f"CONTEXT (from S4ight knowledge base):\n{context}\n"
        if context.strip()
        else "CONTEXT: (no direct knowledge-base matches — be explicit about that)"
    )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT + system_extra},
        {"role": "system", "content": program_line},
        {"role": "system", "content": context_block},
    ]

    if history:
        # Truncate each historical turn to keep prompt size reasonable.
        for turn in history[-8:]:
            role = turn.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = (turn.get("content") or "")[:1200]
            if content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})

    client = _client()
    resp = client.chat(
        model=OLLAMA_MODEL,
        messages=messages,
        options={
            "temperature": OLLAMA_TEMPERATURE,
            "num_ctx": 8192,
        },
    )
    # ollama returns dict-like; support both styles
    if isinstance(resp, dict):
        return (resp.get("message") or {}).get("content", "").strip()
    # newer client returns objects
    try:
        return resp.message.content.strip()  # type: ignore[attr-defined]
    except AttributeError:
        return str(resp).strip()
