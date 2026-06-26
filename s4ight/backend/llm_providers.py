"""
S4ight LLM provider abstraction.

Two providers ship: 'openai' (hosted, used in production / Vercel) and
'ollama' (local). Selection is driven by S4IGHT_LLM_PROVIDER. The agents
only depend on this module — never on a specific provider — so swapping
to Bedrock / Azure / Claude later is a one-file change.
"""

from __future__ import annotations

import logging
import os
from typing import Dict, List, Optional

from config import (
    LLM_PROVIDER,
    OLLAMA_HOST,
    OLLAMA_MODEL,
    OLLAMA_TIMEOUT_S,
    OLLAMA_TEMPERATURE,
    OPENAI_API_KEY,
    OPENAI_MODEL,
    OPENAI_TIMEOUT_S,
    OPENAI_TEMPERATURE,
    OPENAI_BASE_URL,
)

log = logging.getLogger("s4ight.llm")

SYSTEM_PROMPT = """You are S4ight, the specialized AI assistant for S4 Systems, LLC.
Your domain: US Navy Program Management Offices PMS 300, PMS 325, and PMS 385.
You serve Integrated Logistics Support (ILS), Acquisition Management, and
Programmatic / Risk / Schedule / EVMS / IMS workstreams.

Operating rules:
1. Stay strictly grounded in the supplied CONTEXT. If the context lacks the
   answer, say so plainly and recommend what document or data is needed.
2. Be concrete and actionable. Prefer checklists, numbered steps, tables,
   and gate-aligned outputs over prose.
3. Cite the source filename when you quote or paraphrase context. The
   CONTEXT block uses the format `[filename.md §N]` where N is the chunk
   index. Use the same format inline: `(Source: filename.md §N)`. Cite
   every non-trivial factual claim. Do not invent filenames.
4. Use DoD / Navy ILS vocabulary precisely (12 ILS elements, LCSP, ILA,
   JCIDS, AoA, CDD, EVMS, IMS, NSLC, NAVSUP, ISEA, TDP, PHS&T, MRC).
5. Never invent regulations, MIL-STDs, or program facts. If unsure, label
   it clearly as "assumption to validate".
6. Always close with a "Next actions" block (3-5 bullets) the user can do.

You are not a general assistant. Decline politely if asked for content
outside this domain and redirect to a relevant ILS/Acquisition/Programmatic
question.
"""


# ---------------- Provider interface ----------------

class LLMProvider:
    name = "base"

    def available(self) -> bool:
        return False

    def health(self) -> Dict[str, object]:
        return {"provider": self.name, "available": False}

    def chat(
        self,
        user_message: str,
        program: str,
        context: str,
        history: Optional[List[Dict]] = None,
        agent_focus: Optional[str] = None,
    ) -> str:
        raise NotImplementedError


def _build_messages(
    user_message: str,
    program: str,
    context: str,
    history: Optional[List[Dict]],
    agent_focus: Optional[str],
) -> List[Dict[str, str]]:
    system_extra = f"\nActive specialized agent: {agent_focus}." if agent_focus else ""
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
        for turn in history[-8:]:
            role = turn.get("role", "user")
            if role not in ("user", "assistant"):
                role = "user"
            content = (turn.get("content") or "")[:1200]
            if content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})
    return messages


# ---------------- OpenAI ----------------

