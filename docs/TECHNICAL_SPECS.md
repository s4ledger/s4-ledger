# S4 Ledger: Technical Specifications
*Version 5.2.0 — A product line of S4 Systems, LLC*

**Architecture: Hash Anchoring via XRP Ledger (XRPL)**

## 1. Hashing Algorithm

S4 Ledger uses **SHA-256** (NIST FIPS 180-4) for all record fingerprints.

- **Input:** Any data — normalized JSON, PDF binary, file contents, serialized record
- **Output:** 64-character hexadecimal string (256 bits)
- **Properties:** Collision-resistant, irreversible, deterministic

## 2. XRPL Transaction Structure

S4 Ledger utilizes the `Memos` field in a standard XRPL transaction to anchor data:

```json
{
  "TransactionType": "AccountSet",
  "Account": "S4_ISSUER_ADDRESS",
  // No Destination needed — AccountSet modifies own account
  // Memo contains the SHA-256 hash
  "Memos": [
    {
      "Memo": {
        "MemoType": "HEX('defense.anchor')",
        "MemoData": "SHA-256 HASH (64 hex chars)",
        "MemoFormat": "HEX('text/plain')"
      }
    }
  ]
}
```

## 3. Record Types

| Type Code | Description | Example |
|---|---|---|
| `supply_chain_receipt` | Part receipt / chain of custody | NSN lot acceptance |
| `maintenance_3m` | 3-M / SCLSIS maintenance record | MRC completion |
| `cdrl_delivery` | Contract deliverable submission | CDRL A003 delivery |
| `tdp_delivery` | Technical Data Package delivery | TDP Rev 4 |
| `configuration_baseline` | Configuration baseline snapshot | AEGIS BL10 CB |
| `batch_coc` | Batch certificate of conformance | 24x transmission assemblies |
| `audit_artifact` | Audit evidence / inspection report | INSURV finding |

*S4 Ledger supports **156+ pre-built record types across 9 military branches** mapped to real-world defense logistics workflows. The table above shows core examples — any defense record type can be anchored.*

## 4. SDK Specifications

