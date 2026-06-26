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
from typing import Any, Dict
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
from ingestion import store as doc_store, INGEST_MAX_BYTES  # noqa: E402
from chunk_lookup import lookup_chunk  # noqa: E402
from audit import audit, new_request_id  # noqa: E402
from access import authorize as _authorize, is_enabled as _access_enabled, health as _access_health  # noqa: E402
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

    # ---- access control ----

    def _request_headers(self) -> Dict[str, str]:
        # http.server's Message object exposes get_all/get; convert to a plain dict.
        out: Dict[str, str] = {}
        for k, v in self.headers.items():
            out[k] = v
        return out

    def _query_token(self) -> str:
        from urllib.parse import parse_qs, urlparse as _up
        qs = parse_qs(_up(self.path).query or "")
        return (qs.get("token") or [""])[0]

    def _gate(self, program: str = None) -> bool:
        """Run the access check. On denial, write a 401/403 and return False."""
        allowed, principal, reason = _authorize(self._request_headers(), self._query_token(), program=program)
        if allowed:
            self._principal = principal
            return True
        status = 401 if reason in ("missing_token", "invalid_token") else 403
        audit(
            "auth_denied",
            status_code=status,
            message=reason,
            program=program,
        )
        self._send_json(status, {"error": "unauthorized", "reason": reason})
        return False

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
                # Public — needed so the UI can show the status panel
                # before the user has authenticated.
                return self._handle_health()
            # Everything else requires auth (when enabled).
            if not self._gate():
                return
            if route == "/knowledge":
                return self._handle_knowledge()
            if route == "/documents":
                return self._handle_list_documents()
            if route == "/chunk":
                return self._handle_chunk()
            return self._send_json(404, {"error": "not_found", "route": route})
        except Exception as e:
            log.exception("GET failed")
            return self._send_json(500, {"error": "internal", "detail": str(e)})

    def do_POST(self):  # noqa: N802
        try:
            route = _strip_prefix(urlparse(self.path).path)
            # All POSTs require auth (when enabled). For /chat we re-check
            # against the per-token program scope after reading the body.
            if not self._gate():
                return
            if route == "/chat":
                return self._handle_chat()
            if route == "/documents":
                return self._handle_upload_document()
            if route == "/documents/clear":
                return self._handle_clear_documents()
            if route.startswith("/documents/") and route.endswith("/delete"):
                doc_id = route[len("/documents/"):-len("/delete")]
                return self._handle_delete_document(doc_id)
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
        semantic_info: Dict[str, Any] = {"enabled": False}
        try:
            from semantic_retriever import index as _sem  # noqa: WPS433
            semantic_info = _sem.info()
            semantic_info["available"] = _sem.available()
        except Exception as e:  # pragma: no cover
            semantic_info = {"enabled": False, "error": str(e)}
        try:
            from audit import health as _audit_health  # noqa: WPS433
            audit_info = _audit_health()
        except Exception as e:  # pragma: no cover
            audit_info = {"enabled": False, "error": str(e)}
        return self._send_json(200, {
            "status": "ok",
            "version": "1.0.0",
            "knowledge_dir": str(KNOWLEDGE_DIR),
            "knowledge_docs": len(docs),
            "llm": provider.health(),
            "semantic": semantic_info,
            "audit": audit_info,
            "access": _access_health(),
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
        request_id = new_request_id()
        body = self._read_json()
        message = (body.get("message") or "").strip()
        program = (body.get("program") or "PMS 325").strip()
        session_id = (body.get("session_id") or "").strip() or str(uuid4())

        # Program-scoped re-check (do_POST already authenticated; this enforces RBAC).
        allowed, _principal, reason = _authorize(self._request_headers(), self._query_token(), program=program)
        if not allowed:
            audit("auth_denied", request_id=request_id, session_id=session_id, program=program,
                  status_code=403, message=reason)
            return self._send_json(403, {"error": "unauthorized", "reason": reason})

        if not message:
            audit("chat", request_id=request_id, session_id=session_id, status_code=400, level="WARN", message="empty message")
            return self._send_json(400, {"error": "message_required"})
        if len(message) > MAX_MESSAGE_CHARS:
            audit("chat", request_id=request_id, session_id=session_id, status_code=413, level="WARN", message="message too long")
            return self._send_json(413, {"error": "message_too_long", "max_chars": MAX_MESSAGE_CHARS})

        start = time.perf_counter()
        try:
            allowed_cls = body.get("allowed_classifications")
            if allowed_cls is not None and not isinstance(allowed_cls, list):
                allowed_cls = None
            result = orchestrator.route(
                query=message, program=program, session_id=session_id,
                allowed_classifications=allowed_cls,
            )
        except Exception as e:
            log.exception("Chat orchestrator failed")
            audit("chat", request_id=request_id, session_id=session_id, program=program,
                  status_code=500, level="ERROR", error=str(e))
            return self._send_json(500, {
                "error": "chat_failed",
                "detail": str(e),
                "trace": traceback.format_exc(limit=4),
            })
        elapsed_ms = int((time.perf_counter() - start) * 1000)

        audit(
            "chat",
            request_id=request_id,
            session_id=session_id,
            program=program,
            agent=result.get("agent"),
            engine=result.get("engine"),
            tool_used=result.get("tool_used"),
            sources=result.get("sources"),
            duration_ms=elapsed_ms,
            status_code=200,
            message="ok",
        )

        return self._send_json(200, {
            "response": result.get("response", ""),
            "sources": result.get("sources", []),
            "agent": result.get("agent"),
            "focus": result.get("focus"),
            "engine": result.get("engine"),
            "tool_used": result.get("tool_used"),
            "tool_result": result.get("tool_result"),
            "plan_steps": result.get("plan_steps"),
            "session_id": session_id,
            "request_id": request_id,
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
        doc_store.clear(session_id)
        return self._send_json(200, {"status": "ok", "session_id": session_id, "cleared": True})

    # ------- Documents -------

    def _session_from_query(self) -> str:
        from urllib.parse import parse_qs, urlparse as _up
        qs = parse_qs(_up(self.path).query or "")
        sid = (qs.get("session_id") or [""])[0]
        return sid

    def _handle_list_documents(self):
        sid = self._session_from_query()
        if not sid:
            return self._send_json(400, {"error": "session_id_required"})
        return self._send_json(200, doc_store.info(sid))

    def _handle_chunk(self):
        """GET /chunk?source=<filename>&idx=<int>&session_id=<id> — returns the chunk text."""
        from urllib.parse import parse_qs, urlparse as _up
        qs = parse_qs(_up(self.path).query or "")
        source = (qs.get("source") or [""])[0]
        idx_str = (qs.get("idx") or [""])[0]
        sid = (qs.get("session_id") or [""])[0] or None
        try:
            idx = int(idx_str)
        except (TypeError, ValueError):
            return self._send_json(400, {"error": "idx_must_be_int"})
        if not source:
            return self._send_json(400, {"error": "source_required"})
        hit = lookup_chunk(source, idx, session_id=sid)
        if not hit:
            return self._send_json(404, {"error": "chunk_not_found", "source": source, "idx": idx})
        return self._send_json(200, hit)

    def _handle_upload_document(self):
        import base64
        body = self._read_json()
        sid = (body.get("session_id") or "").strip()
        if not sid:
            return self._send_json(400, {"error": "session_id_required"})
        filename = (body.get("filename") or "").strip()
        b64 = body.get("content_base64") or ""
        if not filename or not b64:
            return self._send_json(400, {"error": "filename_and_content_base64_required"})
        try:
            content = base64.b64decode(b64, validate=True)
        except Exception as e:
            return self._send_json(400, {"error": "invalid_base64", "detail": str(e)})
        if len(content) > INGEST_MAX_BYTES:
            return self._send_json(413, {"error": "file_too_large", "max_bytes": INGEST_MAX_BYTES})

        classification = body.get("classification")
        start = time.perf_counter()
        try:
            result = doc_store.ingest(sid, filename, content, classification=classification)
        except Exception as e:
            log.warning("Ingestion failed: %s", e)
            audit("ingest", session_id=sid, status_code=400, level="WARN", error=str(e), message=filename)
            return self._send_json(400, {"error": "ingestion_failed", "detail": str(e)})
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        audit(
            "ingest",
            session_id=sid,
            status_code=200,
            duration_ms=elapsed_ms,
            message=filename,
            extra={"bytes": len(content), "chunks": result["document"]["chunks"]},
        )
        return self._send_json(200, result)

    def _handle_delete_document(self, doc_id: str):
        body = self._read_json()
        sid = (body.get("session_id") or "").strip()
        if not sid:
            return self._send_json(400, {"error": "session_id_required"})
        result = doc_store.remove(sid, doc_id)
        audit("ingest_remove", session_id=sid, status_code=200, message=doc_id)
        return self._send_json(200, result)

    def _handle_clear_documents(self):
        body = self._read_json()
        sid = (body.get("session_id") or "").strip()
        if not sid:
            return self._send_json(400, {"error": "session_id_required"})
        result = doc_store.clear(sid)
        audit("ingest_clear", session_id=sid, status_code=200, message="all")
        return self._send_json(200, result)

    def log_message(self, format, *args):  # noqa: A002
        log.info("%s - %s", self.address_string(), format % args)
