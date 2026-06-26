"""
S4ight — Vercel Python serverless function.

Hosted at /api/s4ight on s4ledger.com via vercel.json rewrites:
    /api/s4ight/chat                -> POST  chat
    /api/s4ight/health              -> GET   health
    /api/s4ight/knowledge           -> GET   knowledge listing
    /api/s4ight/tool/<name>         -> POST  tool invocation
    /api/s4ight/session/<id>/clear  -> POST  reset memory

Implementation notes:
- Uses stdlib BaseHTTPRequestHandler (matches api/index.py pattern in this repo).
- Imports the canonical S4ight backend logic from the bundled /s4ight folder.
- The bundling is configured via `includeFiles` in vercel.json so the
  knowledge base markdown and backend modules ship with the function.
- LLM provider is OpenAI by default. Set OPENAI_API_KEY in Vercel.
"""

from __future__ import annotations

import json
import logging
import os
import sys
import time
import traceback
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
from uuid import uuid4

# Make the bundled S4ight backend importable.
_HERE = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT = os.path.abspath(os.path.join(_HERE, ".."))
_BACKEND_DIR = os.path.join(_REPO_ROOT, "s4ight", "backend")
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

# Force-configure paths/provider BEFORE importing the backend modules so they
# pick up the right defaults under Vercel (no shell .env to source).
os.environ.setdefault("S4IGHT_KNOWLEDGE_DIR", os.path.join(_REPO_ROOT, "s4ight", "s4ight_knowledge"))
os.environ.setdefault("S4IGHT_LLM_PROVIDER", "openai")

from agents import orchestrator  # noqa: E402
from tools import AVAILABLE_TOOLS  # noqa: E402
from memory import store as memory_store  # noqa: E402
from llm_providers import get_provider  # noqa: E402
from retriever import load_knowledge_base  # noqa: E402
from config import (  # noqa: E402
    KNOWLEDGE_DIR,
    MAX_MESSAGE_CHARS,
    SUPPORTED_PROGRAMS,
)

log = logging.getLogger("s4ight.vercel")
logging.basicConfig(level=logging.INFO)

ALLOWED_ORIGINS = {
    o.strip().lower()
    for o in os.getenv(
        "S4IGHT_CORS_ORIGINS",
        "https://s4ledger.com,https://www.s4ledger.com",
    ).split(",")
    if o.strip()
}


def _resolve_origin(req_origin: str) -> str:
    if not req_origin:
        return "https://s4ledger.com"
    if "*" in ALLOWED_ORIGINS:
        return req_origin
    return req_origin if req_origin.lower() in ALLOWED_ORIGINS else "https://s4ledger.com"


def _strip_prefix(path: str) -> str:
    """Strip the /api/s4ight prefix so we can route on the remainder."""
    p = path.split("?", 1)[0]
    for prefix in ("/api/s4ight/", "/api/s4ight"):
        if p.startswith(prefix):
            p = p[len(prefix):]
            break
    if not p.startswith("/"):
        p = "/" + p
    return p


