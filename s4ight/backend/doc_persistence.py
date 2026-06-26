"""
Optional Supabase persistence for session uploads.

When `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE` are set, every successful
document ingestion is mirrored to two Supabase tables:
  - public.s4ight_docs        (per-document metadata)
  - public.s4ight_doc_chunks  (per-chunk text + embedding as jsonb)

On `rehydrate(session_id)`, the in-memory `DocumentStore` is filled from
those tables so a refreshed browser session can resume where it left
off (when the same session_id is presented).

If env vars are absent, this module is a no-op and the ingestion path
stays purely in-memory (current behaviour).

Schema (run once in Supabase SQL editor):

  CREATE TABLE public.s4ight_docs (
    id            text primary key,
    session_id    text not null,
    name          text not null,
    classification text not null default 'UNCLASSIFIED',
    chars         int not null,
    chunk_count   int not null,
    uploaded_at   timestamptz not null default now()
  );
  CREATE INDEX ON public.s4ight_docs (session_id);

  CREATE TABLE public.s4ight_doc_chunks (
    doc_id        text not null references public.s4ight_docs(id) on delete cascade,
    idx           int  not null,
    text          text not null,
    classification text not null default 'UNCLASSIFIED',
    embedding     jsonb not null,
    primary key (doc_id, idx)
  );
  CREATE INDEX ON public.s4ight_doc_chunks (doc_id);
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib import error as _urlerror, request as _urlrequest

log = logging.getLogger("s4ight.doc_persist")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_SERVICE_ROLE = os.getenv("SUPABASE_SERVICE_ROLE", "")
TABLE_DOCS = os.getenv("S4IGHT_DOCS_TABLE", "s4ight_docs")
TABLE_CHUNKS = os.getenv("S4IGHT_DOC_CHUNKS_TABLE", "s4ight_doc_chunks")
TIMEOUT_S = float(os.getenv("S4IGHT_PERSIST_TIMEOUT_S", "5"))


def enabled() -> bool:
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE)


def health() -> Dict[str, Any]:
    return {
        "enabled": enabled(),
        "url_present": bool(SUPABASE_URL),
        "key_present": bool(SUPABASE_SERVICE_ROLE),
        "docs_table": TABLE_DOCS,
        "chunks_table": TABLE_CHUNKS,
    }


def _headers() -> Dict[str, str]:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE}",
        "apikey": SUPABASE_SERVICE_ROLE,
        "Prefer": "return=minimal",
    }


def _post(table: str, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    body = json.dumps(rows, default=str).encode("utf-8")
    req = _urlrequest.Request(url, data=body, headers=_headers(), method="POST")
    with _urlrequest.urlopen(req, timeout=TIMEOUT_S) as _:
        pass


def _delete(table: str, query: str) -> None:
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    req = _urlrequest.Request(url, headers=_headers(), method="DELETE")
    with _urlrequest.urlopen(req, timeout=TIMEOUT_S) as _:
        pass


def _select(table: str, query: str) -> List[Dict[str, Any]]:
    headers = dict(_headers())
    headers["Prefer"] = "return=representation"
    url = f"{SUPABASE_URL}/rest/v1/{table}?{query}"
    req = _urlrequest.Request(url, headers=headers, method="GET")
    with _urlrequest.urlopen(req, timeout=TIMEOUT_S) as resp:
        return json.loads(resp.read().decode("utf-8") or "[]")


# ---------- Public API ----------

def persist_document(session_id: str, meta: Dict[str, Any], chunks: List[Dict[str, Any]]) -> None:
    """Fire-and-forget upsert of a doc + its chunks. Failures log a warning."""
    if not enabled():
        return

    def _worker():
        try:
            _post(TABLE_DOCS, [{
                "id": meta["id"],
                "session_id": session_id,
                "name": meta["name"],
                "classification": meta.get("classification", "UNCLASSIFIED"),
                "chars": meta["chars"],
                "chunk_count": meta["chunks"],
            }])
            rows = [
                {
                    "doc_id": meta["id"],
                    "idx": c["idx"],
                    "text": c["text"],
                    "classification": c.get("classification", "UNCLASSIFIED"),
                    "embedding": c["embedding"],
                }
                for c in chunks
            ]
            # Insert chunks in batches to avoid huge bodies.
            BATCH = 50
            for i in range(0, len(rows), BATCH):
                _post(TABLE_CHUNKS, rows[i:i + BATCH])
        except _urlerror.HTTPError as e:  # pragma: no cover
            log.warning("Supabase persist HTTP %s: %s", e.code, e.reason)
        except Exception as e:  # pragma: no cover
            log.warning("Supabase persist failed: %s", e)

    threading.Thread(target=_worker, daemon=True).start()


def delete_document(doc_id: str) -> None:
    if not enabled() or not doc_id:
        return

    def _worker():
        try:
            # Chunks cascade by FK
            _delete(TABLE_DOCS, f"id=eq.{doc_id}")
        except Exception as e:  # pragma: no cover
            log.warning("Supabase delete failed: %s", e)

    threading.Thread(target=_worker, daemon=True).start()


def clear_session(session_id: str) -> None:
    if not enabled() or not session_id:
        return

    def _worker():
        try:
            _delete(TABLE_DOCS, f"session_id=eq.{session_id}")
        except Exception as e:  # pragma: no cover
            log.warning("Supabase clear-session failed: %s", e)

    threading.Thread(target=_worker, daemon=True).start()


def fetch_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Synchronous read. Returns {docs:[meta], chunks:[{doc_id, idx, text, classification, embedding}]} or None."""
    if not enabled() or not session_id:
        return None
    try:
        docs = _select(TABLE_DOCS, f"session_id=eq.{session_id}&order=uploaded_at.asc")
        if not docs:
            return {"docs": [], "chunks": []}
        ids = ",".join(d["id"] for d in docs)
        chunks = _select(TABLE_CHUNKS, f"doc_id=in.({ids})&order=doc_id.asc,idx.asc")
        return {"docs": docs, "chunks": chunks}
    except Exception as e:  # pragma: no cover
        log.warning("Supabase fetch_session failed: %s", e)
        return None
