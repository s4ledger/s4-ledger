# S4 Ledger API Reference

> **Base URL:** `https://s4ledger.com`  
> **Version:** 5.12.18  
> **Total Routes:** ~105 endpoints  
> **OpenAPI Spec:** [`api/openapi.json`](../api/openapi.json)

---

## Authentication

Most endpoints are open (no auth required). Authenticated routes require one of:

| Method | Header | Description |
|--------|--------|-------------|
| API Key | `X-API-Key: YOUR_KEY` | Standard access — includes org scoping |
| Master Key | `X-API-Key: MASTER_KEY` | Admin operations (key generation, role updates) |
| JWT | `Authorization: Bearer TOKEN` | Token-based auth for web sessions |
| Stripe Signature | `Stripe-Signature: ...` | Webhook HMAC verification (Stripe only) |

Generate an API key via `POST /api/auth/api-key` (requires master key).

---

## Response Format

All responses are JSON. Successful responses include relevant data fields. Errors follow:

```json
{
  "error": "Description of what went wrong",
  "status": 400
}
```

Common HTTP status codes:
- `200` — Success
- `400` — Bad request (missing/invalid fields)
- `401` — Unauthorized (missing or invalid API key)
- `403` — Forbidden (insufficient role)
- `404` — Not found
- `429` — Rate limited
- `500` — Internal server error

---

## System & Health

### `GET /api/status`
Returns platform operational status, version, and record counts.

**Auth:** None

**Response:**
```json
{
  "status": "operational",
  "version": "5.12.18",
  "uptime": 86400,
  "timestamp": "2026-03-15T12:00:00Z",
  "total_records": 127500
}
```

---

### `GET /api/health`
Live health check with Supabase connectivity probe. Returns `"healthy"` or `"degraded"`.

**Auth:** None

**Response (healthy):**
```json
{
  "status": "healthy",
  "checks": { "supabase": true },
  "timestamp": "2026-03-15T12:00:00Z"
}
```

**Response (degraded):**
```json
{
  "status": "degraded",
  "checks": { "supabase": false },
  "timestamp": "2026-03-15T12:00:00Z"
}
```

---

### `GET /api/metrics`
Aggregated platform metrics (record counts, transaction stats).

**Auth:** None

---

### `GET /api/infrastructure`
Full infrastructure details: XRPL connection, Supabase status, auth config, compliance posture.

**Auth:** None

---

### `GET /api/metrics/performance`
API performance stats: latency percentiles, uptime, cost-per-anchor, validator health.

**Auth:** None

---

## Records & Transactions

### `GET /api/transactions`
Returns the last 200 anchored records.

**Auth:** None

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | integer | 25 | Max records (up to 100) |
| `offset` | integer | 0 | Pagination offset |
| `type` | string | — | Filter by record type |

---

### `GET /api/record-types`
All 64+ record types grouped by military branch (Navy, Army, Air Force, Marines, Space Force, Joint).

**Auth:** None

---

### `GET /api/xrpl-status`
XRPL connection status, wallet addresses, and network info.

**Auth:** None

---

## Core Anchoring & Verification

### `POST /api/anchor`
Anchor a hash to XRPL. Automatically deducts 0.01 SLS fee.

**Auth:** None (org_id derived from API key if provided)

**Request Body:**
```json
{
  "data": "CDRL-A003-DI-MGMT-81466-Rev3.pdf",
  "record_type": "cdrl_delivery",
  "metadata": { "contract": "N00024-26-C-5500", "cdrl": "A003" }
}
```

**Response:**
```json
{
  "success": true,
  "hash": "a1b2c3d4e5f6...",
  "xrpl_tx": "F1A3B5C7D9E2...",
  "timestamp": "2026-03-15T12:00:00Z",
  "record_type": "cdrl_delivery",
  "sls_fee": 0.01
}
```

---

### `POST /api/hash`
Compute SHA-256 hash of text without anchoring.

**Auth:** None

**Request Body:**
```json
{ "data": "any text or record string" }
```

**Response:**
```json
{ "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" }
```

---

### `POST /api/hash/file`
Hash file content (accepts base64 or UTF-8).

**Auth:** None

**Request Body:**
```json
{ "content": "base64-encoded-data", "encoding": "base64" }
```

---

