# S4 Ledger — Public API & Features Documentation

## Platform Overview

S4 Ledger is a defense-grade record integrity platform that anchors SHA-256 hashes to the XRP Ledger, providing immutable audit trails for military logistics, supply chain, and compliance records.

**Live Platform:** [https://s4ledger.com](https://s4ledger.com)

---

## Core Features

### 1. Record Anchoring
Hash any data and anchor it to the XRP Ledger. Zero data on-chain — only the cryptographic fingerprint is stored.

- **156+ defense record types** — Navy, Joint, custom
- **0.01 SLS per anchor** ($0.01 equivalent)
- **Batch anchoring** with Merkle tree compression
- **File-based anchoring** — Upload PDFs, XLSX, contracts for binary hashing

### 2. Verification
Re-verify any record against its chain anchor. Instant tamper detection.

- **Drag-drop file verification** — Upload files, compare hash against chain
- **Batch verification** — Verify multiple files at once with export report
- **Visual tamper indicator** — Immediate red/green status

### 3. 14 ILS Workspace Tools
Full Integrated Logistics Support workspace:

| Tool | Description |
|------|-------------|
| Gap Analysis | Upload DRL/CDRL, auto-detect compliance gaps |
| DMSMS Tracker | Obsolescence tracking across 500+ platforms |
| Readiness Calculator | Ao, MTBF, MTTR calculations |
| Compliance Scorecard | Auto-scored across 6 frameworks |
| Supply Chain Risk Engine | ML-powered risk scoring, GIDEP integration |
| Action Items | Track corrective actions with severity/owners |
| Predictive Maintenance | AI-driven failure prediction |
| Lifecycle Cost | Total ownership cost estimation |
| ROI Calculator | Cost-benefit analysis for ILS investments |
| Audit Record Vault | Blockchain-verified record storage |
| Defense Document Library | 100+ searchable MIL-STDs, regulations |
| Audit Report Generator | DCMA-ready compliance packages |
| Submission Review (ILIE) | Line-by-line discrepancy detection |
| SBOM Viewer | Software Bill of Materials analysis and vulnerability tracking |

### 4. AI Agent (S4 Agent)
Full-featured AI assistant specializing in defense logistics:

- Natural language queries about ILS, compliance, regulations
- Document drafting — memos, CARs, SOW language, briefing points
- Data analysis — interprets uploaded CSV/XLSX files
- Context-aware — knows which ILS tool you're working in
- General-purpose — handles any topic, not just defense

### 5. SLS Economy
Secure Logistics Standard (SLS) — utility token on the XRP Ledger:

- **Self-sustaining circulation:** Treasury → User → Treasury
- **Subscription tiers:** Pilot (free, 100 SLS), Starter ($999/mo, 25K SLS), Professional ($2,499/mo, 100K SLS), Enterprise ($9,999/mo, 500K SLS)
- **Automatic wallet provisioning** on signup
- **Real-time balance display** in floating sidebar

### 6. Offline / Air-Gapped Operations
Designed for disconnected environments (naval vessels, forward bases):

- **Offline queue** — Hash and store locally, batch sync when connected
- **End-to-end encryption** — AES-256-GCM for stored queue data
- **Automatic retry** — Exponential backoff with configurable limits
- **Data caps** — Prevent unbounded growth during prolonged outage

### 7. Security & Compliance

| Feature | Status |
|---------|--------|
| CMMC Level 2 | 91% compliant (110 controls) |
| NIST SP 800-171 | 85% (12/14 families) |
| DFARS 252.204-7012 | Compliant |
| RBAC (5 roles) | Active |
| Zero-Knowledge Proofs | Pedersen commitments (Bulletproofs in Phase 2) |
| STRIDE Threat Model | Updated quarterly |
| Dependency Auditing | Automated (Snyk integration) |
| OWASP Headers | Full suite applied |
| HSM Key Management | Software (hardware in Phase 2) |

---

## API Reference

### Authentication
All authenticated endpoints require an `X-API-Key` header.

```bash
curl -H "X-API-Key: YOUR_KEY" https://s4ledger.com/api/metrics
```

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Platform health check |
| POST | `/api/anchor` | Anchor a record hash |
| POST | `/api/verify` | Verify record integrity |
| GET | `/api/records` | List anchored records |
| GET | `/api/metrics` | Platform analytics |
| POST | `/api/ai/query` | Query AI Agent |
| POST | `/api/wallet/register` | Create XRPL wallet |
| GET | `/api/wallet/balance` | Get SLS balance |
| POST | `/api/webhooks` | Register webhook |
| GET | `/api/security/rbac` | RBAC configuration |
| POST | `/api/security/zkp` | Generate/verify ZKP |
| GET | `/api/security/threat-model` | STRIDE assessment |
| GET | `/api/offline/queue` | Offline queue status |
| POST | `/api/offline/sync` | Trigger batch sync |
| GET | `/api/metrics/prometheus` | Prometheus metrics |
| GET | `/api/docs` | OpenAPI 3.1 spec |

### Webhook Events

Subscribe to real-time events:

- `anchor.confirmed` — Record successfully anchored
- `verify.completed` — Verification finished
- `tamper.detected` — Integrity violation found
- `batch.completed` — Batch sync finished
- `custody.transferred` — Chain of custody event
- `sls.balance_low` — SLS balance below threshold

---

## Sandbox / Demo Access

### Try It Now
Visit [s4ledger.com](https://s4ledger.com) — no account required for basic demo.

### Sandbox API Key
For API testing, use the demo key:
```
X-API-Key: s4-demo-key-2026
```

**Note:** Demo key is rate-limited to 120 req/min and uses XRPL Testnet.

### Sample Anchor Request
```bash
curl -X POST https://s4ledger.com/api/anchor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: s4-demo-key-2026" \
  -d '{"data": "Supply receipt for NSN 5340-01-234-5678", "record_type": "USN_SUPPLY_RECEIPT"}'
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    S4 Ledger Frontend                     │
│         Hub Landing Page → Section Sub-Pages              │
│  (Anchor | Verify | Tx Log | ILS Workspace | Systems)    │
│              + Floating Wallet Sidebar                    │
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS / gRPC
┌────────────────────▼─────────────────────────────────────┐
│                   S4 Ledger API                           │
│  Python (Vercel Serverless)  ──  3,300+ lines             │
│  RBAC • Rate Limiting • Webhooks • AI Agent               │
│  Circuit Breakers • Prometheus Metrics                    │
└────────┬───────────┬────────────┬────────────────────────┘
         │           │            │
    ┌────▼───┐  ┌────▼───┐  ┌────▼────────┐
    │  XRPL  │  │Supabase│  │ External    │
    │Testnet/│  │  Auth  │  │ DLA FLIS    │
    │Mainnet │  │  + DB  │  │ GIDEP       │
    │        │  │        │  │ PIEE/WAWF   │
    └────────┘  └────────┘  └─────────────┘
```

---

## Subscription Plans

| Plan | Monthly | SLS/mo | Anchors | AI Queries | ILS Tools |
|------|---------|--------|---------|------------|-----------|
| Pilot | Free | 100 | 10,000 | 50 | 14 |
| Starter | $999 | 25,000 | 2,500,000 | 500 | 14 |
| Professional | $2,499 | 100,000 | 10,000,000 | Unlimited | 14 |
| Enterprise | $9,999 | 500,000 | Unlimited | Unlimited | 14 + HarborLink |

---

*S4 Ledger — Built by S4 Systems, LLC*  
*Defense-grade integrity. Zero data on-chain. Immutable audit trails.*
