"""
S4ight semantic retriever (OpenAI embeddings).

Loads the markdown knowledge base, chunks it, computes embeddings via
OpenAI `text-embedding-3-small`, and answers similarity queries.

Designed to coexist with the keyword retriever in `retriever.py` as a
graceful fallback:
  - If OPENAI_API_KEY is set AND the openai package is available
    AND embeddings can be built, semantic search runs.
  - Otherwise, callers fall back to keyword scoring.

Index is built lazily on first use and cached in-process. On Vercel each
warm function instance re-uses the cached index; cold starts pay the
build cost (~1-2 sec for the seed corpus on text-embedding-3-small).
"""

from __future__ import annotations

import glob
import logging
import math
import os
import re
import threading
import time
from typing import List, Tuple, Dict, Optional

from config import (
    KNOWLEDGE_DIR,
    MAX_CONTEXT_CHARS,
    OPENAI_API_KEY,
    OPENAI_BASE_URL,
)

log = logging.getLogger("s4ight.semantic")

EMBED_MODEL = os.getenv("S4IGHT_EMBED_MODEL", "text-embedding-3-small")
EMBED_BATCH = int(os.getenv("S4IGHT_EMBED_BATCH", "64"))
SEMANTIC_DISABLED = os.getenv("S4IGHT_DISABLE_SEMANTIC", "false").lower() == "true"

_WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9\-]+")


def _chunk_text(text: str, chunk_size: int = 900, overlap: int = 150) -> List[str]:
    if not text:
        return []
    chunks: List[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + chunk_size, n)
        chunks.append(text[start:end])
        if end >= n:
            break
        start = end - overlap
    return chunks


def _dir_signature(path: str) -> Tuple[int, float]:
    """Cheap fingerprint: file count + max mtime."""
    files = glob.glob(os.path.join(path, "*.md"))
    if not files:
        return (0, 0.0)
    return (len(files), max(os.path.getmtime(f) for f in files))


class SemanticIndex:
    def __init__(self):
        self._lock = threading.RLock()
        self._chunks: List[Dict] = []  # {source, idx, text, embedding}
        self._signature: Tuple[int, float] = (0, 0.0)
        self._client = None
        self._built = False
        self._build_error: Optional[str] = None

    # --- public API ---

    def available(self) -> bool:
        if SEMANTIC_DISABLED or not OPENAI_API_KEY:
            return False
        try:
            self._ensure_built()
        except Exception as e:  # pragma: no cover - depends on env
            log.warning("Semantic index unavailable: %s", e)
            return False
        return self._built and bool(self._chunks)

    def info(self) -> Dict[str, object]:
        return {
            "enabled": not SEMANTIC_DISABLED,
            "has_key": bool(OPENAI_API_KEY),
            "built": self._built,
            "chunk_count": len(self._chunks),
            "model": EMBED_MODEL,
            "error": self._build_error,
        }

    def search(self, query: str, top_k: int = 5) -> List[Tuple[float, str, int, str]]:
        """Return [(score, source, chunk_idx, text)] sorted by similarity desc."""
        if not query or not query.strip():
            return []
        if not self.available():
            return []
        try:
            qvec = self._embed([query])[0]
        except Exception as e:  # pragma: no cover - depends on env
            log.warning("Query embed failed: %s", e)
            return []
        scored: List[Tuple[float, str, int, str]] = []
        for c in self._chunks:
            sim = _cosine(qvec, c["embedding"])
            scored.append((sim, c["source"], c["idx"], c["text"]))
        scored.sort(reverse=True, key=lambda x: x[0])
        return scored[:top_k]

    def build_context(self, query: str, top_k: int = 5, max_chars: int = MAX_CONTEXT_CHARS) -> Tuple[str, List[Dict]]:
        """Assemble context + structured citations."""
        hits = self.search(query, top_k=top_k)
        if not hits:
            return "", []
        parts: List[str] = []
        used = 0
        cites: List[Dict] = []
        for score, src, idx, text in hits:
            tag = f"{src} §{idx}"
            snippet = f"[{tag}] (similarity {score:.2f})\n{text.strip()}"
            if used + len(snippet) > max_chars:
                break
            parts.append(snippet)
            used += len(snippet)
            cites.append({"source": src, "chunk": idx, "score": round(float(score), 3)})
        return "\n\n---\n\n".join(parts), cites

    # --- internals ---

    def _client_obj(self):
        if self._client is not None:
            return self._client
        from openai import OpenAI  # type: ignore
        kwargs = {"api_key": OPENAI_API_KEY, "timeout": 30}
        if OPENAI_BASE_URL:
            kwargs["base_url"] = OPENAI_BASE_URL
        self._client = OpenAI(**kwargs)
        return self._client

    def _embed(self, texts: List[str]) -> List[List[float]]:
        client = self._client_obj()
        resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
        return [d.embedding for d in resp.data]

    def _ensure_built(self) -> None:
        if SEMANTIC_DISABLED or not OPENAI_API_KEY:
            self._built = False
            return
        sig = _dir_signature(str(KNOWLEDGE_DIR))
        if self._built and sig == self._signature:
            return
        with self._lock:
            sig = _dir_signature(str(KNOWLEDGE_DIR))
            if self._built and sig == self._signature:
                return
            self._build_error = None
            try:
                self._build()
                self._signature = sig
                self._built = True
            except Exception as e:  # pragma: no cover - depends on env
                self._built = False
                self._build_error = str(e)
                log.warning("Semantic build failed: %s", e)
                raise

    def _build(self) -> None:
        kdir = str(KNOWLEDGE_DIR)
        if not os.path.isdir(kdir):
            self._chunks = []
            return
        t0 = time.time()
        new_chunks: List[Dict] = []
        for filepath in sorted(glob.glob(os.path.join(kdir, "*.md"))):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except OSError:
                continue
            source = os.path.basename(filepath)
            for i, chunk in enumerate(_chunk_text(content)):
                new_chunks.append({"source": source, "idx": i + 1, "text": chunk})
        if not new_chunks:
            self._chunks = []
            return
        # Embed in batches.
        for start in range(0, len(new_chunks), EMBED_BATCH):
            batch = new_chunks[start:start + EMBED_BATCH]
            vecs = self._embed([c["text"] for c in batch])
            for c, v in zip(batch, vecs):
                c["embedding"] = v
        self._chunks = new_chunks
        log.info("Built semantic index: %d chunks in %.2fs", len(new_chunks), time.time() - t0)


def _cosine(a: List[float], b: List[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b):
        dot += x * y
        na += x * x
        nb += y * y
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


# Global instance
index = SemanticIndex()
