"""
S4 Ledger — OpenAPI 3.1 Specification
Auto-generated from api/index.py endpoint definitions.
Serves as the single source of truth for REST API documentation.
"""

OPENAPI_SPEC = {
    "openapi": "3.1.0",
    "info": {
        "title": "S4 Ledger API",
        "version": "5.2.0",
        "description": "Defense record anchoring, verification, and ILS management API. "
                       "Anchors SHA-256 hashes to the XRP Ledger for immutable audit trails.",
        "contact": {
            "name": "S4 Systems, LLC",
            "url": "https://s4ledger.com",
            "email": "support@s4systems.io",
        },
        "license": {
            "name": "Proprietary",
            "url": "https://s4ledger.com/license",
        },
    },
    "servers": [
        {"url": "https://s4ledger.com", "description": "Production"},
        {"url": "http://localhost:3000", "description": "Local development"},
    ],
    "security": [
        {"ApiKeyAuth": []},
    ],
    "tags": [
        {"name": "Anchoring", "description": "Hash and anchor records to XRPL"},
        {"name": "Verification", "description": "Verify record integrity against chain"},
        {"name": "Metrics", "description": "Platform metrics and analytics"},
        {"name": "ILS", "description": "Integrated Logistics Support tools"},
        {"name": "AI Agent", "description": "Defense logistics AI assistant"},
        {"name": "Wallet", "description": "SLS wallet management"},
        {"name": "Webhooks", "description": "Event notification webhooks"},
        {"name": "Security", "description": "RBAC, ZKP, threat model, dependency audit"},
        {"name": "Offline", "description": "Air-gapped and offline queue operations"},
        {"name": "HarborLink", "description": "HarborLink integration endpoints"},
        {"name": "Health", "description": "Platform health and status"},
    ],
    "paths": {
        "/api/health": {
            "get": {
                "tags": ["Health"],
                "summary": "Platform health check",
                "description": "Returns API status, XRPL connectivity, uptime, and version info.",
                "responses": {
                    "200": {
                        "description": "Healthy",
                        "content": {
                            "application/json": {
                                "schema": {
                                    "type": "object",
                                    "properties": {
                                        "status": {"type": "string", "example": "ok"},
                                        "version": {"type": "string", "example": "5.2.0"},
                                        "xrpl_connected": {"type": "boolean"},
                                        "uptime_seconds": {"type": "number"},
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        "/api/anchor": {
            "post": {
                "tags": ["Anchoring"],
                "summary": "Anchor a record hash to XRPL",
                "description": "Computes SHA-256 hash of the record data and anchors it to the XRP Ledger. "
                               "Returns the transaction hash and explorer link.",
                "security": [{"ApiKeyAuth": []}],
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["data"],
                                "properties": {
                                    "data": {
                                        "type": "string",
                                        "description": "The data to hash and anchor",
                                    },
                                    "record_type": {
                                        "type": "string",
                                        "description": "Defense record type code (e.g., 'USN_SUPPLY_RECEIPT')",
                                        "default": "CUSTOM",
                                    },
                                    "branch": {
                                        "type": "string",
                                        "enum": ["USN", "JOINT"],
                                        "default": "JOINT",
                                    },
                                    "metadata": {
                                        "type": "object",
                                        "description": "Additional metadata (not stored on-chain)",
                                    },
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {
                        "description": "Record anchored successfully",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/AnchorResult"},
                            },
                        },
                    },
                    "429": {"description": "Rate limit exceeded"},
                },
            },
        },
        "/api/verify": {
            "post": {
                "tags": ["Verification"],
                "summary": "Verify a record against its chain anchor",
                "description": "Compares a local record hash against the anchored hash on XRPL.",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["hash"],
                                "properties": {
                                    "hash": {
                                        "type": "string",
                                        "description": "SHA-256 hash to verify",
                                    },
                                    "tx_hash": {
                                        "type": "string",
                                        "description": "XRPL transaction hash to verify against",
                                    },
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {
                        "description": "Verification result",
                        "content": {
                            "application/json": {
                                "schema": {"$ref": "#/components/schemas/VerifyResult"},
                            },
                        },
                    },
                },
            },
        },
        "/api/records": {
            "get": {
                "tags": ["Metrics"],
                "summary": "Get all anchored records with optional filters",
                "parameters": [
                    {"name": "type", "in": "query", "schema": {"type": "string"}, "description": "Filter by record type"},
                    {"name": "branch", "in": "query", "schema": {"type": "string"}, "description": "Filter by branch (USN/JOINT)"},
                    {"name": "limit", "in": "query", "schema": {"type": "integer", "default": 100}},
                    {"name": "offset", "in": "query", "schema": {"type": "integer", "default": 0}},
                ],
                "responses": {
                    "200": {"description": "List of anchored records"},
                },
            },
        },
        "/api/metrics": {
            "get": {
                "tags": ["Metrics"],
                "summary": "Platform metrics and analytics",
                "description": "Aggregated metrics: total hashes, fees, records by type/branch, time series data.",
                "responses": {
                    "200": {"description": "Metrics data"},
                },
            },
        },
        "/api/ai/query": {
            "post": {
                "tags": ["AI Agent"],
                "summary": "Query the S4 AI Agent",
                "description": "Send a natural language query to the defense logistics AI assistant.",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["query"],
                                "properties": {
                                    "query": {"type": "string", "description": "User's question or request"},
                                    "tool_context": {"type": "string", "description": "Current ILS tool context"},
                                    "session_id": {"type": "string"},
                                    "analysis_data": {"type": "object"},
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {"description": "AI response"},
                },
            },
        },
        "/api/wallet/register": {
            "post": {
                "tags": ["Wallet"],
                "summary": "Register a new XRPL wallet for SLS operations",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["email"],
                                "properties": {
                                    "email": {"type": "string"},
                                    "plan": {"type": "string", "enum": ["pilot", "starter", "professional", "enterprise"]},
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {"description": "Wallet created with SLS allocation"},
                },
            },
        },
        "/api/wallet/balance": {
            "get": {
                "tags": ["Wallet"],
                "summary": "Get SLS and XRP balance for a wallet",
                "parameters": [
                    {"name": "address", "in": "query", "schema": {"type": "string"}, "required": True},
                ],
                "responses": {
                    "200": {"description": "Balance info"},
                },
            },
        },
        "/api/webhooks": {
            "post": {
                "tags": ["Webhooks"],
                "summary": "Register a webhook endpoint",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["url", "events"],
                                "properties": {
                                    "url": {"type": "string", "format": "uri"},
                                    "events": {
                                        "type": "array",
                                        "items": {
                                            "type": "string",
                                            "enum": ["anchor.confirmed", "verify.completed",
                                                     "tamper.detected", "batch.completed",
                                                     "custody.transferred", "sls.balance_low"],
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {"description": "Webhook registered"},
                },
            },
            "get": {
                "tags": ["Webhooks"],
                "summary": "List registered webhooks",
                "responses": {
                    "200": {"description": "Webhook list"},
                },
            },
        },
        "/api/security/rbac": {
            "get": {
                "tags": ["Security"],
                "summary": "Get RBAC roles and permissions",
                "responses": {
                    "200": {"description": "RBAC configuration"},
                },
            },
        },
        "/api/security/zkp": {
            "post": {
                "tags": ["Security"],
                "summary": "Generate or verify a zero-knowledge proof",
                "requestBody": {
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "hash": {"type": "string"},
                                    "proof": {"type": "object"},
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {"description": "ZKP result"},
                },
            },
        },
        "/api/security/threat-model": {
            "get": {
                "tags": ["Security"],
                "summary": "Get STRIDE threat model assessment",
                "responses": {
                    "200": {"description": "Threat model"},
                },
            },
        },
        "/api/offline/queue": {
            "get": {
                "tags": ["Offline"],
                "summary": "Get offline queue status",
                "responses": {
                    "200": {"description": "Queue statistics"},
                },
            },
            "post": {
                "tags": ["Offline"],
                "summary": "Add records to offline queue for batch sync",
                "requestBody": {
                    "required": True,
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "required": ["records"],
                                "properties": {
                                    "records": {
                                        "type": "array",
                                        "items": {
                                            "type": "object",
                                            "properties": {
                                                "hash": {"type": "string"},
                                                "record_type": {"type": "string"},
                                                "encrypted": {"type": "boolean"},
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                "responses": {
                    "200": {"description": "Records queued"},
                },
            },
        },
        "/api/offline/sync": {
            "post": {
                "tags": ["Offline"],
                "summary": "Trigger batch sync of offline queue to XRPL",
                "responses": {
                    "200": {"description": "Sync result"},
                },
            },
        },
        "/api/metrics/prometheus": {
            "get": {
                "tags": ["Metrics"],
                "summary": "Prometheus-compatible metrics endpoint",
                "description": "Returns metrics in Prometheus text exposition format.",
                "responses": {
                    "200": {
                        "description": "Prometheus metrics",
                        "content": {"text/plain": {}},
                    },
                },
            },
        },
    },
    "components": {
        "securitySchemes": {
            "ApiKeyAuth": {
                "type": "apiKey",
                "in": "header",
                "name": "X-API-Key",
                "description": "API key for authenticated endpoints",
            },
        },
        "schemas": {
            "AnchorResult": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "example": "anchored"},
                    "hash": {"type": "string", "description": "SHA-256 hash of the record"},
                    "tx_hash": {"type": "string", "description": "XRPL transaction hash"},
                    "explorer_url": {"type": "string", "format": "uri"},
                    "record_type": {"type": "string"},
                    "branch": {"type": "string"},
                    "fee": {"type": "number", "example": 0.01},
                    "timestamp": {"type": "string", "format": "date-time"},
                },
            },
            "VerifyResult": {
                "type": "object",
                "properties": {
                    "status": {"type": "string", "enum": ["verified", "tampered", "not_found"]},
                    "hash_match": {"type": "boolean"},
                    "chain_hash": {"type": "string"},
                    "local_hash": {"type": "string"},
                    "tx_hash": {"type": "string"},
                    "tamper_detected": {"type": "boolean"},
                    "verified_at": {"type": "string", "format": "date-time"},
                },
            },
        },
    },
}


def get_openapi_spec() -> dict:
    """Return the OpenAPI spec dict."""
    return OPENAPI_SPEC


def get_openapi_json() -> str:
    """Return the OpenAPI spec as formatted JSON."""
    import json
    return json.dumps(OPENAPI_SPEC, indent=2)
