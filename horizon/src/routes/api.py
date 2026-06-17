"""HORIZON — API routes.

All routes are mounted under `proxy_route_base` from agent_config.json
(default `/api/horizon`). Keep this module thin — business logic lives
in `src/agent.py` and `src/tools.py`.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Header, HTTPException, status
from pydantic import BaseModel, Field

from .. import agent
from ..audit import recent_audit
from ..config import settings
from ..memory import recent_messages, reset_kb_cache

router = APIRouter()


# ──────────────────────────────────────────────────────────────────
#  Schemas
# ──────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    session_id: str | None = None
    user_handle: str = Field(default="anonymous", max_length=64)


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    tool: str | None = None
    tool_args: dict[str, Any] = Field(default_factory=dict)
    tool_result: Any = None
    retrieved: list[dict[str, Any]] = Field(default_factory=list)


# ──────────────────────────────────────────────────────────────────
#  Guard
# ──────────────────────────────────────────────────────────────────

def _check_token(token: str | None) -> None:
    if settings.mode != "prod":
        return
    if not settings.api_token or token != settings.api_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid_or_missing_token",
        )


# ──────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────

@router.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "product": settings.product_name,
        "agent_id": settings.agent_id,
        "persona": settings.persona_name,
        "version": settings.version,
        "mode": settings.mode,
    }


@router.get("/tools")
def tools(x_horizon_token: str | None = Header(default=None)) -> dict[str, Any]:
    _check_token(x_horizon_token)
    return {"tools": agent.available_tools()}


@router.post("/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    x_horizon_token: str | None = Header(default=None),
) -> ChatResponse:
    _check_token(x_horizon_token)
    try:
        resp = agent.run_turn(
            user_handle=req.user_handle,
            message=req.message,
            session_id=req.session_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return ChatResponse(
        session_id=resp.session_id,
        reply=resp.reply,
        tool=resp.tool,
        tool_args=resp.tool_args,
        tool_result=resp.tool_result,
        retrieved=resp.retrieved,
    )


@router.get("/session/{session_id}")
def session_view(
    session_id: str,
    x_horizon_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_token(x_horizon_token)
    return {
        "session_id": session_id,
        "messages": recent_messages(session_id, limit=200),
    }


@router.get("/audit")
def audit_feed(
    limit: int = 100,
    x_horizon_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_token(x_horizon_token)
    return {"events": recent_audit(limit=limit)}


@router.post("/admin/reindex")
def admin_reindex(
    x_horizon_token: str | None = Header(default=None),
) -> dict[str, Any]:
    _check_token(x_horizon_token)
    reset_kb_cache()
    return {"ok": True, "reindexed": True}
