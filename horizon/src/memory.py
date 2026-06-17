"""HORIZON — memory layer.

Two responsibilities:
  1. Short-term conversation memory (last N turns per session) — stored
     in SQLite via `src/db.py`.
  2. Long-term retrieval over the knowledge_base/ folder — a tiny
     in-process keyword index. Embeddings can replace this later
     without changing the call sites (`retrieve_context`).
"""

from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import settings
from .db import db, rows_to_dicts


# ──────────────────────────────────────────────────────────────────
#  Short-term conversation memory
# ──────────────────────────────────────────────────────────────────

def ensure_session(user_handle: str, session_id: str | None = None) -> str:
    sid = session_id or f"sess-{uuid.uuid4().hex[:12]}"
    with db() as conn:
        existing = conn.execute(
            "SELECT id FROM sessions WHERE id = ?", (sid,)
        ).fetchone()
        if existing is None:
            conn.execute(
                """
                INSERT INTO sessions (id, user_handle, persona)
                VALUES (?, ?, ?)
                """,
                (sid, user_handle, settings.persona_name),
            )
        else:
            conn.execute(
                "UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?",
                (sid,),
            )
    return sid


def append_message(
    session_id: str,
    role: str,
    content: str,
    tool_name: str | None = None,
    tool_args: dict[str, Any] | None = None,
    tool_result: Any = None,
) -> None:
    with db() as conn:
        cur = conn.execute(
            "SELECT COALESCE(MAX(turn_index), -1) + 1 AS next FROM messages WHERE session_id = ?",
            (session_id,),
        )
        turn = cur.fetchone()["next"]
        conn.execute(
            """
            INSERT INTO messages
              (session_id, turn_index, role, content, tool_name, tool_args, tool_result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                session_id, turn, role, content, tool_name,
                json.dumps(tool_args) if tool_args is not None else None,
                json.dumps(tool_result) if tool_result is not None else None,
            ),
        )


def recent_messages(session_id: str, limit: int | None = None) -> list[dict[str, Any]]:
    cap = limit or settings.short_term_turn_limit
    with db() as conn:
        rows = conn.execute(
            """
            SELECT role, content, tool_name, tool_args, tool_result, created_at
              FROM messages
             WHERE session_id = ?
             ORDER BY turn_index DESC
             LIMIT ?
            """,
            (session_id, cap),
        ).fetchall()
    return list(reversed(rows_to_dicts(rows)))


# ──────────────────────────────────────────────────────────────────
#  Long-term retrieval over knowledge_base/
# ──────────────────────────────────────────────────────────────────

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9_\-]+")
_STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at",
    "with", "is", "are", "was", "were", "be", "by", "as", "it", "this",
    "that", "from", "into", "any", "all", "if", "then", "else", "than",
    "but", "not", "no", "so", "do", "does", "did",
}


def _tokenize(text: str) -> list[str]:
    return [t.lower() for t in _WORD_RE.findall(text) if t.lower() not in _STOPWORDS]


@dataclass
class KBDoc:
    path: str
    title: str
    text: str
    tokens: set[str]


_KB_CACHE: list[KBDoc] | None = None


def _load_kb() -> list[KBDoc]:
    global _KB_CACHE
    if _KB_CACHE is not None:
        return _KB_CACHE
    docs: list[KBDoc] = []
    kb_dir: Path = settings.kb_path
    if not kb_dir.exists():
        _KB_CACHE = []
        return _KB_CACHE
    for fp in sorted(kb_dir.rglob("*")):
        if not fp.is_file() or fp.suffix.lower() not in {".md", ".txt"}:
            continue
        if fp.name.lower() == "readme.md":
            continue
        text = fp.read_text(encoding="utf-8", errors="ignore")
        first_line = next(
            (ln.lstrip("# ").strip() for ln in text.splitlines() if ln.strip()),
            fp.stem,
        )
        docs.append(KBDoc(
            path=str(fp.relative_to(settings.kb_path.parent)),
            title=first_line or fp.stem,
            text=text,
            tokens=set(_tokenize(text)),
        ))
    _KB_CACHE = docs
    return docs


def retrieve_context(query: str, top_k: int | None = None) -> list[dict[str, Any]]:
    k = top_k or settings.retrieval_top_k
    q_tokens = set(_tokenize(query))
    if not q_tokens:
        return []
    scored: list[tuple[int, KBDoc]] = []
    for doc in _load_kb():
        overlap = len(q_tokens & doc.tokens)
        if overlap > 0:
            scored.append((overlap, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [
        {"path": d.path, "title": d.title, "score": s, "excerpt": d.text[:600]}
        for s, d in scored[:k]
    ]


def reset_kb_cache() -> None:
    global _KB_CACHE
    _KB_CACHE = None
