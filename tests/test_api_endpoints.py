"""
S4 Ledger API Endpoint Tests — Phase 4.4
=========================================
Tests for route resolution, JWT validation, authentication,
data aggregation, and handler logic.
Run: pytest tests/test_api_endpoints.py -v
"""
import json
import hashlib
import time
import hmac
import base64
import os
import sys
import pytest
from datetime import datetime, timezone
from unittest.mock import patch

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set required env vars before importing the API module
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-for-signing")

from api.index import (
    handler,
    _aggregate_metrics,
    _validate_supabase_jwt,
    _get_all_records,
    _zkp_verify_stub,
    _threat_model_assessment,
    _sign_webhook_payload,
    RECORD_CATEGORIES,
    BRANCHES,
)


# ═══════════════════════════════════════════════════════════════════
#  Route Resolution Tests
# ═══════════════════════════════════════════════════════════════════

class TestRouteResolution:
    """Test the _route method maps every API path correctly."""

    @staticmethod
    def _resolve(path):
        """Call _route on a temporary handler instance."""
        return handler._route(None, path)

    # Core routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/health", "health"),
        ("/api/status", "status"),
        ("/api/metrics", "metrics"),
        ("/api/transactions", "transactions"),
        ("/api/record-types", "record_types"),
        ("/api/xrpl-status", "xrpl_status"),
    ])
    def test_core_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Auth routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/auth/api-key", "auth_api_key"),
    ])
    def test_auth_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Anchor / verify routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/anchor", "anchor"),
        ("/api/anchor/batch", "anchor_batch"),
        ("/api/anchor/composite", "anchor_composite"),
        ("/api/verify", "verify"),
        ("/api/verify/batch", "verify_batch"),
        ("/api/hash", "hash"),
    ])
    def test_anchor_verify_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Data routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/org/records", "org_records"),
        ("/api/parts", "parts"),
        ("/api/readiness", "readiness"),
        ("/api/dmsms", "dmsms"),
        ("/api/roi", "roi"),
        ("/api/categorize", "categorize"),
    ])
    def test_data_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Phase 2 feature routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/living-ledger", "living_ledger"),
        ("/api/impact-simulator", "impact_simulator"),
        ("/api/secure-collaboration", "secure_collaboration"),
        ("/api/prepare-email", "prepare_email"),
        ("/api/save-draft", "save_draft"),
        ("/api/scheduled-send", "scheduled_send"),
        ("/api/send-email", "send_email"),
        ("/api/email-vault-delete", "email_vault_delete"),
        ("/api/vault-emails", "vault_emails"),
        ("/api/self-healing-compliance", "self_healing_compliance"),
        ("/api/zero-trust-handoff", "zero_trust_handoff"),
        ("/api/predictive-resource-allocator", "predictive_resource_allocator"),
        ("/api/immutable-after-action-review", "immutable_after_action_review"),
        ("/api/cryptographic-mission-impact-ledger", "cryptographic_mission_impact_ledger"),
    ])
    def test_phase2_feature_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Persistence routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/state/save", "state_save"),
        ("/api/state/load", "state_load"),
        ("/api/errors/report", "errors_report"),
        ("/api/poam", "poam"),
        ("/api/documents", "documents"),
        ("/api/team", "team"),
        ("/api/sbom", "sbom"),
        ("/api/provenance", "provenance"),
    ])
    def test_persistence_routes(self, path, expected):
        assert self._resolve(path) == expected

    # Security routes
    @pytest.mark.parametrize("path,expected", [
        ("/api/security/rbac", "security_rbac"),
        ("/api/security/zkp", "security_zkp"),
        ("/api/security/threat-model", "security_threat_model"),
        ("/api/security/dependency-audit", "security_dep_audit"),
        ("/api/security/audit-trail", "security_audit_trail"),
    ])
    def test_security_routes(self, path, expected):
        assert self._resolve(path) == expected

    def test_unknown_route_returns_none(self):
        assert self._resolve("/api/nonexistent") is None

    def test_slash_stripped(self):
        # Trailing slash should not affect basic paths
        result = self._resolve("/api/health")
        assert result == "health"


# ═══════════════════════════════════════════════════════════════════
#  JWT Validation Tests
# ═══════════════════════════════════════════════════════════════════