### `POST /api/categorize`
Auto-categorize a record memo into one of 64+ record types using NLP.

**Auth:** None

**Request Body:**
```json
{ "memo": "Received 500 fasteners NSN 5306-01-234-5678 at Norfolk" }
```

**Response:**
```json
{ "record_type": "supply_chain_receipt", "confidence": 0.92 }
```

---

### `POST /api/verify`
Verify a record against its on-chain hash (tamper detection).

**Auth:** None

**Request Body:**
```json
{
  "data": "original record data",
  "tx_hash": "F1A3B5C7D9E2..."
}
```

**Response:**
```json
{ "verified": true, "hash_match": true, "timestamp": "2026-03-15T12:00:00Z" }
```

---

### `POST /api/anchor/composite`
Anchor composite hash (file_hash + metadata_hash) for dual-integrity verification.

**Auth:** None

**Request Body:**
```json
{
  "file_hash": "abc123...",
  "metadata_hash": "def456...",
  "record_type": "technical_document"
}
```

---

### `POST /api/anchor/batch`
Merkle batch anchor — up to 1,000 records in a single XRPL transaction.

**Auth:** None

**Request Body:**
```json
{
  "records": [
    { "data": "record-1-data", "record_type": "maintenance_3m" },
    { "data": "record-2-data", "record_type": "supply_chain_receipt" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "merkle_root": "abc123...",
  "xrpl_tx": "F1A3...",
  "count": 2,
  "individual_hashes": ["hash1", "hash2"]
}
```

---

### `POST /api/verify/batch`
Batch verify up to 100 records at once.

**Auth:** None

**Request Body:**
```json
{
  "records": [
    { "data": "record-data", "tx_hash": "F1A3..." }
  ]
}
```

---

## Proof Chain & Custody

### `GET /api/proof-chain`
Get proof chain events for a record.

**Auth:** None

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `record_id` | string | The record to trace |

---

### `GET /api/custody/chain`
Get custody transfer chain for a record.

**Auth:** None

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `record_id` | string | The record to trace |

---

### `POST /api/custody/transfer`
Record a custody transfer (anchored to XRPL).

**Auth:** None

**Request Body:**
```json
{
  "record_id": "rec_123",
  "from_entity": "NAVSEA PMS 400",
  "to_entity": "BAE Systems Norfolk",
  "reason": "Scheduled maintenance period"
}
```

---

## Authentication & Authorization

### `GET /api/auth/validate`
Validate a JWT or API key. Returns role, tier, and org info.

**Auth:** API Key or JWT (required)

**Response:**
```json
{
  "valid": true,
  "role": "analyst",
  "tier": "enterprise",
  "org_id": "org_abc123"
}
```

---

### `POST /api/auth/api-key`
Generate a new API key. **Requires master key.**

**Auth:** Master Key

**Request Body:**
```json
{ "org_id": "org_abc123", "role": "analyst", "label": "CI/CD Pipeline" }
```

---

### `GET /api/security/rbac`
View RBAC roles and current permissions.

**Auth:** API Key (optional — returns public roles if no key)

---

### `POST /api/security/rbac`
Update role for an API key.

**Auth:** Admin API Key

**Request Body:**
```json
{ "api_key": "key_to_update", "role": "auditor" }
```

---

## Webhooks (HarborLink)

### `GET /api/webhooks/list`
List registered webhooks for org.

**Auth:** API Key (required)

---

### `GET /api/webhooks/deliveries`
View last 50 webhook delivery logs.

**Auth:** API Key (required)

---

### `POST /api/webhooks/register`
Register a new webhook URL and event subscriptions.

**Auth:** API Key (required)

**Request Body:**
```json
{
  "url": "https://your-system.mil/webhook",
  "events": ["anchor.created", "custody.transferred", "verification.failed"]
}
```

---

### `POST /api/webhooks/test`
Send a test webhook event to a registered URL.

**Auth:** API Key (required)

---

## Organization & Multi-Tenant

### `GET /api/org/records`
Get records filtered by the API key's organization.

**Auth:** API Key (required)

---

## ILS Tools

All ILS tools support both `GET` (retrieve data) and `POST` (create/calculate). These power the 23-tool Anchor-S4 workspace.

