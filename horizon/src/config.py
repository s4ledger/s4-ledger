"""HORIZON — configuration loader.

Reads `agent_config.json` and `.env` once at startup and exposes a
single `settings` object. No module elsewhere in HORIZON should reach
into `os.environ` or read the config file directly.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # python-dotenv is optional in stub mode
    def load_dotenv(*_a: Any, **_kw: Any) -> bool:  # type: ignore[misc]
        return False


# Repo-relative paths anchored to the /horizon/ directory itself so
# this code works identically when lifted into Replit.
HORIZON_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(HORIZON_ROOT / ".env")


def _read_config() -> dict[str, Any]:
    cfg_path = HORIZON_ROOT / "agent_config.json"
    with cfg_path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def _read_system_prompt() -> str:
    sp_path = HORIZON_ROOT / "system_prompt.md"
    return sp_path.read_text(encoding="utf-8")


@dataclass(frozen=True)
class Settings:
    # Identity
    agent_id: str
    persona_name: str
    product_name: str
    version: str
    proxy_route_base: str

    # Runtime
    mode: str
    host: str
    port: int
    cors_origins: tuple[str, ...]
    api_token: str

    # Persistence
    db_url: str
    db_path: Path

    # Knowledge
    kb_path: Path
    system_prompt: str

    # Audit
    audit_enabled: bool
    redact_pii: bool

    # Memory
    short_term_turn_limit: int
    retrieval_top_k: int

    # Raw config for anything not promoted above
    raw: dict[str, Any]


def _split_csv(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


def load_settings() -> Settings:
    cfg = _read_config()
    mode = os.getenv("HORIZON_MODE", "stub")
    db_url = os.getenv("HORIZON_DB_URL", "sqlite:///./horizon.db")
    # Resolve the sqlite path relative to HORIZON_ROOT for portability.
    if db_url.startswith("sqlite:///"):
        rel = db_url.replace("sqlite:///", "", 1)
        db_path = (HORIZON_ROOT / rel).resolve()
    else:
        db_path = HORIZON_ROOT / "horizon.db"

    kb_rel = os.getenv("HORIZON_KB_PATH", cfg.get("dataset_path", "knowledge_base"))
    kb_path = (HORIZON_ROOT / kb_rel).resolve()

    memory_cfg = cfg.get("memory", {})

    return Settings(
        agent_id=cfg["agent_id"],
        persona_name=cfg["persona_name"],
        product_name=cfg["product_name"],
        version=cfg["version"],
        proxy_route_base=cfg["proxy_route_base"],
        mode=mode,
        host=os.getenv("HORIZON_HOST", "0.0.0.0"),
        port=int(os.getenv("HORIZON_PORT", "8088")),
        cors_origins=_split_csv(os.getenv("HORIZON_CORS_ORIGINS", "*")),
        api_token=os.getenv("HORIZON_API_TOKEN", ""),
        db_url=db_url,
        db_path=db_path,
        kb_path=kb_path,
        system_prompt=_read_system_prompt(),
        audit_enabled=os.getenv("HORIZON_AUDIT_ENABLED", "true").lower() == "true",
        redact_pii=os.getenv("HORIZON_REDACT_PII", "true").lower() == "true",
        short_term_turn_limit=int(memory_cfg.get("short_term_turn_limit", 24)),
        retrieval_top_k=int(memory_cfg.get("retrieval_top_k", 5)),
        raw=cfg,
    )


settings = load_settings()
