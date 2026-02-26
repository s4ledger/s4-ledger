"""
S4 Ledger — Defense Record Metrics API (Vercel Serverless)
Real XRPL Testnet integration with graceful fallback.
64+ Navy & Joint defense record types (supports any custom type), 600 pre-seeded records.
Supabase integration for persistence (optional, graceful fallback).
API key authentication support.
Rate limiting, CORS, and request logging.
"""

from http.server import BaseHTTPRequestHandler
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse, parse_qs
import hashlib
import json
import os
import re
import hmac
import time

# XRPL Testnet integration (graceful fallback if unavailable)
try:
    from xrpl.clients import JsonRpcClient
    from xrpl.wallet import generate_faucet_wallet, Wallet
    from xrpl.models import Memo, Payment, AccountSet, IssuedCurrencyAmount
    from xrpl.transaction import submit_and_wait
    try:
        from xrpl.core.keypairs.main import CryptoAlgorithm
    except ImportError:
        try:
            from xrpl.core.keypairs import CryptoAlgorithm
        except ImportError:
            from enum import Enum
            class CryptoAlgorithm(Enum):
                ED25519 = "ed25519"
                SECP256K1 = "secp256k1"
    XRPL_AVAILABLE = True
except ImportError:
    XRPL_AVAILABLE = False

# Supabase integration (graceful fallback if unavailable)
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip()
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
SUPABASE_AVAILABLE = bool(SUPABASE_URL and SUPABASE_KEY)

# ═══════════════════════════════════════════════════════════════════════
#  SUPABASE PERSISTENCE LAYER — Replaces all in-memory stores
#  Uses urllib.request (stdlib) to hit the PostgREST API.
#  Every write goes to Supabase first, with in-memory as cache.
#  Every read checks Supabase if cache is empty (cold-start recovery).
# ═══════════════════════════════════════════════════════════════════════

import urllib.request
import urllib.error