class handler(BaseHTTPRequestHandler):  # noqa: N801 — Vercel requires this exact name
    server_version = "S4ight/1.0"

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, default=str).encode("utf-8")
        origin = _resolve_origin(self.headers.get("Origin", ""))
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0:
            return {}
        if length > 1_000_000:
            raise ValueError("payload too large")
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError as e:
            raise ValueError(f"invalid JSON: {e}")

    def do_OPTIONS(self):  # noqa: N802
        origin = _resolve_origin(self.headers.get("Origin", ""))
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "86400")
        self.end_headers()

    def do_GET(self):  # noqa: N802
        try:
            route = _strip_prefix(urlparse(self.path).path)
            if route in ("/", "/health"):
                return self._handle_health()
            if route == "/knowledge":
                return self._handle_knowledge()
            return self._send_json(404, {"error": "not_found", "route": route})
        except Exception as e:
            log.exception("GET failed")
            return self._send_json(500, {"error": "internal", "detail": str(e)})

    def do_POST(self):  # noqa: N802
        try:
            route = _strip_prefix(urlparse(self.path).path)
            if route == "/chat":
                return self._handle_chat()
            if route.startswith("/tool/"):
                tool_name = route[len("/tool/"):].strip("/")
                return self._handle_tool(tool_name)
            if route.startswith("/session/") and route.endswith("/clear"):
                session_id = route[len("/session/"):-len("/clear")]
                return self._handle_clear(session_id)
            return self._send_json(404, {"error": "not_found", "route": route})
        except ValueError as e:
            return self._send_json(400, {"error": "bad_request", "detail": str(e)})
        except Exception as e:
            log.exception("POST failed")
            return self._send_json(500, {"error": "internal", "detail": str(e)})

    def _handle_health(self):
        docs = load_knowledge_base()
        provider = get_provider()
        return self._send_json(200, {
            "status": "ok",
            "version": "1.0.0",
            "knowledge_dir": str(KNOWLEDGE_DIR),
            "knowledge_docs": len(docs),
            "llm": provider.health(),
            "supported_programs": SUPPORTED_PROGRAMS,
            "runtime": "vercel-python",
        })

    def _handle_knowledge(self):
        docs = load_knowledge_base()
        return self._send_json(200, {
            "directory": str(KNOWLEDGE_DIR),
            "count": len(docs),
            "documents": [
                {"source": d["source"], "chars": len(d["content"]), "chunks": len(d["chunks"])}
                for d in docs
            ],
        })

    def _handle_chat(self):
        body = self._read_json()
        message = (body.get("message") or "").strip()
        program = (body.get("program") or "PMS 325").strip()
        session_id = (body.get("session_id") or "").strip() or str(uuid4())

        if not message:
            return self._send_json(400, {"error": "message_required"})
        if len(message) > MAX_MESSAGE_CHARS:
            return self._send_json(413, {"error": "message_too_long", "max_chars": MAX_MESSAGE_CHARS})

        start = time.perf_counter()
        try:
            result = orchestrator.route(query=message, program=program, session_id=session_id)
        except Exception as e:
            log.exception("Chat orchestrator failed")
            return self._send_json(500, {
                "error": "chat_failed",
                "detail": str(e),
                "trace": traceback.format_exc(limit=4),
            })
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        return self._send_json(200, {
            "response": result.get("response", ""),
            "sources": result.get("sources", []),
            "agent": result.get("agent"),
            "focus": result.get("focus"),
            "engine": result.get("engine"),
            "tool_used": result.get("tool_used"),
            "tool_result": result.get("tool_result"),
            "session_id": session_id,
            "elapsed_ms": elapsed_ms,
        })

    def _handle_tool(self, name: str):
        fn = AVAILABLE_TOOLS.get(name)
        if not fn:
            return self._send_json(404, {"error": "unknown_tool", "tool": name})
        body = self._read_json()
        params = body.get("parameters") if isinstance(body, dict) else {}
        if not isinstance(params, dict):
            params = {}
        try:
            import inspect
            sig = inspect.signature(fn)
            kwargs = {k: v for k, v in params.items() if k in sig.parameters}
            return self._send_json(200, {"tool": name, "status": "success", "output": fn(**kwargs)})
        except TypeError as e:
            return self._send_json(400, {"error": "bad_parameters", "detail": str(e)})
        except Exception as e:
            log.exception("Tool %s failed", name)
            return self._send_json(500, {"error": "tool_failed", "detail": str(e)})

    def _handle_clear(self, session_id: str):
        memory_store.clear(session_id)
        return self._send_json(200, {"status": "ok", "session_id": session_id, "cleared": True})

    def log_message(self, format, *args):  # noqa: A002
        log.info("%s - %s", self.address_string(), format % args)
