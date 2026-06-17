"""HORIZON — audit log helper."""

from __future__ import annotations

import json
from typing import Any

from .config import settings
from .db import db


def record_audit(
    session_id: str | None,
    event_type: str,
    actor: str,
    payload: dict[str, Any] | None = None,
) -> None:
    if not settings.audit_enabled:
        return
    with db() as conn:
        conn.execute(
            """
            INSERT INTO audit_log (session_id, event_type, actor, payload_json)
            VALUES (?, ?, ?, ?)
            """,
            (session_id, event_type, actor, json.dumps(payload or {})),
        )


def recent_audit(limit: int = 100) -> list[dict[str, Any]]:
    with db() as conn:
        rows = conn.execute(
            """
            SELECT id, session_id, event_type, actor, payload_json, created_at
              FROM audit_log
             ORDER BY id DESC
             LIMIT ?
            """,
            (int(limit),),
        ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        try:
            d["payload"] = json.loads(d.pop("payload_json") or "{}")
        except json.JSONDecodeError:
            d["payload"] = {}
        out.append(d)
    return out