| Method | Path | Tool |
|--------|------|------|
| GET/POST | `/api/dmsms` | DMSMS Obsolescence Tracker |
| GET/POST | `/api/readiness` | Operational Readiness Calculator |
| GET/POST | `/api/parts` | Parts Catalog Cross-Reference |
| GET/POST | `/api/roi` | ROI Analysis Calculator |
| GET/POST | `/api/lifecycle` | Lifecycle Cost Estimator |
| GET/POST | `/api/warranty` | Warranty Tracker |
| GET/POST | `/api/supply-chain-risk` | Supply Chain Risk Engine |
| GET/POST | `/api/audit-reports` | Audit Report Generator |
| GET/POST | `/api/contracts` | Contract / CDRL Tracking |
| GET/POST | `/api/digital-thread` | Digital Thread Change Management |
| GET/POST | `/api/predictive-maintenance` | Predictive Maintenance AI |
| GET/POST | `/api/action-items` | Cross-Tool Action Items |
| GET/POST | `/api/calendar` | Calendar Events |
| GET/POST | `/api/audit-vault` | Audit Document Vault |
| GET/POST | `/api/doc-library` | Defense Document Library |
| GET/POST | `/api/compliance-scorecard` | Compliance Framework Scores |
| GET | `/api/provisioning-ptd` | Provisioning Technical Documentation |
| GET/POST | `/api/ils/gap-analysis` | ILS Gap Analysis |
| GET/POST | `/api/logistics/risk-score` | Logistics Risk Score |

**Common GET query parameters:** `program` (filter by program name)

**Common POST body:** `{ "program": "DDG-51", ...tool-specific fields }`

---

## Database / Analysis Persistence

### `POST /api/db/save-analysis`
Save ILS analysis to Supabase.

**Auth:** API Key (required)

**Request Body:**
```json
{
  "tool": "gap_analysis",
  "program": "DDG-51",
  "data": { "...analysis results..." }
}
```

---

### `POST /api/db/get-analyses`
Retrieve saved ILS analyses.

**Auth:** API Key (required)

**Request Body:**
```json
{ "tool": "gap_analysis", "program": "DDG-51" }
```

---

## Wallet & Treasury (XRPL / SLS Token)

### `GET /api/wallet/balance`
Query XRPL wallet XRP + SLS balances.

**Auth:** None

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `address` | string | XRPL wallet address |

---

### `POST /api/wallet/provision`
Provision a new XRPL wallet. Requires Stripe payment to complete.

**Auth:** Stripe payment required

---

### `POST /api/wallet/buy-sls`
Purchase additional SLS tokens. Requires Stripe payment.

**Auth:** Stripe payment required

---

### `GET /api/treasury/health`
Treasury wallet health: XRP/SLS balances, reserve status, alerts.

**Auth:** None

---

## Payments (Stripe)

### `POST /api/checkout/create`
Create a Stripe Checkout session for subscription or SLS purchase.

**Auth:** None

**Request Body:**
```json
{ "plan": "enterprise", "quantity": 1 }
```

---

### `POST /api/webhook/stripe`
Stripe webhook receiver. Verifies HMAC signature before processing.

**Auth:** Stripe Signature (automatic)

---

## AI & NLP

### `POST /api/ai-chat`
LLM-powered defense logistics assistant. Supports OpenAI, Anthropic (Claude), and Azure backends.

**Auth:** None

**Request Body:**
```json
{
  "message": "What are the ILS gaps for F-35B?",
  "session_id": "optional-session-id",
  "context": { "program": "F-35B" }
}
```

---

### `POST /api/ai/query`
NLP query with intent detection and entity extraction.

**Auth:** None

**Request Body:**
```json
{
  "query": "Show me DMSMS risks for DDG-51",
  "task_type": "ils_gap"
}
```

---

### `POST /api/ai/rag`
RAG-powered AI with document chunk retrieval from Supabase vector store.

**Auth:** None

---

### `GET /api/ai/conversations`
Retrieve AI conversation history.

**Auth:** None

---

### `POST /api/verify/ai`
Verify an AI decision by its response hash (AI audit trail integrity).

**Auth:** None

---

### `POST /api/defense/task`
Execute defense tasks: compliance checks, threat simulations, readiness calculations, ILS reviews.

**Auth:** None

**Request Body:**
```json
{ "task": "compliance_check", "program": "DDG-51", "framework": "CMMC" }
```

