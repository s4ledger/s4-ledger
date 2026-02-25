# S4 Ledger × HarborLink — Integration Architecture

> **Status:** Integration Endpoints Built — Ready for HarborLink Connection
> **Authors:** S4 Systems Engineering
> **Date:** February 2026
> **Version:** 2.0

---

## Executive Summary

HarborLink is the **collaboration portal** — identity, file exchange, workflows, cross-org communication.
S4 Ledger is the **evidence backbone** — hashing, version sealing, ledger anchoring, tamper detection.

Integrated, they form a **defense-grade digital trust network**: every submission, review, decision, and correction that flows through HarborLink is cryptographically sealed by S4 Ledger and independently verifiable on the XRP Ledger.

This document maps the exact technical integration surface — every API call, every data flow, every hook point — so both teams can build toward convergence.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [What Exists Today in S4 Ledger](#2-what-exists-today-in-s4-ledger)
3. [Integration Pattern: Event-Driven Anchoring](#3-integration-pattern-event-driven-anchoring)
4. [Integration Point 1 — Submission Anchoring](#4-integration-point-1--submission-anchoring)
5. [Integration Point 2 — Discrepancy & Tamper Detection](#5-integration-point-2--discrepancy--tamper-detection)
6. [Integration Point 3 — AI Decision Sealing](#6-integration-point-3--ai-decision-sealing)
7. [Integration Point 4 — Chain of Custody](#7-integration-point-4--chain-of-custody)
8. [Integration Point 5 — Audit & Oversight Export](#8-integration-point-5--audit--oversight-export)
9. [Authentication & Multi-Tenancy](#9-authentication--multi-tenancy)
10. [Webhook System (New — Required for Integration)](#10-webhook-system)
11. [What Needs to Be Built](#11-what-needs-to-be-built)
12. [Merkle Batch Anchoring (Phase 2)](#12-merkle-batch-anchoring-phase-2)
13. [Data Flow Diagrams](#13-data-flow-diagrams)
14. [API Contract Reference](#14-api-contract-reference)
15. [SDK Integration](#15-sdk-integration)
16. [Security & Compliance](#16-security--compliance)
17. [Phased Integration Roadmap](#17-phased-integration-roadmap)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  HarborLink Layer                    │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────┐   │
│  │ Identity  │  │  File    │  │   Workflow       │   │
│  │ & Access  │  │ Exchange │  │   Engine         │   │
│  │ (CAC/PKI) │  │ (Upload) │  │  (Review/Approve)│   │
│  └─────┬─────┘  └────┬─────┘  └───────┬─────────┘   │
│        │              │                │             │
│        └──────────────┼────────────────┘             │
│                       │                              │
│                       ▼                              │
│              ┌────────────────┐                      │
│              │ HarborLink →   │                      │
│              │ S4 Event Bus   │                      │
│              └───────┬────────┘                      │
└──────────────────────┼──────────────────────────────┘
                       │
            ┌──────────▼──────────┐
            │   S4 Ledger API     │
            │   s4ledger.com/api  │
            │                     │
            │  POST /api/anchor   │ ◄─── Hash + Seal
            │  POST /api/hash     │ ◄─── Hash Only
            │  POST /api/verify   │ ◄─── Tamper Check
            │  POST /api/ai-chat  │ ◄─── AI Analysis
            │  GET  /api/metrics  │ ◄─── Audit Metrics
            └──────────┬──────────┘
                       │
            ┌──────────▼──────────┐
            │   XRP Ledger        │
            │   (Mainnet)         │
            │                     │
            │  AccountSet + Memo  │
            │  SHA-256 hash       │
            │  3-5 second final   │
            │  ~$0.000024/tx      │
            └─────────────────────┘
```

**Key principle:** HarborLink never talks to XRPL directly. All ledger operations go through S4 Ledger's API. This keeps wallet management, fee economics, and anchor logic centralized.

---

## 2. What Exists Today in S4 Ledger

### Production-Ready Integration Surface

| Capability | Endpoint / Function | Status | Notes |
|---|---|---|---|
| **Hash any data** | `POST /api/hash` | Live | SHA-256, returns 64-char hex |
| **Anchor to XRPL** | `POST /api/anchor` | Live | Hash + `AccountSet` memo + SLS fee |
| **Verify integrity** | `POST /api/verify` | Live | Recompute hash vs. chain, returns `tamper_detected` |
| **Record categorization** | `POST /api/categorize` | Live | 156+ pre-built record types across 9 military branches |
| **AI analysis** | `POST /api/ai-chat` | Live | Azure OpenAI → GPT-4o → Claude fallback |
| **Wallet provisioning** | `POST /api/wallet/provision` | Live | Creates XRPL wallet, funds XRP + SLS |
| **SLS balance check** | `GET /api/wallet/balance` | Live | Query wallet SLS/XRP balance |
| **API key auth** | `POST /api/auth/api-key` | Live | Generate org-scoped API keys |
| **Metrics & audit** | `GET /api/metrics` | Live | Aggregate anchor stats, verify audit log |
| **Transaction history** | `GET /api/transactions` | Live | Last 200 anchored records |
| **DMSMS risk** | `GET /api/dmsms` | Live | Obsolescence scoring |
| **Predictive maintenance** | `GET /api/predictive-maintenance` | Live | AI failure predictions |
| **Supply chain risk** | `GET /api/supply-chain-risk` | Live | Multi-factor risk scoring |
| **Digital thread** | `GET /api/digital-thread` | Live | ECP tracking, BOM revisions |
| **Audit reports** | `GET /api/audit-reports` | Live | 6 report types (full, supply, maintenance, compliance, custody, contract) |
| **SDK (Python)** | `pip install` / `s4-anchor` CLI | Live | 37 methods, CLI tool |
| **Webhook registration** | `POST /api/webhooks/register` | Live | Register webhook URL with HMAC secret |
| **Webhook deliveries** | `GET /api/webhooks/deliveries` | Live | View webhook delivery history |
| **File-level hashing** | `POST /api/hash/file` | Live | Binary hash of uploaded file |
| **Batch anchoring** | `POST /api/anchor/batch` | Live | Batch anchor multiple hashes |
| **Batch verification** | `POST /api/verify/batch` | Live | Batch verify multiple hashes |
| **Custody transfer** | `POST /api/custody/transfer` | Live | Formal chain-of-custody linking |
| **Custody chain** | `GET /api/custody/chain` | Live | Sequential custody graph |
| **Composite anchor** | `POST /api/anchor/composite` | Live | Multi-document composite anchor |
| **Proof chain** | `GET /api/proof-chain` | Live | Full proof chain for a hash |
| **WAWF integration** | `POST /api/integrations/wawf` | Live | WAWF/PIEE webhook receiver |
| **AI NLP query** | `POST /api/ai/query` | Live | Intent detection + task execution |
| **Defense task** | `POST /api/defense/task` | Live | Compliance, readiness, threat sim |
| **Offline queue** | `GET /api/offline/queue` | Live | Air-gapped hash queue status |
| **Offline sync** | `POST /api/offline/sync` | Live | Batch sync queued hashes |
| **Performance metrics** | `GET /api/metrics/performance` | Live | Real-time dashboard data |
| **ZKP** | `POST /api/security/zkp` | Live | Zero-Knowledge Proof stubs |
| **RBAC** | `GET /api/security/rbac` | Live | Role-based access control |
| **Threat model** | `GET /api/security/threat-model` | Live | STRIDE threat model |
| **Dependency audit** | `GET /api/security/dependency-audit` | Live | CycloneDX SBOM audit |

### What Does NOT Exist Yet (Required for Full Integration)

| Capability | Status | Priority |
|---|---|---|
| Multi-tenant org isolation | Not built (single API key namespace) | P1 |
| Persistent storage (records beyond cold start) | Supabase designed, partially deployed | P1 |
| JWT / session auth | Not built (API key only) | P2 |
| MFA (multi-factor authentication) | Planned | P2 |
| Production ZKP circuits (Bulletproofs/Groth16) | Stub implemented | P2 |

---

## 3. Integration Pattern: Event-Driven Anchoring

Every integration follows this pattern:

```
HarborLink Event  →  S4 Ledger API Call  →  XRPL Anchor  →  Confirmation Callback
```

### The Universal Flow

```python
# 1. Something happens in HarborLink (upload, review, approval, etc.)
event = {
    "event_type": "submission.uploaded",
    "actor": "vendor@oemcorp.com",
    "organization": "OEM Corp",
    "program": "DDG-51 Flight III",
    "artifact_type": "VRS",
    "file_hash": "sha256_of_raw_file",          # HarborLink computes this
    "metadata_hash": "sha256_of_metadata_json",  # HarborLink computes this
    "timestamp": "2026-02-18T14:30:00Z"
}

# 2. HarborLink calls S4 Ledger
response = requests.post("https://s4ledger.com/api/anchor", json={
    "record_type": "cdrl_delivery",          # One of 156+ types
    "hash": event["file_hash"],              # SHA-256 of the raw file
    "user_email": event["actor"],            # For SLS fee deduction
    "metadata": {                            # Stored in anchor memo (optional extension)
        "program": event["program"],
        "artifact_type": event["artifact_type"],
        "organization": event["organization"],
        "file_hash": event["file_hash"],
        "metadata_hash": event["metadata_hash"]
    }
}, headers={
    "X-API-Key": "harborlink-org-api-key"
})

# 3. S4 Ledger returns
{
    "record_id": "S4-2026-00847",
    "hash": "a3f8c7d2e1...",
    "tx_hash": "B4E7F9A2C1...",              # XRPL transaction hash
    "explorer_url": "https://livenet.xrpl.org/transactions/B4E7F9A2C1...",
    "ledger_index": 89234567,
    "network": "mainnet",
    "sls_fee": "0.01",
    "sls_fee_tx": "C5D8E9F0...",
    "timestamp": "2026-02-18T14:30:02Z"
}

# 4. HarborLink displays to user:
# "Submission Verified — Immutable Record ID: S4-2026-00847"
# with link to XRPL explorer
```

---

## 4. Integration Point 1 — Submission Anchoring

> *"When a vendor uploads a file through HarborLink, S4 Ledger immediately hashes the raw file, hashes metadata, creates chain-of-custody entry, adds to Merkle batch, and anchors proof."*

### What HarborLink Does

1. Authenticates the vendor (CAC/PKI/SSO)
2. Receives the uploaded file (VRS, BOM, ECP, CDRL, etc.)
3. Computes `SHA-256(raw_file_bytes)` — the file hash
4. Computes `SHA-256(JSON(metadata))` — the metadata hash (who, when, what, program, contract)
5. Sends both hashes to S4 Ledger

### What S4 Ledger Does

1. Receives the hashes via `POST /api/anchor`
2. Creates a composite record: `SHA-256(file_hash + metadata_hash + timestamp)`
3. Submits `AccountSet` transaction to XRPL with memo containing the composite hash
4. Deducts 0.01 SLS from the org's wallet
5. Returns `tx_hash`, `explorer_url`, `record_id`
6. **(New — to build)** Fires webhook callback to HarborLink with confirmation

### API Call — Existing Endpoint

```
POST https://s4ledger.com/api/anchor
Content-Type: application/json
X-API-Key: harborlink-org-key

{
    "record_type": "cdrl_delivery",
    "hash": "<sha256_of_file>",
    "user_email": "vendor@oemcorp.com"
}
```

### Record Type Mapping

HarborLink artifact types should map to S4 Ledger's 156+ pre-built record types across 9 military branches:

| HarborLink Artifact | S4 Record Type | Branch |
|---|---|---|
| VRS (Vendor Recommended Spares) | `USN_SUPPLY` | USN |
| BOM (Bill of Materials) | `USN_CONFIG` | USN |
| ECP (Engineering Change Proposal) | `USN_ECP` | USN |
| CDRL (Contract Data Requirements List) | `USN_CDRL` | USN |
| ILS deliverable | `cdrl_delivery` | Any |
| Discrepancy response | `USN_CAR` | USN |
| Configuration baseline | `configuration_baseline` | Any |
| Depot repair report | `depotRepair` | Any |
| Test & evaluation data | `USN_TEMP` | USN |
| Technical manual revision | `USN_TM` | USN |
| Maintenance plan | `maintenance_3m` | USN |
| Provisioning data (PTD) | `USN_PROV` | USN |
| Certificate of conformance | `batch_coc` | Any |
| Supply chain receipt | `supply_chain_receipt` | Any |
| Custody transfer | `USN_CUSTODY` | USN |

### New: Composite Anchor (To Build)

For HarborLink, we should support a richer anchor that seals both the file and its context:

```
POST https://s4ledger.com/api/anchor/composite    # NEW ENDPOINT
Content-Type: application/json
X-API-Key: harborlink-org-key

{
    "record_type": "cdrl_delivery",
    "file_hash": "abc123...",
    "metadata_hash": "def456...",
    "user_email": "vendor@oemcorp.com",
    "program": "DDG-51 Flight III",
    "contract": "N00024-25-C-5401",
    "artifact_type": "VRS",
    "submitting_org": "OEM Corp",
    "submitting_cage": "1ABC2"
}
```

Response:

```json
{
    "record_id": "S4-2026-00847",
    "composite_hash": "789abc...",
    "file_hash": "abc123...",
    "metadata_hash": "def456...",
    "tx_hash": "B4E7F9A2C1...",
    "explorer_url": "https://livenet.xrpl.org/transactions/B4E7F9A2C1...",
    "ledger_index": 89234567,
    "timestamp": "2026-02-18T14:30:02Z",
    "verification_url": "https://s4ledger.com/api/verify?tx=B4E7F9A2C1..."
}
```

---

## 5. Integration Point 2 — Discrepancy & Tamper Detection

> *"Vendor challenges a discrepancy six months later. With S4 Ledger: original submission hash, discrepancy engine output hash, reviewer decision hash, timestamp proof, independent ledger anchor."*

### The Dispute Resolution Flow

```
Vendor challenges discrepancy
        │
        ▼
HarborLink retrieves record_id from original submission
        │
        ▼
POST /api/verify ─── S4 Ledger recomputes hash, compares to XRPL
        │
        ▼
Returns: MATCH (untampered) or MISMATCH (tampered)
        │
        ▼
HarborLink displays proof chain:
  1. Original file hash (from submission anchor)
  2. Discrepancy report hash (from ILIE anchor)
  3. Reviewer decision hash (from approval anchor)
  4. All XRPL transaction links
  5. All timestamps
```

### API Call — Existing Endpoint

```
POST https://s4ledger.com/api/verify
Content-Type: application/json
X-API-Key: harborlink-org-key

{
    "record_text": "<original VRS file content or hash>",
    "tx_hash": "B4E7F9A2C1...",
    "expected_hash": "abc123..."
}
```

Response:

```json
{
    "status": "MATCH",
    "tamper_detected": false,
    "computed_hash": "abc123...",
    "chain_hash": "abc123...",
    "algorithm": "SHA-256",
    "explorer_url": "https://livenet.xrpl.org/transactions/B4E7F9A2C1...",
    "verified_at": "2026-08-15T09:22:00Z",
    "original_anchor_time": "2026-02-18T14:30:02Z",
    "audit_entry": {
        "operator": "reviewer@navsea.navy.mil",
        "result": "MATCH",
        "timestamp": "2026-08-15T09:22:00Z"
    }
}
```

### Anchoring the ILIE Discrepancy Itself

When S4's analysis engine (ILIE) detects an anomaly, anchor that finding too:

```python
# ILIE detects cost anomaly on a VRS submission
discrepancy = {
    "type": "cost_anomaly",
    "original_submission_record_id": "S4-2026-00847",
    "original_submission_tx": "B4E7F9A2C1...",
    "finding": "Unit price $47,232 exceeds historical ceiling $12,800 by 269%",
    "severity": "critical",
    "detected_by": "ILIE Cost Analysis Engine v2.1",
    "timestamp": "2026-02-18T14:35:00Z"
}

# Anchor the discrepancy finding
response = requests.post("https://s4ledger.com/api/anchor", json={
    "record_type": "USN_CAR",
    "hash": sha256(json.dumps(discrepancy)),
    "user_email": "system@s4ledger.com"
}, headers={"X-API-Key": "harborlink-org-key"})

# Now the discrepancy finding is also on-chain
# Links to original submission via original_submission_tx
```

### Multi-Hash Proof Chain (To Build)

For dispute resolution, HarborLink should be able to retrieve the full proof chain:

```
GET https://s4ledger.com/api/proof-chain?record_id=S4-2026-00847    # NEW
```

Response:

```json
{
    "record_id": "S4-2026-00847",
    "proof_chain": [
        {
            "step": 1,
            "event": "Vendor Submission",
            "hash": "abc123...",
            "tx_hash": "B4E7...",
            "timestamp": "2026-02-18T14:30:02Z",
            "actor": "vendor@oemcorp.com"
        },
        {
            "step": 2,
            "event": "ILIE Discrepancy Detection",
            "hash": "def456...",
            "tx_hash": "C5D8...",
            "timestamp": "2026-02-18T14:35:00Z",
            "actor": "system@s4ledger.com",
            "references": "S4-2026-00847"
        },
        {
            "step": 3,
            "event": "Reviewer Decision: Reject — Request Corrected BOM",
            "hash": "ghi789...",
            "tx_hash": "D6E9...",
            "timestamp": "2026-02-20T10:15:00Z",
            "actor": "reviewer@navsea.navy.mil"
        }
    ],
    "verification": {
        "all_hashes_verified": true,
        "chain_intact": true,
        "total_anchors": 3
    }
}
```

---

## 6. Integration Point 3 — AI Decision Sealing

> *"Congressional inquiry after a failure. You say: 'Here is the cryptographically sealed prediction that existed at that time.'"*

### What Gets Sealed

Every AI/predictive output should be anchored as a record:

| AI Output | S4 Record Type | What's Hashed |
|---|---|---|
| Failure prediction | `predictive_maintenance` | Input dataset snapshot + model version + prediction output + confidence score |
| Cost avoidance estimate | `USN_COST` | Calculation inputs + methodology + result |
| DMSMS risk assessment | `USN_DMSMS` | NSN list + risk scores + recommended actions |
| Supply chain risk | `supply_chain_receipt` | Parts + risk factors + scoring |
| Gap analysis | `USN_LSA` | DRL/CDRL gaps + compliance scores |
| ILS analysis report | `audit_artifact` | Full analysis output |
| User action (defer/accept/reject) | `USN_DECISION` | Decision + rationale + referenced prediction |

### The Prediction Sealing Flow

```python
# 1. S4 AI generates a prediction
prediction = {
    "platform": "DDG-51 Flight III",
    "component": "AN/SPY-6(V)1 Radar Array Module 47",
    "prediction": "failure_likely",
    "confidence": 0.87,
    "predicted_failure_window": "45-90 days",
    "cost_of_inaction": "$2.4M",
    "recommended_action": "Schedule depot-level repair within 30 days",
    "model_version": "s4-predictive-v2.1",
    "input_data_hash": sha256(serialized_input_dataset),
    "timestamp": "2026-02-18T14:45:00Z"
}

# 2. Anchor the prediction
anchor_response = s4_api.anchor(
    record_type="predictive_maintenance",
    hash=sha256(json.dumps(prediction, sort_keys=True)),
    user_email="system@s4ledger.com"
)

# 3. User makes a decision through HarborLink
decision = {
    "prediction_record_id": anchor_response["record_id"],
    "prediction_tx": anchor_response["tx_hash"],
    "decision": "defer_repair",
    "rationale": "Radar performance nominal — reassess at next DPIA",
    "decided_by": "ltcdr.smith@navy.mil",
    "timestamp": "2026-02-19T08:30:00Z"
}

# 4. Anchor the decision
decision_anchor = s4_api.anchor(
    record_type="USN_DECISION",
    hash=sha256(json.dumps(decision, sort_keys=True)),
    user_email="ltcdr.smith@navy.mil"
)

# Now both the prediction AND the human decision are on-chain.
# If there's a failure at month 3, we can produce:
#   - prediction_tx: proves the AI flagged it
#   - decision_tx: proves who deferred and why
#   - Both independently verifiable on XRPL
```

### Existing Endpoint (Works Today)

```
POST https://s4ledger.com/api/anchor
{
    "record_type": "predictive_maintenance",
    "hash": "sha256_of_prediction_json",
    "user_email": "system@s4ledger.com"
}
```

The AI chat endpoint also exists for interactive analysis:

```
POST https://s4ledger.com/api/ai-chat
{
    "message": "What's the failure risk for SPY-6 Module 47?",
    "tool_context": "Predictive Maintenance",
    "analysis_data": { ... },
    "conversation": [...]
}
```

---

## 7. Integration Point 4 — Chain of Custody

> *"No one can silently modify history. No party can rewrite submission trails. Configuration states are provable at specific points in time."*

### Current State

S4 Ledger stores custody events as individual anchored records. Each anchor is independent — there's no linked list or graph structure connecting them.

The SDK has `correct_record()` which creates `CORRECTION:{hash}:SUPERSEDES:{original_tx}` memos, preserving lineage for corrections.

### What Needs to Be Built: Custody Chain Graph

For HarborLink integration, we need a formal `custody_chain` that links sequential events:

```json
{
    "chain_id": "CUSTODY-DDG51-SPY6-MOD47-2026",
    "asset": "AN/SPY-6(V)1 Module 47",
    "nsn": "5841-01-678-9012",
    "serial": "SPY6-M47-2026-001",
    "events": [
        {
            "seq": 1,
            "event": "manufacture_complete",
            "from": "Raytheon — Andover, MA",
            "to": "NAVSEA PEO IWS — Washington Navy Yard",
            "actor": "qc_inspector@raytheon.com",
            "timestamp": "2026-01-15T10:00:00Z",
            "record_id": "S4-2026-00201",
            "tx_hash": "A1B2C3...",
            "prev_tx": null
        },
        {
            "seq": 2,
            "event": "receiving_inspection",
            "from": "NAVSEA PEO IWS",
            "to": "Norfolk Naval Shipyard",
            "actor": "inspector@nnsy.navy.mil",
            "timestamp": "2026-01-22T14:30:00Z",
            "record_id": "S4-2026-00245",
            "tx_hash": "D4E5F6...",
            "prev_tx": "A1B2C3..."
        },
        {
            "seq": 3,
            "event": "installation",
            "from": "Norfolk Naval Shipyard",
            "to": "DDG-51 Hull 138 (USS Harvey Barnum)",
            "actor": "installer@nnsy.navy.mil",
            "timestamp": "2026-02-05T09:15:00Z",
            "record_id": "S4-2026-00389",
            "tx_hash": "G7H8I9...",
            "prev_tx": "D4E5F6..."
        }
    ],
    "chain_hash": "sha256(event1_hash + event2_hash + event3_hash)",
    "chain_anchor_tx": "J0K1L2..."
}
```

### Anchoring Strategy

Each custody event is individually anchored (keeps granularity), AND the full chain is periodically re-anchored as a single composite hash (enables chain-integrity verification).

```python
# Individual event anchor (immediate)
POST /api/anchor
{
    "record_type": "USN_CUSTODY",
    "hash": sha256(event_json),
    "user_email": "inspector@nnsy.navy.mil"
}

# Full chain re-anchor (periodic or on-demand)    # NEW ENDPOINT
POST /api/anchor/chain
{
    "chain_id": "CUSTODY-DDG51-SPY6-MOD47-2026",
    "chain_hash": sha256(concatenated_event_hashes),
    "event_count": 3,
    "record_type": "custody_chain"
}
```

---

## 8. Integration Point 5 — Audit & Oversight Export

> *"The compliance records are independently verifiable."* 

### Existing Audit Report Types

S4 Ledger already generates 6 audit report types via `GET /api/audit-reports`:

| Type | Content |
|---|---|
| `full_audit` | Complete platform audit: all records, all hashes, all verifications |
| `supply_chain` | Supply chain records, vendor submissions, receipt inspections |
| `maintenance` | 3-M/PMS records, MRC completions, depot repairs |
| `compliance` | NIST 800-171, CMMC, DFARS compliance scoring |
| `custody` | Chain of custody timeline, transfer records, handler authentication |
| `contract` | CDRL status, contract mods, SOW milestone tracking |

### What HarborLink Needs: Exportable Verification Package

For IG reviews, GAO investigations, FOIA, or congressional scrutiny, HarborLink should be able to export a **self-contained verification package**:

```
GET https://s4ledger.com/api/audit-reports/export    # NEW ENDPOINT
?type=full_audit
&program=DDG-51
&start=2025-01-01
&end=2026-02-18
&format=json
```

Response: A portable package containing:

```json
{
    "report_type": "full_audit",
    "program": "DDG-51 Flight III",
    "period": { "start": "2025-01-01", "end": "2026-02-18" },
    "generated_at": "2026-02-18T15:00:00Z",
    "generated_by": "S4 Ledger v5.2.0",

    "summary": {
        "total_records": 1247,
        "total_anchored": 1198,
        "verification_rate": "96.1%",
        "tamper_detected": 0,
        "organizations_involved": 8,
        "record_types_used": 23
    },

    "records": [
        {
            "record_id": "S4-2026-00847",
            "record_type": "cdrl_delivery",
            "hash": "abc123...",
            "tx_hash": "B4E7...",
            "explorer_url": "https://livenet.xrpl.org/transactions/B4E7...",
            "timestamp": "2026-02-18T14:30:02Z",
            "actor": "vendor@oemcorp.com",
            "program": "DDG-51",
            "verification_status": "MATCH"
        }
        // ... all 1247 records
    ],

    "verification_instructions": {
        "step_1": "For any record, take the 'hash' field",
        "step_2": "Look up the 'tx_hash' on the XRPL explorer",
        "step_3": "Decode the Memo field from hex → UTF-8",
        "step_4": "Compare the hash in the memo to the record hash",
        "step_5": "If they match, the record has not been tampered with since anchoring",
        "xrpl_explorer": "https://livenet.xrpl.org"
    },

    "report_hash": "sha256_of_this_entire_report",
    "report_anchor_tx": "M3N4O5..."
}
```

The report itself is anchored — proving it existed at generation time and hasn't been altered.

---

## 9. Authentication & Multi-Tenancy

### Current Auth Model

- API key in `X-API-Key` header
- Master key generates org keys via `POST /api/auth/api-key`
- Rate limiting: 120 req/60s per IP
- No JWT, no sessions, no user-level permissions

### Required for HarborLink Integration

| Requirement | Approach | Priority |
|---|---|---|
| **Org-scoped API keys** | Already exists — HarborLink gets its own key | Ready |
| **Per-org wallet** | `POST /api/wallet/provision` creates a wallet per org | Ready |
| **User-level identity** | `user_email` field in anchor requests (already supported) | Ready |
| **Multi-tenant data isolation** | Tag all records with `org_id` from API key | To build |
| **Webhook auth** | HMAC-SHA256 signed webhook payloads | To build |
| **CAC/PKI passthrough** | HarborLink handles auth, passes identity to S4 via API | Design |

### Recommended Architecture

```
HarborLink manages:
  - CAC/PKI authentication
  - Role-based access control
  - Organization hierarchy
  - Session management

S4 Ledger receives:
  - API key (identifies the HarborLink instance/org)
  - user_email (identifies the individual actor)
  - Record data (what to hash/anchor)

S4 Ledger does NOT need to:
  - Manage user accounts
  - Handle passwords/sessions
  - Know about CAC/PKI
  - Enforce role permissions
```

HarborLink is the identity layer. S4 Ledger trusts HarborLink's API key and records the user identity it provides.

---

## 10. Webhook System

**This is the most important new feature for integration.**

When S4 Ledger anchors a record, HarborLink needs to know. Currently S4 returns the result synchronously — but for async/batch workflows, webhooks are essential.

### Webhook Registration (To Build)

```
POST https://s4ledger.com/api/webhooks/register    # NEW
X-API-Key: harborlink-org-key

{
    "url": "https://harborlink.s4systems.com/webhooks/s4-ledger",
    "events": [
        "anchor.confirmed",
        "verify.completed",
        "tamper.detected",
        "sls.balance_low",
        "chain.integrity_check"
    ],
    "secret": "whsec_harborlink_signing_secret"
}
```

### Webhook Payload Format

```json
{
    "event": "anchor.confirmed",
    "timestamp": "2026-02-18T14:30:05Z",
    "data": {
        "record_id": "S4-2026-00847",
        "hash": "abc123...",
        "tx_hash": "B4E7F9A2C1...",
        "explorer_url": "https://livenet.xrpl.org/transactions/B4E7F9A2C1...",
        "record_type": "cdrl_delivery",
        "user_email": "vendor@oemcorp.com",
        "sls_fee_tx": "C5D8..."
    },
    "signature": "HMAC-SHA256(payload, webhook_secret)"
}
```

### Webhook Events

| Event | When | HarborLink Action |
|---|---|---|
| `anchor.confirmed` | Record anchored to XRPL | Show "Immutable Record ID" badge |
| `verify.completed` | Verification check run | Update verification status in UI |
| `tamper.detected` | Hash mismatch found | **Alert** — trigger investigation workflow |
| `sls.balance_low` | Org wallet below 100 SLS | Prompt subscription top-up |
| `chain.integrity_check` | Periodic chain audit result | Update compliance dashboard |
| `batch.completed` | Merkle batch anchor finalized | Update all records in batch |

---

## 11. What Needs to Be Built

### S4 Ledger — Endpoints / Features Status

| # | Feature | Endpoint | Status | Notes |
|---|---|---|---|---|
| 1 | **Webhook system** | `POST /api/webhooks/register`, `/list`, `/deliveries`, `/test` | ✅ Built | HMAC-SHA256 signed, 8 event types, delivery logging |
| 2 | **Composite anchor** | `POST /api/anchor/composite` | ✅ Built | file_hash + metadata_hash in single XRPL tx |
| 3 | **Proof chain retrieval** | `GET /api/proof-chain?record_id=` | ✅ Built | Full sequential event history per record |
| 4 | **Custody chain anchor** | `POST /api/custody/transfer`, `GET /api/custody/chain` | ✅ Built | Blockchain-anchored custody transfers |
| 5 | **Audit export package** | `GET /api/audit-reports/export` | ❌ Not Built | Self-contained verification package for IG/GAO — P1 |
| 6 | **File binary hashing** | `POST /api/hash/file` | ✅ Built | Base64 or UTF-8 content hashing |
| 7 | **Merkle batch anchor** | `POST /api/anchor/batch` | ✅ Built | Up to 1,000 records in 1 XRPL tx, 0.01 SLS total |
| 8 | **Multi-tenant org tagging** | `GET /api/org/records` | ✅ Built | Records tagged with org_id from API key |
| 9 | **Persistent storage** | Supabase/PostgreSQL | ❌ Not Built | Currently in-memory; records lost on cold start — P1 |
| 10 | **Bulk verification** | `POST /api/verify/batch` | ✅ Built | Up to 100 records per call |

> **S4 Ledger Integration Score: 8/10 endpoints built (80%). Remaining: audit export package + persistent storage.**

### HarborLink — Integration Points to Build

| # | Feature | Notes |
|---|---|---|
| 1 | **S4 API client** | HTTP client with API key auth, retry logic, timeout handling |
| 2 | **File hash computation** | SHA-256 of raw file bytes before sending to S4 |
| 3 | **Metadata hash computation** | SHA-256 of serialized metadata JSON |
| 4 | **Webhook receiver** | Accept and verify S4 Ledger webhook callbacks |
| 5 | **Anchor status UI** | "Submission Verified — Immutable Record ID: ####" badge |
| 6 | **Verification UI** | "Verify" button that calls `/api/verify` and shows MATCH/MISMATCH |
| 7 | **Proof chain viewer** | Display full proof chain for dispute resolution |
| 8 | **Audit export trigger** | "Generate Audit Package" button → S4 export endpoint |
| 9 | **SLS balance monitor** | Show org's SLS balance, prompt top-up when low |
| 10 | **Record type mapper** | Map HarborLink artifact types → S4 record types |

---

## 12. Merkle Batch Anchoring (Phase 2)

Individual anchoring works but costs ~$0.000024 per record. At scale (10K+ records/day), Merkle batching reduces this by 100x.

### How It Works

```
Collect N records in a time window (e.g., 60 seconds or 1000 records)
        │
        ▼
Compute SHA-256 for each record → [H1, H2, H3, ..., HN]
        │
        ▼
Build Merkle tree:
        H12 = SHA-256(H1 + H2)
        H34 = SHA-256(H3 + H4)
        ...
        ROOT = SHA-256(H12 + H34)
        │
        ▼
Anchor ROOT to XRPL (1 transaction covers all N records)
        │
        ▼
Store each record's Merkle path (proof of inclusion)
        │
        ▼
Any single record can still be independently verified:
  "My hash H3, combined with H4 → H34, combined with H12 → ROOT,
   and ROOT matches the XRPL anchor."
```

### Batch Anchor Endpoint (To Build)

```
POST https://s4ledger.com/api/anchor/batch
Content-Type: application/json
X-API-Key: harborlink-org-key

{
    "records": [
        { "hash": "abc123...", "record_type": "cdrl_delivery", "metadata": {...} },
        { "hash": "def456...", "record_type": "supply_chain_receipt", "metadata": {...} },
        { "hash": "ghi789...", "record_type": "USN_CUSTODY", "metadata": {...} }
    ]
}
```

Response:

```json
{
    "batch_id": "BATCH-2026-0042",
    "merkle_root": "xyz987...",
    "tx_hash": "P6Q7R8...",
    "explorer_url": "https://livenet.xrpl.org/transactions/P6Q7R8...",
    "record_count": 3,
    "records": [
        {
            "hash": "abc123...",
            "record_id": "S4-2026-00847",
            "merkle_path": ["def456...", "H34..."],
            "merkle_index": 0
        },
        // ...
    ]
}
```

---

## 13. Data Flow Diagrams

### Flow 1: Vendor Submission (Day 0)

```
Vendor                HarborLink              S4 Ledger API           XRPL
  │                      │                         │                    │
  │── Upload VRS ───────►│                         │                    │
  │                      │── Validate identity     │                    │
  │                      │── Compute file SHA-256  │                    │
  │                      │── Compute meta SHA-256  │                    │
  │                      │                         │                    │
  │                      │── POST /api/anchor ────►│                    │
  │                      │   {record_type,         │── AccountSet ─────►│
  │                      │    hash,                │   + Memo(hash)     │
  │                      │    user_email}          │                    │
  │                      │                         │◄── tx_hash ────────│
  │                      │                         │                    │
  │                      │                         │── Deduct 0.01 SLS  │
  │                      │                         │   User → Treasury  │
  │                      │                         │                    │
  │                      │◄── {record_id,          │                    │
  │                      │     tx_hash,            │                    │
  │                      │     explorer_url} ──────│                    │
  │                      │                         │                    │
  │◄── "Verified ────────│                         │                    │
  │    Record S4-00847"  │                         │                    │
```

### Flow 2: Dispute Resolution (Month 6)

```
Vendor                HarborLink              S4 Ledger API           XRPL
  │                      │                         │                    │
  │── "I never           │                         │                    │
  │    submitted that"──►│                         │                    │
  │                      │                         │                    │
  │                      │── GET /api/proof-chain  │                    │
  │                      │   ?record_id=S4-00847 ─►│                    │
  │                      │                         │── Lookup record    │
  │                      │                         │── POST /api/verify │
  │                      │                         │   recompute hash ─►│
  │                      │                         │◄── MATCH ──────────│
  │                      │                         │                    │
  │                      │◄── Proof chain:         │                    │
  │                      │   1. Original hash      │                    │
  │                      │   2. XRPL tx proof      │                    │
  │                      │   3. Timestamp           │                    │
  │                      │   4. Actor identity     │                    │
  │                      │                         │                    │
  │◄── "Original         │                         │                    │
  │    submission         │                         │                    │
  │    verified.          │                         │                    │
  │    Hash matches.      │                         │                    │
  │    Here's the         │                         │                    │
  │    XRPL proof." ─────│                         │                    │
```

### Flow 3: AI Prediction + Decision Sealing

```
S4 AI Engine          S4 Ledger API           XRPL         HarborLink
  │                      │                      │               │
  │── Generate           │                      │               │
  │   prediction ───────►│                      │               │
  │   (failure likely,   │── Anchor prediction─►│               │
  │    87% confidence)   │   tx_hash = X1       │               │
  │                      │                      │               │
  │                      │── Webhook ───────────────────────────►│
  │                      │   anchor.confirmed    │               │
  │                      │                      │               │
  │                      │              User sees prediction ◄──│
  │                      │              User decides: DEFER      │
  │                      │                      │               │
  │                      │◄── POST /api/anchor ─────────────────│
  │                      │   {decision: "defer", │               │
  │                      │    references: X1}    │               │
  │                      │── Anchor decision ──►│               │
  │                      │   tx_hash = X2       │               │
  │                      │                      │               │
  │                      │── Webhook ───────────────────────────►│
  │                      │   anchor.confirmed    │               │
  │                      │                      │               │
  │  (Months later — congressional inquiry)     │               │
  │                      │                      │               │
  │                      │◄── GET /api/proof-chain ─────────────│
  │                      │   {X1: prediction,    │               │
  │                      │    X2: decision}     │               │
  │                      │                      │               │
  │                      │── Verify both ──────►│               │
  │                      │◄── MATCH, MATCH ─────│               │
  │                      │                      │               │
  │                      │── Full proof chain ──────────────────►│
  │                      │                      │  "Here are the│
  │                      │                      │   sealed      │
  │                      │                      │   records."   │
```

---

## 14. API Contract Reference

### Existing Endpoints (Ready for HarborLink)

```yaml
# Hash a record (no anchoring)
POST /api/hash
  Body: { "record": "<any string>" }
  Returns: { "hash": "<sha256>", "algorithm": "SHA-256" }

# Anchor a record to XRPL
POST /api/anchor
  Body: { "record_type": "<type>", "hash": "<sha256>", "user_email": "<email>" }
  Headers: X-API-Key: <key>
  Returns: { "record_id", "hash", "tx_hash", "explorer_url", "sls_fee", ... }

# Verify a record against chain
POST /api/verify
  Body: { "record_text": "<original>", "tx_hash": "<xrpl_tx>", "expected_hash": "<sha256>" }
  Headers: X-API-Key: <key>
  Returns: { "status": "MATCH|MISMATCH|NOT_FOUND", "tamper_detected": bool, ... }

# Categorize a record
POST /api/categorize
  Body: { "memo_text": "<record description>" }
  Headers: X-API-Key: <key>
  Returns: { "category": { "key", "label", "branch", "system" } }

# AI analysis
POST /api/ai-chat
  Body: { "message": "...", "tool_context": "...", "analysis_data": {...}, "conversation": [...] }
  Returns: { "response": "..." } OR { "fallback": true }

# Get metrics
GET /api/metrics
  Returns: { "total_hashes", "total_records", "records_by_type", "verify_audit_log", ... }

# Get transaction history
GET /api/transactions
  Returns: { "total", "records": [...] }

# Get record type catalog
GET /api/record-types
  Returns: { "total", "categories": {...} }

# Generate API key
POST /api/auth/api-key
  Body: { "organization": "HarborLink", "contact_email": "admin@harborlink.com" }
  Headers: X-API-Key: <master_key>
  Returns: { "api_key": "s4-...", "organization": "...", "permissions": [...] }

# Provision XRPL wallet
POST /api/wallet/provision
  Body: { "email": "admin@harborlink.com", "plan": "enterprise" }
  Returns: { "wallet_address": "r...", "sls_balance": "500000", ... }

# Check wallet balance
GET /api/wallet/balance?address=rXXX...
  Returns: { "address", "xrp_balance", "sls_balance", "sls_issuer" }
```

### New Endpoints (To Build for Integration)

```yaml
# Composite anchor (file + metadata)
POST /api/anchor/composite                                         # NEW
  Body: { "record_type", "file_hash", "metadata_hash", "user_email", "program", "contract", ... }
  Returns: { "record_id", "composite_hash", "file_hash", "metadata_hash", "tx_hash", ... }

# Proof chain retrieval
GET /api/proof-chain?record_id=S4-2026-00847                      # NEW
  Returns: { "record_id", "proof_chain": [...], "verification": {...} }

# Custody chain anchor
POST /api/anchor/chain                                             # NEW
  Body: { "chain_id", "chain_hash", "event_count", "record_type" }
  Returns: { "chain_id", "tx_hash", ... }

# Batch anchor (Merkle)
POST /api/anchor/batch                                             # NEW
  Body: { "records": [{ "hash", "record_type", "metadata" }, ...] }
  Returns: { "batch_id", "merkle_root", "tx_hash", "records": [{ "merkle_path", ... }] }

# Webhook registration
POST /api/webhooks/register                                        # NEW
  Body: { "url", "events": [...], "secret" }
  Returns: { "webhook_id", "events", "status": "active" }

# Audit export package
GET /api/audit-reports/export?type=full_audit&program=DDG-51       # NEW
  Returns: { self-contained verification package }

# Bulk verification
POST /api/verify/batch                                             # NEW
  Body: { "records": [{ "hash", "tx_hash" }, ...] }
  Returns: { "results": [{ "status", "tamper_detected" }, ...] }

# File hash (binary upload)
POST /api/hash/file                                                # NEW
  Body: multipart/form-data with file
  Returns: { "hash", "filename", "size", "algorithm" }
```

---

## 15. SDK Integration

HarborLink's backend can integrate via the Python SDK instead of raw HTTP calls.

### Installation

```bash
pip install s4-ledger  # Or copy s4_sdk.py into project
```

### Usage

```python
from s4_sdk import S4SDK

# Initialize
ledger = S4SDK(
    xrpl_rpc_url="wss://xrplcluster.com",        # Mainnet
    sls_issuer="r95GyZac4butvVcsTWUPpxzekmyzaHsTA5",
    api_key="harborlink-org-api-key",
    wallet_seed="sEdXXXXXXXXXXXXXXXXXXXXXXXXX",   # HarborLink org wallet
    testnet=False
)

# --- Anchor a vendor submission ---
result = ledger.anchor_record(
    record_text=json.dumps({
        "file_hash": "abc123...",
        "artifact": "VRS",
        "vendor": "OEM Corp",
        "program": "DDG-51",
        "timestamp": "2026-02-18T14:30:00Z"
    }),
    wallet_seed="sEdXXXXXXXXXXXXXXXXXXXXXXXXX",
    record_type="cdrl_delivery",
    encrypt=True  # Optional — Fernet encrypt CUI data before hashing
)
# result = { "hash": "...", "tx_results": {...}, "record_type": "cdrl_delivery" }

# --- Verify a record ---
verification = ledger.verify_against_chain(
    record_text=original_submission_content,
    tx_hash="B4E7F9A2C1...",
    expected_hash="abc123..."
)
# verification = { "status": "MATCH", "tamper_detected": False, ... }

# --- Import and anchor bulk records ---
results = ledger.import_and_anchor(
    file_text=csv_content,
    source_system="nserc_ide",          # One of 24+ DoD systems
    wallet_seed="sEdXXXX...",
    anchor_to_xrpl=True
)
# Results include per-record hashes and XRPL tx hashes

# --- Get predictive risk ---
prediction = ledger.calculate_readiness(
    mtbf=2400,   # hours
    mttr=4.5,    # hours
    mldt=12.0    # hours
)
# { "Ao": 0.993, "Ai": 0.998, "failure_rate": 0.000417, ... }
```

---

## 16. Security & Compliance

### Data Handling

| Data Type | Where It Lives | Who Can Access |
|---|---|---|
| Raw files (VRS, BOM, etc.) | **HarborLink only** — S4 never stores raw files | HarborLink access controls |
| File hashes (SHA-256) | S4 Ledger + XRPL | Anyone with record_id or tx_hash |
| Metadata (program, actor, type) | S4 Ledger (in-memory / future: Supabase) | API key holders |
| XRPL anchors (hash in memo) | XRP Ledger (public, immutable) | Anyone (public ledger) |
| API keys | S4 Ledger server | Org administrators |
| Wallet seeds | Supabase (encrypted) | S4 system only (custodial) |

**Critical design principle:** S4 Ledger never stores or sees the raw file content. It only receives hashes. This means:
- No CUI/ITAR data touches S4 infrastructure
- S4 cannot reconstruct files from hashes (SHA-256 is one-way)
- XRPL anchors contain only hashes, not data
- HarborLink retains full custody of controlled information

### Compliance Alignment

| Standard | Coverage |
|---|---|
| **NIST 800-171** | SHA-256 hashing (FIPS 180-4), TLS 1.3, audit trails, integrity verification |
| **CMMC Level 2** | Access control via API keys, audit logging, integrity monitoring |
| **DFARS 252.204-7012** | Controlled data stays in HarborLink; only hashes transit to S4 |
| **ITAR** | No technical data stored in S4; hash-only architecture is ITAR-safe |
| **FedRAMP** | Roadmap item — Supabase/infrastructure hardening required |

---

## 17. Phased Integration Roadmap

### Phase 1 — Foundation (Months 1-3)

**Goal:** HarborLink can anchor submissions, verify records, and display proof.

| Week | Deliverable | Owner |
|---|---|---|
| 1-2 | HarborLink generates org API key, provisions XRPL wallet | Both |
| 3-4 | HarborLink computes SHA-256 of uploads, calls `POST /api/anchor` | HarborLink |
| 5-6 | S4 builds composite anchor endpoint (`/api/anchor/composite`) | S4 |
| 7-8 | S4 builds webhook system for anchor confirmations | S4 |
| 9-10 | HarborLink displays "Verified — Record ID" badge on submissions | HarborLink |
| 11-12 | End-to-end testing: upload → hash → anchor → verify → display | Both |

**Phase 1 deliverable:** Every file uploaded through HarborLink gets an XRPL-anchored, independently verifiable immutable record.

### Phase 2 — Intelligence Layer (Months 4-6)

**Goal:** ILIE outputs and AI predictions are anchored. Dispute resolution works.

| Week | Deliverable | Owner |
|---|---|---|
| 13-14 | S4 builds proof chain endpoint (`/api/proof-chain`) | S4 |
| 15-16 | Anchor ILIE discrepancy findings automatically | S4 |
| 17-18 | Anchor reviewer decisions through HarborLink workflow | HarborLink |
| 19-20 | Seal AI predictions (predictive maintenance, DMSMS) | S4 |
| 21-22 | Build dispute resolution UI in HarborLink (proof chain viewer) | HarborLink |
| 23-24 | Anchor user decisions (defer, accept, reject) | Both |

**Phase 2 deliverable:** Full proof chain from submission → analysis → finding → decision → resolution, all on-chain and verifiable.

### Phase 3 — Scale & Custody (Months 7-9)

**Goal:** Merkle batch anchoring live. Formal chain-of-custody.

| Week | Deliverable | Owner |
|---|---|---|
| 25-28 | S4 builds Merkle tree engine + `/api/anchor/batch` | S4 |
| 29-32 | S4 builds custody chain graph + `/api/anchor/chain` | S4 |
| 33-34 | HarborLink auto-batches submissions (configurable window) | HarborLink |
| 35-36 | Custody chain viewer in HarborLink | HarborLink |

**Phase 3 deliverable:** 100x cost reduction at volume. Cross-enterprise custody chains.

### Phase 4 — Audit & Compliance (Months 10-12)

**Goal:** Self-contained audit packages for IG/GAO/FOIA. FedRAMP readiness.

| Week | Deliverable | Owner |
|---|---|---|
| 37-40 | S4 builds audit export package (`/api/audit-reports/export`) | S4 |
| 41-44 | HarborLink builds "Generate Audit Package" workflow | HarborLink |
| 45-48 | FedRAMP pre-assessment + security hardening | Both |

**Phase 4 deliverable:** A defense program manager can export a complete, self-verifying audit trail for any time period, any program, and hand it to an IG — with zero preparation.

---

## Appendix A — Record Type Catalog

S4 Ledger supports 156+ pre-built record types across 9 military branches across U.S. Navy. Key categories for HarborLink:

| Branch | Types | Examples |
|---|---|---|
| USN (Navy) | 30+ | Supply, Maintenance, CDRL, Config, Custody, DMSMS, ECP, LSA, PMS, COSAL |
| USA (Army) | 20+ | Supply, Readiness, Training, Depot Repair |
| USAF (Air Force) | 20+ | Supply, Maintenance, Tech Orders, Config |
| USMC (Marines) | 15+ | Ground Equipment, Aviation, Supply |
| USCG (Coast Guard) | 12+ | Cutter Maintenance, Supply, Compliance |
| USSF (Space Force) | 10+ | Satellite Ops, Ground Systems |
| DLA | 10+ | FLIS, Procurement, Disposal |
| Cross-Branch | 20+ | Contract, Audit, Calibration, Ordnance, Transport |
| Generic | 19+ | Supply chain receipt, maintenance, depot repair, custody transfer |

Full catalog available via `GET /api/record-types`.

---

## Appendix B — Environment Variables

S4 Ledger requires these environment variables (HarborLink does NOT need to manage these — they're S4 server-side):

```bash
# XRPL
XRPL_WALLET_SEED=sEdXXXX       # Issuer wallet (anchors transactions)
XRPL_TREASURY_SEED=sEdXXXX     # Treasury wallet (holds SLS, funds users)
XRPL_NETWORK=mainnet            # or "testnet"

# AI (optional — for AI agent)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AZURE_OPENAI_ENDPOINT=https://...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Auth
S4_API_MASTER_KEY=...           # Master key for generating org keys

# Database (when deployed)
SUPABASE_URL=https://...
SUPABASE_KEY=eyJ...

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Appendix C — Value Propositions by Stakeholder

| Stakeholder | Without Integration | With Integration |
|---|---|---|
| **OEM/Vendor** | "We submitted that." (trust us) | "Here's the XRPL-anchored proof of submission." |
| **Navy Program Office** | Database audit logs | Independently verifiable, tamper-proof audit trails |
| **Prime Contractor** | Disputes escalate to finger-pointing | Disputes resolved mathematically via hash comparison |
| **Sustainment Command** | Configuration history in siloed databases | Provable configuration states at any point in time |
| **IG / GAO** | Request data → wait → trust what's provided | Self-verifying audit packages with XRPL proof |
| **Congress** | "The model probably showed low risk" | "Here is the sealed prediction that existed at that time" |

---

*S4 Systems, LLC — Building the verifiable logistics intelligence backbone.*