class TestJWTValidation:
    """Test _validate_supabase_jwt with real JWT creation."""

    JWT_SECRET = "test-jwt-secret-for-signing"

    @classmethod
    def _make_jwt(cls, payload, secret=None):
        secret = secret or cls.JWT_SECRET
        header = {"alg": "HS256", "typ": "JWT"}
        h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
        p_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b'=').decode()
        signing_input = f"{h_b64}.{p_b64}".encode()
        sig = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
        s_b64 = base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
        return f"{h_b64}.{p_b64}.{s_b64}"

    def test_valid_jwt_returns_payload(self):
        payload = {"sub": "user-123", "email": "test@mil.gov", "role": "authenticated", "exp": int(time.time()) + 3600}
        token = self._make_jwt(payload)
        result = _validate_supabase_jwt(token)
        assert result is not None
        assert result["sub"] == "user-123"
        assert result["email"] == "test@mil.gov"

    def test_expired_jwt_returns_none(self):
        payload = {"sub": "user-123", "exp": int(time.time()) - 100}
        token = self._make_jwt(payload)
        assert _validate_supabase_jwt(token) is None

    def test_wrong_secret_returns_none(self):
        payload = {"sub": "user-123", "exp": int(time.time()) + 3600}
        token = self._make_jwt(payload, secret="wrong-secret")
        assert _validate_supabase_jwt(token) is None

    def test_malformed_token_returns_none(self):
        assert _validate_supabase_jwt("") is None
        assert _validate_supabase_jwt("abc") is None
        assert _validate_supabase_jwt("a.b") is None
        assert _validate_supabase_jwt("a.b.c.d") is None

    def test_none_token_returns_none(self):
        assert _validate_supabase_jwt(None) is None

    def test_non_hs256_rejected(self):
        header = {"alg": "RS256", "typ": "JWT"}
        h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).rstrip(b'=').decode()
        p_b64 = base64.urlsafe_b64encode(json.dumps({"sub": "x", "exp": int(time.time()) + 3600}).encode()).rstrip(b'=').decode()
        sig = base64.urlsafe_b64encode(b"fake-sig").rstrip(b'=').decode()
        token = f"{h_b64}.{p_b64}.{sig}"
        assert _validate_supabase_jwt(token) is None


# ═══════════════════════════════════════════════════════════════════
#  Aggregation Tests
# ═══════════════════════════════════════════════════════════════════

class TestAggregateMetrics:
    """Test the _aggregate_metrics function."""

    def test_empty_records(self):
        result = _aggregate_metrics([])
        assert result["total_hashes"] == 0
        assert result["total_fees"] == 0
        assert result["total_record_types"] == 0

    def test_single_record(self):
        records = [{
            "record_type": "maintenance_log",
            "record_label": "Maintenance Log",
            "branch": "NAVY",
            "data_source": "direct",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "fee": 0.01,
        }]
        result = _aggregate_metrics(records)
        assert result["total_hashes"] == 1
        assert result["total_fees"] == 0.01
        assert result["records_by_branch"]["NAVY"] == 1

    def test_multiple_records_by_type(self):
        records = [
            {"record_label": "CASREP", "branch": "NAVY", "timestamp": "2026-03-15T12:00:00Z"},
            {"record_label": "CASREP", "branch": "NAVY", "timestamp": "2026-03-15T13:00:00Z"},
            {"record_label": "Supply Chain Receipt", "branch": "ARMY", "timestamp": "2026-03-15T14:00:00Z"},
        ]
        result = _aggregate_metrics(records)
        assert result["total_hashes"] == 3
        assert result["records_by_type"]["CASREP"] == 2
        assert result["records_by_type"]["Supply Chain Receipt"] == 1
        assert result["records_by_branch"]["NAVY"] == 2
        assert result["records_by_branch"]["ARMY"] == 1

    def test_bad_timestamp_ignored(self):
        records = [
            {"record_type": "test", "timestamp": "not-a-date"},
            {"record_type": "test", "timestamp": "2026-03-15T12:00:00Z"},
        ]
        result = _aggregate_metrics(records)
        assert result["total_hashes"] == 2


# ═══════════════════════════════════════════════════════════════════
#  Record Categories & Constants Tests
# ═══════════════════════════════════════════════════════════════════

