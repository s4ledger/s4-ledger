"""
S4ight OIDC bearer-token validation.

When `S4IGHT_OIDC_ISSUER` is set, S4ight will accept Microsoft Entra
(or any OIDC-compliant) bearer JWTs as a second authentication path
alongside the static `S4IGHT_ACCESS_TOKENS` table.

What this does:
  - Discovers the OIDC `jwks_uri` from the issuer (or from
    `S4IGHT_OIDC_JWKS_URL` if you want to skip the dance).
  - Validates incoming JWTs: signature (RS256), `iss`, `aud`,
    expiration, optional required claims.
  - Returns a normalized principal `{label, programs, claims}` on
    success.

What this does NOT do (yet):
  - Browser-side sign-in / authorization-code + PKCE flow. For now,
    users obtain a bearer token from Entra (e.g. via the Azure CLI
    or MSAL desktop) and paste it into the sidebar's Access token
    field. The browser-side login flow is the next sub-wave.

Env vars:
  S4IGHT_OIDC_ISSUER         e.g. https://login.microsoftonline.com/<tenant>/v2.0
  S4IGHT_OIDC_AUDIENCE       the audience your S4ight API expects (the
                             "Application ID URI" or client_id of the API)
  S4IGHT_OIDC_JWKS_URL       (optional) explicit JWKS URL override
  S4IGHT_OIDC_REQUIRED_CLAIMS (optional JSON) extra claim → expected value
                             map. e.g. {"roles": "S4ight.User"} requires the
                             token to include "S4ight.User" in roles.
  S4IGHT_OIDC_PROGRAMS_CLAIM (optional, default "programs") JWT claim that
                             lists allowed PMS programs (array of strings).
  S4IGHT_OIDC_LABEL_CLAIM    (optional, default "preferred_username")

Dependencies:
  PyJWT[crypto] — added to api/requirements.txt.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib import request as _urlrequest

log = logging.getLogger("s4ight.oidc")

ISSUER = os.getenv("S4IGHT_OIDC_ISSUER", "").rstrip("/")
AUDIENCE = os.getenv("S4IGHT_OIDC_AUDIENCE", "").strip()
JWKS_URL_OVERRIDE = os.getenv("S4IGHT_OIDC_JWKS_URL", "").strip()
PROGRAMS_CLAIM = os.getenv("S4IGHT_OIDC_PROGRAMS_CLAIM", "programs")
LABEL_CLAIM = os.getenv("S4IGHT_OIDC_LABEL_CLAIM", "preferred_username")

try:
    REQUIRED_CLAIMS_RAW = os.getenv("S4IGHT_OIDC_REQUIRED_CLAIMS", "").strip()
    REQUIRED_CLAIMS = json.loads(REQUIRED_CLAIMS_RAW) if REQUIRED_CLAIMS_RAW else {}
except Exception:
    REQUIRED_CLAIMS = {}

CACHE_TTL_S = float(os.getenv("S4IGHT_OIDC_CACHE_TTL_S", "3600"))

_jwks_cache: Dict[str, Any] = {"keys": None, "url": None, "loaded_at": 0.0}
_lock = threading.RLock()

# PyJWT is optional at import time so the module loads even without it;
# we report not-available via `health()` and fall through cleanly.
try:
    import jwt  # type: ignore
    from jwt.algorithms import RSAAlgorithm  # type: ignore
    _PYJWT_AVAILABLE = True
except Exception:  # pragma: no cover - depends on env
    jwt = None  # type: ignore
    RSAAlgorithm = None  # type: ignore
    _PYJWT_AVAILABLE = False


def enabled() -> bool:
    return bool(ISSUER) and bool(AUDIENCE) and _PYJWT_AVAILABLE


def health() -> Dict[str, Any]:
    return {
        "enabled": enabled(),
        "issuer_present": bool(ISSUER),
        "audience_present": bool(AUDIENCE),
        "jwks_url_override": bool(JWKS_URL_OVERRIDE),
        "pyjwt_installed": _PYJWT_AVAILABLE,
        "required_claims": REQUIRED_CLAIMS,
        "programs_claim": PROGRAMS_CLAIM,
    }


def _discover_jwks_url() -> str:
    if JWKS_URL_OVERRIDE:
        return JWKS_URL_OVERRIDE
    url = ISSUER.rstrip("/") + "/.well-known/openid-configuration"
    with _urlrequest.urlopen(url, timeout=5) as resp:
        data = json.loads(resp.read().decode("utf-8") or "{}")
    return data.get("jwks_uri") or ""


def _fetch_jwks() -> Dict[str, Any]:
    with _lock:
        now = time.time()
        if _jwks_cache["keys"] and (now - _jwks_cache["loaded_at"]) < CACHE_TTL_S:
            return _jwks_cache["keys"]
        url = _discover_jwks_url()
        if not url:
            raise RuntimeError("OIDC jwks_uri not discoverable")
        with _urlrequest.urlopen(url, timeout=5) as resp:
            keys = json.loads(resp.read().decode("utf-8") or "{}")
        _jwks_cache["keys"] = keys
        _jwks_cache["url"] = url
        _jwks_cache["loaded_at"] = now
        return keys


def _find_key(kid: str, jwks: Dict[str, Any]):
    for k in jwks.get("keys", []) or []:
        if k.get("kid") == kid:
            return RSAAlgorithm.from_jwk(json.dumps(k))  # type: ignore[union-attr]
    return None


def validate_token(token: str) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
    """Return (ok, claims, reason)."""
    if not enabled():
        return False, None, "oidc_disabled"
    try:
        unverified_header = jwt.get_unverified_header(token)  # type: ignore[union-attr]
    except Exception as e:
        return False, None, f"bad_header: {e}"
    kid = unverified_header.get("kid")
    if not kid:
        return False, None, "missing_kid"
    try:
        jwks = _fetch_jwks()
    except Exception as e:
        return False, None, f"jwks_fetch_failed: {e}"
    key = _find_key(kid, jwks)
    if key is None:
        # Force refresh once in case keys rotated.
        _jwks_cache["loaded_at"] = 0.0
        try:
            jwks = _fetch_jwks()
            key = _find_key(kid, jwks)
        except Exception:
            pass
    if key is None:
        return False, None, "unknown_kid"
    try:
        claims = jwt.decode(  # type: ignore[union-attr]
            token,
            key=key,
            algorithms=["RS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"verify_aud": True, "verify_iss": True, "verify_exp": True},
        )
    except Exception as e:
        return False, None, f"verify_failed: {e}"
    # Required-claim policy.
    for k, v in (REQUIRED_CLAIMS or {}).items():
        actual = claims.get(k)
        if isinstance(actual, list):
            if v not in actual:
                return False, claims, f"required_claim_missing: {k}={v}"
        else:
            if actual != v:
                return False, claims, f"required_claim_mismatch: {k}!={v}"
    return True, claims, None


def principal_from_claims(claims: Dict[str, Any]) -> Dict[str, Any]:
    label = claims.get(LABEL_CLAIM) or claims.get("upn") or claims.get("sub") or "OIDC user"
    programs = claims.get(PROGRAMS_CLAIM)
    if not programs:
        programs = "*"
    return {"label": label, "programs": programs, "claims": claims}
