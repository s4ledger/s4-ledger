"""
S4ight audit logging.

Emits one JSON line per API event to stderr (always). If
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE` are set, the same payload is
also POSTed to the `s4ight_audit` table in Supabase for retained ATO
evidence. The Supabase write is fire-and-forget — failures never break
the request.

Vercel's stderr stream is captured in function logs. Downstream you can
add another drain (S3, CloudWatch) by extending `_emit_drains`.

Required Supabase table (create once):

  CREATE TABLE public.s4ight_audit (
    id            uuid primary key default gen_random_uuid(),
    ts            timestamptz not null default now(),
    level         text,
    event         text,
    request_id    text,
    session_id    text,
    duration_ms   int,
    agent         text,
    engine        text,
    provider      text,
    model         text,
    program       text,
    sources       jsonb,
    tool_used     text,
    status_code   int,
    message       text,
    error         text,
    extra         jsonb
  );
  CREATE INDEX ON public.s4ight_audit (ts DESC);
  CREATE INDEX ON public.s4ight_audit (session_id);
  CREATE INDEX ON public.s4ight_audit (event);

Fields per event:
  ts            ISO8601 UTC timestamp
  level         "INFO" | "WARN" | "ERROR"
  event         e.g. "chat", "tool", "health"
  request_id    short uuid for correlation
  session_id    chat session id (if any)
  duration_ms   handler timing
  agent         routing agent name (if any)
  engine        "openai" | "ollama" | "retrieval-fallback"
  provider      LLM provider name (when known)
  model         LLM model name (when known)
  program       PMS program in scope
  sources       list of "filename §N" cites used
  tool_used     tool name (if fired)
  status_code   HTTP status returned
  message       short description
  error         error message string (if any)
  extra         json blob of anything else
"""

from __future__ import annotations

import json
import logging
import os
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from urllib import error as _urlerror, request as _urlrequest
from uuid import uuid4

_AUDIT_ENABLED = os.getenv("S4IGHT_AUDIT", "true").lower() != "false"

# Supabase drain (optional). Service-role key is required because RLS is on by default.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE", "")
SUPABASE_TABLE = os.getenv("S4IGHT_AUDIT_TABLE", "s4ight_audit")
SUPABASE_TIMEOUT_S = float(os.getenv("S4IGHT_AUDIT_TIMEOUT_S", "3"))

_log = logging.getLogger("s4ight.audit")


def new_request_id() -> str:
    return uuid4().hex[:12]


def _emit_stderr(payload: Dict[str, Any]) -> None:
    try:
        line = json.dumps(payload, default=str, ensure_ascii=False)
    except Exception:
        line = json.dumps({"audit_fallback": True, "event": payload.get("event")})
    print(line, file=sys.stderr, flush=True)


def _supabase_enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE)


def _supabase_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Map the in-memory event into the Supabase table schema."""
    direct = {
        "ts", "level", "event", "request_id", "session_id", "duration_ms",
        "agent", "engine", "provider", "model", "program", "sources",
        "tool_used", "status_code", "message", "error",
    }
    row = {k: payload.get(k) for k in direct if k in payload}
    extra = {k: v for k, v in payload.items() if k not in direct and k != "extra"}
    if isinstance(payload.get("extra"), dict):
        extra.update(payload["extra"])
    if extra:
        row["extra"] = extra
    return row


def _emit_supabase(payload: Dict[str, Any]) -> None:
    """Fire-and-forget HTTPS POST into the Supabase table."""
    if not _supabase_enabled():
        return
    try:
        url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
        body = json.dumps(_supabase_payload(payload), default=str).encode("utf-8")
        req = _urlrequest.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
                "apikey": SUPABASE_SERVICE_ROLE,
                "Prefer": "return=minimal",
            },
            method="POST",
        )
        # Run synchronously but with a hard timeout — Vercel function will
        # be alive long enough; we cap at SUPABASE_TIMEOUT_S so we never
        # extend the request meaningfully.
        with _urlrequest.urlopen(req, timeout=SUPABASE_TIMEOUT_S) as _:
            pass
    except _urlerror.HTTPError as e:  # pragma: no cover - depends on env
        _log.warning("Supabase audit HTTP %s: %s", e.code, e.reason)
    except Exception as e:  # pragma: no cover - depends on env
        _log.warning("Supabase audit drain failed: %s", e)


def _emit_drains(payload: Dict[str, Any]) -> None:
    _emit_stderr(payload)
    if _supabase_enabled():
        # Run Supabase in a daemon thread so the response doesn't wait on it.
        t = threading.Thread(target=_emit_supabase, args=(payload,), daemon=True)
        t.start()


def audit(
    event: str,
    *,
    request_id: Optional[str] = None,
    session_id: Optional[str] = None,
    duration_ms: Optional[int] = None,
    agent: Optional[str] = None,
    engine: Optional[str] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    program: Optional[str] = None,
    sources: Optional[list] = None,
    tool_used: Optional[str] = None,
    status_code: Optional[int] = None,
    message: Optional[str] = None,
    error: Optional[str] = None,
    level: str = "INFO",
    extra: Optional[Dict[str, Any]] = None,
) -> None:
    if not _AUDIT_ENABLED:
        return
    payload: Dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "level": level,
        "event": event,
    }
    for k, v in (
        ("request_id", request_id),
        ("session_id", session_id),
        ("duration_ms", duration_ms),
        ("agent", agent),
        ("engine", engine),
        ("provider", provider),
        ("model", model),
        ("program", program),
        ("sources", sources),
        ("tool_used", tool_used),
        ("status_code", status_code),
        ("message", message),
        ("error", error),
    ):
        if v is not None:
            payload[k] = v
    if extra:
        payload["extra"] = extra
    _emit_drains(payload)


def health() -> Dict[str, Any]:
    """Lightweight self-report so /health can show drain status."""
    return {
        "enabled": _AUDIT_ENABLED,
        "stderr": True,
        "supabase": {
            "configured": _supabase_enabled(),
            "url_present": bool(SUPABASE_URL),
            "key_present": bool(SUPABASE_SERVICE_ROLE),
            "table": SUPABASE_TABLE,
        },
    }


class Timer:
    """Cheap context manager for handler timing."""

    def __enter__(self) -> "Timer":
        self.t0 = time.perf_counter()
        return self

    def __exit__(self, *_exc):
        self.dt_ms = int((time.perf_counter() - self.t0) * 1000)
        return False

    @property
    def ms(self) -> int:
        return int((time.perf_counter() - self.t0) * 1000)
