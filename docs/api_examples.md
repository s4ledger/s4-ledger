# S4 Ledger API Examples

> **Base URL:** `https://s4ledger.com`  
> **Auth:** Include `X-API-Key: YOUR_KEY` header on all requests.  
> **65 REST API endpoints** — see [TECHNICAL_SPECS.md](TECHNICAL_SPECS.md) for full listing.

---

## Anchor a Defense Record (Python)

```python
from s4_sdk import S4Ledger

ledger = S4Ledger(wallet_seed="sYourXRPLSecret")

# Anchor a supply chain receipt
result = ledger.anchor_hash(
    data="LOT-2026-02-FASTENERS-500ea-NSN5306-NORFOLK",
    record_type="supply_chain_receipt",
    metadata={"nsn": "5306-01-234-5678", "qty": 500}
)
print(result)
```

## Verify a Record Hash (Python)

```python
result = ledger.verify_hash(
    data="LOT-2026-02-FASTENERS-500ea-NSN5306-NORFOLK",
    tx_hash="8A3F2D1B9C7E4A6D0F2B4E6A8C1D3F5B7E9A2C4D6F8B1E3A5C7D9F2B4A6E8C"
)
print(f"Verified: {result['verified']}")
print(f"Timestamp: {result['timestamp']}")
```

## Audit Log Retrieval (Python)

```python
import requests
response = requests.get('https://s4ledger.com/api/audit-reports',
    headers={'X-API-Key': 'YOUR_KEY'})
print(response.json())
```

## Anchor a CDRL Delivery (cURL)

```bash
curl -X POST https://s4ledger.com/api/anchor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "data": "CDRL-A003-DI-MGMT-81466-Rev3-2026-02-12.pdf",
    "record_type": "cdrl_delivery",
    "metadata": {"contract": "N00024-26-C-5500", "cdrl": "A003"}
  }'
```

## Verify a Record (cURL)

```bash
curl -X POST https://s4ledger.com/api/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "data": "CDRL-A003-DI-MGMT-81466-Rev3-2026-02-12.pdf",
    "tx_hash": "F1A3B5C7D9E2F4A6B8C1D3E5F7A9B2C4D6E8F1A3B5C7D9E2F4A6B8C1D3E5F7"
  }'
```

## Batch Anchor (Python)

```python
records = [
    {"data": "MRC-4790-GTE-001-completion.json", "record_type": "maintenance_3m"},
    {"data": "LOT-2026-02-HT24-COC.pdf", "record_type": "batch_coc"},
    {"data": "CB-2026-Q1-R3-baseline.zip", "record_type": "configuration_baseline"},
]

results = ledger.anchor_batch(records)
for r in results:
    print(f"{r['record_type']}: {r['tx_hash']}")
```

---

## AI NLP Query (cURL)

```bash
curl -X POST https://s4ledger.com/api/ai/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "query": "What are the ILS gaps for the DDG-51 program?",
    "task_type": "ils_gap"
  }'
```

## WAWF / PIEE Integration Webhook (cURL)

```bash
curl -X POST https://s4ledger.com/api/integrations/wawf \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "contractId": "N00024-26-C-5500",
    "event_type": "receipt",
    "status": "accepted",
    "payload": {"invoice": "INV-20260301", "amount": 245000}
  }'
```

## Defense Task — Compliance Check (cURL)

```bash
curl -X POST https://s4ledger.com/api/defense/task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "task_type": "compliance_check",
    "parameters": {}
  }'
```

## Defense Task — Readiness Calculation (cURL)

```bash
curl -X POST https://s4ledger.com/api/defense/task \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "task_type": "readiness_calc",
    "parameters": {"mtbf": 1200, "mttr": 3, "aldt": 1.5}
  }'
```

## ILS Gap Analysis (cURL)

```bash
curl https://s4ledger.com/api/ils/gap-analysis \
  -H "X-API-Key: YOUR_KEY"
```

## Logistics Risk Score (cURL)

```bash
curl https://s4ledger.com/api/logistics/risk-score \
  -H "X-API-Key: YOUR_KEY"
```

## Performance Metrics Dashboard (cURL)

```bash
curl https://s4ledger.com/api/metrics/performance \
  -H "X-API-Key: YOUR_KEY"
```

## Offline Queue Status (cURL)

```bash
curl https://s4ledger.com/api/offline/queue \
  -H "X-API-Key: YOUR_KEY"
```

## Offline Batch Sync (cURL)

```bash
curl -X POST https://s4ledger.com/api/offline/sync \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "hashes": [
      {"hash": "abc123...", "record_type": "OFFLINE_BATCH", "branch": "JOINT"},
      {"hash": "def456...", "record_type": "OFFLINE_BATCH", "branch": "NAVY"}
    ]
  }'
```

## Zero-Knowledge Proof — Generate (cURL)

```bash
curl -X POST https://s4ledger.com/api/security/zkp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"hash": "a1b2c3d4e5f6..."}'
```

## Zero-Knowledge Proof — Verify (cURL)

```bash
curl -X POST https://s4ledger.com/api/security/zkp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "hash": "a1b2c3d4e5f6...",
    "proof": {"commitment": "...", "challenge": "...", "response": "..."}
  }'
```

## RBAC — Get Roles & Permissions (cURL)

```bash
curl https://s4ledger.com/api/security/rbac \
  -H "X-API-Key: YOUR_KEY"
```

## Security Threat Model (cURL)

```bash
curl https://s4ledger.com/api/security/threat-model \
  -H "X-API-Key: YOUR_KEY"
```

## Dependency Audit (cURL)

```bash
curl https://s4ledger.com/api/security/dependency-audit \
  -H "X-API-Key: YOUR_KEY"
```

## Security Audit Trail (cURL)

```bash
curl https://s4ledger.com/api/security/audit-trail \
  -H "X-API-Key: YOUR_KEY"
```

## Verify AI Decision (cURL)

```bash
curl -X POST https://s4ledger.com/api/verify/ai \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{"response_hash": "sha256_hash_of_ai_response"}'
```

## Webhook Registration (cURL)

```bash
curl -X POST https://s4ledger.com/api/webhooks/register \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_KEY" \
  -d '{
    "url": "https://your-system.com/webhook",
    "events": ["anchor.confirmed", "batch.completed"],
    "secret": "your-hmac-secret"
  }'
```

## Demo Mode — Provision & Anchor (cURL)

```bash
# Provision a demo session
curl -X POST https://s4ledger.com/api/demo/provision \
  -H "Content-Type: application/json"

# Anchor in demo mode
curl -X POST https://s4ledger.com/api/demo/anchor \
  -H "Content-Type: application/json" \
  -d '{"session_id": "demo_...", "data": "test-document.pdf", "record_type": "test"}'
```
