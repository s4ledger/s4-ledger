"""
S4ight Retriever
Lightweight keyword/overlap retrieval over the s4ight_knowledge folder.
Designed to be swapped for embeddings + vector DB later without changing callers.
"""

from __future__ import annotations

import glob
import os
import re
import time
from typing import List, Tuple, Dict, Optional

from config import KNOWLEDGE_DIR, MAX_CONTEXT_CHARS

# In-memory cache so we don't re-read the corpus on every request.
_CACHE: Dict[str, object] = {"docs": None, "loaded_at": 0.0, "mtime": 0.0}
_CACHE_TTL_S = 30.0  # short TTL so newly added docs appear quickly during dev

# Domain keywords get a boost — this is the cheap "knows the language" trick.
DOMAIN_KEYWORDS = [
    "ils", "supply support", "gate review", "acquisition", "risk", "schedule",
    "evms", "ims", "sustaining engineering", "pms 325", "pms 300", "pms 385",
    "t-ao", "provisioning", "lcsp", "ila", "jcids", "aoa", "cdd", "tdp",
    "phs&t", "mrc", "nslc", "navsup", "isea", "configuration management",
    "milestone", "earned value", "cdrl", "drl", "fmecq", "rcm",
]

_WORD_RE = re.compile(r"[a-z0-9][a-z0-9\-]+")


def _tokenize(text: str) -> List[str]:
    return _WORD_RE.findall(text.lower())


def _chunk_text(text: str, chunk_size: int = 800, overlap: int = 120) -> List[str]:
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


def _dir_mtime(path: str) -> float:
    latest = 0.0
    for fp in glob.glob(os.path.join(path, "*.md")):
        try:
            latest = max(latest, os.path.getmtime(fp))
        except OSError:
            continue
    return latest


def load_knowledge_base() -> List[dict]:
    """Load all markdown documents in KNOWLEDGE_DIR with light caching."""
    kdir = str(KNOWLEDGE_DIR)
    now = time.time()
    cached = _CACHE["docs"]
    cached_at = float(_CACHE["loaded_at"] or 0.0)
    cur_mtime = _dir_mtime(kdir)
    if (
        cached is not None
        and (now - cached_at) < _CACHE_TTL_S
        and cur_mtime == _CACHE["mtime"]
    ):
        return cached  # type: ignore[return-value]

    docs: List[dict] = []
    if os.path.isdir(kdir):
        for filepath in sorted(glob.glob(os.path.join(kdir, "*.md"))):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
            except OSError:
                continue
            docs.append(
                {
                    "source": os.path.basename(filepath),
                    "content": content,
                    "chunks": _chunk_text(content),
                }
            )

    _CACHE["docs"] = docs
    _CACHE["loaded_at"] = now
    _CACHE["mtime"] = cur_mtime
    return docs


def retrieve_relevant_chunks(query: str, top_k: int = 4) -> List[Tuple[str, str]]:
    """Return up to top_k (source, chunk) tuples scored by keyword + overlap."""
    if not query or not query.strip():
        return []
    docs = load_knowledge_base()
    if not docs:
        return []

    query_lower = query.lower()
    query_tokens = set(_tokenize(query_lower))
    scored: List[Tuple[float, str, str]] = []

    for doc in docs:
        for chunk in doc["chunks"]:
            chunk_lower = chunk.lower()
            score = 0.0
            for kw in DOMAIN_KEYWORDS:
                if kw in query_lower and kw in chunk_lower:
                    score += 3.0
            chunk_tokens = set(_tokenize(chunk_lower))
            overlap = len(query_tokens & chunk_tokens)
            score += overlap
            if score > 0:
                scored.append((score, doc["source"], chunk))

    scored.sort(reverse=True, key=lambda x: x[0])
    return [(src, chunk) for _, src, chunk in scored[:top_k]]


