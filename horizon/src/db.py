"""HORIZON — persistence layer.

Tiny SQLite wrapper. We avoid an ORM to keep the Replit transfer
zero-friction: stdlib `sqlite3` only.
"""

from __future__ import annotations

import json
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

from .config import HORIZON_ROOT, settings

_LOCK = threading.Lock()
_INIT_DONE = False


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def db() -> Iterator[sqlite3.Connection]:
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Apply schema.sql and seed pipeline data if the DB is empty."""
    global _INIT_DONE
    with _LOCK:
        if _INIT_DONE:
            return
        schema_sql = (HORIZON_ROOT / "schema.sql").read_text(encoding="utf-8")
        with db() as conn:
            conn.executescript(schema_sql)
            cur = conn.execute("SELECT COUNT(*) AS n FROM pipeline_records")
            if cur.fetchone()["n"] == 0:
                _seed(conn)
        _INIT_DONE = True


def _seed(conn: sqlite3.Connection) -> None:
    seed_path: Path = HORIZON_ROOT / "seed_data" / "seed_pipeline.json"
    if not seed_path.exists():
        return
    data = json.loads(seed_path.read_text(encoding="utf-8"))
    for h in data.get("hulls", []):
        conn.execute(
            """
            INSERT OR REPLACE INTO hulls
              (id, display_name, coar, class_letter, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (h["id"], h["display_name"], h.get("coar"), h.get("class_letter"), h.get("notes")),
        )
    for r in data.get("records", []):
        conn.execute(
            """
            INSERT OR REPLACE INTO pipeline_records
              (pr_number, hull_id, title, phase, status, riy,
               baseline_date, actual_date, variance_days, next_action)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["pr_number"], r.get("hull_id"), r["title"], r["phase"],
                r["status"], r.get("riy", 0), r.get("baseline_date"),
                r.get("actual_date"), r.get("variance_days", 0),
                r.get("next_action"),
            ),
        )


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(r) for r in rows]
