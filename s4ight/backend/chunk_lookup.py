"""
Helpers for fetching a single chunk from either the curated knowledge
base or the per-session uploaded documents. Used by the /chunk endpoint
to render citation popovers in the UI.
"""

from __future__ import annotations

import glob
import os
from typing import Optional, Dict, Any

from config import KNOWLEDGE_DIR


def _chunk_text(text: str, chunk_size: int = 900, overlap: int = 150):
    chunks = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        chunks.append(text[start:end])
        if end >= n:
            break
        start = end - overlap
    return chunks


def lookup_chunk(source: str, idx: int, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Resolve a (source, idx) citation to its text + origin.

    Search order:
      1. Curated knowledge base (s4ight_knowledge/*.md)
      2. Session uploads, if session_id is provided.

    Returns None if no match.
    """
    if not source:
        return None

    # 1) Curated KB
    kb_path = os.path.join(str(KNOWLEDGE_DIR), source)
    if os.path.isfile(kb_path):
        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                content = f.read()
        except OSError:
            content = ""
        chunks = _chunk_text(content)
        # Curated retriever uses chunks indexed 1-based when surfaced via semantic_retriever,
        # 1-based in citations like "filename.md §3". Convert to 0-based.
        i = max(0, idx - 1)
        if 0 <= i < len(chunks):
            return {
                "source": source,
                "idx": idx,
                "origin": "knowledge_base",
                "text": chunks[i],
                "total_chunks": len(chunks),
            }

    # 2) Session uploads
    if session_id:
        try:
            from ingestion import store as _docs  # noqa: WPS433
            sess = _docs._sessions.get(session_id)  # type: ignore[attr-defined]
            if sess:
                for c in sess["chunks"]:
                    if c.source == source and c.idx == idx:
                        return {
                            "source": source,
                            "idx": idx,
                            "origin": "session_upload",
                            "text": c.text,
                            "total_chunks": sum(1 for cc in sess["chunks"] if cc.source == source),
                        }
        except Exception:
            pass

    return None