---

## Security Enhancements

### `GET /api/security/audit-trail`
AI + verification audit trail with timestamps and hashes.

**Auth:** API Key (required)

---

### `GET /api/security/zkp` | `POST /api/security/zkp`
Zero-knowledge proof generation and verification (stub — production: Groth16/Bulletproofs).

**Auth:** None

---

### `GET /api/security/threat-model`
STRIDE threat model assessment with NIST SP 800-161 mapping.

**Auth:** None

---

### `GET /api/security/dependency-audit`
CycloneDX SBOM-based dependency vulnerability audit results.

**Auth:** None

---

## Offline / On-Prem

### `GET /api/offline/queue`
View the offline hash queue (pending anchors).

**Auth:** None

---

### `POST /api/offline/sync`
Sync offline queue — anchor all queued hashes to XRPL.

**Auth:** None

---

## Full Persistence Platform (Supabase CRUD)

These endpoints provide full CRUD for persistent data stored in Supabase with RLS.

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/ils/uploads` | ILS file uploads (parsed data, metadata) |
| GET/POST | `/api/documents` | Document management with versioning |
| GET/POST | `/api/documents/versions` | Document version history |
| GET/POST | `/api/poam` | Plan of Action & Milestones (POA&M) |
| GET/POST | `/api/compliance/evidence` | Compliance evidence artifacts |
| GET/POST | `/api/submissions` | Submission reviews (vendor data) |
| GET/POST | `/api/team` | Team management (create/list) |
| GET | `/api/team/members` | List team members by team_id |
| POST | `/api/team/invite` | Invite member (generates token) |
| GET/POST | `/api/gfp` | Government Furnished Property tracking |
| GET/POST | `/api/sbom` | Software Bill of Materials management |
| GET | `/api/sbom/scan` | Scan SBOM components against NVD |
| GET/POST | `/api/provenance` | Supply chain provenance with QR codes |
| POST | `/api/cdrl/validate` | CDRL compliance validation (8 rules) |
| POST | `/api/contracts/extract` | NLP contract clause extraction (FAR/DFARS) |
| GET/POST | `/api/program-metrics` | Program-level metrics CRUD |
| GET/POST | `/api/analytics/cross-program` | Cross-program analytics |

---

## User State & Error Reporting

### `POST /api/state/save`
Save user UI state (tool selections, preferences).

**Auth:** None

---

### `GET /api/state/load`
Load previously saved UI state.

**Auth:** None

---

### `POST /api/errors/report`
Client-side error reporting. Accepts up to 20 errors per batch.

**Auth:** None

**Request Body:**
```json
{
  "errors": [
    {
      "message": "TypeError: Cannot read property 'x' of null",
      "stack": "at engine.js:1234",
      "url": "https://s4ledger.com/demo-app/",
      "timestamp": "2026-03-15T12:00:00Z"
    }
  ]
}
```

---

## AI-Powered Advanced Features

### `POST /api/living-ledger`
AI-generated Living Program Ledger — comprehensive program summary with track changes.

**Request Body:**
```json
{ "program": "DDG-51", "action": "generate" }
```

---

### `POST /api/living-ledger/export-pdf`
Export Living Ledger as formatted text.

---

### `POST /api/impact-simulator`
Program Impact Simulator — cascade risk analysis showing how changes ripple across a program.

**Request Body:**
```json
{ "program": "DDG-51", "change": "delay", "item": "GTE Module", "magnitude": 30 }
```

---

### `POST /api/secure-collaboration`
Secure Collaboration Network — enable, invite, share, and list collaborative sessions.

**Request Body:**
```json
{ "action": "enable", "program": "DDG-51" }
```

---

### `POST /api/foresight-forecast`
30/60/90-day proactive foresight forecast with risk projections.

---

### `POST /api/signed-package`
Generate HMAC-signed executive package for tamper-proof distribution.

---

### `POST /api/monte-carlo-heatmap`
Monte Carlo probability heatmap simulation for risk analysis.

---

### `POST /api/save-scenario-to-ledger`
Save an impact scenario to the Living Ledger with anchoring.

---

### `POST /api/conflict-resolver`
AI conflict resolver for collaboration field disputes.

---

### `POST /api/federated-benchmark`
Privacy-preserving federated benchmark comparison across programs.

---

### `POST /api/unified-brief`
Unified Command Brief — combines LPL + PIS + SCN data into one executive briefing.

---

## Email (Enterprise Vault)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/prepare-email` | Compose/prepare a secure email |
| POST | `/api/save-draft` | Save email draft |
| POST | `/api/scheduled-send` | Schedule email for future send |
| POST | `/api/import-received-email` | Import received email into vault |
| POST | `/api/send-email` | Send email via SendGrid |
| POST | `/api/email-vault-delete` | Delete email from vault |
| GET | `/api/vault-emails` | List emails in vault |

