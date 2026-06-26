"""
S4ight FastAPI Backend
- /chat          : agentic chat with grounded RAG + Ollama
- /tool/{name}   : direct tool invocation
- /health        : Ollama + knowledge base status
- /knowledge     : list loaded docs (for the frontend KB view)
- /              : serves the bundled HTML frontend if present
"""

from __future__ import annotations

import logging
import time
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

import uvicorn

from config import (
    API_HOST,
    API_PORT,
    CORS_ORIGINS,
    FRONTEND_DIR,
    KNOWLEDGE_DIR,
    MAX_MESSAGE_CHARS,
    SUPPORTED_PROGRAMS,
)
from agents import orchestrator
from tools import AVAILABLE_TOOLS
from memory import store as memory_store
from llm_providers import get_provider
from retriever import load_knowledge_base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
log = logging.getLogger("s4ight.api")

app = FastAPI(
    title="S4ight API",
    description="S4 Systems specialized AI for PMS 300/325/385 — ILS, Acquisition, Programmatic",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# --- Models ---

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    program: str = Field(default="PMS 325")
    session_id: Optional[str] = Field(default=None, max_length=128)

    @field_validator("program")
    @classmethod
    def _valid_program(cls, v: str) -> str:
        if v not in SUPPORTED_PROGRAMS:
            # Allow free text but log — keeps the API flexible.
            log.info("Unrecognized program supplied: %s", v)
        return v


class ChatResponse(BaseModel):
    response: str
    sources: List[str] = []
    agent: Optional[str] = None
    focus: Optional[str] = None
    engine: Optional[str] = None
    tool_used: Optional[str] = None
    tool_result: Optional[Dict[str, Any]] = None
    session_id: str
    elapsed_ms: int


class ToolRequest(BaseModel):
    parameters: Dict[str, Any] = Field(default_factory=dict)


# --- Routes ---

@app.get("/health")
async def health() -> Dict[str, Any]:
    docs = load_knowledge_base()
    provider = get_provider()
    sem: Dict[str, Any]
    try:
        from semantic_retriever import index as _sem  # noqa: WPS433
        sem = _sem.info()
        sem["available"] = _sem.available()
    except Exception as e:
        sem = {"enabled": False, "error": str(e)}
    return {
        "status": "ok",
        "version": app.version,
        "knowledge_dir": str(KNOWLEDGE_DIR),
        "knowledge_docs": len(docs),
        "llm": provider.health(),
        "semantic": sem,
        "supported_programs": SUPPORTED_PROGRAMS,
    }


@app.get("/knowledge")
async def knowledge() -> Dict[str, Any]:
    docs = load_knowledge_base()
    return {
        "directory": str(KNOWLEDGE_DIR),
        "count": len(docs),
        "documents": [
            {"source": d["source"], "chars": len(d["content"]), "chunks": len(d["chunks"])}
            for d in docs
        ],
    }


@app.get("/chunk")
async def chunk(source: str, idx: int, session_id: Optional[str] = None) -> Dict[str, Any]:
    from chunk_lookup import lookup_chunk
    hit = lookup_chunk(source, idx, session_id=session_id)
    if not hit:
        raise HTTPException(status_code=404, detail="chunk_not_found")
    return hit


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest) -> ChatResponse:
    start = time.perf_counter()
    session_id = req.session_id or str(uuid4())
    try:
        result = orchestrator.route(
            query=req.message.strip(),
            program=req.program,
            session_id=session_id,
        )
    except Exception as e:
        log.exception("Chat failed")
        raise HTTPException(status_code=500, detail=f"Chat processing error: {e}")

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return ChatResponse(
        response=result.get("response", ""),
        sources=result.get("sources", []),
        agent=result.get("agent"),
        focus=result.get("focus"),
        engine=result.get("engine"),
        tool_used=result.get("tool_used"),
        tool_result=result.get("tool_result"),
        session_id=session_id,
        elapsed_ms=elapsed_ms,
    )


@app.post("/session/{session_id}/clear")
async def clear_session(session_id: str) -> Dict[str, Any]:
    memory_store.clear(session_id)
    try:
        from ingestion import store as _docs
        _docs.clear(session_id)
    except Exception:
        pass
    return {"status": "ok", "session_id": session_id, "cleared": True}


# ----- Documents (ephemeral session uploads) -----

class DocUpload(BaseModel):
    session_id: str
    filename: str
    content_base64: str


class DocDelete(BaseModel):
    session_id: str


@app.get("/documents")
async def list_documents(session_id: str) -> Dict[str, Any]:
    from ingestion import store as _docs
    return _docs.info(session_id)


@app.post("/documents")
async def upload_document(req: DocUpload) -> Dict[str, Any]:
    import base64
    from ingestion import store as _docs, INGEST_MAX_BYTES
    if not req.session_id:
        raise HTTPException(status_code=400, detail="session_id_required")
    try:
        content = base64.b64decode(req.content_base64, validate=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"invalid_base64: {e}")
    if len(content) > INGEST_MAX_BYTES:
        raise HTTPException(status_code=413, detail="file_too_large")
    try:
        return _docs.ingest(req.session_id, req.filename, content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/documents/clear")
async def clear_documents(req: DocDelete) -> Dict[str, Any]:
    from ingestion import store as _docs
    return _docs.clear(req.session_id)


@app.post("/documents/{doc_id}/delete")
async def delete_document(doc_id: str, req: DocDelete) -> Dict[str, Any]:
    from ingestion import store as _docs
    return _docs.remove(req.session_id, doc_id)


@app.post("/tool/{name}")
async def call_tool(name: str, req: ToolRequest) -> Dict[str, Any]:
    fn = AVAILABLE_TOOLS.get(name)
    if not fn:
        raise HTTPException(status_code=404, detail=f"Unknown tool: {name}")
    try:
        # Filter params to only valid kwargs of fn.
        import inspect
        sig = inspect.signature(fn)
        kwargs = {k: v for k, v in req.parameters.items() if k in sig.parameters}
        return {"tool": name, "status": "success", "output": fn(**kwargs)}
    except TypeError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters: {e}")
    except Exception as e:
        log.exception("Tool %s failed", name)
        raise HTTPException(status_code=500, detail=f"Tool error: {e}")


# --- Frontend hosting (optional) ---

INDEX_FILE = FRONTEND_DIR / "index.html"
if FRONTEND_DIR.exists():
    # Mount static for any future CSS/JS assets.
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    @app.get("/")
    async def root_html() -> FileResponse:
        if INDEX_FILE.exists():
            return FileResponse(str(INDEX_FILE))
        return JSONResponse({"message": "S4ight API ready", "frontend": "missing"})
else:
    @app.get("/")
    async def root_json() -> Dict[str, str]:
        return {"message": "S4ight API v1.0", "status": "ready", "frontend": "not bundled"}


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "no-referrer"
    return resp


if __name__ == "__main__":
    uvicorn.run("main:app", host=API_HOST, port=API_PORT, reload=False)