| Property | Value |
|---|---|
| **Language** | Python 3.10+ |
| **Core Dependencies** | `xrpl-py`, `cryptography` |
| **Authentication** | XRPL wallet seed (secp256k1, Xaman-compatible) |
| **Hashing** | SHA-256 (hashlib, stdlib) |
| **Transport** | WebSocket (wss://) to XRPL nodes |
| **Encryption** | TLS 1.3 |
| **Batch Size** | Up to 1,000 records |
| **SDK Functions** | 37 (anchor, verify, batch, status, readiness, dmsms, roi, lifecycle, warranty, supply-chain-risk, audit-reports, contracts, digital-thread, predictive-maintenance, compliance, ILIE, defense-db-import, custody-transfer, proof-chain, webhook, composite-anchor, ai-query, offline-sync, and more) |

## 5. REST API

| Property | Value |
|---|---|
| **Endpoints** | 65 production REST API endpoints |
| **Framework** | Zero-dependency (BaseHTTPRequestHandler) |
| **Authentication** | API key (master + org keys) |
| **Rate Limiting** | 120 requests/minute per IP |
| **Spec** | OpenAPI 3.0 at /api/openapi.json |

## 6. ILS Workspace

| Property | Value |
|---|---|
| **Tools** | 14 interactive ILS management tools |
| **Platforms** | 500+ pre-loaded (500+ platforms, 37 suppliers, 25 contracts) |
| **Record Types** | 156+ pre-built record types across 9 military branches |
| **Standards** | MIL-STD-1388, DoDI 4245.15, DoD 5000.73, FAR 46.7, MIL-STD-1390D |

## 7. XRPL Network

| Property | Value |
|---|---|
| **Consensus** | XRP Ledger Consensus Protocol |
| **Validators** | 150+ independent validators |
| **Finality** | 3-5 seconds |
| **Cost** | ≈0.000012 XRP per transaction (≈$0.000024) |
| **Uptime** | 99.99%+ since 2012 |
| **Explorer** | livenet.xrpl.org |

### Why XRPL?

S4 Ledger evaluated Ethereum, Solana, Hyperledger, and private blockchain platforms before selecting the XRP Ledger:

| Criteria | Ethereum | Solana | Hyperledger | XRPL |
|---|---|---|---|---|
| **Finality** | 12+ minutes | 400ms (but outage-prone) | Varies | **3-5 seconds** |
| **Cost/tx** | $5–$50+ | ~$0.00025 | Infrastructure cost $500K+ | **≈$0.000024** |
| **Uptime** | 99.9% | ~98% (multiple outages) | Operator-dependent | **99.99%+ since 2012** |
| **Public/Neutral** | Yes | Yes | ❌ Private/vendor-controlled | **Yes (150+ validators)** |
| **Energy** | Proof-of-Stake | Proof-of-Stake/History | Varies | **Federated consensus (negligible energy)** |
| **Defense suitability** | High fees prohibit volume | Reliability concerns | No independent verification | **Ideal: fast, cheap, public, reliable** |

Private blockchains (Hyperledger, Guardtime KSI) defeat the purpose of independent verification — they're controlled by a single entity. Ethereum's gas fees ($5–$50+) make high-volume defense anchoring economically unviable. XRPL provides the speed, cost, neutrality, and reliability required for defense-grade audit trails.

## 8. $SLS Token

| Property | Value |
|---|---|
| **Code** | SLS |
| **Issuer** | `r95GyZac4butvVcsTWUPpxzekmyzaHsTA5` |
| **Total Supply** | 100,000,000 |
| **Treasury Wallet** | `raWL7nYZkuXMUurHcp5ZXkABfVgStdun51` (secp256k1) |
| **Treasury** | `rMLmkrxpadq5z6oTDmq8GhQj9LKjf1KLqJ` (receives 0.01 SLS/anchor) |
| **Fee per Anchor** | ~0.01 SLS |

## 9. Security

- **No data on-chain** — only SHA-256 hashes
- **No CUI/CDI exposure** — architecture makes it impossible
- **No key storage** — wallet seeds remain with the user
- **No telemetry** — SDK does not collect usage data
- **Input validation** — all inputs sanitized before processing

## 10. Compliance Alignment

| Standard | Status |
|---|---|
| NIST SP 800-171 | Aligned |
| CMMC Level 2 | **In Progress** — S4 Systems, LLC |
| DFARS 252.204-7012 | Compliant (no CDI on-chain) |
| NIST SP 800-53 (AU) | Immutable audit trail |
| FedRAMP | Planned (Phase 5) |
| FIPS 180-4 | SHA-256 compliant |

## DoD / DoN Database Integration

S4 Ledger provides native import adapters for 13+ DoD and DoN logistics information systems. Data exported from these systems can be ingested in CSV, XML, or JSON format, automatically mapped to S4 Ledger record types, hashed with SHA-256, and optionally anchored to the XRPL blockchain.

### Supported Systems

| System | Agency | Formats | S4 Record Types |
|--------|--------|---------|------------------|
| NSERC / SE IDE | NAVSEA | CSV, XML, JSON | Configuration, TDPs, DRLs |
| MERLIN | NAVSEA | CSV, XML | Maintenance, PMS, Depot Repair, Calibration |
| NAVAIR AMS PMT | NAVAIR | CSV, XML, JSON | Aviation Maintenance, Flight Ops, Supply |
| COMPASS | DoD | CSV, Fixed-Width | Personnel, Training, Readiness |
| CDMD-OA | NAVSEA/PMS | XML, JSON | Config Baselines, CDRLs, Ship Alterations |
| NDE | Navy | JSON, XML, CSV | Supply Chain, Custody, Quality, Fielding |
| MBPS | OSD/DSPO | XML, JSON | Sustainment, Parts, Readiness Metrics |
| PEO MLB | PEO MLB | CSV, XML | Littoral Combat, Mine Warfare, Ordnance |
| CSPT | NAVSEA | XML, JSON, CSV | Combat Systems Cert, Config, Calibration |
| GCSS | USA/JOINT | CSV, XML, JSON | Global Logistics, Inventory, Maintenance |
| DPAS | OSD | CSV, Fixed-Width | Property Accountability, Custody, Assets |
| DLA FLIS / WebFLIS | DLA | CSV, Fixed-Width, XML | Federal Catalog, NSN Lookup, Supply |
| NAVSUP OneTouch | NAVSUP | CSV, XML, JSON | Supply Chain, Quality Defects, Custody |

### Import Workflow

1. **Export** — Extract data from the DoD system in CSV, XML, or JSON
2. **Upload** — Load the file into S4 Ledger via the ILS Workspace "DoD Import" tool or the SDK `import_and_anchor()` method
3. **Parse & Map** — S4 automatically detects the format and maps fields to the appropriate record types
4. **Hash** — Each record is individually hashed with SHA-256
5. **Anchor** — Optionally anchor each hash to the XRPL blockchain for immutable verification
6. **Integrate** — Imported data flows into all 14 ILS tools: DMSMS tracking, readiness, parts cross-reference, audit vault, etc.

### SDK Import Methods

```python
sdk = S4SDK(wallet_seed="sEd...", network="mainnet")

# List supported systems
systems = sdk.list_dod_systems()

# Import CSV from CDMD-OA
result = sdk.import_csv(csv_text, "cdmd_oa")

# Import and auto-anchor
result = sdk.import_and_anchor(file_text, "merlin", file_format="csv", anchor=True)
```

## Tamper Detection & Response

S4 Ledger provides a complete tamper detection, notification, and correction pipeline.

### Detection

Every record anchored to the XRPL includes its SHA-256 hash in the transaction memo. To verify integrity, the `POST /api/verify` endpoint (or `sdk.verify_against_chain()`) recomputes the hash of the current record and compares it against the on-chain value.

- **MATCH** — Record is intact. Hash matches on-chain proof.
- **MISMATCH** — Tamper detected. Current data differs from anchored version.
- **NOT_FOUND** — No on-chain record found for the given transaction hash.

### Response Pipeline

1. **Detect** — Verification returns `tamper_detected: true`
2. **Alert** — System sends CRITICAL priority notification via `send_tamper_alert()` to Security Officer, Program Manager, and Contracting Officer
3. **Webhook** — All registered webhook endpoints receive the tamper alert via HTTP POST with HMAC signature
4. **Audit Log** — Every verification attempt (pass or fail) is recorded in the verification audit trail with operator ID, timestamp, both hashes, and result
5. **Correct** — The `correct_record()` SDK method or the correction API re-anchors the corrected record with a `supersedes_tx` link to the original, preserving the full chain of custody

### Correction Chain

When a tampered record is corrected:
- The corrected version is re-anchored to the XRPL with a new transaction
- The memo includes `CORRECTION:{new_hash}:SUPERSEDES:{original_tx}` linking the two
- The original transaction remains on-chain as part of the immutable audit trail
- A correction notice is sent via the comms module to all stakeholders

---

## 10. Full API Endpoint Inventory (65 Endpoints)

### Core Platform
| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | GET | Platform status and version |
| `/api/health` | GET | Health check |
| `/api/metrics` | GET | Platform metrics summary |
| `/api/transactions` | GET | Transaction history |
| `/api/record-types` | GET | List all supported record types |
| `/api/xrpl-status` | GET | XRPL network status |
| `/api/infrastructure` | GET | Infrastructure overview |

### Anchoring & Verification
| Endpoint | Method | Description |
|---|---|---|
| `/api/anchor` | POST | Anchor a hash to XRPL |
| `/api/anchor/batch` | POST | Batch anchor multiple hashes |
| `/api/anchor/composite` | POST | Composite multi-doc anchor |
| `/api/verify` | POST | Verify a hash against XRPL |
| `/api/verify/batch` | POST | Batch verify multiple hashes |
| `/api/verify/ai` | POST | Verify an AI decision hash |
| `/api/hash` | POST | Generate SHA-256 hash |
| `/api/hash/file` | POST | Hash a file upload |
| `/api/categorize` | POST | Auto-categorize a record |
| `/api/proof-chain` | GET | Get proof chain for a hash |

### ILS & Defense
| Endpoint | Method | Description |
|---|---|---|
| `/api/dmsms` | GET | DMSMS obsolescence data |
| `/api/readiness` | GET | Readiness metrics (Ao/Ai) |
| `/api/parts` | GET | Parts lookup |
| `/api/roi` | GET | ROI calculator |
| `/api/lifecycle` | GET | Lifecycle cost analysis |
| `/api/warranty` | GET | Warranty tracker |
| `/api/supply-chain-risk` | GET | Supply chain risk assessment |
| `/api/audit-reports` | GET | Audit report data |
| `/api/contracts` | GET | Contract management |
| `/api/digital-thread` | GET | Digital thread tracker |
| `/api/predictive-maintenance` | GET | Predictive maintenance data |
| `/api/action-items` | GET | Action item management |
| `/api/calendar` | GET | Milestone calendar |
| `/api/ils/gap-analysis` | GET | ILS gap analysis with scoring |
| `/api/logistics/risk-score` | GET | Weighted logistics risk score |
| `/api/defense/task` | POST | Execute defense tasks (compliance, readiness, threat sim) |

### AI & NLP
| Endpoint | Method | Description |
|---|---|---|
| `/api/ai-chat` | POST | AI assistant chat (OpenAI/Anthropic/local) |
| `/api/ai/query` | POST | NLP query with intent detection |

### Integrations
| Endpoint | Method | Description |
|---|---|---|
| `/api/integrations/wawf` | POST | WAWF/PIEE webhook receiver |
| `/api/webhooks/register` | POST | Register webhook endpoint |
| `/api/webhooks/list` | GET | List registered webhooks |
| `/api/webhooks/deliveries` | GET | Webhook delivery history |
| `/api/webhooks/test` | POST | Test webhook delivery |

### Custody & Chain of Custody
| Endpoint | Method | Description |
|---|---|---|
| `/api/custody/transfer` | POST | Transfer custody |
| `/api/custody/chain` | GET | Get custody chain |
| `/api/org/records` | GET | Organization records |

### Wallet & Economy
| Endpoint | Method | Description |
|---|---|---|
| `/api/wallet/provision` | POST | Provision XRPL wallet |
| `/api/wallet/buy-sls` | POST | Purchase SLS tokens |
| `/api/wallet/balance` | GET | Wallet balance |
| `/api/treasury/health` | GET | Treasury health status |
| `/api/webhook/stripe` | POST | Stripe payment webhook |

### Offline / On-Prem
| Endpoint | Method | Description |
|---|---|---|
| `/api/offline/queue` | GET | Offline queue status |
| `/api/offline/sync` | POST | Batch sync queued hashes |

### Performance Metrics
| Endpoint | Method | Description |
|---|---|---|
| `/api/metrics/performance` | GET | Real-time performance dashboard data |

### Security
| Endpoint | Method | Description |
|---|---|---|
| `/api/security/audit-trail` | GET | AI + verification audit trail |
| `/api/security/rbac` | GET/POST | RBAC role management |
| `/api/security/zkp` | GET/POST | Zero-Knowledge Proof generation & verification |
| `/api/security/threat-model` | GET | STRIDE threat model assessment |
| `/api/security/dependency-audit` | GET | Dependency security audit (CycloneDX SBOM) |

### Auth
| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/api-key` | POST | Generate API key |
| `/api/auth/validate` | POST | Validate API key |

### Demo
| Endpoint | Method | Description |
|---|---|---|
| `/api/demo/provision` | POST | Provision demo session |
| `/api/demo/anchor` | POST | Demo anchor |
| `/api/demo/status` | GET | Demo session status |

### Database
| Endpoint | Method | Description |
|---|---|---|
| `/api/db/save-analysis` | POST | Save ILS analysis to Supabase |
| `/api/db/get-analyses` | GET | Retrieve saved analyses |

---

*Created by Nick Frankfort — S4 Systems, LLC — Charleston, SC*

For technical inquiries: info@s4ledger.com | [s4ledger.com](https://s4ledger.com)


---

## v12 Technical Additions (2026-02-22)

### AI Threat Intelligence Engine
- **Inputs:** Risk item data (level, factors, supplier, NSN)
- **Scoring:** Weighted composite: critical items (×12), high (×6), single-source (×8), GIDEP alerts (×5), lead time spikes (×4)
- **Output:** 0-100 Threat Score with RED/AMBER/GREEN classification
- **Dashboard:** Real-time overlay in Supply Chain Risk panel

### Predictive Failure Timeline
- **Data Source:** Predictive Maintenance table (system, confidence, ETA, cost)
- **Visualization:** Chart.js stacked bar — 12 monthly buckets, severity-coded
- **Buckets:** Critical (≥85% conf), High (≥70%), Medium (≥50%), Low (<50%)

### SBOM Integration
- **Formats:** CycloneDX 1.5, SPDX 2.3, S4 Native
- **Fields:** Component name, version, type, CVE count, license, supplier, severity
- **Database:** Per-platform component catalogs (12+ components per platform)
- **Anchoring:** SHA-256 hash of SBOM snapshot → XRPL memo field

### Digital Thread Graph
- **Chain:** Source Tool → Content → SHA-256 → Encryption Status → XRPL Anchor → Verification → Audit Trail
- **Rendering:** Vertical provenance graph with color-coded steps and explorer links

### Zero-Trust Audit Watermark
- **Mechanism:** All `Blob` creation for CSV exports intercepted and wrapped with verification header/footer
- **Header includes:** Report type, program, timestamp, session ID, blockchain network, export hash, verification URL
- **Tamper detection:** Instructions to verify at s4ledger.com/verify

### Collaboration Indicators
- **Session management:** Simulated multi-analyst presence with avatar overlays
- **Activity tracking:** Rotating status messages showing analyst actions
- **Joining simulation:** Analysts appear at 15-45s intervals for demo realism

### Navy Platform Expansion
- **Total programs:** 28 in PROGS + custom + fallback to S4_PLATFORMS (462)
- **Dropdown categories:** 11 optgroups (NAVSEA Surface, Submarines, Mine, Amphibs, Service Craft; NAVAIR Strike Fighters, Mission Support, Rotary, Tiltrotor, Training; USMC Aviation)