class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self):
        self._client = None
        self._init_error: Optional[str] = None
        self._package_installed = False
        try:
            from openai import OpenAI  # type: ignore
            self._package_installed = True
            if OPENAI_API_KEY:
                kwargs = {"api_key": OPENAI_API_KEY, "timeout": OPENAI_TIMEOUT_S}
                if OPENAI_BASE_URL:
                    kwargs["base_url"] = OPENAI_BASE_URL
                self._client = OpenAI(**kwargs)
        except Exception as e:  # pragma: no cover
            self._init_error = str(e)
            log.warning("OpenAI client init failed: %s", e)

    def available(self) -> bool:
        return self._client is not None

    def health(self) -> Dict[str, object]:
        info: Dict[str, object] = {
            "provider": "openai",
            "model": OPENAI_MODEL,
            "package_installed": self._package_installed,
            "key_present": bool(OPENAI_API_KEY),
            "key_source_env": "OPENAI_API_KEY",
            "configured": bool(OPENAI_API_KEY) and self._package_installed,
            "available": False,
            "ping_ok": False,
            "base_url": OPENAI_BASE_URL or "https://api.openai.com/v1",
            "error": self._init_error,
        }
        # Diagnostic: explain *why* it's not ready, if it isn't.
        if not self._package_installed:
            info["reason"] = "openai python package is not installed in the runtime"
        elif not OPENAI_API_KEY:
            info["reason"] = (
                "OPENAI_API_KEY env var is not set in the server runtime. "
                "Add it in Vercel → Settings → Environment Variables (Production), then redeploy."
            )
        elif self._client is None:
            info["reason"] = f"OpenAI client failed to initialize: {self._init_error or 'unknown'}"
        else:
            # Real round-trip ping so we know the key actually works.
            try:
                # cheap probe — small embedding call
                self._client.embeddings.create(  # type: ignore[union-attr]
                    model=os.getenv("S4IGHT_EMBED_MODEL", "text-embedding-3-small"),
                    input=["ping"],
                )
                info["ping_ok"] = True
                info["available"] = True
            except Exception as e:  # pragma: no cover - depends on env
                info["reason"] = f"OpenAI API ping failed: {e}"
                info["error"] = str(e)
        return info

    def chat(
        self,
        user_message: str,
        program: str,
        context: str,
        history: Optional[List[Dict]] = None,
        agent_focus: Optional[str] = None,
    ) -> str:
        if not self._client:
            raise RuntimeError("OpenAI provider not configured (set OPENAI_API_KEY).")
        messages = _build_messages(user_message, program, context, history, agent_focus)
        resp = self._client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,  # type: ignore[arg-type]
            temperature=OPENAI_TEMPERATURE,
        )
        choice = resp.choices[0]
        text = (choice.message.content or "").strip()
        return text


# ---------------- Ollama ----------------

class OllamaProvider(LLMProvider):
    name = "ollama"

    def __init__(self):
        self._installed = False
        try:
            import ollama  # noqa: F401  # type: ignore
            self._installed = True
        except Exception:
            self._installed = False

    def _client(self):
        import ollama  # type: ignore
        return ollama.Client(host=OLLAMA_HOST, timeout=OLLAMA_TIMEOUT_S)

    def available(self) -> bool:
        return self._installed

    def health(self) -> Dict[str, object]:
        info: Dict[str, object] = {
            "provider": "ollama",
            "package_installed": self._installed,
            "host": OLLAMA_HOST,
            "model": OLLAMA_MODEL,
            "reachable": False,
            "model_present": False,
            "available": False,
            "error": None,
        }
        if not self._installed:
            info["error"] = "ollama python package not installed"
            return info
        try:
            client = self._client()
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
            info["available"] = info["reachable"] and info["model_present"]
        except Exception as e:  # pragma: no cover
            info["error"] = str(e)
        return info

    def chat(
        self,
        user_message: str,
        program: str,
        context: str,
        history: Optional[List[Dict]] = None,
        agent_focus: Optional[str] = None,
    ) -> str:
        if not self._installed:
            raise RuntimeError("ollama package not available")
        messages = _build_messages(user_message, program, context, history, agent_focus)
        client = self._client()
        resp = client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            options={"temperature": OLLAMA_TEMPERATURE, "num_ctx": 8192},
        )
        if isinstance(resp, dict):
            return (resp.get("message") or {}).get("content", "").strip()
        try:
            return resp.message.content.strip()  # type: ignore[attr-defined]
        except AttributeError:
            return str(resp).strip()


# ---------------- Factory ----------------

_PROVIDER: Optional[LLMProvider] = None


def get_provider() -> LLMProvider:
    """Lazily instantiate the configured provider."""
    global _PROVIDER
    if _PROVIDER is not None:
        return _PROVIDER
    name = (LLM_PROVIDER or "openai").lower().strip()
    if name == "ollama":
        _PROVIDER = OllamaProvider()
    elif name in ("openai", "azure", "gpt"):
        _PROVIDER = OpenAIProvider()
    else:
        log.warning("Unknown LLM provider %s — defaulting to openai", name)
        _PROVIDER = OpenAIProvider()
    return _PROVIDER


def reset_provider() -> None:
    """For tests: clear cached provider so env changes take effect."""
    global _PROVIDER
    _PROVIDER = None