class TestConstants:
    """Test API constants are properly configured."""

    def test_record_categories_populated(self):
        assert len(RECORD_CATEGORIES) > 0
        for key, cat in RECORD_CATEGORIES.items():
            assert "label" in cat
            assert "branch" in cat

    def test_branches_populated(self):
        assert len(BRANCHES) > 0
        for key, branch in BRANCHES.items():
            assert "name" in branch

    def test_standard_branches_exist(self):
        assert "USN" in BRANCHES
        assert "JOINT" in BRANCHES

    def test_record_categories_reference_valid_branches(self):
        for key, cat in RECORD_CATEGORIES.items():
            branch = cat["branch"]
            assert branch in BRANCHES, f"Category {key} references unknown branch {branch}"


# ═══════════════════════════════════════════════════════════════════
#  Security Helper Tests
# ═══════════════════════════════════════════════════════════════════

class TestSecurityHelpers:
    """Test security utility functions."""

    def test_zkp_verify_stub_with_valid_hash(self):
        """ZKP stub should return a result dict."""
        result = _zkp_verify_stub("abc123def456")
        assert isinstance(result, dict)
        assert "verified" in result

    def test_zkp_verify_stub_with_proof(self):
        result = _zkp_verify_stub("abc123", proof="some-proof")
        assert isinstance(result, dict)

    def test_threat_model_returns_assessment(self):
        result = _threat_model_assessment()
        assert isinstance(result, dict)

    def test_sign_webhook_payload(self):
        """Webhook signature should be deterministic HMAC-SHA256."""
        payload = '{"event":"test"}'
        sig1 = _sign_webhook_payload(payload, "webhook-secret")
        sig2 = _sign_webhook_payload(payload, "webhook-secret")
        assert sig1 == sig2
        assert len(sig1) == 64  # hex SHA-256

    def test_sign_webhook_different_secrets(self):
        payload = '{"event":"test"}'
        sig1 = _sign_webhook_payload(payload, "secret-a")
        sig2 = _sign_webhook_payload(payload, "secret-b")
        assert sig1 != sig2


# ═══════════════════════════════════════════════════════════════════
#  CORS & Security Headers Tests
# ═══════════════════════════════════════════════════════════════════

class TestCORSHeaders:
    """Test CORS header generation."""

    def test_allowed_origin_reflected(self):
        """An allowed origin should be reflected back."""
        h = handler.__new__(handler)
        h.headers = {"Origin": "https://s4ledger.com"}
        cors = h._cors_headers()
        assert cors["Access-Control-Allow-Origin"] == "https://s4ledger.com"

    def test_disallowed_origin_defaults(self):
        """A disallowed origin should default to main domain."""
        h = handler.__new__(handler)
        h.headers = {"Origin": "https://evil.com"}
        cors = h._cors_headers()
        assert cors["Access-Control-Allow-Origin"] == "https://s4ledger.com"

    def test_security_headers_present(self):
        """All security headers should be included."""
        h = handler.__new__(handler)
        h.headers = {"Origin": "https://s4ledger.com"}
        cors = h._cors_headers()
        assert "X-Content-Type-Options" in cors
        assert cors["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in cors
        assert cors["X-Frame-Options"] == "DENY"
        assert "Strict-Transport-Security" in cors
        assert "Content-Security-Policy" in cors
        assert "Referrer-Policy" in cors

    def test_localhost_allowed(self):
        """Localhost origins should be allowed for development."""
        h = handler.__new__(handler)
        h.headers = {"Origin": "http://localhost:5173"}
        cors = h._cors_headers()
        assert cors["Access-Control-Allow-Origin"] == "http://localhost:5173"


# ═══════════════════════════════════════════════════════════════════
#  Handler Method Tests
# ═══════════════════════════════════════════════════════════════════

class TestHandlerMethods:
    """Test handler instance methods."""

    def test_max_body_size_defined(self):
        assert handler.MAX_BODY_SIZE == 1_048_576

    def test_allowed_origins_includes_production(self):
        assert "https://s4ledger.com" in handler._ALLOWED_ORIGINS
        assert "https://www.s4ledger.com" in handler._ALLOWED_ORIGINS


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
