"""
S4ight access control.

Simple token-gated access with per-token program scope. Activated when
the `S4IGHT_ACCESS_TOKENS` env var is set; otherwise S4ight remains
open (current pre-auth behaviour).

`S4IGHT_ACCESS_TOKENS` accepts either:
  - a JSON map: {"token123": {"label": "Nick (S4)", "programs": ["PMS 325"]},
                 "token456": {"label": "Pilot user", "programs": "*"}}
  - or a comma-separated list of bare tokens (all granted "*"):
    "token123,token456"

The "programs" list uses the same labels declared in
`config.SUPPORTED_PROGRAMS`. Use "*" or omit to grant all.

This is not a replacement for real OIDC / mTLS — it is a closed-preview
gate suitable for invited testers. For ATO, add a dedicated identity
provider in front of the function.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List, Optional, Tuple

log = logging.getLogger("s4ight.access")

ACCESS_TOKENS_RAW = os.getenv("S4IGHT_ACCESS_TOKENS", "").strip()


def _parse_tokens(raw: str) -> Dict[str, Dict[str, object]]:
    if not raw:
        return {}
    # Try JSON first.
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            out: Dict[str, Dict[str, object]] = {}
            for tok, meta in data.items():
                if not isinstance(tok, str) or not tok:
                    continue
                if isinstance(meta, dict):
                    programs = meta.get("programs") or "*"
                    out[tok] = {
                        "label": meta.get("label") or "S4ight user",
                        "programs": programs if programs == "*" else list(programs),
                    }
                else:
                    out[tok] = {"label": "S4ight user", "programs": "*"}
            return out
    except Exception:
        pass
    # CSV of bare tokens
    return {
        t.strip(): {"label": "S4ight user", "programs": "*"}
        for t in raw.split(",")
        if t.strip()
    }


TOKENS: Dict[str, Dict[str, object]] = _parse_tokens(ACCESS_TOKENS_RAW)


def is_enabled() -> bool:
    return bool(TOKENS)


def health() -> Dict[str, object]:
    return {
        "enabled": is_enabled(),
        "token_count": len(TOKENS),
    }


def _extract_token(headers: Dict[str, str], query_token: Optional[str]) -> Optional[str]:
    auth = headers.get("authorization") or headers.get("Authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip() or None
    if auth.lower().startswith("token "):
        return auth.split(" ", 1)[1].strip() or None
    custom = headers.get("x-s4ight-token") or headers.get("X-S4ight-Token")
    if custom:
        return custom.strip() or None
    if query_token:
        return query_token.strip() or None
    return None


def authorize(
    headers: Dict[str, str],
    query_token: Optional[str] = None,
    program: Optional[str] = None,
) -> Tuple[bool, Optional[Dict[str, object]], Optional[str]]:
    """
    Returns (allowed, principal, reason).
      allowed   : True if access is permitted.
      principal : token metadata (label, programs) on success.
      reason    : human-readable error on denial.
    """
    if not is_enabled():
        return True, {"label": "anonymous", "programs": "*"}, None
    token = _extract_token(headers, query_token)
    if not token:
        return False, None, "missing_token"
    principal = TOKENS.get(token)
    if not principal:
        return False, None, "invalid_token"
    if program is not None:
        allowed_programs = principal.get("programs") or "*"
        if allowed_programs != "*" and program not in allowed_programs:
            return False, principal, f"program_not_allowed: {program}"
    return True, principal, None