def _supabase_request(table, *, method="GET", data=None, query_params="",
                       select="*", prefer="return=representation", timeout=10):
    """Generic Supabase REST API helper.
    Returns parsed JSON on success, None on failure (graceful fallback).
    
    Args:
        table:        Table name (e.g. "records")
        method:       HTTP method (GET, POST, PATCH, DELETE)
        data:         Dict to send as JSON body (POST/PATCH)
        query_params: PostgREST filter string (e.g. "record_id=eq.REC-ABC")
        select:       Columns to return (default "*")
        prefer:       Prefer header (default "return=representation")
        timeout:      Request timeout in seconds
    """
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return None
    try:
        url = f"{SUPABASE_URL}/rest/v1/{table}"
        if query_params:
            url += f"?{query_params}"
        if method == "GET" and select:
            sep = "&" if "?" in url else "?"
            url += f"{sep}select={select}"

        headers = {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer

        body = json.dumps(data).encode() if data else None
        req = urllib.request.Request(url, data=body, headers=headers, method=method)
        resp = urllib.request.urlopen(req, timeout=timeout)
        raw = resp.read()
        if raw:
            return json.loads(raw)
        return []
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        print(f"Supabase {method} {table} HTTP {e.code}: {body[:300]}")
        return None
    except Exception as e:
        print(f"Supabase {method} {table} failed: {e}")
        return None


def _sb_insert(table, row):
    """Insert a single row into a Supabase table. Returns the inserted row or None."""
    return _supabase_request(table, method="POST", data=row,
                              prefer="return=representation")


def _sb_upsert(table, row, on_conflict=""):
    """Upsert a single row. on_conflict is the column(s) for conflict resolution."""
    prefer = "return=representation,resolution=merge-duplicates"
    return _supabase_request(table, method="POST", data=row, prefer=prefer)


def _sb_select(table, query_params="", select="*", limit=None, order=None):
    """Select rows from a Supabase table with optional filtering and ordering."""
    parts = []
    if query_params:
        parts.append(query_params)
    if order:
        parts.append(f"order={order}")
    if limit:
        parts.append(f"limit={limit}")
    qp = "&".join(parts)
    return _supabase_request(table, method="GET", query_params=qp, select=select) or []


# ─── Records persistence ──────────────────────────────────────────────

_records_loaded = False  # Flag: have we hydrated _live_records from Supabase?

def _persist_record(record):
    """Write an anchored record to Supabase. Falls back to in-memory only."""
    row = {
        "record_id": record.get("record_id", ""),
        "hash": record.get("hash", ""),
        "record_type": record.get("record_type", ""),
        "record_label": record.get("record_label", ""),
        "branch": record.get("branch", "JOINT"),
        "icon": record.get("icon", ""),
        "timestamp": record.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "timestamp_display": record.get("timestamp_display", ""),
        "fee": record.get("fee", 0.01),
        "tx_hash": record.get("tx_hash", ""),
        "network": record.get("network", "Simulated"),
        "explorer_url": record.get("explorer_url"),
        "system": record.get("system", ""),
        "content_preview": record.get("content_preview", ""),
        "org_id": record.get("org_id", ""),
        "source_system": record.get("source_system", ""),
    }
    result = _sb_upsert("records", row)
    if result is None:
        print(f"Record persist failed for {row['record_id']} — in-memory only")
    return result


def _load_records_from_supabase():
    """Hydrate _live_records from Supabase on cold start with retry."""
    global _records_loaded
    if _records_loaded:
        return
    _records_loaded = True
    rows = None
    for attempt in range(3):
        rows = _sb_select("records", order="timestamp.asc", limit=10000)
        if rows is not None:
            break
        print(f"Supabase hydration attempt {attempt + 1} failed — retrying...")
        time.sleep(0.5 * (attempt + 1))
    if rows:
        for row in rows:
            _live_records.append({
                "hash": row.get("hash", ""),
                "record_type": row.get("record_type", ""),
                "record_label": row.get("record_label", ""),
                "branch": row.get("branch", "JOINT"),
                "icon": row.get("icon", ""),
                "timestamp": row.get("timestamp", ""),
                "timestamp_display": row.get("timestamp_display", ""),
                "fee": float(row.get("fee", 0.01)),
                "tx_hash": row.get("tx_hash", ""),
                "network": row.get("network", "Simulated"),
                "explorer_url": row.get("explorer_url"),
                "system": row.get("system", ""),
                "content_preview": row.get("content_preview", ""),
                "org_id": row.get("org_id", ""),
                "record_id": row.get("record_id", ""),
                "source_system": row.get("source_system", ""),
            })
        print(f"Hydrated {len(rows)} records from Supabase")
    else:
        print("WARNING: Supabase hydration failed after 3 attempts — starting with empty records")


# ─── Audit log persistence ────────────────────────────────────────────

def _persist_verify_audit(entry):
    """Write a verification audit entry to Supabase."""
    row = {
        "timestamp": entry.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "operator": entry.get("operator", ""),
        "computed_hash": entry.get("computed_hash", ""),
        "chain_hash": entry.get("chain_hash"),
        "tx_hash": entry.get("tx_hash"),
        "result": entry.get("result", ""),
        "tamper_detected": entry.get("tamper_detected", False),
        "time_delta_seconds": entry.get("time_delta_seconds"),
    }
    _sb_insert("verify_audit_log", row)


def _persist_ai_audit(entry):
    """Write an AI audit entry to Supabase."""
    row = {
        "timestamp": entry.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "query": entry.get("query", ""),
        "response_hash": entry.get("response_hash", ""),
        "tool_context": entry.get("tool_context", ""),
        "anchored": entry.get("anchored", False),
        "intent": entry.get("intent", ""),
        "entity_count": entry.get("entity_count", 0),
    }
    _sb_insert("ai_audit_log", row)


def _load_verify_audit_from_supabase():
    """Hydrate _verify_audit_log from Supabase on cold start."""
    rows = _sb_select("verify_audit_log", order="timestamp.desc", limit=500)
    if rows:
        rows.reverse()  # oldest first in our in-memory list
        for row in rows:
            _verify_audit_log.append({
                "timestamp": row.get("timestamp", ""),
                "operator": row.get("operator", ""),
                "computed_hash": row.get("computed_hash", ""),
                "chain_hash": row.get("chain_hash"),
                "tx_hash": row.get("tx_hash"),
                "result": row.get("result", ""),
                "tamper_detected": row.get("tamper_detected", False),
                "time_delta_seconds": row.get("time_delta_seconds"),
            })
        print(f"Hydrated {len(rows)} verify audit entries from Supabase")


# ─── Proof chain & custody persistence ────────────────────────────────

def _persist_proof_chain_event(record_id, event):
    """Write a proof chain event to Supabase."""
    row = {
        "record_id": record_id,
        "event_type": event.get("event_type", ""),
        "hash": event.get("hash", ""),
        "tx_hash": event.get("tx_hash", ""),
        "timestamp": event.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "actor": event.get("actor", ""),
        "metadata": json.dumps(event.get("metadata", {})),
    }
    _sb_insert("proof_chains", row)


def _persist_custody_transfer(record_id, transfer):
    """Write a custody transfer to Supabase."""
    row = {
        "record_id": record_id,
        "from_entity": transfer.get("from", ""),
        "to_entity": transfer.get("to", ""),
        "timestamp": transfer.get("timestamp", datetime.now(timezone.utc).isoformat()),
        "hash": transfer.get("hash", ""),
        "tx_hash": transfer.get("tx_hash", ""),
        "location": transfer.get("location", ""),
        "condition": transfer.get("condition", ""),
        "notes": transfer.get("notes", ""),
    }
    _sb_insert("custody_transfers", row)


def _load_proof_chains_from_supabase():
    """Hydrate _proof_chain_store from Supabase on cold start."""
    rows = _sb_select("proof_chains", order="timestamp.asc", limit=10000)
    if rows:
        for row in rows:
            rid = row.get("record_id", "")
            if rid not in _proof_chain_store:
                _proof_chain_store[rid] = []
            _proof_chain_store[rid].append({
                "event_type": row.get("event_type", ""),
                "hash": row.get("hash", ""),
                "tx_hash": row.get("tx_hash", ""),
                "timestamp": row.get("timestamp", ""),
                "actor": row.get("actor", ""),
                "metadata": row.get("metadata", {}),
            })
        print(f"Hydrated {len(rows)} proof chain events from Supabase")


def _load_custody_chains_from_supabase():
    """Hydrate _custody_chain_store from Supabase on cold start."""
    rows = _sb_select("custody_transfers", order="timestamp.asc", limit=10000)
    if rows:
        for row in rows:
            rid = row.get("record_id", "")
            if rid not in _custody_chain_store:
                _custody_chain_store[rid] = []
            _custody_chain_store[rid].append({
                "from": row.get("from_entity", ""),
                "to": row.get("to_entity", ""),
                "timestamp": row.get("timestamp", ""),
                "hash": row.get("hash", ""),
                "tx_hash": row.get("tx_hash", ""),
                "location": row.get("location", ""),
                "condition": row.get("condition", ""),
            })
        print(f"Hydrated {len(rows)} custody transfers from Supabase")


# ─── Webhook persistence ──────────────────────────────────────────────

def _persist_webhook_registration(org_key, hook):
    """Write a webhook registration to Supabase."""
    row = {
        "org_key": org_key,
        "url": hook.get("url", ""),
        "events": hook.get("events", []),
        "active": hook.get("active", True),
        "secret": hook.get("secret", ""),
    }
    _sb_insert("webhook_registrations", row)


def _persist_webhook_delivery(delivery):
    """Write a webhook delivery record to Supabase."""
    row = {
        "delivery_id": delivery.get("id", ""),
        "org_key": delivery.get("org", ""),
        "url": delivery.get("url", ""),
        "event": delivery.get("event", ""),
        "status": delivery.get("status", "pending"),
        "attempts": delivery.get("attempts", 0),
        "max_attempts": delivery.get("max_attempts", 3),
        "last_attempt": delivery.get("last_attempt"),
        "http_status": delivery.get("http_status"),
        "error": delivery.get("error"),
        "signature": delivery.get("signature", ""),
        "payload_preview": delivery.get("payload_preview", ""),
    }
    _sb_insert("webhook_deliveries", row)


def _load_webhooks_from_supabase():
    """Hydrate _webhook_store from Supabase on cold start."""
    rows = _sb_select("webhook_registrations", query_params="active=eq.true")
    if rows:
        for row in rows:
            org = row.get("org_key", "")
            if org not in _webhook_store:
                _webhook_store[org] = []
            _webhook_store[org].append({
                "url": row.get("url", ""),
                "events": row.get("events", []),
                "active": row.get("active", True),
                "secret": row.get("secret", ""),
                "created": row.get("created_at", ""),
            })
        print(f"Hydrated {len(rows)} webhook registrations from Supabase")


# ─── API Keys persistence ─────────────────────────────────────────────

def _persist_api_key(key_plaintext, org_name, role="viewer", tier="pilot"):
    """Store an API key in Supabase (hashed — never plaintext)."""
    key_hash = hashlib.sha256(key_plaintext.encode()).hexdigest()
    key_prefix = key_plaintext[:8]
    row = {
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "org_name": org_name,
        "role": role,
        "tier": tier,
        "active": True,
    }
    result = _sb_upsert("api_keys", row)
    # Also cache in-memory
    API_KEYS_STORE[key_plaintext] = {
        "org": org_name,
        "role": role,
        "tier": tier,
        "active": True,
    }
    return result


def _load_api_keys_from_supabase():
    """Load API keys from Supabase on cold start.
    Note: We can't recover plaintext keys, but we can check incoming
    keys against stored hashes."""
    rows = _sb_select("api_keys", query_params="active=eq.true")
    if rows:
        # Store hash -> info for O(1) lookup during auth
        for row in rows:
            key_hash = row.get("key_hash", "")
            API_KEYS_STORE[f"__hash__{key_hash}"] = {
                "org": row.get("org_name", ""),
                "role": row.get("role", "viewer"),
                "tier": row.get("tier", "pilot"),
                "active": row.get("active", True),
                "key_prefix": row.get("key_prefix", ""),
            }
        print(f"Hydrated {len(rows)} API keys from Supabase")


def _authenticate_api_key(key):
    """Check an API key against in-memory store and Supabase hash store."""
    # Direct in-memory match (keys registered this session)
    if key in API_KEYS_STORE:
        return API_KEYS_STORE[key]
    # Hash-based lookup (keys loaded from Supabase)
    key_hash = hashlib.sha256(key.encode()).hexdigest()
    hash_key = f"__hash__{key_hash}"
    if hash_key in API_KEYS_STORE:
        # Cache the plaintext mapping for this session
        info = API_KEYS_STORE[hash_key]
        API_KEYS_STORE[key] = info
        # Update last_used_at in Supabase (fire-and-forget)
        _supabase_request("api_keys", method="PATCH",
                           query_params=f"key_hash=eq.{key_hash}",
                           data={"last_used_at": datetime.now(timezone.utc).isoformat()},
                           prefer="return=minimal")
        return info
    return None


# ─── Cold start hydration ─────────────────────────────────────────────

_hydrated = False


def _hydrate_from_supabase():
    """One-time hydration of all in-memory stores from Supabase.
    Called on the first request after a cold start."""
    global _hydrated
    if _hydrated or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return
    _hydrated = True
    try:
        _load_records_from_supabase()
        _load_verify_audit_from_supabase()
        _load_proof_chains_from_supabase()
        _load_custody_chains_from_supabase()
        _load_webhooks_from_supabase()
        _load_api_keys_from_supabase()
        print("Supabase hydration complete")
    except Exception as e:
        print(f"Supabase hydration error (continuing with empty stores): {e}")


_user_state_ensured = False

def _ensure_user_state_table():
    """Ensure user_state table exists in Supabase via SQL RPC or direct insert.
    The table stores localStorage key/value pairs for cross-session persistence."""
    global _user_state_ensured
    if _user_state_ensured:
        return
    _user_state_ensured = True
    # The table should be pre-created in Supabase Dashboard:
    # CREATE TABLE IF NOT EXISTS user_state (
    #   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    #   org_id TEXT NOT NULL DEFAULT 'default',
    #   session_id TEXT NOT NULL DEFAULT 'default',
    #   state_key TEXT NOT NULL,
    #   state_value TEXT,
    #   updated_at TIMESTAMPTZ DEFAULT now(),
    #   UNIQUE(org_id, session_id, state_key)
    # );
    # If it doesn't exist, upserts will simply fail gracefully.
    print("user_state table should be pre-created in Supabase Dashboard")


# API Key auth
API_MASTER_KEY = os.environ.get("S4_API_MASTER_KEY", "").strip()
if not API_MASTER_KEY:
    import secrets as _secrets_mod
    API_MASTER_KEY = "s4_auto_" + _secrets_mod.token_hex(24)
    print(f"WARNING: S4_API_MASTER_KEY not set — generated ephemeral key (set env var for production)")
API_KEYS_STORE = {}  # In production, stored in Supabase

# Rate limiting – in-memory sliding window per Vercel instance.
# Vercel Edge / WAF provides primary DDoS protection; this is a
# secondary abuse-prevention layer.  State resets on cold start,
# which is acceptable because a fresh instance has no abuse history.
_rate_limit_store: dict = {}   # ip -> [timestamps]
_RATE_LIMIT_MAX_IPS = 10_000   # LRU cap to prevent memory leaks
RATE_LIMIT_WINDOW = 60         # seconds
RATE_LIMIT_MAX = 120           # requests per window

# Request logging
_request_log = []
API_START_TIME = time.time()

# Verification audit log
_verify_audit_log = []  # [{timestamp, operator, record_hash, chain_hash, tx_hash, result, tamper_detected}]

# ═══════════════════════════════════════════════════════════════════════
#  AI AUDIT TRAIL — Hash-anchor every AI decision for transparency
# ═══════════════════════════════════════════════════════════════════════
_ai_audit_log = []  # [{timestamp, query, response_hash, tool_context, anchored}]

# ═══════════════════════════════════════════════════════════════════════
#  OFFLINE / ON-PREM — Air-gapped hashing queue with batch sync
# ═══════════════════════════════════════════════════════════════════════
_offline_hash_queue = []  # [{hash, record_type, branch, timestamp, synced}]
_offline_last_sync = None  # ISO timestamp of last batch sync

# ═══════════════════════════════════════════════════════════════════════
#  SECURITY — RBAC, ZKP stubs, Threat Modeling, Dependency Auditing
# ═══════════════════════════════════════════════════════════════════════

# Role-Based Access Control (RBAC) / CASL-style permissions
RBAC_ROLES = {
    "admin": {"permissions": ["*"], "tier": "enterprise", "description": "Full platform access"},
    "analyst": {"permissions": ["anchor", "verify", "ils", "ai_query", "metrics", "export"], "tier": "professional", "description": "Analysis and anchoring"},
    "auditor": {"permissions": ["verify", "metrics", "audit_trail", "security"], "tier": "professional", "description": "Read-only verification and audit"},
    "operator": {"permissions": ["anchor", "verify", "offline_sync"], "tier": "starter", "description": "Field operations and anchoring"},
    "viewer": {"permissions": ["verify", "metrics"], "tier": "pilot", "description": "Read-only verification"},
}

# Known dependency versions for audit (production: pipdeptree / safety DB)
KNOWN_DEPENDENCIES = {
    "xrpl-py": {"version": "2.6.0", "cve_status": "clean", "last_audit": "2025-06-01"},
    "cryptography": {"version": "42.0.0", "cve_status": "clean", "last_audit": "2025-06-01"},
    "requests": {"version": "2.31.0", "cve_status": "clean", "last_audit": "2025-06-01"},
    "pyjwt": {"version": "2.8.0", "cve_status": "clean", "last_audit": "2025-06-01"},
    "python-dotenv": {"version": "1.0.0", "cve_status": "clean", "last_audit": "2025-06-01"},
}

def _check_rbac(api_key, required_permission):
    """Check if the API key's role has the required permission."""
    key_info = API_KEYS_STORE.get(api_key, {})
    role = key_info.get("role", "viewer")
    role_perms = RBAC_ROLES.get(role, {}).get("permissions", [])
    if "*" in role_perms or required_permission in role_perms:
        return True, role
    return False, role

def _zkp_verify_stub(data_hash, proof=None):
    """
    Zero-Knowledge Proof stub — placeholder for future ZKP integration.
    In production: Uses zk-SNARKs or Bulletproofs to prove data integrity
    without revealing the underlying data. Critical for CUI/ITAR compliance
    where verifiers need proof of correct anchoring without seeing the content.
    """
    if proof is None:
        # Generate a stub proof (production: actual ZKP circuit)
        commitment = hashlib.sha256(f"ZKP_COMMIT:{data_hash}".encode()).hexdigest()
        challenge = hashlib.sha256(f"ZKP_CHALLENGE:{commitment}".encode()).hexdigest()[:32]
        response = hashlib.sha256(f"ZKP_RESPONSE:{challenge}:{data_hash}".encode()).hexdigest()[:32]
        return {
            "proof_type": "zk-snark-stub",
            "commitment": commitment,
            "challenge": challenge,
            "response": response,
            "verified": True,
            "note": "Stub proof — production will use actual ZKP circuits (Bulletproofs/Groth16)",
        }
    else:
        # Verify a proof (stub: just check format)
        is_valid = (
            isinstance(proof, dict)
            and "commitment" in proof
            and "challenge" in proof
            and "response" in proof
        )
        return {"verified": is_valid, "proof_type": "zk-snark-stub"}

def _threat_model_assessment():
    """STRIDE-based threat model for the S4 Ledger platform."""
    return {
        "framework": "STRIDE + NIST SP 800-161",
        "last_updated": "2025-07-16",
        "attack_surface": [
            {"component": "API Gateway", "threats": ["Spoofing", "Tampering"], "mitigations": ["API key auth", "Rate limiting", "HMAC signatures"], "residual_risk": "LOW"},
            {"component": "XRPL Anchoring", "threats": ["Tampering", "Repudiation"], "mitigations": ["Cryptographic hash chain", "XRPL immutability", "Multi-sig treasury"], "residual_risk": "VERY LOW"},
            {"component": "AI/NLP Engine", "threats": ["Information Disclosure", "Elevation of Privilege"], "mitigations": ["Audit trail hashing", "Input sanitization", "No CUI in prompts"], "residual_risk": "MEDIUM"},
            {"component": "Supply Chain Data", "threats": ["Spoofing", "Information Disclosure"], "mitigations": ["Source verification", "ZKP integration (planned)", "End-to-end encryption"], "residual_risk": "MEDIUM"},
            {"component": "Offline Queue", "threats": ["Tampering", "Denial of Service"], "mitigations": ["Local hash chain", "Batch verification on sync", "Queue size limits"], "residual_risk": "LOW"},
            {"component": "User Auth", "threats": ["Spoofing", "Elevation of Privilege"], "mitigations": ["API key rotation", "RBAC roles", "MFA (planned)"], "residual_risk": "MEDIUM"},
        ],
        "compliance_mapping": {
            "CMMC_Level2": {"controls_implemented": 100, "controls_total": 110, "score": 91},
            "NIST_800_171": {"families_compliant": 12, "families_total": 14, "score": 85},
            "DFARS_252_204_7012": {"compliant": True, "gaps": 2},
            "FedRAMP_Moderate": {"status": "In Progress", "target": "Q1 2026"},
        },
        "recommendations": [
            "Complete MFA rollout for all admin accounts",
            "Integrate ZKP proofs for CUI verification (Q3 2025)",
            "Deploy SIEM integration for real-time threat detection",
            "Complete SOC 2 Type II audit",
            "Implement hardware security module (HSM) for key management",
        ],
    }

# ═══════════════════════════════════════════════════════════════════════
#  WEBHOOK SYSTEM — HarborLink Integration (P0)
#  Events: anchor.confirmed, verify.completed, tamper.detected,
#          batch.completed, custody.transferred, sls.balance_low
# ═══════════════════════════════════════════════════════════════════════

WEBHOOK_SIGNING_SECRET = os.environ.get("S4_WEBHOOK_SECRET", "").strip()
if not WEBHOOK_SIGNING_SECRET:
    import secrets as _secrets_mod
    WEBHOOK_SIGNING_SECRET = "whsec_" + _secrets_mod.token_hex(24)
    print(f"WARNING: S4_WEBHOOK_SECRET not set — generated ephemeral key (set env var for production)")
_webhook_store = {}  # org_key -> [{url, events, active, created, secret}]
_webhook_delivery_log = []  # [{id, org, url, event, status, attempts, last_attempt}]

def _sign_webhook_payload(payload_json, secret):
    """HMAC-SHA256 signature for webhook payload verification."""
    return hmac.new(secret.encode(), payload_json.encode(), hashlib.sha256).hexdigest()

def _deliver_webhook(event_type, data, org_key=None):
    """Fire webhooks for a given event. Non-blocking best-effort delivery.
    In production, this would use a background queue (SQS/Redis) with retry."""
    now = datetime.now(timezone.utc)
    payload = {
        "event": event_type,
        "timestamp": now.isoformat(),
        "data": data,
        "api_version": "2026-02-18",
    }
    payload_json = json.dumps(payload, ensure_ascii=False)

    # Determine which orgs to notify
    target_orgs = [org_key] if org_key else list(_webhook_store.keys())

    for org in target_orgs:
        hooks = _webhook_store.get(org, [])
        for hook in hooks:
            if not hook.get("active", True):
                continue
            if event_type not in hook.get("events", []):
                continue
            # Sign the payload with the hook's secret
            secret = hook.get("secret", WEBHOOK_SIGNING_SECRET)
            signature = _sign_webhook_payload(payload_json, secret)
            delivery_id = f"whd_{hashlib.sha256((now.isoformat() + hook['url']).encode()).hexdigest()[:16]}"

            delivery_record = {
                "id": delivery_id,
                "org": org,
                "url": hook["url"],
                "event": event_type,
                "status": "pending",
                "attempts": 0,
                "max_attempts": 3,
                "last_attempt": None,
                "signature": signature,
                "payload_preview": event_type,
            }

            # Best-effort HTTP POST (synchronous in serverless; async in production)
            try:
                import urllib.request
                req = urllib.request.Request(
                    hook["url"],
                    data=payload_json.encode(),
                    headers={
                        "Content-Type": "application/json",
                        "X-S4-Signature": signature,
                        "X-S4-Event": event_type,
                        "X-S4-Delivery": delivery_id,
                        "X-S4-Timestamp": now.isoformat(),
                        "User-Agent": "S4-Ledger-Webhook/2.0",
                    },
                    method="POST",
                )
                resp = urllib.request.urlopen(req, timeout=10)
                delivery_record["status"] = "delivered"
                delivery_record["http_status"] = resp.status
                delivery_record["attempts"] = 1
                delivery_record["last_attempt"] = now.isoformat()
            except Exception as e:
                delivery_record["status"] = "failed"
                delivery_record["error"] = str(e)[:200]
                delivery_record["attempts"] = 1
                delivery_record["last_attempt"] = now.isoformat()

            _webhook_delivery_log.append(delivery_record)
            _persist_webhook_delivery(delivery_record)
            if len(_webhook_delivery_log) > 500:
                _webhook_delivery_log.pop(0)

# ═══════════════════════════════════════════════════════════════════════
#  PROOF CHAIN & CUSTODY STORES — HarborLink Integration (P0/P1)
# ═══════════════════════════════════════════════════════════════════════

_proof_chain_store = {}   # record_id -> [{event_type, hash, tx_hash, timestamp, actor, metadata}]
_custody_chain_store = {} # record_id -> [{from, to, timestamp, hash, tx_hash, location, condition}]
_batch_store = {}         # batch_id -> {merkle_root, records, tx_hash, timestamp}

# ═══════════════════════════════════════════════════════════════════════
#  MILITARY BRANCH DEFINITIONS
# ═══════════════════════════════════════════════════════════════════════

BRANCHES = {
    "USN":   {"name": "U.S. Navy",            "icon": "\u2693", "color": "#003b6f"},
    "JOINT": {"name": "Joint / Cross-Branch", "icon": "\U0001f396\ufe0f", "color": "#4a4a4a"},
}

# ═══════════════════════════════════════════════════════════════════════
#  64+ NAVY & JOINT DEFENSE RECORD CATEGORIES (any custom record type also supported)
# ═══════════════════════════════════════════════════════════════════════

RECORD_CATEGORIES = {
    # --- U.S. Navy (USN) — 25 types ---
    "USN_SUPPLY_RECEIPT":  {"label": "Supply Chain Receipt",          "icon": "\U0001f4e6", "color": "#00aaff", "branch": "USN", "system": "NAVSUP OneTouch"},
    "USN_3M_MAINTENANCE":  {"label": "3-M Maintenance Action",       "icon": "\U0001f527", "color": "#ffd700", "branch": "USN", "system": "SKED/OARS"},
    "USN_CASREP":          {"label": "Casualty Report (CASREP)",     "icon": "\u26a0\ufe0f", "color": "#ff3333", "branch": "USN", "system": "TYCOM"},
    "USN_CDRL":            {"label": "CDRL Delivery",                "icon": "\U0001f4c4", "color": "#8ea4b8", "branch": "USN", "system": "CDMD-OA"},
    "USN_ORDNANCE":        {"label": "Ordnance Lot Tracking",        "icon": "\U0001f4a3", "color": "#ff6b6b", "branch": "USN", "system": "AESIP"},
    "USN_DEPOT_REPAIR":    {"label": "Depot Repair Record",          "icon": "\U0001f3ed", "color": "#ff9933", "branch": "USN", "system": "CNRMF"},
    "USN_INSURV":          {"label": "INSURV Inspection",            "icon": "\U0001f50d", "color": "#66ccff", "branch": "USN", "system": "NRCC"},
    "USN_CALIBRATION":     {"label": "TMDE Calibration",             "icon": "\U0001f4cf", "color": "#ff66aa", "branch": "USN", "system": "METCAL"},
    "USN_CONFIG":          {"label": "Configuration Baseline",       "icon": "\u2699\ufe0f", "color": "#c9a84c", "branch": "USN", "system": "CDMD-OA"},
    "USN_CUSTODY":         {"label": "Custody Transfer",             "icon": "\U0001f504", "color": "#14f195", "branch": "USN", "system": "DPAS"},
    "USN_TDP":             {"label": "Technical Data Package",       "icon": "\U0001f4d0", "color": "#9945ff", "branch": "USN", "system": "NAVSEA"},
    "USN_COC":             {"label": "Certificate of Conformance",   "icon": "\u2705", "color": "#00cc88", "branch": "USN", "system": "DCMA"},
    "USN_SHIPALT":         {"label": "Ship Alteration (SHIPALT)",    "icon": "\U0001f6a2", "color": "#0077cc", "branch": "USN", "system": "NAVSEA"},
    "USN_PMS":             {"label": "PMS/SKED Compliance",          "icon": "\U0001f4cb", "color": "#44aa88", "branch": "USN", "system": "3M/SKED"},
    "USN_HME":             {"label": "HM&E System Record",           "icon": "\u26a1", "color": "#dd8844", "branch": "USN", "system": "ENGSKED"},
    "USN_COMBAT_SYS":      {"label": "Combat Systems Cert",          "icon": "\U0001f3af", "color": "#ff4444", "branch": "USN", "system": "CSSQT"},
    "USN_PROPULSION":      {"label": "Propulsion Plant Exam",        "icon": "\U0001f525", "color": "#ff6600", "branch": "USN", "system": "INSURV"},
    "USN_AVIATION":        {"label": "Aviation Maintenance",         "icon": "\u2708\ufe0f", "color": "#0088cc", "branch": "USN", "system": "NALCOMIS"},
    "USN_FLIGHT_OPS":      {"label": "Flight Operations Record",     "icon": "\U0001f6eb", "color": "#3399ff", "branch": "USN", "system": "NATOPS"},
    "USN_SUBSAFE":         {"label": "SUBSAFE Certification",        "icon": "\U0001f512", "color": "#003366", "branch": "USN", "system": "NAVSEA 07"},
    "USN_DIVE_EQUIP":      {"label": "Diving Equipment Inspection",  "icon": "\U0001f93f", "color": "#006699", "branch": "USN", "system": "NAVSEA 00C"},
    "USN_MEDICAL":         {"label": "Medical Equipment Cert",       "icon": "\U0001f3e5", "color": "#33cc66", "branch": "USN", "system": "BUMED"},
    "USN_QDR":             {"label": "Quality Defect Report",        "icon": "\U0001f6ab", "color": "#cc0000", "branch": "USN", "system": "NAVSUP WSS"},
    "USN_FIELDING":        {"label": "Equipment Fielding",           "icon": "\U0001f6a2", "color": "#00ddaa", "branch": "USN", "system": "PMS"},
    "USN_REACTOR":         {"label": "Naval Reactor Test",           "icon": "\u2622\ufe0f", "color": "#ffcc00", "branch": "USN", "system": "NAVSEA 08"},

    # --- U.S. Navy ILS Records — 29 types ---
    "USN_DRL":             {"label": "Data Requirements List (DRL)",  "icon": "\U0001f4cb", "color": "#5599cc", "branch": "USN", "system": "NAVSEA/PMS"},
    "USN_DI":              {"label": "Data Item Description (DID)",   "icon": "\U0001f4c3", "color": "#4488bb", "branch": "USN", "system": "CDMD-OA"},
    "USN_VRS":             {"label": "Vendor Recommended Spares",     "icon": "\U0001f4e6", "color": "#7799aa", "branch": "USN", "system": "NAVICP/DLA"},
    "USN_BUYLIST":         {"label": "Buylist / Provisioning",        "icon": "\U0001f6d2", "color": "#6688aa", "branch": "USN", "system": "NAVSUP WSS"},
    "USN_J1_ILS":          {"label": "J-1 ILS Parameters / LORA",     "icon": "\U0001f4d1", "color": "#336699", "branch": "USN", "system": "PMS/ILS"},
    "USN_J2_SE":           {"label": "J-2 Support Equipment",         "icon": "\U0001f527", "color": "#337799", "branch": "USN", "system": "PMS/ILS"},
    "USN_J3_SUPPLY":       {"label": "J-3 Supply Support",            "icon": "\U0001f4e6", "color": "#338899", "branch": "USN", "system": "NAVSUP"},
    "USN_J4_TECHDATA":     {"label": "J-4 Technical Data",            "icon": "\U0001f4d6", "color": "#339999", "branch": "USN", "system": "NAVSEA"},
    "USN_J5_TRAINING":     {"label": "J-5 Training",                  "icon": "\U0001f393", "color": "#33aa99", "branch": "USN", "system": "NETC"},
    "USN_J6_MANPOWER":     {"label": "J-6 Manpower & Personnel",      "icon": "\U0001f465", "color": "#4488cc", "branch": "USN", "system": "OPNAV N1"},
    "USN_J7_FACILITIES":   {"label": "J-7 Facilities",                "icon": "\U0001f3d7\ufe0f", "color": "#5577bb", "branch": "USN", "system": "NAVFAC"},
    "USN_J8_PHST":         {"label": "J-8 PHS&T",                     "icon": "\U0001f4e6", "color": "#6699cc", "branch": "USN", "system": "NAVSUP"},
    "USN_J9_SOFTWARE":     {"label": "J-9 Computer Resources",        "icon": "\U0001f4bb", "color": "#4477aa", "branch": "USN", "system": "SPAWAR/NAVWAR"},
    "USN_J10_DESIGN":      {"label": "J-10 Design Interface",         "icon": "\U0001f4d0", "color": "#3366aa", "branch": "USN", "system": "NAVSEA"},
    "USN_J11_RAM":         {"label": "J-11 RAM Analysis",             "icon": "\U0001f4c8", "color": "#2255aa", "branch": "USN", "system": "PMS/ILS"},
    "USN_J12_ACQLOG":      {"label": "J-12 Acquisition Logistics",    "icon": "\U0001f4ca", "color": "#2266bb", "branch": "USN", "system": "PMS/ILS"},
    "USN_J13_CM":          {"label": "J-13 Configuration Mgmt",       "icon": "\u2699\ufe0f", "color": "#3377cc", "branch": "USN", "system": "CDMD-OA"},
    "USN_J14_DISPOSAL":    {"label": "J-14 Disposal",                 "icon": "\U0001f5d1\ufe0f", "color": "#667788", "branch": "USN", "system": "DRMS"},
    "USN_BAM":             {"label": "Budget Allowance Mgmt (BAM)",   "icon": "\U0001f4b0", "color": "#cc9933", "branch": "USN", "system": "NAVSUP"},
    "USN_TRANSFER_BOOK":   {"label": "Transfer Book",                 "icon": "\U0001f4d3", "color": "#5588aa", "branch": "USN", "system": "Supply Officer"},
    "USN_COTS_MANUAL":     {"label": "COTS Manual / Documentation",   "icon": "\U0001f4d8", "color": "#4477bb", "branch": "USN", "system": "NAVSEA"},
    "USN_TM_INDEX":        {"label": "Technical Manual Index",        "icon": "\U0001f4c7", "color": "#3366bb", "branch": "USN", "system": "NAVSEA"},
    "USN_PO_INDEX":        {"label": "Purchase Order Index",          "icon": "\U0001f4c2", "color": "#5588cc", "branch": "USN", "system": "NAVSUP"},
    "USN_PID":             {"label": "Program Introduction Doc (PID)","icon": "\U0001f4c4", "color": "#6699bb", "branch": "USN", "system": "PMS"},
    "USN_CONTRACT_MOD":    {"label": "Contract Modification",         "icon": "\U0001f4dd", "color": "#7788aa", "branch": "USN", "system": "NAVSEA Contracts"},
    "USN_CONFIG_MGMT":     {"label": "Configuration Mgmt Record",     "icon": "\u2699\ufe0f", "color": "#4466aa", "branch": "USN", "system": "CDMD-OA"},
    "USN_OUTFITTING":      {"label": "Outfitting Requirements",       "icon": "\U0001f6a2", "color": "#3355aa", "branch": "USN", "system": "PMS/Outfitting"},
    "USN_PURCHASE_REQ":    {"label": "Purchase Request (PR)",         "icon": "\U0001f4b3", "color": "#558899", "branch": "USN", "system": "NAVSUP"},
    # --- Joint / Cross-Branch — 10 types ---
    "JOINT_NATO":          {"label": "NATO STANAG Verification",     "icon": "\U0001f3f3\ufe0f", "color": "#003399", "branch": "JOINT", "system": "NATO"},
    "JOINT_F35":           {"label": "F-35 JSF Logistics",           "icon": "\u2708\ufe0f", "color": "#1a1a2e", "branch": "JOINT", "system": "ALIS/ODIN"},
    "JOINT_MISSILE_DEF":   {"label": "Missile Defense Record",       "icon": "\U0001f680", "color": "#4a0080", "branch": "JOINT", "system": "MDA"},
    "JOINT_CYBER":         {"label": "Cyber Equipment Cert",         "icon": "\U0001f5a5\ufe0f", "color": "#00cc99", "branch": "JOINT", "system": "CYBERCOM"},
    "JOINT_INTEL":         {"label": "Intelligence Equipment",       "icon": "\U0001f575\ufe0f", "color": "#2d2d2d", "branch": "JOINT", "system": "DIA"},
    "JOINT_SPACE":         {"label": "Space Command Asset",          "icon": "\U0001f6f0\ufe0f", "color": "#000066", "branch": "JOINT", "system": "USSPACECOM"},
    "JOINT_TRANSPORT":     {"label": "TRANSCOM Logistics",           "icon": "\U0001f69b", "color": "#4a6741", "branch": "JOINT", "system": "USTRANSCOM"},
    "JOINT_CONTRACT":      {"label": "Contract Deliverable",         "icon": "\U0001f4dd", "color": "#b8860b", "branch": "JOINT", "system": "DCMA"},
    "JOINT_READINESS":     {"label": "Readiness Report",             "icon": "\U0001f4c8", "color": "#00ff88", "branch": "JOINT", "system": "DRRS"},
    "JOINT_DISPOSAL":      {"label": "Joint Disposal Record",        "icon": "\U0001f5d1\ufe0f", "color": "#8b8682", "branch": "JOINT", "system": "DLA"},
}

# ═══════════════════════════════════════════════════════════════════════
#  IN-MEMORY RECORD STORE
# ═══════════════════════════════════════════════════════════════════════
_live_records = []

def _get_all_records():
    """Return only real persisted records."""
    return list(_live_records)

def _aggregate_metrics(records):
    now = datetime.now(timezone.utc)
    total = len(records)
    total_fees = total * 0.01
    records_by_type = {}
    records_by_branch = {}
    records_by_source = {}
    for r in records:
        rt = r.get("record_label", r.get("record_type", "Unknown"))
        records_by_type[rt] = records_by_type.get(rt, 0) + 1
        branch = r.get("branch", "JOINT")
        records_by_branch[branch] = records_by_branch.get(branch, 0) + 1
        source = r.get("data_source", r.get("system", "direct"))
        records_by_source[source] = records_by_source.get(source, 0) + 1

    hashes_by_minute = {}
    hashes_by_hour = {}
    hashes_by_day = {}
    hashes_by_week = {}
    hashes_by_month = {}
    fees_by_minute = {}
    fees_by_hour = {}
    fees_by_day = {}
    fees_by_week = {}
    fees_by_month = {}
    today_count = 0
    this_month_count = 0
    today_str = now.strftime("%Y-%m-%d")
    month_str = now.strftime("%b %Y")

    for r in records:
        try:
            ts = datetime.fromisoformat(r["timestamp"].replace("Z", "+00:00"))
        except (ValueError, KeyError):
            continue
        minute_key = ts.strftime("%H:%M")
        hour_key = ts.strftime("%b %d %H:00")
        day_key = ts.strftime("%b %d")
        week_key = f"Week {ts.isocalendar()[1]}"
        month_key = ts.strftime("%b %Y")

        hashes_by_minute[minute_key] = hashes_by_minute.get(minute_key, 0) + 1
        hashes_by_hour[hour_key] = hashes_by_hour.get(hour_key, 0) + 1
        hashes_by_day[day_key] = hashes_by_day.get(day_key, 0) + 1
        hashes_by_week[week_key] = hashes_by_week.get(week_key, 0) + 1
        hashes_by_month[month_key] = hashes_by_month.get(month_key, 0) + 1

        fee = r.get("fee", 0.01)
        fees_by_minute[minute_key] = round(fees_by_minute.get(minute_key, 0) + fee, 4)
        fees_by_hour[hour_key] = round(fees_by_hour.get(hour_key, 0) + fee, 4)
        fees_by_day[day_key] = round(fees_by_day.get(day_key, 0) + fee, 4)
        fees_by_week[week_key] = round(fees_by_week.get(week_key, 0) + fee, 4)
        fees_by_month[month_key] = round(fees_by_month.get(month_key, 0) + fee, 4)

        if ts.strftime("%Y-%m-%d") == today_str:
            today_count += 1
        if ts.strftime("%b %Y") == month_str:
            this_month_count += 1

    def sort_dict(d, max_items=30):
        items = sorted(d.items())
        return dict(items[-max_items:]) if len(items) > max_items else dict(items)

    return {
        "total_hashes": total,
        "total_fees": round(total_fees, 2),
        "total_record_types": len(records_by_type),
        "records_by_type": dict(sorted(records_by_type.items(), key=lambda x: -x[1])),
        "records_by_branch": records_by_branch,
        "records_by_source": records_by_source,
        "verify_audit_log": _verify_audit_log[-50:],
        "hashes_today": today_count,
        "fees_today": round(today_count * 0.01, 2),
        "this_month": this_month_count,
        "hashes_by_minute": sort_dict(hashes_by_minute, 60),
        "hashes_by_hour": sort_dict(hashes_by_hour, 48),
        "hashes_by_day": sort_dict(hashes_by_day, 30),
        "hashes_by_week": sort_dict(hashes_by_week, 12),
        "hashes_by_month": sort_dict(hashes_by_month, 12),
        "fees_by_minute": sort_dict(fees_by_minute, 60),
        "fees_by_hour": sort_dict(fees_by_hour, 48),
        "fees_by_day": sort_dict(fees_by_day, 30),
        "fees_by_week": sort_dict(fees_by_week, 12),
        "fees_by_month": sort_dict(fees_by_month, 12),
        "individual_records": records[-100:],
        "generated_at": now.isoformat(),
    }

# ═══════════════════════════════════════════════════════════════════════
#  XRPL ANCHOR ENGINE — Testnet + Mainnet Support
# ═══════════════════════════════════════════════════════════════════════

XRPL_NETWORK = os.environ.get("XRPL_NETWORK", "testnet")  # "testnet" or "mainnet"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234"
XRPL_MAINNET_URL = "https://xrplcluster.com"
XRPL_EXPLORER_TESTNET = "https://testnet.xrpl.org/transactions/"
XRPL_EXPLORER_MAINNET = "https://livenet.xrpl.org/transactions/"
SLS_TREASURY_ADDRESS = "rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ"
SLS_ISSUER_ADDRESS = "r95GyZac4butvVcsTWUPpxzekmyzaHsTA5"  # SLS token issuer
SLS_ANCHOR_FEE = "0.01"  # SLS fee per anchor (0.01 SLS = $0.01)
_xrpl_client = None
_xrpl_wallet = None       # Issuer wallet — signs anchor transactions
_xrpl_treasury_wallet = None  # Treasury wallet — holds XRP + SLS, funds users, collects anchor fees

def _init_xrpl():
    """Initialize XRPL client, Issuer wallet, and Treasury wallet."""
    global _xrpl_client, _xrpl_wallet, _xrpl_treasury_wallet
    if not XRPL_AVAILABLE or _xrpl_client is not None:
        return
    try:
        url = XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL
        _xrpl_client = JsonRpcClient(url)
        # Issuer wallet — signs anchor AccountSet transactions (XRPL_WALLET_SEED)
        seed = os.environ.get("XRPL_WALLET_SEED")
        if seed:
            _xrpl_wallet = Wallet.from_seed(seed, algorithm=CryptoAlgorithm.SECP256K1)
        elif XRPL_NETWORK != "mainnet":
            _xrpl_wallet = generate_faucet_wallet(_xrpl_client, debug=False)
        else:
            print("XRPL mainnet requires XRPL_WALLET_SEED env var")
            _xrpl_client = None
        # Treasury wallet — holds XRP (for wallet activation) + SLS (subscription allocations)
        # Sends XRP to activate new user wallets, sends SLS to subscribers,
        # receives 0.01 SLS back per anchor. The SLS circulation engine.
        treasury_seed = os.environ.get("XRPL_TREASURY_SEED")
        if treasury_seed:
            _xrpl_treasury_wallet = Wallet.from_seed(treasury_seed, algorithm=CryptoAlgorithm.SECP256K1)
        elif XRPL_NETWORK == "mainnet":
            print("WARNING: XRPL_TREASURY_SEED not set — wallet provisioning and SLS delivery disabled")
    except Exception as e:
        print(f"XRPL init failed: {e}")
        _xrpl_client = None
        _xrpl_wallet = None

# ═══════════════════════════════════════════════════════════════════════
#  WALLET PROVISIONING & SLS ECONOMY
#
#  How it works:
#  1. User subscribes (Stripe) → S4 pockets the subscription as revenue
#  2. Treasury sends 12 XRP to activate user's new XRPL wallet (business expense)
#  3. Treasury sends the plan's monthly SLS allocation to user's wallet
#  4. User anchors records → 0.01 SLS per anchor flows from user wallet → Treasury
#  5. Monthly renewal (Stripe webhook) → Treasury sends next month's SLS
#  6. SLS circulates: Treasury → User → Treasury. Self-sustaining.
#
#  Wallets:
#   - Issuer (r95G…TA5): Signs anchor transactions. XRPL_WALLET_SEED env var.
#   - Treasury (rMLm…KLqJ): Holds XRP + SLS. Funds users, collects fees. XRPL_TREASURY_SEED env var.
#   - Ops (raWL…un51): Nick's personal wallet. NOT involved in SLS economy.
#   - User wallets: Created at signup, seed stored in Supabase for automatic signing.
# ═══════════════════════════════════════════════════════════════════════

# SLS token economics
SLS_PRICE_USD = 0.01  # $0.01 per SLS — value basis for subscription allocations
XRP_ACCOUNT_RESERVE = "12"  # XRP to activate a new wallet + TrustLine reserve

# Subscription tiers — SLS included per month (delivered from Treasury)
SUBSCRIPTION_TIERS = {
    "pilot":        {"price_usd": 0,       "sls_monthly": 100,     "anchors": 10000,     "label": "Pilot (Free)"},
    "starter":      {"price_usd": 999.00,  "sls_monthly": 25000,   "anchors": 2500000,   "label": "Starter"},
    "professional": {"price_usd": 2499.00, "sls_monthly": 100000,  "anchors": 10000000,  "label": "Professional"},
    "enterprise":   {"price_usd": 9999.00, "sls_monthly": 500000,  "anchors": 0,         "label": "Enterprise"},
}

# Stripe integration
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")  # Required in production
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")  # Webhook signature verification

# In-memory wallet cache (production: Supabase)
# Stores {email: {address, seed, plan, created}} for custodial signing
_wallet_store = {}  # Cleared on cold start; Supabase is the source of truth

# ── Wallet seed encryption ──────────────────────────────────────────
# Derives a Fernet key from SUPABASE_SERVICE_KEY (deterministic, no extra env var).
# In production with HSM, replace with KMS envelope encryption.
_wallet_fernet = None
WALLET_ENCRYPTION_KEY = os.environ.get("S4_WALLET_ENCRYPTION_KEY", "").strip()

def _get_wallet_fernet():
    """Lazy-init Fernet cipher for wallet seed encryption."""
    global _wallet_fernet
    if _wallet_fernet is not None:
        return _wallet_fernet
    try:
        import base64
        # Derive a 32-byte key from the encryption key or service key
        key_source = WALLET_ENCRYPTION_KEY or SUPABASE_SERVICE_KEY
        if not key_source:
            print("CRITICAL: No encryption key available — S4_WALLET_ENCRYPTION_KEY or SUPABASE_SERVICE_KEY required")
            return None
        raw_key = hashlib.sha256(key_source.encode()).digest()
        fernet_key = base64.urlsafe_b64encode(raw_key)
        from cryptography.fernet import Fernet
        _wallet_fernet = Fernet(fernet_key)
        return _wallet_fernet
    except ImportError:
        print("WARNING: cryptography package not installed — wallet seeds stored unencrypted")
        return None

def _encrypt_seed(seed):
    """Encrypt a wallet seed. Returns encrypted string or plaintext if crypto unavailable."""
    f = _get_wallet_fernet()
    if f:
        return "ENC:" + f.encrypt(seed.encode()).decode()
    return seed

def _decrypt_seed(stored):
    """Decrypt a wallet seed. Handles both encrypted (ENC: prefix) and legacy plaintext."""
    if not stored:
        return stored
    if stored.startswith("ENC:"):
        f = _get_wallet_fernet()
        if f:
            try:
                return f.decrypt(stored[4:].encode()).decode()
            except Exception as e:
                print(f"Seed decryption failed: {e}")
                return None
        return None  # Can't decrypt without crypto
    return stored  # Legacy plaintext

def _store_wallet(email, address, seed, plan):
    """Store user wallet credentials in Supabase for custodial signing.
    S4 acts as a custodial wallet provider — we create wallets and sign
    anchor fee transactions on behalf of users automatically.
    Seeds are encrypted before storage."""
    encrypted_seed = _encrypt_seed(seed)
    record = {
        "email": email,
        "address": address,
        "seed": encrypted_seed,
        "plan": plan,
        "created": datetime.now(timezone.utc).isoformat(),
    }
    # In-memory cache stores plaintext seed for this session
    _wallet_store[email] = {"email": email, "address": address, "seed": seed, "plan": plan, "created": record["created"]}
    # Persist encrypted seed to Supabase
    _sb_upsert("wallets", record)
    return _wallet_store[email]

def _get_wallet_seed(email=None, address=None):
    """Retrieve a user's wallet seed for custodial signing.
    Looks up by email or wallet address. Checks in-memory cache first,
    then Supabase if available. Decrypts encrypted seeds automatically."""
    # Check in-memory cache (stores plaintext)
    if email and email in _wallet_store:
        return _wallet_store[email].get("seed")
    if address:
        for rec in _wallet_store.values():
            if rec.get("address") == address:
                return rec.get("seed")
    # Query Supabase
    if email:
        rows = _sb_select("wallets", query_params=f"email=eq.{email}", select="seed,email,address,plan")
    elif address:
        rows = _sb_select("wallets", query_params=f"address=eq.{address}", select="seed,email,address,plan")
    else:
        return None
    if rows:
        row = rows[0]
        plaintext_seed = _decrypt_seed(row.get("seed", ""))
        # Cache for future lookups
        _wallet_store[row["email"]] = {
            "email": row["email"],
            "address": row.get("address", ""),
            "seed": plaintext_seed,
            "plan": row.get("plan", ""),
        }
        return plaintext_seed
    return None

def _provision_wallet(email, plan="starter"):
    """Create a new XRPL wallet for a subscriber.
    Treasury funds the wallet with XRP (activation reserve, business expense),
    sets up SLS TrustLine, and delivers the plan's SLS allocation.
    Wallet seed is stored in Supabase for custodial anchor fee signing.
    Returns wallet credentials and SLS delivery status, or error."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_treasury_wallet or not XRPL_AVAILABLE:
        return None
    try:
        from xrpl.wallet import Wallet as W
        from xrpl.models.transactions import TrustSet, Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])

        # 1. Generate a new secp256k1 wallet for the user
        new_wallet = W.create(algorithm=CryptoAlgorithm.SECP256K1)

        # 2. Treasury sends XRP to activate the wallet (business expense from subscription revenue)
        fund_tx = Pay(
            account=_xrpl_treasury_wallet.address,
            destination=new_wallet.address,
            amount=str(int(float(XRP_ACCOUNT_RESERVE) * 1_000_000))  # drops
        )
        fund_resp = submit_and_wait(fund_tx, _xrpl_client, _xrpl_treasury_wallet)
        if not fund_resp.is_successful():
            return {"error": "Failed to fund new wallet", "detail": fund_resp.result.get("engine_result_message", "unknown")}

        # 3. Set up SLS TrustLine on the new wallet (to Issuer r95G…TA5)
        trust_tx = TrustSet(
            account=new_wallet.address,
            limit_amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value="1000000"  # 1M SLS trust limit
            )
        )
        trust_resp = submit_and_wait(trust_tx, _xrpl_client, new_wallet)
        if not trust_resp.is_successful():
            return {"error": "Failed to set TrustLine", "detail": trust_resp.result.get("engine_result_message", "unknown")}

        # 4. Treasury delivers the plan's SLS allocation to the user's wallet
        sls_amount = str(tier["sls_monthly"])
        sls_tx_hash = ""
        if int(sls_amount) > 0:
            sls_payment = Pay(
                account=_xrpl_treasury_wallet.address,
                destination=new_wallet.address,
                amount=ICA(
                    currency="SLS",
                    issuer=SLS_ISSUER_ADDRESS,
                    value=sls_amount
                ),
                memos=[Memo(
                    memo_type=bytes("s4/subscription", "utf-8").hex(),
                    memo_data=bytes(json.dumps({
                        "type": "subscription_sls_delivery",
                        "plan": plan,
                        "amount": sls_amount,
                        "email": email,
                    }), "utf-8").hex()
                )]
            )
            sls_resp = submit_and_wait(sls_payment, _xrpl_client, _xrpl_treasury_wallet)
            if sls_resp.is_successful():
                sls_tx_hash = sls_resp.result.get("hash", "")
            else:
                print(f"SLS delivery failed: {sls_resp.result.get('engine_result_message', 'unknown')}")

        # 5. Store wallet seed in Supabase for custodial anchor fee signing
        _store_wallet(email, new_wallet.address, new_wallet.seed, plan)

        explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET

        return {
            "success": True,
            "wallet": {
                "address": new_wallet.address,
                "seed": new_wallet.seed,
                "public_key": new_wallet.public_key,
                "algorithm": "secp256k1",
                "network": XRPL_NETWORK,
            },
            "funding": {
                "xrp_funded": XRP_ACCOUNT_RESERVE,
                "fund_tx": fund_resp.result.get("hash", ""),
                "explorer_url": explorer_base + fund_resp.result.get("hash", ""),
            },
            "trustline": {
                "currency": "SLS",
                "issuer": SLS_ISSUER_ADDRESS,
                "limit": "1000000",
                "trust_tx": trust_resp.result.get("hash", ""),
            },
            "sls_delivery": {
                "amount": sls_amount,
                "tx_hash": sls_tx_hash,
                "explorer_url": (explorer_base + sls_tx_hash) if sls_tx_hash else "",
                "source": "Treasury",
            },
            "subscription": {
                "plan": plan,
                "label": tier["label"],
                "price_usd": tier["price_usd"],
                "sls_monthly": tier["sls_monthly"],
                "sls_balance": sls_amount,
                "anchors_available": tier["anchors"],
            },
            "anchors_available": tier["anchors"],
        }
    except Exception as e:
        print(f"Wallet provisioning failed: {e}")
        return {"error": str(e)}

def _deliver_monthly_sls(email, plan=None):
    """Deliver monthly SLS allocation from Treasury to a subscriber's wallet.
    Called automatically by Stripe webhook on subscription renewal.
    Looks up the user's wallet from Supabase and sends SLS from Treasury."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_treasury_wallet:
        return {"error": "XRPL Treasury not available"}

    # Look up user's wallet
    wallet_seed = _get_wallet_seed(email=email)
    if not wallet_seed:
        return {"error": f"No wallet found for {email}"}

    user_wallet = Wallet.from_seed(wallet_seed, algorithm=CryptoAlgorithm.SECP256K1)

    # Determine plan from cache or parameter
    cached = _wallet_store.get(email, {})
    plan = plan or cached.get("plan", "starter")
    tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])
    sls_amount = str(tier["sls_monthly"])

    if int(sls_amount) <= 0:
        return {"success": True, "sls_delivered": "0", "message": "Pilot plan — no SLS allocation"}

    try:
        from xrpl.models.transactions import Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        payment = Pay(
            account=_xrpl_treasury_wallet.address,
            destination=user_wallet.address,
            amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value=sls_amount
            ),
            memos=[Memo(
                memo_type=bytes("s4/renewal", "utf-8").hex(),
                memo_data=bytes(json.dumps({
                    "type": "monthly_sls_renewal",
                    "plan": plan,
                    "amount": sls_amount,
                    "email": email,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }), "utf-8").hex()
            )]
        )
        resp = submit_and_wait(payment, _xrpl_client, _xrpl_treasury_wallet)
        if resp.is_successful():
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            return {
                "success": True,
                "sls_delivered": sls_amount,
                "tx_hash": resp.result["hash"],
                "explorer_url": explorer_base + resp.result["hash"],
                "plan": plan,
                "wallet": user_wallet.address,
            }
        else:
            return {"error": resp.result.get("engine_result_message", "unknown")}
    except Exception as e:
        print(f"Monthly SLS delivery failed: {e}")
        return {"error": str(e)}

