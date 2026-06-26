"""
S4ight audit logging.

Emits one JSON line per API event to stdout. Vercel's log drain captures
stdout, so no filesystem write is required. Downstream you can:
  - tail in `vercel logs`
  - forward to Supabase / S3 / CloudWatch for retained ATO evidence

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
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

_AUDIT_ENABLED = os.getenv("S4IGHT_AUDIT", "true").lower() != "false"


def new_request_id() -> str:
    return uuid4().hex[:12]


def _emit(payload: Dict[str, Any]) -> None:
    if not _AUDIT_ENABLED:
        return
    try:
        line = json.dumps(payload, default=str, ensure_ascii=False)
    except Exception:
        # Last-ditch: don't crash the request on a log serialization error.
        line = json.dumps({"audit_fallback": True, "event": payload.get("event")})
    # Use stderr so Vercel captures it as a function log line separate from response output.
    print(line, file=sys.stderr, flush=True)


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
        payload.update(extra)
    _emit(payload)


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