---

## Novel Defense Features

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/cryptographic-mission-impact-ledger` | Anchor PIS risk simulation to XRPL with AI analysis |
| POST | `/api/self-healing-compliance` | Auto-detect + remediate compliance gaps |
| POST | `/api/self-healing-compliance/approve` | Approve a self-healing remediation |
| POST | `/api/zero-trust-handoff` | Zero-trust custody handoff with cryptographic verification |
| POST | `/api/predictive-resource-allocator` | AI-powered resource allocation optimization |
| POST | `/api/immutable-after-action-review` | Anchor after-action review to XRPL |
| POST | `/api/quantum-safe-reanchor` | Re-anchor records with quantum-safe hashing |
| POST | `/api/program-legacy-archive` | Archive program to immutable ledger |
| POST | `/api/congressional-funding-forecast` | Congressional funding forecast analysis |
| POST | `/api/self-executing-contract-clause` | Self-executing contract clause automation |
| POST | `/api/federated-lessons-knowledge-graph` | Federated lessons learned knowledge graph |
| POST | `/api/supply-chain-insurance-optimizer` | Supply chain insurance cost optimizer |
| POST | `/api/verifiable-scorecard` | Verifiable compliance scorecard with anchoring |
| POST | `/api/mission-outcome-correlation` | Mission outcome correlation analysis |
| POST | `/api/multi-program-cascade` | Multi-program cascade risk analysis |
| POST | `/api/automated-neutral-mediator` | AI neutral mediator for disputes |

---

## DRL (Deficiency Review Log)

### `POST /api/drl/update`
Update a single DRL cell. Change is anchored to XRPL for audit trail.

**Request Body:**
```json
{
  "row_id": "drl_001",
  "field": "status_notes",
  "value": "Updated per NAVSEA directive 2026-03-15"
}
```

---

### `POST /api/drl/status`
Change DRL row status (anchored).

---

### `POST /api/drl/workflow-link`
Link DRL row to external workflow URL (anchored).

---

### `POST /api/drl/import`
Bulk import DRL records — up to 500 rows per request. Each row is anchored.

---

## Integration

### `POST /api/integrations/wawf`
WAWF/ERP webhook receiver — accepts and anchors external events from Wide Area Workflow or ERP systems.

---

## Rate Limiting

- Standard: 100 requests/minute per IP
- Authenticated: 300 requests/minute per API key
- Batch endpoints: 10 requests/minute
- AI endpoints: 20 requests/minute

---

## Error Codes

| Code | Meaning |
|------|---------|
| `INVALID_PAYLOAD` | Missing or malformed request body |
| `AUTH_REQUIRED` | Endpoint requires authentication |
| `INSUFFICIENT_ROLE` | API key lacks required role |
| `RECORD_NOT_FOUND` | Referenced record does not exist |
| `HASH_MISMATCH` | Verification failed — data has been tampered |
| `XRPL_UNAVAILABLE` | XRPL network unreachable |
| `SLS_INSUFFICIENT` | Not enough SLS tokens for anchoring |
| `RATE_LIMITED` | Too many requests |
| `BATCH_TOO_LARGE` | Batch exceeds max size (1000 anchor, 100 verify) |

---

## SDKs & Examples

- **Python SDK:** `pip install s4-ledger-sdk` — see [sdk/](../sdk/)
- **API Examples:** [docs/api_examples.md](api_examples.md) — cURL, Python, JavaScript samples
- **OpenAPI Spec:** [api/openapi.json](../api/openapi.json) — importable into Postman, Swagger UI
- **SDK Playground:** [sdk-playground/](../sdk-playground/) — interactive browser-based API tester