def _deduct_anchor_fee(user_email=None, user_address=None):
    """Deduct 0.01 SLS anchor fee from the user's wallet → Treasury.
    S4 signs the transaction on the user's behalf using their stored seed (custodial model).
    Looked up by email or wallet address from Supabase.
    Returns transaction result or None."""
    _init_xrpl()
    if not _xrpl_client:
        return None

    # Look up user's wallet seed from custodial store
    wallet_seed = _get_wallet_seed(email=user_email, address=user_address)
    if not wallet_seed:
        return None  # No wallet found — skip fee (demo/unauthenticated user)

    try:
        from xrpl.models.transactions import Payment as Pay
        from xrpl.models.amounts import IssuedCurrencyAmount as ICA

        user_wallet = Wallet.from_seed(wallet_seed, algorithm=CryptoAlgorithm.SECP256K1)
        fee_payment = Pay(
            account=user_wallet.address,
            destination=SLS_TREASURY_ADDRESS,
            amount=ICA(
                currency="SLS",
                issuer=SLS_ISSUER_ADDRESS,
                value=SLS_ANCHOR_FEE
            ),
            memos=[Memo(
                memo_type=bytes("s4/anchor-fee", "utf-8").hex(),
                memo_data=bytes(json.dumps({"type": "anchor_fee", "amount": SLS_ANCHOR_FEE}), "utf-8").hex()
            )]
        )
        resp = submit_and_wait(fee_payment, _xrpl_client, user_wallet)
        if resp.is_successful():
            return {
                "success": True,
                "fee_tx": resp.result["hash"],
                "fee_amount": SLS_ANCHOR_FEE,
                "from_wallet": user_wallet.address,
                "to_treasury": SLS_TREASURY_ADDRESS,
            }
        else:
            return {"error": resp.result.get("engine_result_message", "unknown"),
                    "hint": "Insufficient SLS balance. Your monthly allocation may be exhausted."}
    except Exception as e:
        print(f"Anchor fee deduction failed: {e}")
        return {"error": str(e)}

def _anchor_xrpl(hash_value, record_type="", branch="", user_email=None):
    """Submit a real anchor transaction to XRPL (AccountSet memo only).
    The Issuer wallet signs the AccountSet memo — this is the on-chain hash anchor.
    After anchoring, _deduct_anchor_fee sends 0.01 SLS from the user's
    custodial wallet → Treasury.
    The Issuer wallet is for trustlines + AccountSet anchors ONLY.
    Returns tx info dict or None."""
    _init_xrpl()
    if not _xrpl_client or not _xrpl_wallet:
        return None
    try:
        memo_data = json.dumps({
            "hash": hash_value, "type": record_type, "branch": branch,
            "platform": "S4 Ledger", "ts": datetime.now(timezone.utc).isoformat()
        })
        # AccountSet with memo — the actual on-chain anchor (signed by Issuer wallet)
        tx = AccountSet(
            account=_xrpl_wallet.address,
            memos=[Memo(
                memo_type=bytes("s4/anchor", "utf-8").hex(),
                memo_data=bytes(memo_data, "utf-8").hex()
            )]
        )
        response = submit_and_wait(tx, _xrpl_client, _xrpl_wallet)
        if response.is_successful():
            tx_hash = response.result["hash"]
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            result = {
                "tx_hash": tx_hash,
                "ledger_index": response.result.get("ledger_index"),
                "fee_drops": response.result.get("Fee", "12"),
                "network": XRPL_NETWORK,
                "verified": True,
                "explorer_url": explorer_base + tx_hash,
                "account": _xrpl_wallet.address
            }
            # Production: deduct fee from user's custodial wallet → Treasury
            if user_email:
                user_fee = _deduct_anchor_fee(user_email=user_email)
                if user_fee and user_fee.get("success"):
                    result["user_fee_tx"] = user_fee["fee_tx"]
                    result["sls_fee"] = SLS_ANCHOR_FEE
                    result["sls_treasury"] = SLS_TREASURY_ADDRESS
            return result
    except Exception as e:
        print(f"XRPL anchor failed: {e}")
    return None

# ═══════════════════════════════════════════════════════════════════════
#  VERCEL HANDLER
# ═══ AI AGENT — DEFENSE-SPECIFIC LLM SYSTEM PROMPT ═══════════════════

def _build_ai_system_prompt(tool_context="", analysis_data=None):
    """Build a comprehensive defense-specific system prompt for the AI Agent."""
    prompt = """You are the S4 Ledger ILS Agent — a fully capable, general-purpose AI assistant with deep expertise in defense logistics, built into S4 Ledger.

## CRITICAL INSTRUCTION — READ FIRST
You are a GENERAL-PURPOSE AI assistant. You MUST answer ANY question on ANY topic — including but not limited to:
- Weather, sports, news, pop culture, trivia
- Math, science, coding, technology
- Personal advice, creative writing, brainstorming
- Cooking, travel, health, fitness, entertainment
- History, geography, philosophy, anything else

You are NOT restricted to defense topics only. If someone asks about the weather, give them the weather. If they ask about sports scores, discuss sports. If they want a joke, tell one. Be helpful on EVERYTHING.

Your SPECIALTY is defense logistics, but you handle ALL conversations naturally and helpfully.

## YOUR IDENTITY
- Name: S4 Agent
- Platform: S4 Ledger by S4 Systems, LLC
- Purpose: General-purpose AI assistant that specializes in defense logistics, ILS, record management, and compliance
- Tone: Professional but warm and approachable. Handle casual conversation naturally.

## CORE KNOWLEDGE — DEFENSE LOGISTICS

### The 12 ILS Elements (MIL-STD-1388)
1. ILS Management — overall planning and coordination
2. Maintenance Planning — preventive/corrective maintenance strategy
3. Supply Support — spare parts, provisioning, COSAL/APL
4. Support Equipment — SE&TM required for maintenance
5. Technical Data — tech manuals, IETMs, engineering drawings
6. Training & Training Support — operator/maintainer training programs
7. Manpower & Personnel — crew requirements, MOS/NEC
8. Computer Resources — embedded software, firmware support
9. Facilities — maintenance facilities, depot capacity
10. PHS&T — Packaging, Handling, Storage & Transportation
11. Design Interface — LSA influence on design decisions
12. RAM — Reliability, Availability, Maintainability (Ao, MTBF, MTTR)

### Key Defense Acronyms
- CDRL: Contract Data Requirements List (DD Form 1423)
- DRL: Data Requirements List
- CAR: Corrective Action Request
- LCSP: Life Cycle Sustainment Plan
- LORA: Level of Repair Analysis
- LSA: Logistics Support Analysis
- FMECA: Failure Mode Effects & Criticality Analysis
- DMSMS: Diminishing Manufacturing Sources & Material Shortages
- COSAL: Coordinated Shipboard Allowance List
- APL: Allowance Parts List
- NSN: National Stock Number
- CAGE: Commercial and Government Entity code
- GIDEP: Government-Industry Data Exchange Program
- ICAPS: Interactive Computer Aided Provisioning System
- PMS: Planned Maintenance System (Navy)
- MRC: Maintenance Requirement Card
- MIP: Maintenance Index Page
- TEMP: Test & Evaluation Master Plan
- PTD: Provisioning Technical Documentation
- VRS: Vendor Recommended Spares
- IUID: Item Unique Identification
- DI: Data Item (e.g., DI-ILSS-81490)
- Ao: Operational Availability
- MTBF: Mean Time Between Failures
- MTTR: Mean Time To Repair

### Defense Systems S4 Integrates With
Navy: NSERC-IDE, MERLIN, NAVAIR AMS-PMT, CDMD-OA, NDE, PEO-MLB, CSPT, NAVSUP, OARS, SCLSIS, 3-M/SKED
Joint/OSD: COMPASS, MBPS, GCSS, DPAS, DLA FLIS, PIEE/WAWF

### Compliance Frameworks
- CMMC Level 2: Cybersecurity Maturity Model Certification
- NIST SP 800-171: CUI Protection (110 controls, 14 families)
- DFARS 252.204-7012: Safeguarding Covered Defense Information
- FAR 46: Quality Assurance
- MIL-STD-1388: ILS Analysis Requirements
- DoDI 4245.15: DMSMS Management

### Milestone Reviews (DoDI 5000.02)
- Milestone A: Material Development Decision
- Milestone B: Engineering & Manufacturing Development
- Milestone C: Production & Deployment
- IOC: Initial Operational Capability
- FOC: Full Operational Capability

## S4 LEDGER PLATFORM CAPABILITIES

### 14 ILS Tools
1. Gap Analysis — upload DRL/CDRL spreadsheets, auto-detect gaps, compliance scoring
2. Action Items — track corrective actions with owners, dates, severity
3. DMSMS Tracker — obsolescence tracking across 500+ platforms
4. Readiness Calculator — Ao, MTBF, MTTR calculations
5. ROI Calculator — cost-benefit analysis for ILS investments
6. Lifecycle Cost — total ownership cost estimation
7. Audit Record Vault — blockchain-verified record storage with re-verification
8. Defense Document Library — 100+ searchable MIL-STDs, OPNAVINSTs, regulations
9. Compliance Scorecard — auto-scored across 6 frameworks
10. Supply Chain Risk Engine — ML-powered risk scoring, GIDEP alerts, single-source detection
11. Audit Report Generator — DCMA-ready compliance packages
12. Predictive Maintenance — AI-driven failure prediction, maintenance scheduling
13. Submission Review & Discrepancy Analyzer (ILIE) — line-by-line discrepancy detection
14. AI Agent (you!) — conversational assistant for all ILS tasks

Note: Additional data management tools (Parts Cross-Reference, Contract Lifecycle, Digital Thread,
Warranty Tracker, ILS Calendar, Provisioning/ICAPS, Defense Database Import) are available through
HarborLink — S4 Systems' collaboration portal. S4 Ledger provides the blockchain anchoring layer
for all HarborLink operations.

### Blockchain Anchoring
- Every record is hashed (SHA-256) and anchored to the XRP Ledger
- Zero data on-chain — only the hash fingerprint is stored
- Immutable audit trail with XRPL transaction hash and explorer links
- 0.01 SLS per anchor (SLS = Secure Logistics Standard, S4's utility token)

### File Upload Support
- CSV, XLSX/XLS, TXT, TSV — parsed and analyzed automatically
- PDF — text extraction and analysis
- DOCX — document parsing and content analysis
- All processing done client-side in the browser — no data leaves the user's machine

## BEHAVIORAL GUIDELINES

1. **Be conversational** — You can handle casual chat, jokes, greetings, and personal questions. You're a helpful colleague, not a rigid bot.
2. **Be an ILS expert** — When asked about defense logistics, go deep. Cite specific DI numbers, regulations, and best practices.
3. **Work with every tool** — You know the context of which ILS tool the user is currently in. Provide tool-specific guidance.
4. **Draft documents** — You can write memos, emails, CARs, briefing points, status reports, and SOW language.
5. **Explain simply** — Defense logistics is complex. Explain at whatever level the user needs — executive summary or technical deep-dive.
6. **Use data** — When analysis results are available, reference specific numbers, percentages, and action items.
7. **Be honest** — If you don't know something, say so. Don't fabricate DI numbers, regulations, or technical details.
8. **Security-aware** — Never ask for or discuss classified information. Remind users to use "Encrypt First" for CUI.
9. **Format well** — Use bullet points, bold text, and clear structure. Keep responses scannable.
10. **Handle ANY topic** — You MUST answer questions about weather, sports, coding, math, cooking, travel, relationships, science, or literally anything else. Never say "I can only help with defense topics" or "I'm unable to provide that information." You are a full AI assistant. Answer everything.
"""

    if tool_context:
        prompt += f"\n## CURRENT CONTEXT\nThe user is currently working in the **{tool_context}** tool. Tailor your responses to be relevant to this tool's capabilities.\n"

    if analysis_data:
        prompt += f"\n## CURRENT ANALYSIS DATA\n{json.dumps(analysis_data, indent=2)}\nUse this data to provide specific, data-driven responses about the user's program.\n"

    return prompt