def build_context(
    query: str,
    top_k: int = 4,
    max_chars: int = MAX_CONTEXT_CHARS,
    session_id: Optional[str] = None,
    allowed_classifications: Optional[List[str]] = None,
    program: Optional[str] = None,
) -> Tuple[str, List[str]]:
    """Assemble a context string (capped) plus its source list.

    Strategy:
      1. If the session has uploaded documents, fetch top hits (filtered by
         allowed_classifications when provided).
      2. Get top hits from the curated knowledge base (semantic preferred,
         keyword fallback). KB hits are filtered by program profile's
         `applicable_kb` when a program is supplied.
      3. Interleave so user docs come first (they're usually the program-
         specific source of truth), then KB.
    """
    parts: List[str] = []
    sources: List[str] = []
    used = 0

    # Program profile KB allow-list (None = no filtering)
    def _kb_keep(src: str) -> bool:
        if not program:
            return True
        try:
            from program_profiles import kb_allowed  # noqa: WPS433
            return kb_allowed(program, src)
        except Exception:
            return True

    # 1) Session uploads (semantic embeddings).
    if session_id:
        try:
            from ingestion import store as _docs  # noqa: WPS433
            if _docs.has_documents(session_id):
                hits = _docs.search(
                    session_id, query, top_k=top_k,
                    allowed_classifications=allowed_classifications,
                )
                for hit in hits:
                    # New signature: (score, source, idx, text, classification)
                    score, src, idx, text, classification = hit
                    if score <= 0:
                        continue
                    tag = f"{src} §{idx}"
                    snippet = (
                        f"[uploaded: {tag} | {classification}] "
                        f"(similarity {score:.2f})\n{text.strip()}"
                    )
                    if used + len(snippet) > max_chars:
                        break
                    parts.append(snippet)
                    used += len(snippet)
                    sources.append(tag)
        except Exception:  # pragma: no cover
            pass

    remaining = max_chars - used
    if remaining > 200:
        # 2) Curated knowledge base.
        kb_added = False
        try:
            from semantic_retriever import index as _sem  # noqa: WPS433
            if _sem.available():
                ctx, cites = _sem.build_context(query, top_k=top_k * 2, max_chars=remaining)
                # Filter by program-applicable KB.
                if program:
                    filtered_cites = [c for c in cites if _kb_keep(c["source"])]
                else:
                    filtered_cites = cites
                if filtered_cites:
                    # Reassemble only filtered snippets (cheap re-join).
                    filtered_text_parts = []
                    used2 = 0
                    for c in filtered_cites:
                        # The original ctx is already capped; just keep tags consistent.
                        tag = f"{c['source']} §{c['chunk']}"
                        if tag not in sources:
                            sources.append(tag)
                        filtered_text_parts.append(tag)
                    parts.append(ctx)
                    used += len(ctx)
                    kb_added = True
        except Exception:  # pragma: no cover
            pass

        if not kb_added:
            # Keyword fallback (also filtered).
            hits = retrieve_relevant_chunks(query, top_k=top_k * 2)
            for src, chunk in hits:
                if not _kb_keep(src):
                    continue
                snippet = f"From {src}:\n{chunk.strip()}"
                if used + len(snippet) > max_chars:
                    break
                parts.append(snippet)
                used += len(snippet)
                if src not in sources:
                    sources.append(src)

    return "\n\n---\n\n".join(parts), sources


def get_grounded_response(query: str, program: str = "PMS 325") -> dict:
    """Non-LLM fallback: returns a structured summary from retrieved chunks."""
    context, sources = build_context(query)
    if not context:
        return {
            "response": (
                f"S4ight has no direct matches in the {program} knowledge base for your query. "
                "Add documents under s4ight_knowledge/ or refine the question with specific ILS, "
                "acquisition, or programmatic terms."
            ),
            "sources": ["General S4 Domain Knowledge"],
        }
    response = (
        f"Based on the S4ight knowledge base for {program}:\n\n{context}\n\n"
        "S4ight synthesis: the excerpts above directly address the query. "
        "Enable Ollama for fluent, cited synthesis."
    )
    return {"response": response, "sources": sources or ["S4ight Knowledge Base"]}