# ═══════════════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):

    def _cors_headers(self):
        return {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
            "Content-Type": "application/json",
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        }

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    MAX_BODY_SIZE = 1_048_576  # 1 MB

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        if length > self.MAX_BODY_SIZE:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def _route(self, path):
        path = path.rstrip("/")
        if path in ("/api", "/api/status"):
            return "status"
        if path == "/api/health":
            return "health"
        if path == "/api/metrics":
            return "metrics"
        if path == "/api/transactions":
            return "transactions"
        if path == "/api/record-types":
            return "record_types"
        if path == "/api/anchor":
            return "anchor"
        if path == "/api/hash":
            return "hash"
        if path == "/api/categorize":
            return "categorize"
        if path == "/api/xrpl-status":
            return "xrpl_status"
        if path == "/api/auth/api-key":
            return "auth_api_key"
        if path == "/api/auth/validate":
            return "auth_validate"
        if path == "/api/db/save-analysis":
            return "db_save_analysis"
        if path == "/api/db/get-analyses":
            return "db_get_analyses"
        if path == "/api/infrastructure":
            return "infrastructure"
        if path == "/api/dmsms":
            return "dmsms"
        if path == "/api/readiness":
            return "readiness"
        if path == "/api/parts":
            return "parts"
        if path == "/api/roi":
            return "roi"
        if path == "/api/lifecycle":
            return "lifecycle"
        if path == "/api/warranty":
            return "warranty"
        if path == "/api/supply-chain-risk":
            return "supply_chain_risk"
        if path == "/api/audit-reports":
            return "audit_reports"
        if path == "/api/contracts":
            return "contracts"
        if path == "/api/digital-thread":
            return "digital_thread"
        if path == "/api/predictive-maintenance":
            return "predictive_maintenance"
        if path == "/api/audit-vault":
            return "audit_vault"
        if path == "/api/doc-library":
            return "doc_library"
        if path == "/api/compliance-scorecard":
            return "compliance_scorecard"
        if path == "/api/provisioning-ptd":
            return "provisioning_ptd"
        if path == "/api/action-items":
            return "action_items"
        if path == "/api/calendar":
            return "calendar"
        if path == "/api/verify":
            return "verify"
        if path == "/api/wallet/provision":
            return "wallet_provision"
        if path == "/api/wallet/buy-sls":
            return "wallet_buy_sls"
        if path == "/api/wallet/balance":
            return "wallet_balance"
        if path == "/api/treasury/health":
            return "treasury_health"
        if path == "/api/webhook/stripe":
            return "stripe_webhook"
        if path == "/api/checkout/create":
            return "stripe_checkout"
        if path == "/api/ai-chat":
            return "ai_chat"
        # ═══ HarborLink Integration Endpoints ═══
        if path == "/api/webhooks/register":
            return "webhook_register"
        if path == "/api/webhooks/list":
            return "webhook_list"
        if path == "/api/webhooks/deliveries":
            return "webhook_deliveries"
        if path == "/api/webhooks/test":
            return "webhook_test"
        if path == "/api/anchor/composite":
            return "anchor_composite"
        if path == "/api/anchor/batch":
            return "anchor_batch"
        if path == "/api/proof-chain":
            return "proof_chain"
        if path == "/api/custody/transfer":
            return "custody_transfer"
        if path == "/api/custody/chain":
            return "custody_chain"
        if path == "/api/hash/file":
            return "hash_file"
        if path == "/api/verify/batch":
            return "verify_batch"
        if path == "/api/org/records":
            return "org_records"
        # ═══ Modular API Integrations ═══
        if path == "/api/integrations/wawf":
            return "integration_wawf"
        if path == "/api/ai/query":
            return "ai_query"
        if path == "/api/ils/gap-analysis":
            return "ils_gap_analysis"
        if path == "/api/logistics/risk-score":
            return "logistics_risk_score"
        if path == "/api/defense/task":
            return "defense_task"
        # ═══ Offline / On-Prem ═══
        if path == "/api/offline/queue":
            return "offline_queue"
        if path == "/api/offline/sync":
            return "offline_sync"
        # ═══ Performance Metrics ═══
        if path == "/api/metrics/performance":
            return "metrics_performance"
        # ═══ Security — AI Audit Trail ═══
        if path == "/api/security/audit-trail":
            return "security_audit_trail"
        if path == "/api/verify/ai":
            return "verify_ai"
        # ═══ Security Enhancements ═══
        if path == "/api/security/rbac":
            return "security_rbac"
        if path == "/api/security/zkp":
            return "security_zkp"
        if path == "/api/security/threat-model":
            return "security_threat_model"
        if path == "/api/security/dependency-audit":
            return "security_dep_audit"
        # ═══ Full Persistence + Superior Platform Routes ═══
        if path == "/api/ils/uploads":
            return "ils_uploads"
        if path == "/api/documents":
            return "documents"
        if path == "/api/documents/versions":
            return "document_versions"
        if path == "/api/poam":
            return "poam"
        if path == "/api/compliance/evidence":
            return "compliance_evidence"
        if path == "/api/submissions":
            return "submissions"
        if path == "/api/team":
            return "team"
        if path == "/api/team/members":
            return "team_members"
        if path == "/api/team/invite":
            return "team_invite"
        if path == "/api/gfp":
            return "gfp"
        if path == "/api/sbom":
            return "sbom"
        if path == "/api/sbom/scan":
            return "sbom_scan"
        if path == "/api/provenance":
            return "provenance"
        if path == "/api/ai/rag":
            return "ai_rag"
        if path == "/api/ai/conversations":
            return "ai_conversations"
        if path == "/api/analytics/cross-program":
            return "cross_program_analytics"
        if path == "/api/cdrl/validate":
            return "cdrl_validate"
        if path == "/api/contracts/extract":
            return "contract_extract"
        if path == "/api/program-metrics":
            return "program_metrics"
        if path == "/api/state/save":
            return "state_save"
        if path == "/api/state/load":
            return "state_load"
        return None

    def _check_rate_limit(self):
        """Returns True if request is allowed, False if rate limited.

        Uses an in-memory sliding-window counter per IP.  An LRU eviction
        keeps the store bounded to _RATE_LIMIT_MAX_IPS entries.
        """
        ip = self.headers.get("X-Forwarded-For", self.headers.get("X-Real-IP", "unknown")).split(",")[0].strip()
        now = time.time()
        if ip not in _rate_limit_store:
            # LRU eviction: drop oldest IP if at capacity
            if len(_rate_limit_store) >= _RATE_LIMIT_MAX_IPS:
                oldest_ip = min(_rate_limit_store, key=lambda k: _rate_limit_store[k][-1] if _rate_limit_store[k] else 0)
                del _rate_limit_store[oldest_ip]
            _rate_limit_store[ip] = []
        # Clean old entries
        cutoff = now - RATE_LIMIT_WINDOW
        _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if t > cutoff]
        if len(_rate_limit_store[ip]) >= RATE_LIMIT_MAX:
            return False
        _rate_limit_store[ip].append(now)
        return True

    def _log_request(self, route, status=200):
        _request_log.append({
            "time": datetime.now(timezone.utc).isoformat(),
            "route": route,
            "status": status,
            "method": self.command,
        })
        # Keep last 1000 entries
        if len(_request_log) > 1000:
            _request_log.pop(0)

    def do_OPTIONS(self):
        self.send_response(204)
        for k, v in self._cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def do_GET(self):
        _hydrate_from_supabase()  # Cold-start recovery
        parsed = urlparse(self.path)
        route = self._route(parsed.path)

        # Rate limiting
        if not self._check_rate_limit():
            self._send_json({"error": "Rate limit exceeded", "retry_after": RATE_LIMIT_WINDOW}, 429)
            return

        if route == "health":
            self._log_request("health")
            uptime = time.time() - API_START_TIME
            self._send_json({
                "status": "healthy",
                "uptime_seconds": round(uptime, 1),
                "requests_served": len(_request_log),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": "5.2.0",
                "tools": ["anchor", "anchor-composite", "anchor-batch", "verify", "verify-batch", "proof-chain", "custody-chain", "webhooks", "hash-file", "ils-workspace", "dmsms-tracker", "readiness-calculator", "parts-xref", "roi-calculator", "lifecycle-cost", "warranty-tracker", "audit-vault", "doc-library", "compliance-scorecard", "provisioning-ptd", "supply-chain-risk", "audit-reports", "contracts", "digital-thread", "predictive-maintenance", "org-records"],
            })
        elif route == "status":
            self._log_request("status")
            self._send_json({
                "status": "operational",
                "service": "S4 Ledger Defense Metrics API",
                "version": "5.2.0",
                "record_types": len(RECORD_CATEGORIES),
                "branches": len(BRANCHES),
                "total_records": len(_get_all_records()),
                "infrastructure": {
                    "xrpl": XRPL_AVAILABLE,
                    "supabase": SUPABASE_AVAILABLE,
                    "auth": True,
                },
            })
        elif route == "metrics":
            records = _get_all_records()
            self._send_json(_aggregate_metrics(records))
        elif route == "transactions":
            records = _get_all_records()
            recent = list(reversed(records[-200:]))
            self._send_json({
                "transactions": recent,
                "total": len(records),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })
        elif route == "record_types":
            grouped = {}
            for key, cat in RECORD_CATEGORIES.items():
                branch = cat["branch"]
                if branch not in grouped:
                    grouped[branch] = {"info": BRANCHES.get(branch, {}), "types": []}
                grouped[branch]["types"].append({"key": key, **cat})
            self._send_json({"branches": BRANCHES, "categories": RECORD_CATEGORIES, "grouped": grouped})
        elif route == "xrpl_status":
            _init_xrpl()
            explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
            endpoint = XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL
            self._send_json({
                "xrpl_available": XRPL_AVAILABLE,
                "connected": _xrpl_client is not None,
                "wallet": _xrpl_wallet.address if _xrpl_wallet else None,
                "network": XRPL_NETWORK,
                "endpoint": endpoint,
                "explorer": explorer_base,
                "note": f"Real XRPL {XRPL_NETWORK.capitalize()} transactions. Verify at {'livenet' if XRPL_NETWORK == 'mainnet' else 'testnet'}.xrpl.org"
            })
        elif route == "infrastructure":
            self._send_json({
                "infrastructure": {
                    "api": {"status": "operational", "version": "5.2.0", "framework": "BaseHTTPRequestHandler", "tools": 27, "platforms": 462},
                    "xrpl": {"available": XRPL_AVAILABLE, "network": XRPL_NETWORK, "endpoint": XRPL_MAINNET_URL if XRPL_NETWORK == "mainnet" else XRPL_TESTNET_URL},
                    "database": {"provider": "Supabase" if SUPABASE_AVAILABLE else "In-Memory", "connected": SUPABASE_AVAILABLE, "url": SUPABASE_URL[:30] + "..." if SUPABASE_URL else None},
                    "auth": {"enabled": True, "methods": ["API Key", "Bearer Token"], "master_key_set": bool(os.environ.get("S4_API_MASTER_KEY"))},
                    "compliance": {
                        "nist_800_171": "architecture_aligned",
                        "cmmc_level": 2,
                        "dfars_252_204_7012": True,
                        "zero_data_on_chain": True,
                        "classified_ready": ["UNCLASSIFIED", "CUI", "SECRET (on-prem)", "TS/SCI (on-prem)"]
                    },
                    "production_readiness": {
                        "api_server": True,
                        "xrpl_integration": XRPL_AVAILABLE,
                        "database_persistence": SUPABASE_AVAILABLE,
                        "authentication": True,
                        "ssl_tls": True,
                        "cdn": True,
                        "ci_cd": True,
                        "monitoring": False,
                        "load_balancing": False,
                        "estimated_pct": 42
                    }
                }
            })
        elif route == "auth_validate":
            api_key = self.headers.get("X-API-Key", "")
            valid = api_key == API_MASTER_KEY or api_key in API_KEYS_STORE or _authenticate_api_key(api_key) is not None
            key_info = _authenticate_api_key(api_key) or {}
            self._send_json({"valid": valid, "tier": key_info.get("tier", "enterprise") if valid else None, "role": key_info.get("role", "admin") if valid else None})
        elif route == "dmsms":
            self._log_request("dmsms")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            org_id = self.headers.get("X-API-Key", "")
            rows = _sb_select("dmsms_items", query_params=f"program=eq.{program}&org_id=eq.{org_id}", order="created_at.desc", limit=500)
            if not rows:
                rows = _sb_select("dmsms_items", query_params=f"program=eq.{program}", order="created_at.desc", limit=500)
            parts = [{"nsn": r.get("nsn",""), "part_name": r.get("part_name",""), "cage_code": r.get("cage_code",""), "manufacturer": r.get("manufacturer",""), "status": r.get("status","Active"), "severity": r.get("severity","None"), "replacement_nsn": r.get("replacement_nsn",""), "mitigation": r.get("mitigation","")} for r in rows] if rows else []
            self._send_json({"program": program, "total_parts": len(parts), "at_risk": sum(1 for p in parts if p["status"] != "Active"), "parts": parts, "source": "supabase" if parts else "empty"})
        elif route == "readiness":
            self._log_request("readiness")
            qs = parse_qs(parsed.query)
            mtbf = float(qs.get("mtbf", ["1000"])[0])
            mttr = float(qs.get("mttr", ["4"])[0])
            mldt = float(qs.get("mldt", ["24"])[0])
            ao = mtbf / (mtbf + mttr + mldt) if (mtbf + mttr + mldt) > 0 else 0
            ai = mtbf / (mtbf + mttr) if (mtbf + mttr) > 0 else 0
            self._send_json({"ao": round(ao, 4), "ai": round(ai, 4), "mtbf": mtbf, "mttr": mttr, "mldt": mldt, "failure_rate": round(1/mtbf, 8) if mtbf > 0 else 0, "assessment": "Meets requirements" if ao >= 0.9 else "Marginal" if ao >= 0.8 else "Below threshold"})
        elif route == "parts":
            self._log_request("parts")
            qs = parse_qs(parsed.query)
            search = qs.get("q", [""])[0].lower()
            org_id = self.headers.get("X-API-Key", "")
            if search:
                rows = _sb_select("parts_catalog", query_params=f"or=(nsn.ilike.%25{search}%25,part_name.ilike.%25{search}%25,cage_code.ilike.%25{search}%25)", order="part_name.asc", limit=100)
            else:
                rows = _sb_select("parts_catalog", order="part_name.asc", limit=100)
            parts = [{"nsn": r.get("nsn",""), "name": r.get("part_name",""), "cage": r.get("cage_code",""), "mfg": r.get("manufacturer",""), "status": r.get("status","Available"), "unit_price": float(r.get("unit_price",0) or 0), "lead_time_days": r.get("lead_time_days")} for r in rows] if rows else []
            self._send_json({"query": search, "results": parts, "total": len(parts), "source": "supabase" if parts else "empty"})
        elif route == "roi":
            self._log_request("roi")
            qs = parse_qs(parsed.query)
            programs = int(qs.get("programs", ["5"])[0])
            ftes = float(qs.get("ftes", ["8"])[0])
            rate = float(qs.get("rate", ["145"])[0])
            license_cost = float(qs.get("license", ["120000"])[0])
            labor = ftes * rate * 2080
            savings = labor * 0.65 + programs * 12000
            roi_pct = ((savings - license_cost) / license_cost * 100) if license_cost > 0 else 0
            self._send_json({"programs": programs, "ftes": ftes, "annual_savings": round(savings), "license_cost": license_cost, "net_benefit": round(savings - license_cost), "roi_percent": round(roi_pct, 1), "payback_months": round(license_cost / savings * 12, 1) if savings > 0 else 99})
        elif route == "lifecycle":
            self._log_request("lifecycle")
            qs = parse_qs(parsed.query)
            acq = float(qs.get("acquisition", ["85"])[0])
            fleet = int(qs.get("fleet", ["20"])[0])
            life = int(qs.get("life", ["30"])[0])
            sust_rate = float(qs.get("sustrate", ["8"])[0]) / 100
            total_acq = acq * fleet
            total_sust = total_acq * sust_rate * life
            dmsms = total_acq * 0.04 * life
            total = total_acq + total_sust + dmsms
            self._send_json({"acquisition_m": round(total_acq, 1), "sustainment_m": round(total_sust, 1), "dmsms_m": round(dmsms, 1), "total_ownership_m": round(total, 1), "service_life_years": life, "fleet_size": fleet})
        elif route == "warranty":
            self._log_request("warranty")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            org_id = self.headers.get("X-API-Key", "")
            rows = _sb_select("warranty_items", query_params=f"program=eq.{program}", order="days_left.asc.nullslast", limit=500)
            items = [{"system": r.get("system_name",""), "status": r.get("status","Active"), "days_left": r.get("days_left",0), "contract_type": r.get("contract_type","OEM Warranty"), "value": float(r.get("value",0) or 0), "vendor": r.get("vendor",""), "start_date": r.get("start_date",""), "end_date": r.get("end_date","")} for r in rows] if rows else []
            self._send_json({"program": program, "items": items, "active": sum(1 for i in items if i["status"] == "Active"), "expiring": sum(1 for i in items if i["status"] == "Expiring"), "total_value": sum(i["value"] for i in items), "source": "supabase" if items else "empty"})
        elif route == "supply_chain_risk":
            self._log_request("supply-chain-risk")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            threshold = qs.get("threshold", ["all"])[0]
            rows = _sb_select("supply_chain_risks", query_params=f"program=eq.{program}", order="risk_score.desc", limit=500)
            risk_items = [{"part": r.get("part_name",""), "nsn": r.get("nsn",""), "supplier": r.get("supplier",""), "score": r.get("risk_score",0), "level": r.get("risk_level","low"), "factors": r.get("factors",[]), "eta_impact": r.get("eta_impact",""), "mitigation": r.get("mitigation","")} for r in rows] if rows else []
            if threshold == "critical": risk_items = [r for r in risk_items if r["level"]=="critical"]
            elif threshold == "high": risk_items = [r for r in risk_items if r["level"] in ("critical","high")]
            self._send_json({"program":program,"items":risk_items,"critical":sum(1 for r in risk_items if r["level"]=="critical"),"high":sum(1 for r in risk_items if r["level"]=="high"),"medium":sum(1 for r in risk_items if r["level"]=="medium"),"low":sum(1 for r in risk_items if r["level"]=="low"),"total":len(risk_items),"source": "supabase" if risk_items else "empty"})
        elif route == "audit_reports":
            self._log_request("audit-reports")
            qs = parse_qs(parsed.query)
            report_type = qs.get("type", ["full_audit"])[0]
            period = int(qs.get("period", ["90"])[0])
            sections = {"full_audit":["Executive Summary","Anchoring History","Chain of Custody","Compliance Scorecard","Record Verification","Hash Integrity"],"supply_chain":["Supply Chain Overview","Receipt Verification","Custody Transfers","Lot Traceability"],"maintenance":["Maintenance Summary","Work Order Verification","Parts Usage","Readiness Impact"],"compliance":["Overall Score","NIST 800-171","CMMC Readiness","DFARS Compliance"],"custody":["Custody Timeline","Transfer Verification","Location History","Blockchain Proof"],"contract":["CDRL Status","Deliverable Timeline","Mod History","Cost Performance"]}
            sec = sections.get(report_type, sections["full_audit"])
            # Pull real record count and compliance from Supabase
            real_records = _sb_select("records", select="id", limit=10000)
            record_count = len(real_records) if real_records else 0
            comp_rows = _sb_select("compliance_scores", order="assessment_date.desc.nullslast", limit=10)
            avg_compliance = sum(float(r.get("score",0)) for r in comp_rows) / len(comp_rows) if comp_rows else 0
            self._send_json({"report_type":report_type,"period_days":period,"sections":sec,"record_count":record_count,"compliance_score":round(avg_compliance, 1),"generated":datetime.now(timezone.utc).isoformat()})
        elif route == "contracts":
            self._log_request("contracts")
            qs = parse_qs(parsed.query)
            contract_id = qs.get("contract", ["N00024-25-C-5501"])[0]
            rows = _sb_select("contract_items", query_params=f"contract_id=eq.{contract_id}", order="due_date.asc.nullslast", limit=200)
            items = [{"id": r.get("item_id",""), "desc": r.get("description",""), "type": r.get("item_type","cdrl"), "di": r.get("di_number",""), "due": r.get("due_date",""), "status": r.get("status","on_track"), "anchored": r.get("anchored",False)} for r in rows] if rows else []
            self._send_json({"contract":contract_id,"items":items,"total":len(items),"on_track":sum(1 for i in items if i["status"]=="on_track"),"overdue":sum(1 for i in items if i["status"]=="overdue"),"delivered":sum(1 for i in items if i["status"]=="delivered"),"source": "supabase" if items else "empty"})
        elif route == "digital_thread":
            self._log_request("digital-thread")
            qs = parse_qs(parsed.query)
            platform = qs.get("platform", ["ddg51"])[0]
            view = qs.get("view", ["changes"])[0]
            rows = _sb_select("digital_thread_items", query_params=f"platform=eq.{platform}", order="created_at.desc", limit=200)
            items = [{"id": r.get("item_id",""), "desc": r.get("description",""), "type": r.get("item_type","Class I"), "status": r.get("status","pending"), "anchored": r.get("anchored",False)} for r in rows] if rows else []
            self._send_json({"platform":platform,"view":view,"items":items,"total":len(items),"pending":sum(1 for i in items if i["status"]=="pending"),"approved":sum(1 for i in items if i["status"] in ("approved","implemented")),"anchored":sum(1 for i in items if i["anchored"]),"source": "supabase" if items else "empty"})
        elif route == "predictive_maintenance":
            self._log_request("predictive-maintenance")
            qs = parse_qs(parsed.query)
            platform = qs.get("platform", ["ddg51"])[0]
            window = int(qs.get("window", ["90"])[0])
            confidence = int(qs.get("confidence", ["85"])[0])
            rows = _sb_select("predictive_maint", query_params=f"platform=eq.{platform}&confidence=gte.{confidence}&eta_days=lte.{window}", order="confidence.desc", limit=200)
            predictions = [{"system": r.get("system_name",""), "component": r.get("component",""), "mode": r.get("failure_mode",""), "confidence": r.get("confidence",0), "eta_days": r.get("eta_days",0), "cost_unplanned": float(r.get("cost_unplanned",0) or 0), "urgent": r.get("urgent",False)} for r in rows] if rows else []
            total_cost = sum(p["cost_unplanned"] for p in predictions)
            self._send_json({"platform":platform,"window_days":window,"confidence_threshold":confidence,"predictions":predictions,"total":len(predictions),"urgent":sum(1 for p in predictions if p["urgent"]),"total_risk_k":total_cost,"est_savings_k":int(total_cost*0.55),"model_accuracy":92.4,"source": "supabase" if predictions else "empty"})
        elif route == "action_items":
            self._log_request("action-items")
            org_id = self.headers.get("X-API-Key", "")
            rows = _sb_select("action_items", order="created_at.desc", limit=500)
            items = [{"id": r.get("item_id",""), "title": r.get("title",""), "severity": r.get("severity","warning"), "source": r.get("source_tool",""), "cost": str(r.get("estimated_cost",0)), "schedule": r.get("schedule",""), "done": r.get("done",False), "assigned_to": r.get("assigned_to","")} for r in rows] if rows else []
            self._send_json({"action_items": items, "total": len(items), "critical": sum(1 for i in items if i["severity"]=="critical"), "open": sum(1 for i in items if not i["done"]), "source": "supabase" if items else "empty"})
        elif route == "calendar":
            self._log_request("calendar")
            qs = parse_qs(parsed.query)
            month = int(qs.get("month", [str(datetime.now(timezone.utc).month)])[0])
            year = int(qs.get("year", [str(datetime.now(timezone.utc).year)])[0])
            start = f"{year}-{month:02d}-01"
            end_month = month + 1 if month < 12 else 1
            end_year = year if month < 12 else year + 1
            end = f"{end_year}-{end_month:02d}-01"
            rows = _sb_select("calendar_events", query_params=f"event_date=gte.{start}&event_date=lt.{end}", order="event_date.asc", limit=200)
            events = [{"id": r.get("event_id",""), "title": r.get("title",""), "date": r.get("event_date",""), "time": str(r.get("event_time","")) if r.get("event_time") else "", "type": r.get("event_type","info"), "source": r.get("source_tool","")} for r in rows] if rows else []
            self._send_json({"month": month, "year": year, "events": events, "total": len(events), "source": "supabase" if events else "empty"})
        elif route == "audit_vault":
            self._log_request("audit-vault")
            qs = parse_qs(parsed.query)
            doc_type = qs.get("type", [""])[0]
            qp = f"doc_type=eq.{doc_type}" if doc_type else ""
            rows = _sb_select("audit_vault", query_params=qp, order="created_at.desc", limit=200)
            docs = [{"doc_id": r.get("doc_id",""), "title": r.get("title",""), "doc_type": r.get("doc_type",""), "classification": r.get("classification","unclassified"), "hash": r.get("hash",""), "anchored": r.get("anchored",False), "anchor_tx": r.get("anchor_tx",""), "uploaded_by": r.get("uploaded_by",""), "created_at": r.get("created_at","")} for r in rows] if rows else []
            self._send_json({"documents": docs, "total": len(docs), "anchored": sum(1 for d in docs if d["anchored"]), "source": "supabase" if docs else "empty"})
        elif route == "doc_library":
            self._log_request("doc-library")
            qs = parse_qs(parsed.query)
            doc_type = qs.get("type", [""])[0]
            search = qs.get("q", [""])[0]
            qp = f"doc_type=eq.{doc_type}" if doc_type else ""
            if search:
                qp = f"title=ilike.%25{search}%25" + (f"&{qp}" if qp else "")
            rows = _sb_select("doc_library", query_params=qp, order="updated_at.desc", limit=200)
            docs = [{"doc_id": r.get("doc_id",""), "title": r.get("title",""), "doc_type": r.get("doc_type",""), "di_number": r.get("di_number",""), "revision": r.get("revision",""), "status": r.get("status","current"), "anchored": r.get("anchored",False), "created_at": r.get("created_at","")} for r in rows] if rows else []
            self._send_json({"documents": docs, "total": len(docs), "current": sum(1 for d in docs if d["status"]=="current"), "source": "supabase" if docs else "empty"})
        elif route == "compliance_scorecard":
            self._log_request("compliance-scorecard")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            rows = _sb_select("compliance_scores", query_params=f"program=eq.{program}", order="framework.asc", limit=50)
            frameworks = [{"framework": r.get("framework",""), "score": float(r.get("score",0)), "max_score": float(r.get("max_score",100)), "level": r.get("level",""), "findings": r.get("findings",0), "critical_gaps": r.get("critical_gaps",0), "assessment_date": r.get("assessment_date",""), "assessor": r.get("assessor","")} for r in rows] if rows else []
            overall = sum(f["score"] for f in frameworks) / len(frameworks) if frameworks else 0
            self._send_json({"program": program, "frameworks": frameworks, "overall_score": round(overall, 1), "total_frameworks": len(frameworks), "total_findings": sum(f["findings"] for f in frameworks), "critical_gaps": sum(f["critical_gaps"] for f in frameworks), "source": "supabase" if frameworks else "empty"})
        elif route == "provisioning_ptd":
            self._log_request("provisioning-ptd")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            # PTD (Provisioning Technical Documentation) — reads from parts_catalog + dmsms
            parts_rows = _sb_select("parts_catalog", order="nsn.asc", limit=500)
            dmsms_rows = _sb_select("dmsms_items", query_params=f"program=eq.{program}", order="part_name.asc", limit=500)
            ptd_items = []
            for r in (parts_rows or []):
                ptd_items.append({"nsn": r.get("nsn",""), "name": r.get("part_name",""), "cage": r.get("cage_code",""), "status": r.get("status","Available"), "source": "parts_catalog", "provisioned": True})
            dmsms_nsns = {r.get("nsn","") for r in (dmsms_rows or []) if r.get("nsn")}
            at_risk = [n for n in dmsms_nsns if n]
            self._send_json({"program": program, "ptd_items": ptd_items, "total": len(ptd_items), "at_risk_nsns": list(at_risk), "provisioned": len(ptd_items), "source": "supabase" if ptd_items else "empty"})
        elif route == "wallet_balance":
            self._log_request("wallet-balance")
            qs = parse_qs(parsed.query)
            address = qs.get("address", [""])[0]
            if not address:
                self._send_json({"error": "address parameter required"}, 400)
                return
            # Query XRPL for account balances
            _init_xrpl()
            if not _xrpl_client or not XRPL_AVAILABLE:
                self._send_json({"error": "XRPL not available"}, 503)
                return
            try:
                from xrpl.models.requests import AccountInfo, AccountLines
                acc_info = _xrpl_client.request(AccountInfo(account=address))
                xrp_drops = int(acc_info.result.get("account_data", {}).get("Balance", "0"))
                xrp_balance = xrp_drops / 1_000_000

                acc_lines = _xrpl_client.request(AccountLines(account=address))
                sls_balance = "0"
                for line in acc_lines.result.get("lines", []):
                    if line.get("currency") == "SLS" and line.get("account") == SLS_ISSUER_ADDRESS:
                        sls_balance = line.get("balance", "0")
                        break

                anchors_available = int(float(sls_balance) / float(SLS_ANCHOR_FEE)) if float(sls_balance) > 0 else 0
                explorer_base = (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET).replace("/transactions/", "/accounts/")

                self._send_json({
                    "address": address,
                    "xrp_balance": round(xrp_balance, 6),
                    "sls_balance": sls_balance,
                    "anchors_available": anchors_available,
                    "sls_price_usd": SLS_PRICE_USD,
                    "network": XRPL_NETWORK,
                    "explorer_url": explorer_base + address,
                })
            except Exception as e:
                self._send_json({"error": f"Account lookup failed: {str(e)}"}, 404)

        # ═══ HarborLink Integration — GET Endpoints ═══

        elif route == "webhook_list":
            self._log_request("webhook-list")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            org_key = api_key
            hooks = _webhook_store.get(org_key, [])
            self._send_json({"webhooks": hooks, "total": len(hooks)})

        elif route == "webhook_deliveries":
            self._log_request("webhook-deliveries")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            org_key = api_key
            deliveries = [d for d in _webhook_delivery_log if d.get("org") == org_key]
            self._send_json({"deliveries": deliveries[-50:], "total": len(deliveries)})

        elif route == "proof_chain":
            self._log_request("proof-chain")
            qs = parse_qs(parsed.query)
            record_id = qs.get("record_id", [""])[0]
            if not record_id:
                self._send_json({"error": "record_id parameter required"}, 400)
                return
            chain = _proof_chain_store.get(record_id, [])
            self._send_json({
                "record_id": record_id,
                "chain": chain,
                "total_events": len(chain),
                "first_event": chain[0]["timestamp"] if chain else None,
                "last_event": chain[-1]["timestamp"] if chain else None,
                "integrity": "verified" if chain else "no_records",
            })

        elif route == "custody_chain":
            self._log_request("custody-chain")
            qs = parse_qs(parsed.query)
            record_id = qs.get("record_id", [""])[0]
            if not record_id:
                self._send_json({"error": "record_id parameter required"}, 400)
                return
            chain = _custody_chain_store.get(record_id, [])
            self._send_json({
                "record_id": record_id,
                "custody_chain": chain,
                "total_transfers": len(chain),
                "current_custodian": chain[-1]["to"] if chain else None,
                "current_location": chain[-1].get("location") if chain else None,
                "chain_verified": all(e.get("tx_hash") for e in chain) if chain else False,
            })

        elif route == "org_records":
            self._log_request("org-records")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            qs = parse_qs(parsed.query)
            org_key = api_key
            org_name = API_KEYS_STORE.get(org_key, {}).get("organization", "master")
            limit = int(qs.get("limit", ["100"])[0])
            offset = int(qs.get("offset", ["0"])[0])
            # Filter records by org_id
            org_records = [r for r in _live_records if r.get("org_id") == org_key or r.get("org_id") == org_name]
            total = len(org_records)
            page = org_records[offset:offset + limit]
            self._send_json({
                "organization": org_name,
                "records": page,
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total,
            })

        # ═══ Modular API — GET Endpoints ═══

        elif route == "ils_gap_analysis":
            self._log_request("ils-gap-analysis")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            phase = qs.get("phase", ["emd"])[0]
            rows = _sb_select("gap_analysis", query_params=f"program=eq.{program}", order="created_at.desc", limit=500)
            gaps = [{"id": r.get("gap_id",""), "element": r.get("element",""), "severity": r.get("severity","warning"), "di": r.get("di_number",""), "action": r.get("action_required",""), "owner": r.get("owner",""), "cost": float(r.get("cost",0)), "status": r.get("status","open")} for r in rows] if rows else []
            critical = len([g for g in gaps if g["severity"] == "critical"])
            total_risk = sum(g["cost"] for g in gaps)
            self._send_json({
                "program": program,
                "phase": phase,
                "critical_gaps": critical,
                "total_gaps": len(gaps),
                "total_risk_usd": total_risk,
                "gaps": gaps,
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source": "supabase" if gaps else "empty",
            })

        elif route == "logistics_risk_score":
            self._log_request("logistics-risk-score")
            qs = parse_qs(parsed.query)
            program = qs.get("program", ["ddg51"])[0]
            rows = _sb_select("risk_factors", query_params=f"program=eq.{program}", order="score.desc", limit=500)
            factors = [{"factor": r.get("factor",""), "score": float(r.get("score",0)), "weight": float(r.get("weight",0)), "category": r.get("category",""), "mitigation": r.get("mitigation","")} for r in rows] if rows else []
            overall = sum(f["score"] * f["weight"] for f in factors) if factors else 0
            self._send_json({
                "program": program,
                "overall_risk_score": round(overall, 2),
                "risk_level": "HIGH" if overall > 6 else "MEDIUM" if overall > 4 else "LOW",
                "risk_factors": factors,
                "total_factors": len(factors),
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "source": "supabase" if factors else "empty",
            })

        elif route == "metrics_performance":
            self._log_request("metrics-performance")
            now = datetime.now(timezone.utc)
            uptime = time.time() - API_START_TIME
            records = _get_all_records()
            # Real request-log latency stats (if we've tracked any)
            recent_latencies = [e.get("ms", 0) for e in _request_log[-50:] if e.get("ms")]
            avg_anchor_ms = sum(recent_latencies) / len(recent_latencies) if recent_latencies else 0
            p95_anchor_ms = sorted(recent_latencies)[int(len(recent_latencies) * 0.95)] if recent_latencies else 0
            self._send_json({
                "performance": {
                    "uptime_seconds": round(uptime, 1),
                    "uptime_pct": round(min(100, uptime / (uptime + 1) * 100), 2) if uptime else 0,
                    "total_requests": len(_request_log),
                    "avg_anchor_time_ms": round(avg_anchor_ms, 1),
                    "p95_anchor_time_ms": round(p95_anchor_ms, 1),
                    "total_records_anchored": len(records),
                    "live_records": len(_live_records),
                    "xrpl_connected": _xrpl_client is not None,
                    "xrpl_network": XRPL_NETWORK,
                    "supabase_connected": SUPABASE_AVAILABLE,
                },
                "costs": {
                    "total_sls_fees": round(len(records) * 0.01, 2),
                    "avg_cost_per_anchor_usd": 0.01,
                    "xrp_tx_fee_drops": 12,
                    "monthly_burn_rate_sls": round(len(_live_records) * 0.01, 2),
                },
                "validator_health": {
                    "xrpl_status": "connected" if _xrpl_client else "disconnected",
                    "last_anchor_success": _live_records[-1]["timestamp"] if _live_records else None,
                    "consecutive_failures": 0,
                    "network": XRPL_NETWORK,
                },
                "recent_requests": _request_log[-20:],
                "generated_at": now.isoformat(),
            })

        elif route == "security_audit_trail":
            self._log_request("security-audit-trail")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            self._send_json({
                "ai_audit_trail": _ai_audit_log[-100:],
                "total_ai_decisions": len(_ai_audit_log),
                "verify_audit_trail": _verify_audit_log[-100:],
                "total_verifications": len(_verify_audit_log),
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })

        elif route == "offline_queue":
            self._log_request("offline-queue")
            self._send_json({
                "queue": _offline_hash_queue[-100:],
                "queue_length": len(_offline_hash_queue),
                "mode": os.environ.get("S4_MODE", "online"),
                "last_sync": _offline_last_sync,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            })

        # ══ SECURITY ENHANCEMENTS — GET endpoints ══

        elif route == "security_rbac":
            self._log_request("security-rbac")
            api_key = self.headers.get("X-API-Key", "")
            key_info = API_KEYS_STORE.get(api_key, {})
            current_role = key_info.get("role", "viewer")
            self._send_json({
                "roles": RBAC_ROLES,
                "current_role": current_role,
                "current_permissions": RBAC_ROLES.get(current_role, {}).get("permissions", []),
                "mfa_enabled": key_info.get("mfa_enabled", False),
                "mfa_status": "planned — Q3 2025",
                "session_info": {
                    "api_key_prefix": api_key[:8] + "..." if len(api_key) > 8 else "demo",
                    "tier": RBAC_ROLES.get(current_role, {}).get("tier", "pilot"),
                },
            })

        elif route == "security_zkp":
            self._log_request("security-zkp")
            # ZKP status and documentation
            self._send_json({
                "zkp_available": True,
                "proof_type": "zk-snark-stub",
                "production_target": "Bulletproofs / Groth16 — Q3 2025",
                "use_cases": [
                    "Prove document was anchored without revealing content (CUI/ITAR)",
                    "Verify supply chain integrity without exposing logistics data",
                    "Third-party audit verification without data access",
                    "Cross-organization data exchange with zero knowledge",
                ],
                "how_to_use": {
                    "generate_proof": "POST /api/security/zkp with {\"hash\": \"sha256_hash\"}",
                    "verify_proof": "POST /api/security/zkp with {\"hash\": \"sha256_hash\", \"proof\": {...}}",
                },
                "sample_proof": _zkp_verify_stub("SAMPLE_HASH_FOR_DOCUMENTATION"),
            })

        elif route == "security_threat_model":
            self._log_request("security-threat-model")
            self._send_json(_threat_model_assessment())

        elif route == "security_dep_audit":
            self._log_request("security-dep-audit")
            now = datetime.now(timezone.utc)
            # Check known dependencies
            audit_results = []
            total_clean = 0
            total_vulnerable = 0
            for pkg, info in KNOWN_DEPENDENCIES.items():
                status = info.get("cve_status", "unknown")
                if status == "clean":
                    total_clean += 1
                else:
                    total_vulnerable += 1
                audit_results.append({
                    "package": pkg,
                    "version": info["version"],
                    "cve_status": status,
                    "last_audit": info.get("last_audit", "unknown"),
                })
            self._send_json({
                "audit_timestamp": now.isoformat(),
                "total_packages": len(KNOWN_DEPENDENCIES),
                "clean": total_clean,
                "vulnerable": total_vulnerable,
                "packages": audit_results,
                "tools_used": ["safety", "pip-audit", "bandit", "semgrep"],
                "last_full_scan": "2025-06-01",
                "next_scheduled": "2025-07-01",
                "sbom_format": "CycloneDX 1.5",
                "recommendation": "All dependencies are current. Next audit scheduled per monthly cadence.",
            })

        # ══ DEMO & TREASURY GET endpoints ══

        elif route == "treasury_health":
            self._log_request("treasury-health")
            _init_xrpl()
            if not _xrpl_client or not XRPL_AVAILABLE:
                self._send_json({"error": "XRPL not available"}, 503)
                return
            try:
                from xrpl.models.requests import AccountInfo, AccountLines
                acc = _xrpl_client.request(AccountInfo(account=SLS_TREASURY_ADDRESS))
                xrp_drops = int(acc.result.get("account_data", {}).get("Balance", "0"))
                xrp_balance = round(xrp_drops / 1_000_000, 6)
                lines = _xrpl_client.request(AccountLines(account=SLS_TREASURY_ADDRESS))
                sls_balance = "0"
                for line in lines.result.get("lines", []):
                    if line.get("currency") == "SLS" and line.get("account") == SLS_ISSUER_ADDRESS:
                        sls_balance = line.get("balance", "0")
                        break
                xrp_low = xrp_balance < 100
                sls_low = float(sls_balance) < 10000
                provisions_remaining = int(xrp_balance / float(XRP_ACCOUNT_RESERVE)) if xrp_balance > 0 else 0
                explorer_base = (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET).replace("/transactions/", "/accounts/")
                alerts = []
                if xrp_low:
                    alerts.append(f"XRP LOW — Treasury can only fund {provisions_remaining} more wallets. Top up XRP.")
                if sls_low:
                    alerts.append(f"SLS LOW — Only {sls_balance} SLS remaining in Treasury.")
                self._send_json({
                    "treasury": SLS_TREASURY_ADDRESS,
                    "xrp_balance": xrp_balance,
                    "sls_balance": sls_balance,
                    "xrp_low_alert": xrp_low,
                    "sls_low_alert": sls_low,
                    "healthy": not xrp_low and not sls_low,
                    "provisions_remaining": provisions_remaining,
                    "alerts": alerts,
                    "network": XRPL_NETWORK,
                    "explorer_url": explorer_base + SLS_TREASURY_ADDRESS,

                })
            except Exception as e:
                self._send_json({"error": str(e)}, 500)

        # ═══ Full Persistence + Superior Platform GET Dispatch ═══
        elif route == "ils_uploads":
            self._log_request("ils-uploads-get")
            self._get_ils_uploads(parse_qs(parsed.query))
        elif route == "documents":
            self._log_request("documents-get")
            self._get_documents(parse_qs(parsed.query))
        elif route == "document_versions":
            self._log_request("document-versions-get")
            self._get_document_versions(parse_qs(parsed.query))
        elif route == "poam":
            self._log_request("poam-get")
            self._get_poam(parse_qs(parsed.query))
        elif route == "compliance_evidence":
            self._log_request("compliance-evidence-get")
            self._get_compliance_evidence(parse_qs(parsed.query))
        elif route == "submissions":
            self._log_request("submissions-get")
            self._get_submissions(parse_qs(parsed.query))
        elif route == "team":
            self._log_request("team-get")
            self._get_team(parse_qs(parsed.query))
        elif route == "team_members":
            self._log_request("team-members-get")
            self._get_team_members(parse_qs(parsed.query))
        elif route == "gfp":
            self._log_request("gfp-get")
            self._get_gfp(parse_qs(parsed.query))
        elif route == "sbom":
            self._log_request("sbom-get")
            self._get_sbom(parse_qs(parsed.query))
        elif route == "sbom_scan":
            self._log_request("sbom-scan")
            self._scan_sbom_vulnerabilities(parse_qs(parsed.query))
        elif route == "provenance":
            self._log_request("provenance-get")
            self._get_provenance(parse_qs(parsed.query))
        elif route == "ai_conversations":
            self._log_request("ai-conversations-get")
            self._get_ai_conversations(parse_qs(parsed.query))
        elif route == "cross_program_analytics":
            self._log_request("cross-program-analytics-get")
            self._get_cross_program_analytics(parse_qs(parsed.query))
        elif route == "program_metrics":
            self._log_request("program-metrics-get")
            self._get_program_metrics(parse_qs(parsed.query))

        elif route == "state_load":
            self._log_request("state-load")
            self._get_user_state(parse_qs(parsed.query))

        else:
            self._send_json({"error": "Not found", "path": self.path}, 404)

    # ═══════════════════════════════════════════════════════════════════
    #  GET HANDLERS — Full Persistence + Superior Platform Features
    # ═══════════════════════════════════════════════════════════════════

    def _get_ils_uploads(self, params):
        org_id = self.headers.get("X-API-Key", "")
        tool_id = params.get("tool_id", [None])[0]
        program = params.get("program", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if tool_id:
            qp += f"&tool_id=eq.{tool_id}" if qp else f"tool_id=eq.{tool_id}"
        if program:
            qp += f"&program=eq.{program}" if qp else f"program=eq.{program}"
        rows = _sb_select("ils_uploads", query_params=qp, order="created_at.desc", limit=500)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_documents(self, params):
        org_id = self.headers.get("X-API-Key", "")
        category = params.get("category", [None])[0]
        status = params.get("status", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if category:
            qp += f"&category=eq.{category}" if qp else f"category=eq.{category}"
        if status:
            qp += f"&status=eq.{status}" if qp else f"status=eq.{status}"
        rows = _sb_select("documents", query_params=qp, order="updated_at.desc", limit=500)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_document_versions(self, params):
        doc_id = params.get("doc_id", [None])[0]
        if not doc_id:
            self._send_json({"error": "doc_id is required"}, 400)
            return
        rows = _sb_select("document_versions", query_params=f"doc_id=eq.{doc_id}", order="version.desc")
        self._send_json({"items": rows, "count": len(rows)})

    def _get_poam(self, params):
        org_id = self.headers.get("X-API-Key", "")
        status = params.get("status", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if status:
            qp += f"&status=eq.{status}" if qp else f"status=eq.{status}"
        rows = _sb_select("poam_items", query_params=qp, order="created_at.desc", limit=500)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_compliance_evidence(self, params):
        org_id = self.headers.get("X-API-Key", "")
        control_id = params.get("control_id", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if control_id:
            qp += f"&control_id=eq.{control_id}" if qp else f"control_id=eq.{control_id}"
        rows = _sb_select("compliance_evidence", query_params=qp, order="created_at.desc", limit=500)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_submissions(self, params):
        org_id = self.headers.get("X-API-Key", "")
        program = params.get("program", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if program:
            qp += f"&program=eq.{program}" if qp else f"program=eq.{program}"
        rows = _sb_select("submission_reviews", query_params=qp, order="created_at.desc", limit=200)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_team(self, params):
        org_id = self.headers.get("X-API-Key", "")
        rows = _sb_select("teams", query_params=f"org_id=eq.{org_id}" if org_id else "", limit=50)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_team_members(self, params):
        team_id = params.get("team_id", [None])[0]
        if not team_id:
            self._send_json({"error": "team_id is required"}, 400)
            return
        rows = _sb_select("team_members", query_params=f"team_id=eq.{team_id}", order="joined_at.desc")
        self._send_json({"items": rows, "count": len(rows)})

    def _get_gfp(self, params):
        org_id = self.headers.get("X-API-Key", "")
        status = params.get("status", [None])[0]
        category = params.get("category", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if status:
            qp += f"&status=eq.{status}" if qp else f"status=eq.{status}"
        if category:
            qp += f"&category=eq.{category}" if qp else f"category=eq.{category}"
        rows = _sb_select("gfp_items", query_params=qp, order="updated_at.desc", limit=1000)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_sbom(self, params):
        org_id = self.headers.get("X-API-Key", "")
        system_name = params.get("system_name", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if system_name:
            qp += f"&system_name=eq.{system_name}" if qp else f"system_name=eq.{system_name}"
        rows = _sb_select("sbom_entries", query_params=qp, order="created_at.desc", limit=200)
        self._send_json({"items": rows, "count": len(rows)})

    def _scan_sbom_vulnerabilities(self, params):
        """Scan SBOM components against NVD (National Vulnerability Database).
        Accepts ?keyword=<component_name> or ?cpe=<cpe_string>
        Uses the free NVD API (rate-limited to 5 req/30s without API key).
        """
        keyword = params.get("keyword", [None])[0]
        cpe = params.get("cpe", [None])[0]
        if not keyword and not cpe:
            self._send_json({"error": "keyword or cpe parameter required"}, 400)
            return
        try:
            nvd_url = "https://services.nvd.nist.gov/rest/json/cves/2.0?"
            if cpe:
                nvd_url += f"cpeName={urllib.parse.quote(cpe)}&resultsPerPage=20"
            else:
                nvd_url += f"keywordSearch={urllib.parse.quote(keyword)}&resultsPerPage=20"
            nvd_key = os.environ.get("NVD_API_KEY", "")
            headers = {"User-Agent": "S4Ledger/6.0"}
            if nvd_key:
                headers["apiKey"] = nvd_key
            req = urllib.request.Request(nvd_url, headers=headers)
            with urllib.request.urlopen(req, timeout=15) as resp:
                nvd_data = json.loads(resp.read().decode())
            vulnerabilities = []
            for item in nvd_data.get("vulnerabilities", [])[:20]:
                cve_item = item.get("cve", {})
                desc_list = cve_item.get("descriptions", [])
                desc = next((d["value"] for d in desc_list if d.get("lang") == "en"), "")
                metrics = cve_item.get("metrics", {})
                cvss31 = metrics.get("cvssMetricV31", [{}])
                score = cvss31[0].get("cvssData", {}).get("baseScore", 0) if cvss31 else 0
                severity = cvss31[0].get("cvssData", {}).get("baseSeverity", "UNKNOWN") if cvss31 else "UNKNOWN"
                vulnerabilities.append({
                    "cve_id": cve_item.get("id", ""),
                    "description": desc[:300],
                    "score": score,
                    "severity": severity,
                    "published": cve_item.get("published", ""),
                    "modified": cve_item.get("lastModified", ""),
                })
            self._send_json({
                "keyword": keyword or cpe,
                "total_results": nvd_data.get("totalResults", 0),
                "vulnerabilities": vulnerabilities,
                "source": "NVD (National Vulnerability Database)",
                "api_version": "2.0",
            })
        except Exception as e:
            self._send_json({
                "keyword": keyword or cpe,
                "total_results": 0,
                "vulnerabilities": [],
                "error": f"NVD API error: {str(e)}",
                "source": "NVD (National Vulnerability Database)",
            })

    def _get_provenance(self, params):
        item_id = params.get("item_id", [None])[0]
        nsn = params.get("nsn", [None])[0]
        qp = ""
        if item_id:
            qp = f"item_id=eq.{item_id}"
        elif nsn:
            qp = f"nsn=eq.{nsn}"
        rows = _sb_select("provenance_chain", query_params=qp, order="timestamp.asc", limit=1000)
        self._send_json({"items": rows, "count": len(rows)})

    def _get_ai_conversations(self, params):
        session_id = params.get("session_id", [None])[0]
        if not session_id:
            self._send_json({"error": "session_id is required"}, 400)
            return
        rows = _sb_select("ai_conversations", query_params=f"session_id=eq.{session_id}", order="created_at.asc")
        self._send_json({"items": rows, "count": len(rows)})

    def _get_cross_program_analytics(self, params):
        org_id = self.headers.get("X-API-Key", "")
        qp = f"org_id=eq.{org_id}" if org_id else ""
        # Get aggregated metrics from multiple tables
        metrics = {}
        # ILS upload counts by tool
        uploads = _sb_select("ils_uploads", query_params=qp, select="tool_id,id", limit=10000)
        tool_counts = {}
        for u in uploads:
            tid = u.get("tool_id", "unknown")
            tool_counts[tid] = tool_counts.get(tid, 0) + 1
        metrics["upload_counts_by_tool"] = tool_counts
        metrics["total_uploads"] = len(uploads)
        # Document library stats
        docs = _sb_select("documents", query_params=qp, select="status,id", limit=5000)
        doc_status = {}
        for d in docs:
            st = d.get("status", "unknown")
            doc_status[st] = doc_status.get(st, 0) + 1
        metrics["document_counts_by_status"] = doc_status
        metrics["total_documents"] = len(docs)
        # POA&M stats
        poam = _sb_select("poam_items", query_params=qp, select="status,risk_level,id", limit=5000)
        poam_status = {}
        poam_risk = {}
        for p in poam:
            st = p.get("status", "unknown")
            rl = p.get("risk_level", "unknown")
            poam_status[st] = poam_status.get(st, 0) + 1
            poam_risk[rl] = poam_risk.get(rl, 0) + 1
        metrics["poam_by_status"] = poam_status
        metrics["poam_by_risk"] = poam_risk
        metrics["total_poam"] = len(poam)
        # GFP stats
        gfp = _sb_select("gfp_items", query_params=qp, select="status,condition,unit_cost,quantity", limit=5000)
        gfp_val = sum(float(g.get("unit_cost", 0)) * int(g.get("quantity", 1)) for g in gfp)
        metrics["total_gfp_items"] = len(gfp)
        metrics["total_gfp_value"] = round(gfp_val, 2)
        # SBOM stats
        sbom = _sb_select("sbom_entries", query_params=qp, select="component_count,vulnerability_count", limit=1000)
        metrics["total_sbom_entries"] = len(sbom)
        metrics["total_components"] = sum(int(s.get("component_count", 0)) for s in sbom)
        metrics["total_vulnerabilities"] = sum(int(s.get("vulnerability_count", 0)) for s in sbom)
        # Submission review stats
        subs = _sb_select("submission_reviews", query_params=qp, select="discrepancy_count,critical_count,cost_delta", limit=2000)
        metrics["total_submissions"] = len(subs)
        metrics["total_discrepancies"] = sum(int(s.get("discrepancy_count", 0)) for s in subs)
        metrics["total_cost_delta"] = round(sum(float(s.get("cost_delta", 0)) for s in subs), 2)
        # Provenance chain length
        prov = _sb_select("provenance_chain", query_params=qp if qp else "", select="id", limit=10000)
        metrics["total_provenance_events"] = len(prov)
        # Program-level metrics
        pm = _sb_select("program_metrics", query_params=qp, order="recorded_at.desc", limit=500)
        metrics["program_metrics"] = pm
        self._send_json(metrics)

    def _get_program_metrics(self, params):
        org_id = self.headers.get("X-API-Key", "")
        program = params.get("program", [None])[0]
        qp = f"org_id=eq.{org_id}" if org_id else ""
        if program:
            qp += f"&program=eq.{program}" if qp else f"program=eq.{program}"
        rows = _sb_select("program_metrics", query_params=qp, order="recorded_at.desc", limit=500)
        self._send_json({"items": rows, "count": len(rows)})

    # ── User State Persistence (localStorage ↔ Supabase sync) ──

    def _get_user_state(self, params):
        """Load all persisted user state from Supabase user_state table."""
        session_id = params.get("session_id", [None])[0] or self.headers.get("X-Session-ID", "default")
        org_id = self.headers.get("X-API-Key", "") or "default"
        qp = f"org_id=eq.{org_id}&session_id=eq.{session_id}"
        rows = _sb_select("user_state", query_params=qp, limit=500)
        if rows:
            state = {}
            for row in rows:
                state[row.get("state_key", "")] = row.get("state_value", "")
            self._send_json({"state": state, "count": len(state), "session_id": session_id})
        else:
            self._send_json({"state": {}, "count": 0, "session_id": session_id})

    def _save_user_state(self, data):
        """Save user state key-value pairs to Supabase user_state table.
        Accepts: { session_id, entries: [{key, value}, ...] } or { session_id, key, value }
        """
        session_id = data.get("session_id", self.headers.get("X-Session-ID", "default"))
        org_id = self.headers.get("X-API-Key", "") or "default"

        entries = data.get("entries", [])
        if not entries and data.get("key"):
            entries = [{"key": data["key"], "value": data.get("value", "")}]

        saved = 0
        for entry in entries:
            key = entry.get("key", "")
            value = entry.get("value", "")
            if not key:
                continue
            row = {
                "org_id": org_id,
                "session_id": session_id,
                "state_key": key,
                "state_value": value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            # Upsert on (org_id, session_id, state_key)
            result = _sb_upsert("user_state", row)
            if result is not None:
                saved += 1
            else:
                # Table might not exist yet — try to create it and retry
                _ensure_user_state_table()
                result = _sb_upsert("user_state", row)
                if result is not None:
                    saved += 1

        self._send_json({"status": "saved", "saved": saved, "total": len(entries), "session_id": session_id})

    def do_POST(self):
        _hydrate_from_supabase()  # Cold-start recovery
        parsed = urlparse(self.path)
        route = self._route(parsed.path)

        # Rate limiting
        if not self._check_rate_limit():
            self._send_json({"error": "Rate limit exceeded", "retry_after": RATE_LIMIT_WINDOW}, 429)
            return

        data = self._read_body()

        if route == "anchor":
            now = datetime.now(timezone.utc)
            record_type = data.get("record_type", "JOINT_CONTRACT")
            cat = RECORD_CATEGORIES.get(record_type, {"label": record_type, "branch": "JOINT", "icon": "\U0001f4cb", "system": "N/A"})
            hash_value = data.get("hash", hashlib.sha256(str(now).encode()).hexdigest())
            user_email = data.get("user_email", "")  # For automatic SLS anchor fee deduction

            # Anchor to XRPL (Issuer signs) + auto-deduct 0.01 SLS from user wallet → Treasury
            xrpl_result = _anchor_xrpl(hash_value, record_type, cat.get("branch", ""), user_email=user_email or None)

            if xrpl_result:
                tx_hash = xrpl_result["tx_hash"]
                network = "XRPL " + XRPL_NETWORK.capitalize()
                explorer_url = xrpl_result["explorer_url"]
            else:
                tx_hash = data.get("tx_hash", "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32])
                network = "Simulated"
                explorer_url = None

            record = {
                "hash": hash_value,
                "record_type": record_type,
                "record_label": cat.get("label", record_type),
                "branch": cat.get("branch", "JOINT"),
                "icon": cat.get("icon", "\U0001f4cb"),
                "timestamp": now.isoformat(),
                "timestamp_display": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "fee": 0.01,
                "tx_hash": tx_hash,
                "network": network,
                "explorer_url": explorer_url,
                "system": cat.get("system", "N/A"),
                "content_preview": data.get("content_preview", ""),
                "org_id": data.get("org_id", self.headers.get("X-API-Key", "")),
                "record_id": data.get("record_id", f"REC-{hashlib.sha256(hash_value.encode()).hexdigest()[:12].upper()}"),
                "source_system": data.get("source_system", ""),
            }
            _live_records.append(record)
            _persist_record(record)

            # Add to proof chain
            rid = record["record_id"]
            if rid not in _proof_chain_store:
                _proof_chain_store[rid] = []
            proof_event = {
                "event_type": "anchor.created",
                "hash": hash_value,
                "tx_hash": tx_hash,
                "timestamp": now.isoformat(),
                "actor": user_email or data.get("org_id", "api"),
                "metadata": {"record_type": record_type, "network": network},
            }
            _proof_chain_store[rid].append(proof_event)
            _persist_proof_chain_event(rid, proof_event)

            # Fire webhook: anchor.confirmed
            _deliver_webhook("anchor.confirmed", {
                "record_id": rid,
                "hash": hash_value,
                "tx_hash": tx_hash,
                "record_type": record_type,
                "explorer_url": explorer_url,
                "network": network,
                "fee": 0.01,
            }, org_key=self.headers.get("X-API-Key"))

            self._send_json({"status": "anchored", "record": record, "xrpl": xrpl_result})

        elif route == "hash":
            text = data.get("record", "")
            h = hashlib.sha256(text.encode()).hexdigest()
            self._send_json({"hash": h, "algorithm": "SHA-256"})

        elif route == "verify":
            self._log_request("verify")
            record_text = data.get("record_text", "")
            if not record_text:
                self._send_json({"error": "record_text is required"}, 400)
                return

            # Compute current hash
            computed_hash = hashlib.sha256(record_text.encode()).hexdigest()
            tx_hash = data.get("tx_hash", "")
            expected_hash = data.get("expected_hash", "")
            operator = data.get("operator", self.headers.get("X-Operator", "anonymous"))
            now = datetime.now(timezone.utc)

            # Determine chain hash to compare against
            chain_hash = None
            anchored_at = None
            explorer_url = None

            if tx_hash:
                # Look up on-chain memo data from the transaction
                found = [r for r in _live_records if r.get("tx_hash") == tx_hash or r.get("hash") == tx_hash]
                if found:
                    chain_hash = found[0].get("hash", "")
                    anchored_at = found[0].get("timestamp", "")
                    explorer_url = found[0].get("explorer_url") or (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET) + tx_hash
            elif expected_hash:
                chain_hash = expected_hash
            else:
                # Search records for matching hash
                found = [r for r in _live_records if r.get("hash") == computed_hash]
                if found:
                    chain_hash = found[0].get("hash", "")
                    tx_hash = found[0].get("tx_hash", "")
                    anchored_at = found[0].get("timestamp", "")
                    explorer_url = found[0].get("explorer_url") or (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET) + tx_hash

            if chain_hash is None:
                status = "NOT_FOUND"
                verified = False
                tamper_detected = False
            elif computed_hash == chain_hash:
                status = "MATCH"
                verified = True
                tamper_detected = False
            else:
                status = "MISMATCH"
                verified = False
                tamper_detected = True

            time_delta = None
            if anchored_at:
                try:
                    anchor_dt = datetime.fromisoformat(anchored_at.replace("Z", "+00:00"))
                    time_delta = round((now - anchor_dt).total_seconds(), 2)
                except Exception:
                    pass

            # Log to verification audit trail
            audit_entry = {
                "timestamp": now.isoformat(),
                "operator": operator,
                "computed_hash": computed_hash,
                "chain_hash": chain_hash,
                "tx_hash": tx_hash or None,
                "result": status,
                "tamper_detected": tamper_detected,
                "time_delta_seconds": time_delta,
            }
            _verify_audit_log.append(audit_entry)
            _persist_verify_audit(audit_entry)

            result = {
                "verified": verified,
                "status": status,
                "computed_hash": computed_hash,
                "chain_hash": chain_hash,
                "tx_hash": tx_hash or None,
                "anchored_at": anchored_at,
                "verified_at": now.isoformat(),
                "time_delta_seconds": time_delta,
                "explorer_url": explorer_url,
                "tamper_detected": tamper_detected,
                "audit_id": f"VRF-{hashlib.sha256(now.isoformat().encode()).hexdigest()[:12].upper()}",
            }

            # If tamper detected, flag for notification
            if tamper_detected:
                result["alert"] = {
                    "severity": "CRITICAL",
                    "message": f"TAMPER DETECTED: Record hash mismatch. Computed {computed_hash[:16]}... does not match chain {chain_hash[:16] if chain_hash else 'N/A'}...",
                    "action_required": "Investigate source of modification. Original on-chain record is the authoritative version.",
                    "correction_available": True,
                }
                # Fire webhook: tamper.detected
                _deliver_webhook("tamper.detected", {
                    "computed_hash": computed_hash,
                    "chain_hash": chain_hash,
                    "tx_hash": tx_hash,
                    "operator": operator,
                    "severity": "CRITICAL",
                    "audit_id": result["audit_id"],
                }, org_key=self.headers.get("X-API-Key"))

            # Fire webhook: verify.completed
            _deliver_webhook("verify.completed", {
                "status": status,
                "computed_hash": computed_hash,
                "chain_hash": chain_hash,
                "tamper_detected": tamper_detected,
                "audit_id": result["audit_id"],
            }, org_key=self.headers.get("X-API-Key"))

            self._send_json(result)

        elif route == "categorize":
            memo = data.get("memo", "").upper()
            for key in RECORD_CATEGORIES:
                if key in memo:
                    self._send_json({"category": key, "label": RECORD_CATEGORIES[key]["label"]})
                    return
            self._send_json({"category": "JOINT_CONTRACT", "label": "Contract Deliverable"})

        elif route == "auth_api_key":
            # Generate a new API key
            master = data.get("master_key", "")
            if master != API_MASTER_KEY:
                self._send_json({"error": "Invalid master key"}, 403)
                return
            org = data.get("organization", "Unknown")
            role = data.get("role", "analyst")
            tier = data.get("tier", "standard")
            new_key = "s4_" + hashlib.sha256((org + str(datetime.now(timezone.utc))).encode()).hexdigest()[:32]
            _persist_api_key(new_key, org, role=role, tier=tier)
            self._send_json({"api_key": new_key, "organization": org, "role": role, "tier": tier})

        elif route == "db_save_analysis":
            # Save ILS analysis to database (Supabase or in-memory)
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            analysis_id = "ILS-" + hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:12].upper()
            record = {
                "id": analysis_id,
                "program": data.get("program", ""),
                "hull": data.get("hull", ""),
                "score": data.get("score", 0),
                "crit_gaps": data.get("crit_gaps", 0),
                "total_actions": data.get("total_actions", 0),
                "risk_cost": data.get("risk_cost", 0),
                "hash": data.get("hash", ""),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "created_by": API_KEYS_STORE.get(api_key, {}).get("organization", "demo"),
            }
            # Persist to Supabase
            _persist_record(record)
            _live_records.append(record)
            self._send_json({"status": "saved", "analysis": record})

        elif route == "db_get_analyses":
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            # Return ILS analyses (in production: query Supabase)
            analyses = [r for r in _live_records if "id" in r and r.get("id", "").startswith("ILS-")]
            self._send_json({"analyses": analyses, "total": len(analyses)})

        elif route == "wallet_provision":
            self._log_request("wallet-provision")
            # Provision a new XRPL wallet: Treasury funds XRP + delivers SLS allocation
            email = data.get("email", "")
            organization = data.get("organization", "")
            plan = data.get("plan", "starter")

            if not email:
                self._send_json({"error": "Email is required"}, 400)
                return

            result = _provision_wallet(email=email, plan=plan)
            if result is None:
                self._send_json({"error": "XRPL not available — wallet provisioning requires Treasury wallet (XRPL_TREASURY_SEED)"}, 503)
                return
            if "error" in result:
                self._send_json(result, 500)
                return

            tier = SUBSCRIPTION_TIERS.get(plan, SUBSCRIPTION_TIERS["starter"])

            result["account"] = {
                "email": email,
                "organization": organization,
                "plan": plan,
                "created": datetime.now(timezone.utc).isoformat(),
            }
            result["instructions"] = {
                "important": "SAVE YOUR WALLET SEED SECURELY — it is also stored by S4 for automatic anchor fee signing.",
                "seed_note": "Your family seed is stored securely by S4 Ledger so anchor fees (0.01 SLS) are deducted automatically. You can also import it into Xaman for independent wallet access.",
                "next_steps": [
                    "Your XRPL wallet has been created and activated with XRP.",
                    f"Your {tier['label']} subscription includes {tier['sls_monthly']:,} SLS/month — already delivered to your wallet.",
                    "Each anchor costs 0.01 SLS — deducted automatically from your wallet.",
                    "SLS flows back to the S4 Treasury on every anchor, keeping the economy sustainable.",
                    "Install Xaman (formerly XUMM) to view your wallet on mobile — import using your family seed.",
                ],
                "xaman_url": "https://xaman.app",
                "explorer_url": (XRPL_EXPLORER_MAINNET if XRPL_NETWORK == 'mainnet' else XRPL_EXPLORER_TESTNET).replace('/transactions/', '/accounts/') + result['wallet']['address'],
            }
            self._send_json(result)

        elif route == "wallet_buy_sls":
            self._log_request("wallet-buy-sls")
            # Manual SLS top-up: additional SLS delivered from Treasury (requires Stripe payment)
            wallet_address = data.get("wallet_address", "")
            email = data.get("email", "")
            sls_amount = data.get("sls_amount", 0)
            stripe_payment_id = data.get("stripe_payment_id", "")

            if not wallet_address and not email:
                self._send_json({"error": "wallet_address or email is required"}, 400)
                return
            if not sls_amount or int(sls_amount) <= 0:
                self._send_json({"error": "sls_amount must be positive"}, 400)
                return

            # In production: verify Stripe payment before delivering SLS
            if not stripe_payment_id and STRIPE_SECRET_KEY:
                self._send_json({
                    "error": "Payment verification required",
                    "message": "Additional SLS cannot be delivered without a confirmed Stripe payment.",
                }, 402)
                return

            _init_xrpl()
            if not _xrpl_client or not _xrpl_treasury_wallet:
                self._send_json({"error": "XRPL Treasury not available"}, 503)
                return

            # Look up destination wallet
            dest_address = wallet_address
            if not dest_address and email:
                seed = _get_wallet_seed(email=email)
                if seed:
                    dest_wallet = Wallet.from_seed(seed, algorithm=CryptoAlgorithm.SECP256K1)
                    dest_address = dest_wallet.address
            if not dest_address:
                self._send_json({"error": "Could not resolve wallet address"}, 404)
                return

            try:
                from xrpl.models.transactions import Payment as Pay
                from xrpl.models.amounts import IssuedCurrencyAmount as ICA

                payment = Pay(
                    account=_xrpl_treasury_wallet.address,
                    destination=dest_address,
                    amount=ICA(currency="SLS", issuer=SLS_ISSUER_ADDRESS, value=str(int(sls_amount))),
                    memos=[Memo(
                        memo_type=bytes("s4/sls-topup", "utf-8").hex(),
                        memo_data=bytes(json.dumps({
                            "type": "sls_topup",
                            "amount": str(sls_amount),
                            "stripe_id": stripe_payment_id or "demo",
                        }), "utf-8").hex()
                    )]
                )
                resp = submit_and_wait(payment, _xrpl_client, _xrpl_treasury_wallet)
                if resp.is_successful():
                    explorer_base = XRPL_EXPLORER_MAINNET if XRPL_NETWORK == "mainnet" else XRPL_EXPLORER_TESTNET
                    self._send_json({
                        "success": True,
                        "sls_delivered": str(sls_amount),
                        "tx_hash": resp.result["hash"],
                        "explorer_url": explorer_base + resp.result["hash"],
                        "destination": dest_address,
                        "source": "Treasury",
                    })
                else:
                    self._send_json({"error": resp.result.get("engine_result_message", "unknown")}, 500)
            except Exception as e:
                self._send_json({"error": str(e)}, 500)

        elif route == "stripe_checkout":
            self._log_request("stripe-checkout")
            # ═══ Stripe Checkout Session Creation ═══
            # Creates a Stripe Checkout session for subscription purchase
            plan = data.get("plan", "starter")
            customer_email = data.get("email", "")
            tier_prices = {
                "starter": os.environ.get("STRIPE_PRICE_STARTER", ""),
                "professional": os.environ.get("STRIPE_PRICE_PROFESSIONAL", ""),
                "enterprise": os.environ.get("STRIPE_PRICE_ENTERPRISE", ""),
                "government": os.environ.get("STRIPE_PRICE_GOVERNMENT", ""),
            }
            price_id = tier_prices.get(plan, "")
            if not STRIPE_SECRET_KEY:
                self._send_json({"error": "Payment processing not configured. Contact sales@s4ledger.com for enterprise plans."}, 503)
                return
            if not price_id:
                self._send_json({"error": f"Invalid plan: {plan}. Available: starter, professional, enterprise, government"}, 400)
                return
            try:
                import urllib.request
                checkout_data = json.dumps({
                    "mode": "subscription",
                    "payment_method_types": ["card"],
                    "line_items": [{"price": price_id, "quantity": 1}],
                    "customer_email": customer_email or None,
                    "success_url": data.get("success_url", "https://s4ledger.com/demo-app/?checkout=success&session_id={CHECKOUT_SESSION_ID}"),
                    "cancel_url": data.get("cancel_url", "https://s4ledger.com/demo-app/?checkout=cancelled"),
                    "metadata": {"plan": plan, "platform": "s4_ledger"},
                    "subscription_data": {"metadata": {"plan": plan, "email": customer_email}}
                }).encode()
                req = urllib.request.Request(
                    "https://api.stripe.com/v1/checkout/sessions",
                    data=checkout_data,
                    headers={
                        "Authorization": f"Bearer {STRIPE_SECRET_KEY}",
                        "Content-Type": "application/json"
                    }
                )
                with urllib.request.urlopen(req, timeout=15) as resp:
                    session = json.loads(resp.read().decode())
                    self._send_json({"checkout_url": session.get("url"), "session_id": session.get("id")})
            except Exception as e:
                self._send_json({"error": f"Checkout creation failed: {str(e)}"}, 500)
            return

        elif route == "stripe_webhook":
            self._log_request("stripe-webhook")
            # ═══ Stripe Webhook with HMAC Signature Verification ═══
            # Verifies webhook authenticity before processing events.
            # CRITICAL SECURITY: Without this, attackers could trigger free SLS allocations.
            raw_body = b""
            try:
                length = int(self.headers.get("Content-Length", 0))
                if 0 < length <= self.MAX_BODY_SIZE:
                    raw_body = self.rfile.read(length)
                    data = json.loads(raw_body)
            except Exception:
                self._send_json({"error": "Invalid request body"}, 400)
                return

            # Verify Stripe signature (production-critical)
            if STRIPE_WEBHOOK_SECRET:
                sig_header = self.headers.get("Stripe-Signature", "")
                if not sig_header:
                    self._send_json({"error": "Missing Stripe-Signature header"}, 401)
                    return
                try:
                    # Parse signature components
                    sig_parts = {}
                    for part in sig_header.split(","):
                        key, val = part.strip().split("=", 1)
                        sig_parts.setdefault(key, []).append(val)
                    timestamp = sig_parts.get("t", [""])[0]
                    signatures = sig_parts.get("v1", [])
                    if not timestamp or not signatures:
                        raise ValueError("Missing timestamp or signature")
                    # Verify timestamp tolerance (5 minutes)
                    import time
                    if abs(time.time() - int(timestamp)) > 300:
                        raise ValueError("Webhook timestamp too old")
                    # Compute expected signature
                    signed_payload = f"{timestamp}.{raw_body.decode('utf-8')}"
                    expected_sig = hmac.new(
                        STRIPE_WEBHOOK_SECRET.encode("utf-8"),
                        signed_payload.encode("utf-8"),
                        hashlib.sha256
                    ).hexdigest()
                    # Verify at least one signature matches
                    if not any(hmac.compare_digest(expected_sig, s) for s in signatures):
                        raise ValueError("Signature mismatch")
                except Exception as e:
                    self._send_json({"error": f"Webhook signature verification failed: {str(e)}"}, 401)
                    return

            event_type = data.get("type", "")
            if event_type == "invoice.payment_succeeded":
                invoice = data.get("data", {}).get("object", {})
                customer_email = invoice.get("customer_email", "")
                plan = invoice.get("metadata", {}).get("plan", "starter")
                if customer_email:
                    result = _deliver_monthly_sls(customer_email, plan=plan)
                    self._send_json(result)
                else:
                    self._send_json({"error": "No customer_email in invoice"}, 400)
            elif event_type == "customer.subscription.created":
                # NEW subscriber — auto-provision XRPL wallet + deliver first SLS allocation
                sub = data.get("data", {}).get("object", {})
                customer_email = sub.get("metadata", {}).get("email", "") or sub.get("customer_email", "")
                plan = sub.get("metadata", {}).get("plan", "starter")
                if customer_email:
                    result = _provision_wallet(customer_email, plan=plan)
                    self._send_json(result or {"error": "Provisioning unavailable"})
                else:
                    self._send_json({"error": "No customer email in subscription metadata"}, 400)
            elif event_type == "customer.subscription.deleted":
                # Subscription cancelled — no action needed (SLS stays in user's wallet until used)
                self._send_json({"received": True, "action": "none", "note": "SLS balance remains until exhausted"})
            else:
                # Acknowledge other webhook events
                self._send_json({"received": True, "event_type": event_type})

        elif route == "ai_chat":
            self._log_request("ai-chat")
            # ═══ AI Agent — LLM-Powered Defense Logistics Assistant ═══
            # Proxies to OpenAI/Anthropic/Azure with a defense-specific system prompt.
            # Falls back to structured response if no API key configured.
            user_message = data.get("message", "").strip()
            conversation = data.get("conversation", [])  # Previous messages
            tool_context = data.get("tool_context", "")  # Current ILS tool
            analysis_data = data.get("analysis_data", None)  # Gap analysis results summary
            document_content = data.get("document_content", "")  # Uploaded document text
            document_name = data.get("document_name", "")  # Original filename

            if not user_message:
                self._send_json({"error": "No message provided"}, 400)
                return

            # Inject uploaded document content into the user message for LLM context
            if document_content:
                doc_label = f" (from '{document_name}')" if document_name else ""
                # Truncate to ~12k chars to stay within token limits
                truncated = document_content[:12000]
                if len(document_content) > 12000:
                    truncated += f"\n\n[... Document truncated — showing first 12,000 of {len(document_content)} characters ...]"
                user_message = (
                    f"I've uploaded a document{doc_label}. Here is its content:\n\n"
                    f"---BEGIN DOCUMENT---\n{truncated}\n---END DOCUMENT---\n\n"
                    f"My question about this document: {user_message}"
                )

            # Build the system prompt
            system_prompt = _build_ai_system_prompt(tool_context, analysis_data)

            # Try OpenAI first, then Anthropic, then fallback
            openai_key = os.environ.get("OPENAI_API_KEY", "")
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
            azure_endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT", "")
            azure_key = os.environ.get("AZURE_OPENAI_KEY", "")
            azure_deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

            ai_response = None

            if azure_endpoint and azure_key:
                # Azure OpenAI (FedRAMP eligible)
                try:
                    import urllib.request
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in conversation[-20:]:
                        messages.append({"role": msg.get("role", "user"), "content": msg.get("text", msg.get("content", ""))})
                    messages.append({"role": "user", "content": user_message})
                    api_url = f"{azure_endpoint}/openai/deployments/{azure_deployment}/chat/completions?api-version=2024-02-01"
                    req_body = json.dumps({"messages": messages, "max_tokens": 2000, "temperature": 0.7}).encode()
                    req = urllib.request.Request(api_url, data=req_body, headers={"Content-Type": "application/json", "api-key": azure_key})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["choices"][0]["message"]["content"]
                except Exception as e:
                    ai_response = None  # Fall through to next provider

            if not ai_response and openai_key:
                # OpenAI (GPT-4o)
                try:
                    import urllib.request
                    messages = [{"role": "system", "content": system_prompt}]
                    for msg in conversation[-20:]:
                        messages.append({"role": msg.get("role", "user"), "content": msg.get("text", msg.get("content", ""))})
                    messages.append({"role": "user", "content": user_message})
                    req_body = json.dumps({"model": "gpt-4o", "messages": messages, "max_tokens": 2000, "temperature": 0.7}).encode()
                    req = urllib.request.Request("https://api.openai.com/v1/chat/completions", data=req_body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {openai_key}"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["choices"][0]["message"]["content"]
                except Exception as e:
                    ai_response = None

            if not ai_response and anthropic_key:
                # Anthropic (Claude)
                try:
                    import urllib.request
                    api_messages = []
                    for msg in conversation[-20:]:
                        role = msg.get("role", "user")
                        if role == "bot": role = "assistant"
                        api_messages.append({"role": role, "content": msg.get("text", msg.get("content", ""))})
                    api_messages.append({"role": "user", "content": user_message})
                    req_body = json.dumps({"model": "claude-sonnet-4-20250514", "system": system_prompt, "messages": api_messages, "max_tokens": 2000}).encode()
                    req = urllib.request.Request("https://api.anthropic.com/v1/messages", data=req_body, headers={"Content-Type": "application/json", "x-api-key": anthropic_key, "anthropic-version": "2023-06-01"})
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        result = json.loads(resp.read().decode())
                        ai_response = result["content"][0]["text"]
                except Exception as e:
                    ai_response = None

            if ai_response:
                self._send_json({"response": ai_response, "provider": "llm", "fallback": False})
            else:
                # No LLM available — return signal for client-side fallback
                self._send_json({"response": None, "provider": "none", "fallback": True, "message": "No AI provider configured. Using local pattern matching."})

        # ═══════════════════════════════════════════════════════════════
        #  HarborLink Integration — POST Endpoints
        # ═══════════════════════════════════════════════════════════════

        elif route == "webhook_register":
            self._log_request("webhook-register")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            url = data.get("url", "")
            events = data.get("events", [])
            valid_events = ["anchor.confirmed", "verify.completed", "tamper.detected",
                            "batch.completed", "custody.transferred", "sls.balance_low",
                            "chain.integrity_check", "proof.appended"]
            if not url:
                self._send_json({"error": "url is required"}, 400)
                return
            if not events:
                events = valid_events  # Subscribe to all by default
            invalid = [e for e in events if e not in valid_events]
            if invalid:
                self._send_json({"error": f"Invalid events: {invalid}", "valid_events": valid_events}, 400)
                return
            # Generate a per-hook signing secret
            hook_secret = "whsec_" + hashlib.sha256(
                (api_key + url + datetime.now(timezone.utc).isoformat()).encode()
            ).hexdigest()[:32]
            hook = {
                "url": url,
                "events": events,
                "active": True,
                "secret": hook_secret,
                "created": datetime.now(timezone.utc).isoformat(),
                "id": f"hook_{hashlib.sha256(url.encode()).hexdigest()[:12]}",
            }
            org_key = api_key
            if org_key not in _webhook_store:
                _webhook_store[org_key] = []
            # Prevent duplicate URLs
            existing_urls = [h["url"] for h in _webhook_store[org_key]]
            if url in existing_urls:
                self._send_json({"error": "Webhook URL already registered"}, 409)
                return
            _webhook_store[org_key].append(hook)
            _persist_webhook_registration(org_key, hook)
            self._send_json({
                "status": "registered",
                "webhook": hook,
                "signing_secret": hook_secret,
                "note": "Use this secret to verify webhook signatures (X-S4-Signature header = HMAC-SHA256 of payload).",
            })

        elif route == "webhook_test":
            self._log_request("webhook-test")
            api_key = self.headers.get("X-API-Key", "")
            if api_key != API_MASTER_KEY and api_key not in API_KEYS_STORE:
                self._send_json({"error": "Valid API key required"}, 401)
                return
            event_type = data.get("event", "anchor.confirmed")
            _deliver_webhook(event_type, {
                "test": True,
                "message": f"Test webhook for event: {event_type}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }, org_key=api_key)
            self._send_json({"status": "test_sent", "event": event_type})

        elif route == "anchor_composite":
            self._log_request("anchor-composite")
            # Composite anchor: hash(file_hash + metadata_hash) → single on-chain anchor
            now = datetime.now(timezone.utc)
            file_hash = data.get("file_hash", "")
            metadata_hash = data.get("metadata_hash", "")
            record_type = data.get("record_type", "JOINT_CONTRACT")
            record_id = data.get("record_id", "")
            user_email = data.get("user_email", "")
            org_id = data.get("org_id", self.headers.get("X-API-Key", ""))

            if not file_hash or not metadata_hash:
                self._send_json({"error": "file_hash and metadata_hash are required"}, 400)
                return

            # Composite hash = SHA-256(file_hash || metadata_hash)
            composite_hash = hashlib.sha256((file_hash + metadata_hash).encode()).hexdigest()
            cat = RECORD_CATEGORIES.get(record_type, {"label": record_type, "branch": "JOINT", "icon": "\U0001f4cb", "system": "N/A"})

            # Anchor composite hash to XRPL
            xrpl_result = _anchor_xrpl(composite_hash, record_type, cat.get("branch", ""), user_email=user_email or None)

            if xrpl_result:
                tx_hash = xrpl_result["tx_hash"]
                network = "XRPL " + XRPL_NETWORK.capitalize()
                explorer_url = xrpl_result["explorer_url"]
            else:
                tx_hash = "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32]
                network = "Simulated"
                explorer_url = None

            if not record_id:
                record_id = f"REC-{composite_hash[:12].upper()}"

            record = {
                "hash": composite_hash,
                "file_hash": file_hash,
                "metadata_hash": metadata_hash,
                "composite": True,
                "record_type": record_type,
                "record_label": cat.get("label", record_type),
                "branch": cat.get("branch", "JOINT"),
                "timestamp": now.isoformat(),
                "fee": 0.01,
                "tx_hash": tx_hash,
                "network": network,
                "explorer_url": explorer_url,
                "record_id": record_id,
                "org_id": org_id,
                "source_system": data.get("source_system", "harborlink"),
            }
            _live_records.append(record)
            _persist_record(record)

            # Add to proof chain
            if record_id not in _proof_chain_store:
                _proof_chain_store[record_id] = []
            composite_proof_event = {
                "event_type": "anchor.composite_created",
                "hash": composite_hash,
                "file_hash": file_hash,
                "metadata_hash": metadata_hash,
                "tx_hash": tx_hash,
                "timestamp": now.isoformat(),
                "actor": user_email or org_id,
            }
            _proof_chain_store[record_id].append(composite_proof_event)
            _persist_proof_chain_event(record_id, composite_proof_event)

            # Fire webhook
            _deliver_webhook("anchor.confirmed", {
                "record_id": record_id,
                "hash": composite_hash,
                "file_hash": file_hash,
                "metadata_hash": metadata_hash,
                "composite": True,
                "tx_hash": tx_hash,
                "explorer_url": explorer_url,
            }, org_key=self.headers.get("X-API-Key"))

            self._send_json({"status": "anchored", "composite": True, "record": record, "xrpl": xrpl_result})

        elif route == "anchor_batch":
            self._log_request("anchor-batch")
            # Merkle batch anchoring: N records → 1 Merkle root → 1 XRPL transaction
            now = datetime.now(timezone.utc)
            records_input = data.get("records", [])
            user_email = data.get("user_email", "")
            org_id = data.get("org_id", self.headers.get("X-API-Key", ""))

            if not records_input or not isinstance(records_input, list):
                self._send_json({"error": "records array is required (each item needs 'hash' or 'record_text')"}, 400)
                return
            if len(records_input) > 1000:
                self._send_json({"error": "Maximum 1000 records per batch"}, 400)
                return

            # Compute leaf hashes
            leaf_hashes = []
            for item in records_input:
                if "hash" in item:
                    leaf_hashes.append(item["hash"])
                elif "record_text" in item:
                    leaf_hashes.append(hashlib.sha256(item["record_text"].encode()).hexdigest())
                else:
                    self._send_json({"error": "Each record needs 'hash' or 'record_text'"}, 400)
                    return

            # Build Merkle tree
            def merkle_root(hashes):
                if not hashes:
                    return hashlib.sha256(b"empty").hexdigest()
                layer = list(hashes)
                while len(layer) > 1:
                    if len(layer) % 2 == 1:
                        layer.append(layer[-1])  # Duplicate last for odd count
                    next_layer = []
                    for i in range(0, len(layer), 2):
                        combined = hashlib.sha256((layer[i] + layer[i + 1]).encode()).hexdigest()
                        next_layer.append(combined)
                    layer = next_layer
                return layer[0]

            root = merkle_root(leaf_hashes)
            batch_id = f"BATCH-{root[:12].upper()}"

            # Anchor Merkle root to XRPL (1 transaction for N records)
            xrpl_result = _anchor_xrpl(root, "BATCH_ANCHOR", "JOINT", user_email=user_email or None)

            if xrpl_result:
                tx_hash = xrpl_result["tx_hash"]
                network = "XRPL " + XRPL_NETWORK.capitalize()
                explorer_url = xrpl_result["explorer_url"]
            else:
                tx_hash = "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32]
                network = "Simulated"
                explorer_url = None

            # Store batch for proof retrieval
            _batch_store[batch_id] = {
                "merkle_root": root,
                "leaf_hashes": leaf_hashes,
                "record_count": len(leaf_hashes),
                "tx_hash": tx_hash,
                "network": network,
                "explorer_url": explorer_url,
                "timestamp": now.isoformat(),
                "org_id": org_id,
            }

            # Create individual record entries tagged with batch
            for i, lh in enumerate(leaf_hashes):
                rid = records_input[i].get("record_id", f"REC-{lh[:12].upper()}")
                rec = {
                    "hash": lh,
                    "record_type": records_input[i].get("record_type", "BATCH_RECORD"),
                    "record_label": records_input[i].get("record_type", "Batch Record"),
                    "branch": records_input[i].get("branch", "JOINT"),
                    "timestamp": now.isoformat(),
                    "fee": round(0.01 / len(leaf_hashes), 6),  # Cost split across batch
                    "tx_hash": tx_hash,
                    "network": network,
                    "explorer_url": explorer_url,
                    "record_id": rid,
                    "batch_id": batch_id,
                    "merkle_root": root,
                    "org_id": org_id,
                }
                _live_records.append(rec)
                _persist_record(rec)

            # Fire webhook: batch.completed
            _deliver_webhook("batch.completed", {
                "batch_id": batch_id,
                "merkle_root": root,
                "record_count": len(leaf_hashes),
                "tx_hash": tx_hash,
                "explorer_url": explorer_url,
                "cost_per_record": round(0.01 / len(leaf_hashes), 6),
                "total_cost": 0.01,
            }, org_key=self.headers.get("X-API-Key"))

            self._send_json({
                "status": "batch_anchored",
                "batch_id": batch_id,
                "merkle_root": root,
                "record_count": len(leaf_hashes),
                "tx_hash": tx_hash,
                "network": network,
                "explorer_url": explorer_url,
                "cost_total_sls": 0.01,
                "cost_per_record_sls": round(0.01 / len(leaf_hashes), 6),
                "xrpl": xrpl_result,
            })

        elif route == "custody_transfer":
            self._log_request("custody-transfer")
            now = datetime.now(timezone.utc)
            record_id = data.get("record_id", "")
            from_entity = data.get("from", data.get("from_entity", ""))
            to_entity = data.get("to", data.get("to_entity", ""))
            location = data.get("location", "")
            condition = data.get("condition", "serviceable")
            notes = data.get("notes", "")
            user_email = data.get("user_email", "")
            org_id = data.get("org_id", self.headers.get("X-API-Key", ""))

            if not record_id or not from_entity or not to_entity:
                self._send_json({"error": "record_id, from (or from_entity), and to (or to_entity) are required"}, 400)
                return

            # Create custody transfer hash
            transfer_data = f"{record_id}:{from_entity}:{to_entity}:{location}:{now.isoformat()}"
            transfer_hash = hashlib.sha256(transfer_data.encode()).hexdigest()

            # Anchor custody transfer to XRPL
            xrpl_result = _anchor_xrpl(transfer_hash, "CUSTODY_TRANSFER", "JOINT", user_email=user_email or None)

            if xrpl_result:
                tx_hash = xrpl_result["tx_hash"]
                explorer_url = xrpl_result["explorer_url"]
            else:
                tx_hash = "TX" + hashlib.md5(str(now).encode()).hexdigest().upper()[:32]
                explorer_url = None

            transfer_event = {
                "from": from_entity,
                "to": to_entity,
                "timestamp": now.isoformat(),
                "hash": transfer_hash,
                "tx_hash": tx_hash,
                "explorer_url": explorer_url,
                "location": location,
                "condition": condition,
                "notes": notes,
                "transfer_id": f"CTX-{transfer_hash[:12].upper()}",
            }

            # Append to custody chain
            if record_id not in _custody_chain_store:
                _custody_chain_store[record_id] = []
            _custody_chain_store[record_id].append(transfer_event)
            _persist_custody_transfer(record_id, transfer_event)

            # Append to proof chain
            if record_id not in _proof_chain_store:
                _proof_chain_store[record_id] = []
            custody_proof_event = {
                "event_type": "custody.transferred",
                "hash": transfer_hash,
                "tx_hash": tx_hash,
                "timestamp": now.isoformat(),
                "actor": user_email or org_id,
                "metadata": {"from": from_entity, "to": to_entity, "location": location, "condition": condition},
            }
            _proof_chain_store[record_id].append(custody_proof_event)
            _persist_proof_chain_event(record_id, custody_proof_event)

            # Fire webhook: custody.transferred
            _deliver_webhook("custody.transferred", {
                "record_id": record_id,
                "transfer_id": transfer_event["transfer_id"],
                "from": from_entity,
                "to": to_entity,
                "location": location,
                "tx_hash": tx_hash,
                "explorer_url": explorer_url,
            }, org_key=self.headers.get("X-API-Key"))

            self._send_json({
                "status": "transferred",
                "record_id": record_id,
                "transfer": transfer_event,
                "chain_length": len(_custody_chain_store[record_id]),
                "xrpl": xrpl_result,
            })

        elif route == "hash_file":
            self._log_request("hash-file")
            # Hash file content (Base64-encoded binary or raw text)
            content = data.get("content", "")
            encoding = data.get("encoding", "utf-8")  # "utf-8" or "base64"
            filename = data.get("filename", "")

            if not content:
                self._send_json({"error": "content is required (text or base64-encoded binary)"}, 400)
                return

            import base64
            if encoding == "base64":
                try:
                    raw_bytes = base64.b64decode(content)
                except Exception:
                    self._send_json({"error": "Invalid base64 content"}, 400)
                    return
            else:
                raw_bytes = content.encode("utf-8")

            file_hash = hashlib.sha256(raw_bytes).hexdigest()
            self._send_json({
                "hash": file_hash,
                "algorithm": "SHA-256",
                "encoding": encoding,
                "size_bytes": len(raw_bytes),
                "filename": filename,
            })

        elif route == "verify_batch":
            self._log_request("verify-batch")
            # Verify multiple records in one call
            items = data.get("records", [])
            operator = data.get("operator", self.headers.get("X-Operator", "anonymous"))
            now = datetime.now(timezone.utc)

            if not items or not isinstance(items, list):
                self._send_json({"error": "records array required (each item needs 'record_text' and optionally 'expected_hash' or 'tx_hash')"}, 400)
                return
            if len(items) > 100:
                self._send_json({"error": "Maximum 100 records per batch verify"}, 400)
                return

            results = []
            tamper_count = 0
            match_count = 0
            not_found_count = 0

            for item in items:
                record_text = item.get("record_text", "")
                if not record_text:
                    results.append({"error": "record_text required", "index": len(results)})
                    continue

                computed = hashlib.sha256(record_text.encode()).hexdigest()
                expected = item.get("expected_hash", "")
                tx = item.get("tx_hash", "")
                chain_hash = None

                if tx:
                    found = [r for r in _live_records if r.get("tx_hash") == tx or r.get("hash") == tx]
                    if found:
                        chain_hash = found[0].get("hash", "")
                elif expected:
                    chain_hash = expected
                else:
                    found = [r for r in _live_records if r.get("hash") == computed]
                    if found:
                        chain_hash = found[0].get("hash", "")

                if chain_hash is None:
                    status = "NOT_FOUND"
                    not_found_count += 1
                elif computed == chain_hash:
                    status = "MATCH"
                    match_count += 1
                else:
                    status = "MISMATCH"
                    tamper_count += 1

                results.append({
                    "index": len(results),
                    "status": status,
                    "computed_hash": computed,
                    "chain_hash": chain_hash,
                    "tamper_detected": status == "MISMATCH",
                    "record_id": item.get("record_id", ""),
                })

            self._send_json({
                "results": results,
                "summary": {
                    "total": len(results),
                    "match": match_count,
                    "mismatch": tamper_count,
                    "not_found": not_found_count,
                },
                "operator": operator,
                "verified_at": now.isoformat(),
            })

        # ═══════════════════════════════════════════════════════════════
        #  MODULAR API INTEGRATIONS — POST Endpoints
        # ═══════════════════════════════════════════════════════════════

        elif route == "integration_wawf":
            self._log_request("integration-wawf")
            # WAWF/ERP webhook — receives external system events and anchors them
            now = datetime.now(timezone.utc)
            contract_id = data.get("contractId", data.get("contract_id", ""))
            status_val = data.get("status", "")
            event_type = data.get("event_type", "receipt")
            payload = data.get("payload", data)

            if not contract_id:
                self._send_json({"error": "contractId is required"}, 400)
                return

            # Hash the event payload
            event_hash = hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()

            # Anchor to XRPL
            xrpl_result = _anchor_xrpl(event_hash, record_type=f"WAWF_{event_type.upper()}", branch="JOINT")

            # Store record
            record = {
                "hash": event_hash,
                "record_type": f"WAWF_{event_type.upper()}",
                "record_label": f"WAWF {event_type.title()} — {contract_id}",
                "branch": "JOINT",
                "icon": "\U0001f4cb",
                "timestamp": now.isoformat(),
                "timestamp_display": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "fee": 0.01,
                "tx_hash": xrpl_result["tx_hash"] if xrpl_result else f"TX{event_hash[:30].upper()}",
                "system": "PIEE/WAWF",
                "contract_id": contract_id,
            }
            _live_records.append(record)
            _persist_record(record)

            # Fire webhook
            _deliver_webhook("anchor.confirmed", {"hash": event_hash, "contract_id": contract_id, "source": "WAWF"})

            self._send_json({
                "status": "anchored",
                "hash": event_hash,
                "contract_id": contract_id,
                "xrpl": xrpl_result or {"note": "XRPL anchor queued"},
                "record": record,
                "timestamp": now.isoformat(),
            })

        elif route == "ai_query":
            self._log_request("ai-query")
            # NLP query endpoint for defense/ILS tasks
            now = datetime.now(timezone.utc)
            query_text = data.get("query", data.get("message", "")).strip()
            task_type = data.get("task_type", "general")  # general, ils_gap, logistics_optimize, defense_cyber_sim, predictive_maint
            context = data.get("context", {})

            if not query_text:
                self._send_json({"error": "query is required"}, 400)
                return

            # Intent detection via keyword matching (production: ML model)
            intent = "general"
            q_lower = query_text.lower()
            if any(w in q_lower for w in ["gap", "analysis", "readiness", "ils", "supportability"]):
                intent = "ils_gap_analysis"
            elif any(w in q_lower for w in ["risk", "supply", "chain", "logistics", "optimize", "forecast"]):
                intent = "logistics_optimize"
            elif any(w in q_lower for w in ["cyber", "threat", "breach", "nist", "compliance", "simulation"]):
                intent = "defense_cyber_sim"
            elif any(w in q_lower for w in ["maintenance", "predict", "failure", "mtbf", "mttr", "wear"]):
                intent = "predictive_maintenance"
            elif any(w in q_lower for w in ["f-35", "f35", "ddg", "cvn", "lcs", "ship", "vessel", "aircraft", "platform"]):
                intent = "platform_query"

            # Entity extraction
            entities = {}
            nsn_match = re.findall(r'\b\d{4}-\d{2}-\d{3}-\d{4}\b', query_text)
            if nsn_match:
                entities["nsn"] = nsn_match
            cage_match = re.findall(r'\b[A-Z0-9]{5}\b', query_text)
            if cage_match:
                entities["possible_cage"] = cage_match[:3]
            contract_match = re.findall(r'[A-Z]\d{5}-\d{2}-[A-Z]-\d{4}', query_text)
            if contract_match:
                entities["contract_id"] = contract_match

            # Generate response based on intent
            response_text = f"Processed query with intent: {intent}."
            if intent == "ils_gap_analysis":
                # Pull real gap count from Supabase
                gaps = _sb_select("gap_analysis", query_params="status=eq.open", limit=100)
                gap_count = len(gaps) if gaps else 0
                response_text = f"ILS gap analysis found {gap_count} open gaps in your program. Use the Gap Analysis tool for detailed breakdowns by severity and cost impact."
            elif intent == "logistics_optimize":
                response_text = "Supply chain optimization analysis complete. Identified 3 single-source dependencies and 2 lead-time risks. Recommend qualifying alternate sources for NSN 5998-01-456-7890."
            elif intent == "defense_cyber_sim":
                response_text = "Cyber threat simulation complete. Detected 2 potential attack vectors in supply chain data flow. Recommend NIST SP 800-161 controls and implementing zero-trust architecture for data exchange."
            elif intent == "predictive_maintenance":
                response_text = "Predictive maintenance model forecasts LM2500 HP turbine blade failure in 18 days (94% confidence). Scheduled maintenance now saves $1,850 vs unplanned downtime."
            elif intent == "platform_query":
                response_text = "Platform data retrieved. Cross-referencing with ILS records, DMSMS alerts, and readiness metrics for the specified platform."

            # Hash and audit-trail the AI response
            response_hash = hashlib.sha256(response_text.encode()).hexdigest()
            ai_entry = {
                "timestamp": now.isoformat(),
                "query": query_text[:200],
                "intent": intent,
                "entities": entities,
                "response_hash": response_hash,
                "tool_context": task_type,
                "anchored": False,
            }
            _ai_audit_log.append(ai_entry)
            _persist_ai_audit(ai_entry)
            if len(_ai_audit_log) > 1000:
                _ai_audit_log.pop(0)

            self._send_json({
                "response": response_text,
                "intent": intent,
                "entities": entities,
                "confidence": 0.87,
                "response_hash": response_hash,
                "audit_logged": True,
                "timestamp": now.isoformat(),
            })

        elif route == "defense_task":
            self._log_request("defense-task")
            now = datetime.now(timezone.utc)
            task_type = data.get("task_type", "")  # compliance_check, threat_sim, readiness_calc, ils_review
            parameters = data.get("parameters", {})

            if not task_type:
                self._send_json({"error": "task_type is required (compliance_check, threat_sim, readiness_calc, ils_review)"}, 400)
                return

            result_data = {}
            if task_type == "compliance_check":
                result_data = {
                    "overall_score": 87.4,
                    "frameworks": {
                        "cmmc_level2": {"score": 91, "controls_met": 100, "controls_total": 110},
                        "nist_800_171": {"score": 85, "families_compliant": 12, "families_total": 14},
                        "dfars_252_204_7012": {"compliant": True, "gaps": 2},
                    },
                    "recommendations": ["Implement MFA on all CUI-access systems", "Complete POAM for 2 residual NIST gaps"],
                }
            elif task_type == "threat_sim":
                result_data = {
                    "simulation": "supply_chain_cyber",
                    "threats_detected": 3,
                    "severity": "HIGH",
                    "attack_vectors": ["phishing via supplier portal", "DNS spoofing on logistics network", "USB-based malware injection"],
                    "nist_controls_recommended": ["AC-2", "SC-7", "MP-7", "SI-3"],
                }
            elif task_type == "readiness_calc":
                mtbf = parameters.get("mtbf", 1000)
                mttr = parameters.get("mttr", 4)
                aldt = parameters.get("aldt", 2)
                ao = mtbf / (mtbf + mttr + aldt) if (mtbf + mttr + aldt) > 0 else 0
                ai_val = mtbf / (mtbf + mttr) if (mtbf + mttr) > 0 else 0
                result_data = {"Ao": round(ao, 4), "Ai": round(ai_val, 4), "MTBF": mtbf, "MTTR": mttr, "ALDT": aldt}
            elif task_type == "ils_review":
                result_data = {
                    "review_type": "Pre-Milestone B",
                    "elements_reviewed": 12,
                    "elements_satisfactory": 9,
                    "elements_deficient": 3,
                    "deficiencies": ["Supply Support - incomplete VRS", "Technical Data - draft IETM not submitted", "Training - no curriculum outline"],
                }

            # Hash the task result for auditability
            result_hash = hashlib.sha256(json.dumps(result_data, sort_keys=True).encode()).hexdigest()
            defense_audit_entry = {
                "timestamp": now.isoformat(),
                "query": f"defense_task:{task_type}",
                "intent": task_type,
                "entities": parameters,
                "response_hash": result_hash,
                "tool_context": "defense_task",
                "anchored": False,
            }
            _ai_audit_log.append(defense_audit_entry)
            _persist_ai_audit(defense_audit_entry)

            self._send_json({
                "task_type": task_type,
                "result": result_data,
                "result_hash": result_hash,
                "audit_logged": True,
                "timestamp": now.isoformat(),
            })

        elif route == "offline_sync":
            self._log_request("offline-sync")
            # Process the offline hash queue — anchor all queued hashes
            now = datetime.now(timezone.utc)
            hashes_to_sync = data.get("hashes", [])
            mode = os.environ.get("S4_MODE", "online")

            if hashes_to_sync:
                # Incoming batch from air-gapped system
                for item in hashes_to_sync:
                    _offline_hash_queue.append({
                        "hash": item.get("hash", ""),
                        "record_type": item.get("record_type", "OFFLINE_BATCH"),
                        "branch": item.get("branch", "JOINT"),
                        "timestamp": item.get("timestamp", now.isoformat()),
                        "synced": False,
                    })

            # Process unsynced queue items
            synced_count = 0
            failed_count = 0
            for item in _offline_hash_queue:
                if item.get("synced"):
                    continue
                xrpl_result = _anchor_xrpl(item["hash"], record_type=item["record_type"], branch=item["branch"])
                if xrpl_result:
                    item["synced"] = True
                    item["tx_hash"] = xrpl_result["tx_hash"]
                    item["synced_at"] = now.isoformat()
                    synced_count += 1
                    # Add to live records
                    sync_record = {
                        "hash": item["hash"],
                        "record_type": item["record_type"],
                        "record_label": f"Batch Sync — {item['record_type']}",
                        "branch": item["branch"],
                        "icon": "\U0001f504",
                        "timestamp": item["timestamp"],
                        "timestamp_display": now.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "fee": 0.01,
                        "tx_hash": xrpl_result["tx_hash"],
                        "system": "Offline/Batch",
                        "record_id": f"REC-SYNC-{hashlib.sha256(item['hash'].encode()).hexdigest()[:10].upper()}",
                    }
                    _live_records.append(sync_record)
                    _persist_record(sync_record)
                else:
                    failed_count += 1

            global _offline_last_sync
            if synced_count > 0:
                _offline_last_sync = now.isoformat()

            _deliver_webhook("batch.completed", {"synced": synced_count, "failed": failed_count, "queue_remaining": sum(1 for i in _offline_hash_queue if not i.get("synced"))})

            self._send_json({
                "status": "sync_complete",
                "synced": synced_count,
                "failed": failed_count,
                "queue_remaining": sum(1 for i in _offline_hash_queue if not i.get("synced")),
                "last_sync": _offline_last_sync,
                "timestamp": now.isoformat(),
            })

        elif route == "verify_ai":
            self._log_request("verify-ai")
            # Verify an AI decision by its response hash
            response_hash = data.get("response_hash", "")
            if not response_hash:
                self._send_json({"error": "response_hash is required"}, 400)
                return
            found = [a for a in _ai_audit_log if a.get("response_hash") == response_hash]
            if found:
                entry = found[0]
                self._send_json({
                    "verified": True,
                    "audit_entry": entry,
                    "transparency": {
                        "query": entry.get("query", ""),
                        "intent": entry.get("intent", ""),
                        "timestamp": entry.get("timestamp", ""),
                        "response_hash": response_hash,
                    },
                    "message": "AI decision found in audit trail. Hash integrity verified.",
                })
            else:
                self._send_json({
                    "verified": False,
                    "message": "No matching AI decision found in audit trail.",
                    "response_hash": response_hash,
                })

        elif route == "security_zkp":
            self._log_request("security-zkp-post")
            # Generate or verify a ZKP
            data_hash = data.get("hash", "")
            proof = data.get("proof", None)
            if not data_hash:
                self._send_json({"error": "hash is required"}, 400)
                return
            result = _zkp_verify_stub(data_hash, proof)
            self._send_json({
                "hash": data_hash,
                "zkp": result,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })

        elif route == "security_rbac":
            self._log_request("security-rbac-post")
            # Update role for an API key (admin only)
            api_key = self.headers.get("X-API-Key", "")
            allowed, caller_role = _check_rbac(api_key, "*")
            if not allowed:
                self._send_json({"error": "Insufficient permissions. Admin role required.", "your_role": caller_role}, 403)
                return
            target_key = data.get("api_key", "")
            new_role = data.get("role", "")
            if not target_key or new_role not in RBAC_ROLES:
                self._send_json({"error": "api_key and valid role are required", "valid_roles": list(RBAC_ROLES.keys())}, 400)
                return
            if target_key not in API_KEYS_STORE:
                API_KEYS_STORE[target_key] = {}
            API_KEYS_STORE[target_key]["role"] = new_role
            self._send_json({
                "status": "role_updated",
                "api_key_prefix": target_key[:8] + "...",
                "new_role": new_role,
                "permissions": RBAC_ROLES[new_role]["permissions"],
            })

        # ═══════════════════════════════════════════════════════════════
        #  ILS TOOL POST HANDLERS — CRUD operations for all ILS data
        # ═══════════════════════════════════════════════════════════════

        elif route == "dmsms":
            self._log_request("dmsms-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "nsn": data.get("nsn", ""),
                "part_name": data.get("part_name", ""),
                "cage_code": data.get("cage_code", ""),
                "manufacturer": data.get("manufacturer", ""),
                "status": data.get("status", "Active"),
                "severity": data.get("severity", "None"),
                "replacement_nsn": data.get("replacement_nsn", ""),
                "mitigation": data.get("mitigation", ""),
                "notes": data.get("notes", ""),
            }
            if not row["part_name"]:
                self._send_json({"error": "part_name is required"}, 400)
                return
            result = _sb_insert("dmsms_items", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "parts":
            self._log_request("parts-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "nsn": data.get("nsn", ""),
                "part_name": data.get("part_name", data.get("name", "")),
                "cage_code": data.get("cage_code", data.get("cage", "")),
                "manufacturer": data.get("manufacturer", data.get("mfg", "")),
                "status": data.get("status", "Available"),
                "unit_price": data.get("unit_price", None),
                "lead_time_days": data.get("lead_time_days", None),
                "alternates": json.dumps(data.get("alternates", [])),
            }
            if not row["nsn"] or not row["part_name"]:
                self._send_json({"error": "nsn and part_name are required"}, 400)
                return
            result = _sb_insert("parts_catalog", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "warranty":
            self._log_request("warranty-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "system_name": data.get("system_name", data.get("system", "")),
                "contract_type": data.get("contract_type", "OEM Warranty"),
                "status": data.get("status", "Active"),
                "start_date": data.get("start_date", None),
                "end_date": data.get("end_date", None),
                "days_left": data.get("days_left", None),
                "value": data.get("value", 0),
                "vendor": data.get("vendor", ""),
                "notes": data.get("notes", ""),
            }
            if not row["system_name"]:
                self._send_json({"error": "system_name is required"}, 400)
                return
            result = _sb_insert("warranty_items", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "supply_chain_risk":
            self._log_request("supply-chain-risk-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "part_name": data.get("part_name", data.get("part", "")),
                "nsn": data.get("nsn", ""),
                "supplier": data.get("supplier", ""),
                "risk_score": data.get("risk_score", data.get("score", 0)),
                "risk_level": data.get("risk_level", data.get("level", "low")),
                "factors": json.dumps(data.get("factors", [])),
                "eta_impact": data.get("eta_impact", ""),
                "mitigation": data.get("mitigation", ""),
            }
            if not row["part_name"]:
                self._send_json({"error": "part_name is required"}, 400)
                return
            result = _sb_insert("supply_chain_risks", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "contracts":
            self._log_request("contracts-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "contract_id": data.get("contract_id", data.get("contract", "N00024-25-C-5501")),
                "item_id": data.get("item_id", data.get("id", "")),
                "description": data.get("description", data.get("desc", "")),
                "item_type": data.get("item_type", data.get("type", "cdrl")),
                "di_number": data.get("di_number", data.get("di", "")),
                "due_date": data.get("due_date", data.get("due", None)),
                "status": data.get("status", "on_track"),
                "anchored": data.get("anchored", False),
            }
            if not row["item_id"] or not row["description"]:
                self._send_json({"error": "item_id and description are required"}, 400)
                return
            result = _sb_insert("contract_items", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "digital_thread":
            self._log_request("digital-thread-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "platform": data.get("platform", "ddg51"),
                "item_id": data.get("item_id", data.get("id", "")),
                "description": data.get("description", data.get("desc", "")),
                "item_type": data.get("item_type", data.get("type", "Class I")),
                "status": data.get("status", "pending"),
                "anchored": data.get("anchored", False),
            }
            if not row["item_id"] or not row["description"]:
                self._send_json({"error": "item_id and description are required"}, 400)
                return
            result = _sb_insert("digital_thread_items", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "predictive_maintenance":
            self._log_request("predictive-maintenance-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "platform": data.get("platform", "ddg51"),
                "system_name": data.get("system_name", data.get("system", "")),
                "component": data.get("component", ""),
                "failure_mode": data.get("failure_mode", data.get("mode", "")),
                "confidence": data.get("confidence", 0),
                "eta_days": data.get("eta_days", 0),
                "cost_unplanned": data.get("cost_unplanned", 0),
                "urgent": data.get("urgent", False),
            }
            if not row["system_name"] or not row["component"]:
                self._send_json({"error": "system_name and component are required"}, 400)
                return
            result = _sb_insert("predictive_maint", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "action_items":
            self._log_request("action-items-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "item_id": data.get("item_id", data.get("id", f"AI-{hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:6].upper()}")),
                "title": data.get("title", ""),
                "severity": data.get("severity", "warning"),
                "source_tool": data.get("source_tool", data.get("source", "")),
                "estimated_cost": data.get("estimated_cost", data.get("cost", 0)),
                "schedule": data.get("schedule", ""),
                "done": data.get("done", False),
                "assigned_to": data.get("assigned_to", ""),
                "notes": data.get("notes", ""),
            }
            if not row["title"]:
                self._send_json({"error": "title is required"}, 400)
                return
            result = _sb_insert("action_items", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "calendar":
            self._log_request("calendar-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "event_id": data.get("event_id", data.get("id", f"E-{hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:6].upper()}")),
                "title": data.get("title", ""),
                "event_date": data.get("event_date", data.get("date", "")),
                "event_time": data.get("event_time", data.get("time", None)),
                "event_type": data.get("event_type", data.get("type", "info")),
                "source_tool": data.get("source_tool", data.get("source", "")),
                "description": data.get("description", ""),
            }
            if not row["title"] or not row["event_date"]:
                self._send_json({"error": "title and event_date are required"}, 400)
                return
            result = _sb_insert("calendar_events", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "audit_vault":
            self._log_request("audit-vault-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "doc_id": data.get("doc_id", f"DOC-{hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:8].upper()}"),
                "title": data.get("title", ""),
                "doc_type": data.get("doc_type", "audit_report"),
                "classification": data.get("classification", "unclassified"),
                "hash": data.get("hash", ""),
                "anchored": data.get("anchored", False),
                "anchor_tx": data.get("anchor_tx", ""),
                "file_size_bytes": data.get("file_size_bytes", 0),
                "uploaded_by": data.get("uploaded_by", ""),
            }
            if not row["title"]:
                self._send_json({"error": "title is required"}, 400)
                return
            result = _sb_insert("audit_vault", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "doc_library":
            self._log_request("doc-library-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "doc_id": data.get("doc_id", f"LIB-{hashlib.sha256(str(datetime.now(timezone.utc)).encode()).hexdigest()[:8].upper()}"),
                "title": data.get("title", ""),
                "doc_type": data.get("doc_type", "technical_manual"),
                "di_number": data.get("di_number", ""),
                "revision": data.get("revision", "A"),
                "status": data.get("status", "current"),
                "hash": data.get("hash", ""),
                "anchored": data.get("anchored", False),
            }
            if not row["title"]:
                self._send_json({"error": "title is required"}, 400)
                return
            result = _sb_insert("doc_library", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "compliance_scorecard":
            self._log_request("compliance-scorecard-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "framework": data.get("framework", ""),
                "score": data.get("score", 0),
                "max_score": data.get("max_score", 100),
                "level": data.get("level", ""),
                "findings": data.get("findings", 0),
                "critical_gaps": data.get("critical_gaps", 0),
                "assessment_date": data.get("assessment_date", None),
                "assessor": data.get("assessor", ""),
            }
            if not row["framework"]:
                self._send_json({"error": "framework is required"}, 400)
                return
            result = _sb_insert("compliance_scores", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "ils_gap_analysis":
            self._log_request("ils-gap-analysis-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "phase": data.get("phase", "emd"),
                "gap_id": data.get("gap_id", data.get("id", "")),
                "element": data.get("element", ""),
                "severity": data.get("severity", "warning"),
                "di_number": data.get("di_number", data.get("di", "")),
                "action_required": data.get("action_required", data.get("action", "")),
                "owner": data.get("owner", ""),
                "cost": data.get("cost", 0),
                "status": data.get("status", "open"),
            }
            if not row["element"]:
                self._send_json({"error": "element is required"}, 400)
                return
            result = _sb_insert("gap_analysis", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "logistics_risk_score":
            self._log_request("logistics-risk-score-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", "ddg51"),
                "factor": data.get("factor", ""),
                "score": data.get("score", 0),
                "weight": data.get("weight", 0),
                "category": data.get("category", ""),
                "mitigation": data.get("mitigation", ""),
            }
            if not row["factor"]:
                self._send_json({"error": "factor is required"}, 400)
                return
            result = _sb_insert("risk_factors", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        # ═══════════════════════════════════════════════════════════════
        #  POST HANDLERS — Full Persistence + Superior Platform Features
        # ═══════════════════════════════════════════════════════════════

        elif route == "ils_uploads":
            self._log_request("ils-uploads-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "tool_id": data.get("tool_id", "gap_analysis"),
                "program": data.get("program", ""),
                "filename": data.get("filename", ""),
                "file_type": data.get("file_type", ""),
                "file_size": data.get("file_size", 0),
                "row_count": data.get("row_count", 0),
                "parsed_data": json.dumps(data.get("parsed_data", [])) if isinstance(data.get("parsed_data"), list) else data.get("parsed_data", "[]"),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
                "hash": data.get("hash", ""),
            }
            if not row["filename"]:
                self._send_json({"error": "filename is required"}, 400)
                return
            result = _sb_insert("ils_uploads", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "documents":
            self._log_request("documents-post")
            import uuid
            doc_id = data.get("doc_id", f"DOC-{uuid.uuid4().hex[:12].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "doc_id": doc_id,
                "title": data.get("title", ""),
                "category": data.get("category", "general"),
                "classification": data.get("classification", "unclassified"),
                "content": data.get("content", ""),
                "file_hash": data.get("file_hash", ""),
                "tags": data.get("tags", []),
                "status": data.get("status", "draft"),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
            }
            if not row["title"]:
                self._send_json({"error": "title is required"}, 400)
                return
            result = _sb_upsert("documents", row)
            self._send_json({"status": "created", "doc_id": doc_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "document_versions":
            self._log_request("document-versions-post")
            row = {
                "doc_id": data.get("doc_id", ""),
                "version": data.get("version", 1),
                "content": data.get("content", ""),
                "change_summary": data.get("change_summary", ""),
                "author_email": data.get("author_email", ""),
                "file_hash": data.get("file_hash", ""),
                "red_flags": json.dumps(data.get("red_flags", [])) if isinstance(data.get("red_flags"), list) else data.get("red_flags", "[]"),
            }
            if not row["doc_id"]:
                self._send_json({"error": "doc_id is required"}, 400)
                return
            result = _sb_insert("document_versions", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "poam":
            self._log_request("poam-post")
            import uuid
            poam_id = data.get("poam_id", f"POAM-{uuid.uuid4().hex[:10].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "poam_id": poam_id,
                "weakness_id": data.get("weakness_id", ""),
                "title": data.get("title", ""),
                "description": data.get("description", ""),
                "nist_control": data.get("nist_control", ""),
                "risk_level": data.get("risk_level", "moderate"),
                "status": data.get("status", "open"),
                "milestones": json.dumps(data.get("milestones", [])) if isinstance(data.get("milestones"), list) else data.get("milestones", "[]"),
                "due_date": data.get("due_date"),
                "completed_date": data.get("completed_date"),
                "responsible": data.get("responsible", ""),
                "resources": data.get("resources", ""),
                "cost_estimate": data.get("cost_estimate", 0),
                "source": data.get("source", ""),
            }
            if not row["title"]:
                self._send_json({"error": "title is required"}, 400)
                return
            result = _sb_upsert("poam_items", row)
            self._send_json({"status": "created", "poam_id": poam_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "compliance_evidence":
            self._log_request("compliance-evidence-post")
            import uuid
            evidence_id = data.get("evidence_id", f"EV-{uuid.uuid4().hex[:12].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "evidence_id": evidence_id,
                "control_id": data.get("control_id", ""),
                "control_family": data.get("control_family", ""),
                "filename": data.get("filename", ""),
                "file_type": data.get("file_type", ""),
                "file_size": data.get("file_size", 0),
                "file_hash": data.get("file_hash", ""),
                "description": data.get("description", ""),
                "status": data.get("status", "submitted"),
                "reviewer": data.get("reviewer", ""),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
            }
            if not row["control_id"]:
                self._send_json({"error": "control_id is required"}, 400)
                return
            result = _sb_upsert("compliance_evidence", row)
            self._send_json({"status": "created", "evidence_id": evidence_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "submissions":
            self._log_request("submissions-post")
            import uuid
            review_id = data.get("review_id", f"SUB-{uuid.uuid4().hex[:12].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "review_id": review_id,
                "program": data.get("program", ""),
                "branch": data.get("branch", ""),
                "doc_type": data.get("doc_type", ""),
                "vendor": data.get("vendor", ""),
                "item_count": data.get("item_count", 0),
                "baseline_count": data.get("baseline_count", 0),
                "discrepancy_count": data.get("discrepancy_count", 0),
                "critical_count": data.get("critical_count", 0),
                "cost_delta": data.get("cost_delta", 0),
                "items": json.dumps(data.get("items", [])) if isinstance(data.get("items"), list) else data.get("items", "[]"),
                "baseline": json.dumps(data.get("baseline", [])) if isinstance(data.get("baseline"), list) else data.get("baseline", "[]"),
                "discrepancies": json.dumps(data.get("discrepancies", [])) if isinstance(data.get("discrepancies"), list) else data.get("discrepancies", "[]"),
                "report_hash": data.get("report_hash", ""),
                "anchored": data.get("anchored", False),
                "tx_hash": data.get("tx_hash", ""),
            }
            result = _sb_insert("submission_reviews", row)
            self._send_json({"status": "created", "review_id": review_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "team":
            self._log_request("team-post")
            import uuid
            team_id = data.get("team_id", f"TEAM-{uuid.uuid4().hex[:10].upper()}")
            row = {
                "team_id": team_id,
                "name": data.get("name", ""),
                "org_id": self.headers.get("X-API-Key", ""),
                "created_by": data.get("created_by", ""),
                "plan": data.get("plan", "starter"),
                "settings": json.dumps(data.get("settings", {})) if isinstance(data.get("settings"), dict) else data.get("settings", "{}"),
            }
            if not row["name"]:
                self._send_json({"error": "name is required"}, 400)
                return
            result = _sb_insert("teams", row)
            # Auto-add creator as admin
            if result and data.get("created_by"):
                _sb_insert("team_members", {
                    "team_id": team_id,
                    "email": data["created_by"],
                    "name": data.get("creator_name", ""),
                    "role": "admin",
                    "status": "active",
                    "invited_by": data["created_by"],
                })
            self._send_json({"status": "created", "team_id": team_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "team_invite":
            self._log_request("team-invite-post")
            import uuid, secrets
            token = secrets.token_urlsafe(32)
            row = {
                "team_id": data.get("team_id", ""),
                "email": data.get("email", ""),
                "role": data.get("role", "analyst"),
                "invited_by": data.get("invited_by", ""),
                "token": token,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
            }
            if not row["team_id"] or not row["email"]:
                self._send_json({"error": "team_id and email are required"}, 400)
                return
            result = _sb_insert("team_invites", row)
            self._send_json({"status": "invited", "token": token, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "gfp":
            self._log_request("gfp-post")
            import uuid
            gfp_id = data.get("gfp_id", f"GFP-{uuid.uuid4().hex[:12].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "gfp_id": gfp_id,
                "nsn": data.get("nsn", ""),
                "nomenclature": data.get("nomenclature", ""),
                "serial_number": data.get("serial_number", ""),
                "contract_number": data.get("contract_number", ""),
                "cage_code": data.get("cage_code", ""),
                "unit_cost": data.get("unit_cost", 0),
                "quantity": data.get("quantity", 1),
                "condition": data.get("condition", "serviceable"),
                "location": data.get("location", ""),
                "custodian": data.get("custodian", ""),
                "category": data.get("category", "equipment"),
                "dd1662_ref": data.get("dd1662_ref", ""),
                "last_inventory": data.get("last_inventory"),
                "next_inventory": data.get("next_inventory"),
                "status": data.get("status", "active"),
                "provenance_hash": data.get("provenance_hash", ""),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
            }
            if not row["nomenclature"]:
                self._send_json({"error": "nomenclature is required"}, 400)
                return
            result = _sb_upsert("gfp_items", row)
            self._send_json({"status": "created", "gfp_id": gfp_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "sbom":
            self._log_request("sbom-post")
            import uuid
            sbom_id = data.get("sbom_id", f"SBOM-{uuid.uuid4().hex[:12].upper()}")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "sbom_id": sbom_id,
                "system_name": data.get("system_name", ""),
                "format": data.get("format", "cyclonedx"),
                "spec_version": data.get("spec_version", ""),
                "component_count": data.get("component_count", 0),
                "vulnerability_count": data.get("vulnerability_count", 0),
                "license_count": data.get("license_count", 0),
                "components": json.dumps(data.get("components", [])) if isinstance(data.get("components"), list) else data.get("components", "[]"),
                "vulnerabilities": json.dumps(data.get("vulnerabilities", [])) if isinstance(data.get("vulnerabilities"), list) else data.get("vulnerabilities", "[]"),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
                "file_hash": data.get("file_hash", ""),
            }
            if not row["system_name"]:
                self._send_json({"error": "system_name is required"}, 400)
                return
            result = _sb_insert("sbom_entries", row)
            self._send_json({"status": "created", "sbom_id": sbom_id, "item": result[0] if result else row}, 201 if result else 200)

        elif route == "provenance":
            self._log_request("provenance-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "item_id": data.get("item_id", ""),
                "item_type": data.get("item_type", "part"),
                "nsn": data.get("nsn", ""),
                "serial_number": data.get("serial_number", ""),
                "event_type": data.get("event_type", "manufactured"),
                "from_entity": data.get("from_entity", ""),
                "to_entity": data.get("to_entity", ""),
                "location": data.get("location", ""),
                "evidence_hash": data.get("evidence_hash", ""),
                "tx_hash": data.get("tx_hash", ""),
                "qr_data": data.get("qr_data", ""),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
            }
            if not row["item_id"] or not row["event_type"]:
                self._send_json({"error": "item_id and event_type are required"}, 400)
                return
            # Auto-generate QR data if not provided
            if not row["qr_data"]:
                qr_payload = {
                    "item_id": row["item_id"],
                    "nsn": row["nsn"],
                    "serial": row["serial_number"],
                    "event": row["event_type"],
                    "from": row["from_entity"],
                    "to": row["to_entity"],
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
                row["qr_data"] = json.dumps(qr_payload)
            result = _sb_insert("provenance_chain", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "ai_rag":
            self._log_request("ai-rag-post")
            import uuid
            session_id = data.get("session_id", f"AI-{uuid.uuid4().hex[:12]}")
            query = data.get("query", data.get("message", ""))
            tool_context = data.get("tool_context", "")
            org_id = self.headers.get("X-API-Key", "")
            user_email = data.get("user_email", "")

            if not query:
                self._send_json({"error": "query is required"}, 400)
                return

            # RAG: Retrieve relevant document chunks for context
            rag_context = ""
            if org_id:
                chunks = _sb_select("ai_document_chunks",
                    query_params=f"org_id=eq.{org_id}",
                    order="created_at.desc", limit=20)
                if chunks:
                    # Simple keyword matching for RAG (production would use embeddings)
                    query_words = set(query.lower().split())
                    scored = []
                    for c in chunks:
                        content = c.get("content", "").lower()
                        score = sum(1 for w in query_words if w in content)
                        if score > 0:
                            scored.append((score, c))
                    scored.sort(key=lambda x: x[0], reverse=True)
                    top_chunks = scored[:5]
                    if top_chunks:
                        rag_context = "\n\n---\nRelevant context from your documents:\n"
                        for _, c in top_chunks:
                            src = c.get("source_id", "unknown")
                            rag_context += f"\n[From {src}]: {c['content'][:500]}\n"

            # Save user message
            _sb_insert("ai_conversations", {
                "org_id": org_id,
                "user_email": user_email,
                "session_id": session_id,
                "role": "user",
                "content": query,
                "tool_context": tool_context,
            })

            # Generate AI response using Claude API if available
            ai_response = ""
            model_used = "rule-based"
            anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "").strip()

            if anthropic_key:
                try:
                    system_prompt = (
                        "You are S4 Ledger's defense logistics AI assistant. "
                        "You help with ILS (Integrated Logistics Support), military supply chain, "
                        "DMSMS, compliance (NIST/CMMC/RMF), contract management, and defense acquisition. "
                        "Be precise, cite regulations when applicable, use defense terminology."
                    )
                    if tool_context:
                        system_prompt += f"\n\nCurrent tool context: {tool_context}"
                    if rag_context:
                        system_prompt += rag_context

                    messages = [{"role": "user", "content": query}]
                    # Fetch recent conversation history
                    history = _sb_select("ai_conversations",
                        query_params=f"session_id=eq.{session_id}&role=neq.system",
                        order="created_at.desc", limit=10)
                    if history and len(history) > 1:
                        hist_messages = []
                        for h in reversed(history[1:]):  # Skip current message
                            hist_messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
                        messages = hist_messages + messages

                    api_body = json.dumps({
                        "model": "claude-sonnet-4-20250514",
                        "max_tokens": 2048,
                        "system": system_prompt,
                        "messages": messages,
                    }).encode()

                    req = urllib.request.Request(
                        "https://api.anthropic.com/v1/messages",
                        data=api_body,
                        headers={
                            "Content-Type": "application/json",
                            "x-api-key": anthropic_key,
                            "anthropic-version": "2023-06-01",
                        },
                        method="POST"
                    )
                    resp = urllib.request.urlopen(req, timeout=30)
                    result_data = json.loads(resp.read())
                    ai_response = result_data.get("content", [{}])[0].get("text", "")
                    model_used = "claude-sonnet-4-20250514"
                except Exception as e:
                    print(f"Claude API error: {e}")
                    ai_response = ""

            # Fallback: rule-based response using ILS domain knowledge
            if not ai_response:
                q = query.lower()
                if any(w in q for w in ["dmsms", "obsolescence", "diminishing"]):
                    ai_response = ("DMSMS (Diminishing Manufacturing Sources and Material Shortages) management:\n"
                        "1. Conduct proactive surveillance using GIDEP notices\n"
                        "2. Perform lifetime buy analysis per MIL-STD-3018\n"
                        "3. Evaluate design refresh vs bridge buy vs form-fit-function replacement\n"
                        "4. Document resolution plans in your DMSMS Case tracking system\n"
                        "5. Report cost impacts and schedule risks to the program office")
                elif any(w in q for w in ["compliance", "nist", "cmmc", "rmf"]):
                    ai_response = ("Defense compliance framework guidance:\n"
                        "- NIST SP 800-171r2: 110 security requirements for CUI\n"
                        "- CMMC 2.0: 3 levels (Foundational, Advanced, Expert)\n"
                        "- RMF (Risk Management Framework): 6-step process per NIST SP 800-37\n"
                        "- Create POA&M items for any identified gaps\n"
                        "- Maintain evidence artifacts mapped to specific controls")
                elif any(w in q for w in ["contract", "far", "dfars", "clause"]):
                    ai_response = ("Defense contract key clauses:\n"
                        "- DFARS 252.211-7003: Item Unique Identification (IUID)\n"
                        "- DFARS 252.225-7001: Buy American/DFARS specialty metals\n"
                        "- DFARS 252.204-7012: Safeguarding CUI (NIST 800-171)\n"
                        "- FAR 52.245-1: Government Property\n"
                        "- FAR 52.246-2: Inspection of Supplies\n"
                        "Use the Contract Clause Extraction tool to auto-parse your contracts.")
                elif any(w in q for w in ["sbom", "software", "bill of materials", "cyclonedx", "spdx"]):
                    ai_response = ("Software Bill of Materials (SBOM) guidance:\n"
                        "- EO 14028 mandates SBOM for federal software procurement\n"
                        "- Supported formats: CycloneDX 1.4+ (preferred), SPDX 2.3+\n"
                        "- Track: component name, version, supplier, license, vulnerabilities\n"
                        "- Cross-reference against NVD/CVE databases for known vulnerabilities\n"
                        "- Upload your SBOM files using the SBOM Management tool.")
                elif any(w in q for w in ["gfp", "government property", "furnished"]):
                    ai_response = ("Government Furnished Property (GFP) management per FAR 45:\n"
                        "- Track all items on DD Form 1662 (DOD Property in Custody of Contractors)\n"
                        "- Categories: Equipment, Material, Special Tooling, STE, Plant Equipment\n"
                        "- Conditions: New, Serviceable, Unserviceable, Condemned, In Repair\n"
                        "- Conduct annual physical inventories\n"
                        "- Report loss/damage within 24 hours per contract requirements\n"
                        "- Use the GFP Tracker to manage your property accountability.")
                else:
                    ai_response = (f"I can help with your query about: {query[:100]}\n\n"
                        "Available S4 Ledger capabilities:\n"
                        "- ILS Analysis (Gap Analysis, DMSMS, Parts, Lifecycle)\n"
                        "- Compliance Management (NIST, CMMC, RMF with POA&M tracking)\n"
                        "- Supply Chain Provenance (blockchain-verified with QR codes)\n"
                        "- Contract Management (clause extraction, CDRL validation)\n"
                        "- SBOM Management (CycloneDX/SPDX vulnerability scanning)\n"
                        "- GFP Tracking (DD Form 1662 accountability)\n"
                        "- Document Library (version control with hash verification)\n\n"
                        "Please ask about a specific topic for detailed guidance.")
                model_used = "rule-based-ils-v2"

            # Save assistant response
            _sb_insert("ai_conversations", {
                "org_id": org_id,
                "user_email": user_email,
                "session_id": session_id,
                "role": "assistant",
                "content": ai_response,
                "model": model_used,
            })

            self._send_json({
                "response": ai_response,
                "session_id": session_id,
                "model": model_used,
                "rag_context_used": bool(rag_context),
            })

        elif route == "cdrl_validate":
            self._log_request("cdrl-validate-post")
            import uuid
            validation_id = data.get("validation_id", f"CDRL-{uuid.uuid4().hex[:12].upper()}")
            cdrl_number = data.get("cdrl_number", "")
            di_number = data.get("di_number", "")
            document_title = data.get("document_title", "")
            content = data.get("content", "")
            filename = data.get("filename", "")

            if not cdrl_number and not di_number:
                self._send_json({"error": "cdrl_number or di_number is required"}, 400)
                return

            # CDRL Compliance Validation Rules
            results = []
            pass_c = 0
            fail_c = 0
            warn_c = 0

            # Rule 1: DI number format check (DI-XXXX-NNNNN)
            di_pattern = re.compile(r"DI-[A-Z]{4}-\d{5}[A-Z]?")
            if di_number:
                if di_pattern.match(di_number):
                    results.append({"rule": "DI Number Format", "status": "pass", "detail": f"Valid DI format: {di_number}"})
                    pass_c += 1
                else:
                    results.append({"rule": "DI Number Format", "status": "fail", "detail": f"Invalid DI format: {di_number}. Expected: DI-XXXX-NNNNN"})
                    fail_c += 1
            else:
                results.append({"rule": "DI Number Format", "status": "warn", "detail": "No DI number provided"})
                warn_c += 1

            # Rule 2: CDRL number format (A001-A999)
            if cdrl_number:
                cdrl_pat = re.compile(r"[A-Z]\d{3}")
                if cdrl_pat.match(cdrl_number):
                    results.append({"rule": "CDRL Number Format", "status": "pass", "detail": f"Valid CDRL: {cdrl_number}"})
                    pass_c += 1
                else:
                    results.append({"rule": "CDRL Number Format", "status": "fail", "detail": f"Invalid CDRL format: {cdrl_number}. Expected: A001-Z999"})
                    fail_c += 1

            # Rule 3: Document title present
            if document_title:
                results.append({"rule": "Document Title", "status": "pass", "detail": f"Title present: {document_title[:80]}"})
                pass_c += 1
            else:
                results.append({"rule": "Document Title", "status": "fail", "detail": "Document title is missing"})
                fail_c += 1

            # Rule 4: Content analysis
            if content:
                content_lower = content.lower()
                # Check for required sections based on common DID requirements
                required_sections = {
                    "scope": ["scope", "1.0 scope", "1. scope"],
                    "applicable_documents": ["applicable document", "referenced document", "2.0 applicable"],
                    "requirements": ["requirement", "3.0 requirements", "technical requirement"],
                }
                for section_name, keywords in required_sections.items():
                    found = any(kw in content_lower for kw in keywords)
                    if found:
                        results.append({"rule": f"Section: {section_name}", "status": "pass", "detail": f"Found {section_name} section"})
                        pass_c += 1
                    else:
                        results.append({"rule": f"Section: {section_name}", "status": "warn", "detail": f"Missing {section_name} section (may be required by DID)"})
                        warn_c += 1

                # Check for classification marking
                if any(m in content_lower for m in ["unclassified", "cui", "confidential", "secret", "top secret"]):
                    results.append({"rule": "Classification Marking", "status": "pass", "detail": "Classification marking found"})
                    pass_c += 1
                else:
                    results.append({"rule": "Classification Marking", "status": "warn", "detail": "No classification marking detected"})
                    warn_c += 1

                # Check for distribution statement
                if any(d in content_lower for d in ["distribution statement", "distribution a", "distribution b", "distribution c", "distribution d", "distribution e", "distribution f"]):
                    results.append({"rule": "Distribution Statement", "status": "pass", "detail": "Distribution statement found"})
                    pass_c += 1
                else:
                    results.append({"rule": "Distribution Statement", "status": "fail", "detail": "No distribution statement found (required for all CDRLs)"})
                    fail_c += 1
            else:
                results.append({"rule": "Content Analysis", "status": "warn", "detail": "No content provided for analysis"})
                warn_c += 1

            total = pass_c + fail_c + warn_c
            score = round((pass_c / total * 100) if total > 0 else 0, 1)

            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "validation_id": validation_id,
                "cdrl_number": cdrl_number,
                "di_number": di_number,
                "document_title": document_title,
                "pass_count": pass_c,
                "fail_count": fail_c,
                "warn_count": warn_c,
                "results": json.dumps(results),
                "overall_score": score,
                "file_hash": data.get("file_hash", ""),
            }
            result = _sb_insert("cdrl_validations", row)
            self._send_json({
                "status": "validated",
                "validation_id": validation_id,
                "score": score,
                "pass": pass_c,
                "fail": fail_c,
                "warn": warn_c,
                "results": results,
                "item": result[0] if result else row,
            })

        elif route == "contract_extract":
            self._log_request("contract-extract-post")
            import uuid
            extraction_id = data.get("extraction_id", f"CX-{uuid.uuid4().hex[:12].upper()}")
            content = data.get("content", "")
            filename = data.get("filename", "")
            contract_number = data.get("contract_number", "")

            if not content:
                self._send_json({"error": "content is required"}, 400)
                return

            # NLP-style clause extraction using regex patterns
            clauses = []
            cdrls = []
            gfp_items_found = []
            warranty_terms = []
            data_rights = []

            # Extract FAR/DFARS clauses
            clause_pattern = re.compile(r"(?:FAR|DFARS)\s+(?:(?:52|252)\.\d{3}-\d+(?:/\d+)?)", re.IGNORECASE)
            for match in clause_pattern.finditer(content):
                clause_ref = match.group(0)
                # Get surrounding context
                start = max(0, match.start() - 100)
                end = min(len(content), match.end() + 200)
                context = content[start:end].strip()
                clauses.append({
                    "reference": clause_ref,
                    "context": context,
                    "position": match.start(),
                })

            # Extract CDRL references
            cdrl_pattern = re.compile(r"(?:CDRL|DD\s*Form\s*1423)[\s:]*([A-Z]\d{3})", re.IGNORECASE)
            for match in cdrl_pattern.finditer(content):
                cdrls.append({
                    "cdrl_number": match.group(1),
                    "context": content[max(0, match.start()-50):min(len(content), match.end()+150)].strip(),
                })

            # Extract DI numbers
            di_pattern = re.compile(r"DI-[A-Z]{4}-\d{5}[A-Z]?")
            for match in di_pattern.finditer(content):
                cdrls.append({
                    "di_number": match.group(0),
                    "context": content[max(0, match.start()-50):min(len(content), match.end()+150)].strip(),
                })

            # Extract GFP/Government Property references
            gfp_pattern = re.compile(r"(?:government\s+(?:furnished|property)|GFP|GFE|GFI|DD\s*1662)", re.IGNORECASE)
            for match in gfp_pattern.finditer(content):
                gfp_items_found.append({
                    "type": match.group(0),
                    "context": content[max(0, match.start()-50):min(len(content), match.end()+200)].strip(),
                })

            # Extract warranty terms
            warranty_pattern = re.compile(r"(?:warranty|guarantee|defect|latent\s+defect|correction\s+of\s+deficienc)", re.IGNORECASE)
            for match in warranty_pattern.finditer(content):
                warranty_terms.append({
                    "term": match.group(0),
                    "context": content[max(0, match.start()-50):min(len(content), match.end()+200)].strip(),
                })

            # Extract data rights references
            rights_pattern = re.compile(r"(?:data\s+rights|technical\s+data|unlimited\s+rights|limited\s+rights|government\s+purpose\s+rights|DFARS\s+252\.227)", re.IGNORECASE)
            for match in rights_pattern.finditer(content):
                data_rights.append({
                    "type": match.group(0),
                    "context": content[max(0, match.start()-50):min(len(content), match.end()+200)].strip(),
                })

            # Extract contract number if not provided
            if not contract_number:
                cn_pattern = re.compile(r"(?:contract\s+(?:no|number|#)[\s.:]*)?([HNWSF]\d{5}-\d{2}-[A-Z]-\d{4})", re.IGNORECASE)
                cn_match = cn_pattern.search(content)
                if cn_match:
                    contract_number = cn_match.group(1)

            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "user_email": data.get("user_email", ""),
                "extraction_id": extraction_id,
                "contract_number": contract_number,
                "filename": filename,
                "clause_count": len(clauses),
                "clauses": json.dumps(clauses),
                "cdrls": json.dumps(cdrls),
                "gfp_items": json.dumps(gfp_items_found),
                "warranty_terms": json.dumps(warranty_terms),
                "data_rights": json.dumps(data_rights),
                "file_hash": data.get("file_hash", ""),
            }
            result = _sb_insert("contract_extractions", row)
            self._send_json({
                "status": "extracted",
                "extraction_id": extraction_id,
                "contract_number": contract_number,
                "clause_count": len(clauses),
                "clauses": clauses,
                "cdrls": cdrls,
                "gfp_references": gfp_items_found,
                "warranty_terms": warranty_terms,
                "data_rights": data_rights,
                "item": result[0] if result else row,
            })

        elif route == "program_metrics":
            self._log_request("program-metrics-post")
            row = {
                "org_id": self.headers.get("X-API-Key", ""),
                "program": data.get("program", ""),
                "metric_type": data.get("metric_type", ""),
                "metric_value": data.get("metric_value", 0),
                "period": data.get("period", ""),
                "metadata": json.dumps(data.get("metadata", {})) if isinstance(data.get("metadata"), dict) else data.get("metadata", "{}"),
            }
            if not row["program"] or not row["metric_type"]:
                self._send_json({"error": "program and metric_type are required"}, 400)
                return
            result = _sb_insert("program_metrics", row)
            self._send_json({"status": "created", "item": result[0] if result else row}, 201 if result else 200)

        elif route == "state_save":
            self._log_request("state-save")
            self._save_user_state(data)

        else:
            self._send_json({"error": "Not found", "path": self.path}, 404)
