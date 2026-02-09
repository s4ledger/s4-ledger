# SLS Protocol — XRPL Mainnet Migration Guide

> **Status:** Pre-production. This document outlines the step-by-step process for migrating from XRPL Testnet to XRPL Mainnet. A pre-built backend endpoint is included but **has not been deployed to production**.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture Change: Client-Side → Server-Side Signing](#2-architecture-change)
3. [XRPL Addresses & Configuration](#3-xrpl-addresses--configuration)
4. [Step-by-Step Migration Process](#4-step-by-step-migration-process)
5. [Pre-Built Backend Anchor Endpoint](#5-pre-built-backend-anchor-endpoint)
6. [Frontend Changes](#6-frontend-changes)
7. [Security Considerations](#7-security-considerations)
8. [Testing the Migration](#8-testing-the-migration)
9. [Rollback Plan](#9-rollback-plan)
10. [Cost Estimation](#10-cost-estimation)
11. [XRPL Amendment Resilience](#11-xrpl-amendment-resilience)
12. [SVCN Care Network Migration](#12-svcn-care-network-migration)
13. [SLS Protocol EHR Migration](#13-sls-protocol-ehr-migration)
14. [Metrics API Migration](#14-metrics-api-migration)
15. [Visual Calendar & Scheduling](#15-visual-calendar--scheduling-v2100)
16. [ICD-10/CPT Billing & Claim Lifecycle](#16-icd-10cpt-billing--claim-lifecycle-v2100)
17. [Insurance Eligibility Verification & Anchoring](#17-insurance-eligibility-verification--anchoring-v2100)
18. [Drug Interaction Checker](#18-drug-interaction-checker-v2100)
19. [XLS-20 NFT Consent Tokens](#19-xls-20-nft-consent-tokens-v2100)
20. [Gamification & Guardian Level System](#20-gamification--guardian-level-system-v2100)
21. [Hash Mismatch & Integrity Testing](#21-hash-mismatch--integrity-testing-v2100)
22. [Multi-Factor Authentication](#22-multi-factor-authentication-v2100)
23. [Settings Persistence & PWA Service Worker](#23-settings-persistence--pwa-service-worker-v2100)
24. [In-App Feedback System](#24-in-app-feedback-system-v2100)
25. [ONC/CEHRT Compliance Roadmap](#25-onccehrt-compliance-roadmap)
26. [Freemium Pricing Model](#26-freemium-pricing-model)
27. [PWA Push Notifications (v2.10.1)](#27-pwa-push-notifications-v2101)
28. [Cohort Analytics & Population Health (v2.10.1)](#28-cohort-analytics--population-health-v2101)
29. [Stress Testing & Scalability Benchmarks (v2.10.1)](#29-stress-testing--scalability-benchmarks-v2101)
30. [AI Predictions & Insights Engine (v2.10.4)](#30-ai-predictions--insights-engine-v2104)
31. [Enhanced Scheduling System (v2.10.4)](#31-enhanced-scheduling-system-v2104)

---

## 1. Overview

### Current State (Testnet)
- **Network:** XRPL Testnet
- **WebSocket:** `wss://s.altnet.rippletest.net:51233`
- **REST API:** `https://s.altnet.rippletest.net:51234/`
- **Explorer:** `https://testnet.xrpl.org`
- **Signing:** Client-side (wallet seed embedded in browser JavaScript)
- **Account:** `rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA`
- **Cost:** Free (testnet XRP from faucet)

### Target State (Mainnet)
- **Network:** XRPL Mainnet
- **WebSocket:** `wss://xrplcluster.com` or `wss://s1.ripple.com`
- **REST API:** `https://xrplcluster.com/` or `https://s1.ripple.com:51234/`
- **Explorer:** `https://livenet.xrpl.org`
- **Signing:** Server-side only (wallet secret stored as environment variable)
- **Account:** SLS Issuer Address (see Section 3)
- **Cost:** ~0.000012 XRP per transaction (~$0.000024 at $2/XRP)

---

## 2. Architecture Change

### Why Server-Side Signing is Required

On Testnet, the wallet seed is embedded in the browser JavaScript for demo purposes. **This is not acceptable for Mainnet** because:

1. **Anyone can inspect browser JavaScript** and extract the seed
2. **A stolen mainnet seed** gives full control over real XRP funds
3. **Rate limiting and access control** cannot be enforced client-side
4. **Audit logging** requires a server-side layer
5. **HIPAA compliance** requires server-side access controls

### Architecture Diagram

```
┌─────────────────────────────────────┐
│          CURRENT (Testnet)          │
│                                     │
│  Browser ──(xrpl.js)──> XRPL       │
│    │                   Testnet      │
│    └── Seed in JS (INSECURE)        │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│          TARGET (Mainnet)           │
│                                     │
│  Browser ──(HTTPS)──> Backend API   │
│                           │         │
│                    ┌──────┴──────┐  │
│                    │ Server-Side │  │
│                    │   Signing   │  │
│                    │ (seed in    │  │
│                    │  env var)   │  │
│                    └──────┬──────┘  │
│                           │         │
│                      XRPL Mainnet   │
└─────────────────────────────────────┘
```

---

## 3. XRPL Addresses & Configuration

### SLS Issuer Account

The **SLS (Solus Ledger Service) Issuer** is the mainnet account that will submit all anchor transactions.

| Field | Value |
|-------|-------|
| **Account Type** | Regular XRPL Account |
| **Purpose** | Submit `AccountSet` transactions with Memo-based health record anchors |
| **Minimum Reserve** | 10 XRP (base reserve) |
| **Recommended Balance** | 50–100 XRP (covers ~4–8 million transactions) |

### How to Create the SLS Issuer Account

```bash
# Generate a new mainnet wallet using xrpl.js or ripple-keypairs
node -e "
const xrpl = require('xrpl');
const wallet = xrpl.Wallet.generate();
console.log('Address:', wallet.classicAddress);
console.log('Seed:', wallet.seed);
console.log('Public Key:', wallet.publicKey);
"
```

**CRITICAL:** Store the seed securely:
- Save to a hardware security module (HSM) or encrypted secrets manager
- Set as `XRPL_MAINNET_SEED` environment variable on the backend server
- **Never commit the seed to Git**
- **Never expose it in client-side code**

### Fund the Account

Send at least **50 XRP** to the generated address from an exchange or existing wallet. The 10 XRP base reserve is locked; remaining 40 XRP covers millions of transactions.

### Environment Variables

```bash
# Backend server environment variables
XRPL_MAINNET_SEED=s__________________________________  # Mainnet wallet seed
XRPL_MAINNET_ACCOUNT=r_________________________________  # Mainnet wallet address
XRPL_MAINNET_URL=wss://xrplcluster.com                   # Mainnet WebSocket
XRPL_NETWORK=mainnet                                      # Network selector
SOLUS_API_KEY=sk_live_________________________________     # API key for frontend auth
SOLUS_RATE_LIMIT=100                                       # Max anchors per minute
```

---

## 4. Step-by-Step Migration Process

### Phase 1: Prepare Backend (Do First — No Impact on Live App)

- [ ] **Step 1.1** — Generate a mainnet wallet (see Section 3)
- [ ] **Step 1.2** — Fund the wallet with 50+ XRP
- [ ] **Step 1.3** — Deploy the backend anchor endpoint (see Section 5) to Render
- [ ] **Step 1.4** — Set environment variables on Render
- [ ] **Step 1.5** — Test the backend endpoint using curl with testnet first:
  ```bash
  curl -X POST https://solusprotocol.onrender.com/api/anchor \
    -H "Content-Type: application/json" \
    -H "X-API-Key: YOUR_API_KEY" \
    -d '{"hash": "abc123...", "record_type": "lab_results"}'
  ```
- [ ] **Step 1.6** — Verify the transaction appears on the XRPL Explorer

### Phase 2: Update Frontend (Deploy When Ready to Go Live)

- [ ] **Step 2.1** — Remove xrpl.js CDN script tag from `demo-app/index.html`
- [ ] **Step 2.2** — Replace `anchorFromPlayground()` with backend API call (see Section 6)
- [ ] **Step 2.3** — Replace `anchorBatchQueue()` with backend API calls
- [ ] **Step 2.4** — Update `verifyRecordOnChain()` to use mainnet explorer + account
- [ ] **Step 2.5** — Update explorer links from `testnet.xrpl.org` to `livenet.xrpl.org`
- [ ] **Step 2.6** — Update WebSocket status indicator text (remove "Testnet" references)
- [ ] **Step 2.7** — Test end-to-end on staging

### Phase 3: Switch DNS & Go Live

- [ ] **Step 3.1** — Set `XRPL_NETWORK=mainnet` on the backend
- [ ] **Step 3.2** — Deploy updated frontend to Vercel
- [ ] **Step 3.3** — Smoke test: anchor one record and verify on mainnet explorer
- [ ] **Step 3.4** — Monitor backend logs and XRPL account balance
- [ ] **Step 3.5** — Update documentation and whitepaper references

### Phase 4: Post-Launch

- [ ] **Step 4.1** — Set up XRP balance monitoring alerts (warn at 10 XRP)
- [ ] **Step 4.2** — Set up backend health check monitoring
- [ ] **Step 4.3** — Enable rate limiting in production
- [ ] **Step 4.4** — Archive testnet-related code

---

## 5. Pre-Built Backend Anchor Endpoint

Add the following to `metrics_api.py` (or create a new `anchor_api.py`). This code is **ready to deploy** but configured to use testnet by default until `XRPL_NETWORK=mainnet` is set.

### Backend Code (`metrics_api.py` addition)

```python
import os
import time
import hashlib
import secrets
from functools import wraps
from flask import request, jsonify

# ===== XRPL MAINNET ANCHOR ENDPOINT =====
# This endpoint receives a SHA-256 hash from the frontend,
# signs an AccountSet transaction server-side, and submits
# it to XRPL. The wallet seed NEVER leaves the server.

XRPL_NETWORK = os.environ.get('XRPL_NETWORK', 'testnet')
XRPL_SEED = os.environ.get('XRPL_MAINNET_SEED', 'sEd75GpyfXbSLGUShjwvViXoo6xaGuZ')  # Testnet default
SOLUS_API_KEY = os.environ.get('SOLUS_API_KEY', 'sk_test_demo_key_not_for_production')
RATE_LIMIT = int(os.environ.get('SOLUS_RATE_LIMIT', '100'))

XRPL_URLS = {
    'testnet': 'https://s.altnet.rippletest.net:51234/',
    'mainnet': 'https://xrplcluster.com/'
}

XRPL_WS_URLS = {
    'testnet': 'wss://s.altnet.rippletest.net:51233',
    'mainnet': 'wss://xrplcluster.com'
}

EXPLORER_URLS = {
    'testnet': 'https://testnet.xrpl.org/transactions/',
    'mainnet': 'https://livenet.xrpl.org/transactions/'
}

# Simple in-memory rate limiter (use Redis in production)
_rate_limit_store = {}

def check_rate_limit(api_key):
    """Return True if request is within rate limit."""
    now = time.time()
    window_start = now - 60
    if api_key not in _rate_limit_store:
        _rate_limit_store[api_key] = []
    # Remove old entries
    _rate_limit_store[api_key] = [t for t in _rate_limit_store[api_key] if t > window_start]
    if len(_rate_limit_store[api_key]) >= RATE_LIMIT:
        return False
    _rate_limit_store[api_key].append(now)
    return True

def require_api_key(f):
    """Decorator to require API key authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        api_key = request.headers.get('X-API-Key', '')
        if not api_key or api_key != SOLUS_API_KEY:
            return jsonify({'error': 'Invalid or missing API key'}), 401
        if not check_rate_limit(api_key):
            return jsonify({'error': 'Rate limit exceeded. Max ' + str(RATE_LIMIT) + ' requests per minute.'}), 429
        return f(*args, **kwargs)
    return decorated


@app.route('/api/anchor', methods=['POST'])
@require_api_key
def anchor_record():
    """
    Anchor a health record hash to the XRPL.
    
    Request body:
        {
            "hash": "64-char hex SHA-256 hash",
            "record_type": "lab_results|surgery|vitals|...",
            "metadata": "optional additional context"
        }
    
    Response:
        {
            "success": true,
            "tx_hash": "XRPL transaction hash",
            "ledger_index": 12345678,
            "account": "rXXX...",
            "explorer_url": "https://livenet.xrpl.org/transactions/...",
            "network": "mainnet",
            "timestamp": "2025-01-15T10:30:00Z"
        }
    """
    import xrpl
    import xrpl.clients
    import xrpl.wallet
    import xrpl.models.transactions
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    record_hash = data.get('hash', '').strip()
    record_type = data.get('record_type', 'custom_record').strip()
    
    # Validate hash
    if not record_hash or len(record_hash) != 64:
        return jsonify({'error': 'Hash must be exactly 64 hex characters (SHA-256)'}), 400
    try:
        int(record_hash, 16)
    except ValueError:
        return jsonify({'error': 'Hash must be valid hexadecimal'}), 400
    
    # Validate record type
    allowed_types = [
        'lab_results', 'surgery', 'vitals', 'imaging', 'prescription',
        'immunization', 'clinical_note', 'discharge_summary', 'emergency',
        'mental_health', 'referral', 'consent', 'insurance_claim',
        'pathology', 'genetic_test', 'dental', 'optometry', 'physical_therapy',
        'allergy', 'patient_message', 'custom_record', 'ehr_sync',
        'device_reading', 'rare_disease', 'telemedicine'
    ]
    if record_type not in allowed_types:
        record_type = 'custom_record'
    
    try:
        # Build memo data
        memo_data_str = f'solus:{record_type}:{record_hash}'
        memo_type_hex = memo_data_str.encode().hex()  # This is for MemoData
        memo_type_str = 'solus/anchor'
        memo_type_hex_actual = memo_type_str.encode().hex()
        memo_data_hex = memo_data_str.encode().hex()
        
        # Connect to XRPL
        network = XRPL_NETWORK
        client = xrpl.clients.JsonRpcClient(XRPL_URLS[network])
        
        # Create wallet from seed (seed is in env var, never exposed)
        wallet = xrpl.wallet.Wallet.from_seed(XRPL_SEED)
        
        # Build transaction
        tx = xrpl.models.transactions.AccountSet(
            account=wallet.classic_address,
            memos=[
                xrpl.models.transactions.Memo(
                    memo_type=memo_type_hex_actual,
                    memo_data=memo_data_hex
                )
            ]
        )
        
        # Autofill sequence, fee, last_ledger_sequence
        prepared = xrpl.transaction.autofill(tx, client)
        
        # Sign
        signed = xrpl.transaction.sign(prepared, wallet)
        
        # Submit and wait for validation
        response = xrpl.transaction.submit_and_wait(signed, client)
        
        tx_hash = response.result.get('hash', '')
        ledger_index = response.result.get('ledger_index', 0)
        
        return jsonify({
            'success': True,
            'tx_hash': tx_hash,
            'ledger_index': ledger_index,
            'account': wallet.classic_address,
            'explorer_url': EXPLORER_URLS[network] + tx_hash,
            'network': network,
            'record_type': record_type,
            'hash': record_hash,
            'timestamp': datetime.datetime.utcnow().isoformat() + 'Z'
        })
    
    except xrpl.clients.XRPLRequestFailureException as e:
        return jsonify({
            'error': 'XRPL request failed',
            'details': str(e),
            'network': XRPL_NETWORK
        }), 502
    except Exception as e:
        return jsonify({
            'error': 'Anchor failed',
            'details': str(e)
        }), 500


@app.route('/api/verify', methods=['POST'])
@require_api_key
def verify_record():
    """
    Verify a record hash exists on the XRPL.
    
    Request body:
        {"hash": "64-char hex SHA-256 hash"}
    
    Response:
        {
            "found": true/false,
            "tx_hash": "...",
            "ledger_index": ...,
            "memo_data": "solus:lab_results:abc123...",
            "explorer_url": "..."
        }
    """
    import xrpl
    import xrpl.clients
    
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body must be JSON'}), 400
    
    search_hash = data.get('hash', '').strip()
    if not search_hash or len(search_hash) != 64:
        return jsonify({'error': 'Hash must be exactly 64 hex characters'}), 400
    
    try:
        network = XRPL_NETWORK
        client = xrpl.clients.JsonRpcClient(XRPL_URLS[network])
        wallet = xrpl.wallet.Wallet.from_seed(XRPL_SEED)
        
        response = client.request(xrpl.models.requests.AccountTx(
            account=wallet.classic_address,
            limit=200
        ))
        
        txs = response.result.get('transactions', [])
        for tx_entry in txs:
            tx = tx_entry.get('tx_json', tx_entry.get('tx', {}))
            memos = tx.get('Memos', [])
            for m in memos:
                memo_data_hex = m.get('Memo', {}).get('MemoData', '')
                if memo_data_hex:
                    try:
                        decoded = bytes.fromhex(memo_data_hex).decode('utf-8')
                        if search_hash in decoded:
                            return jsonify({
                                'found': True,
                                'tx_hash': tx.get('hash', ''),
                                'ledger_index': tx.get('ledger_index', tx_entry.get('ledger_index', 0)),
                                'memo_data': decoded,
                                'explorer_url': EXPLORER_URLS[network] + tx.get('hash', ''),
                                'network': network
                            })
                    except Exception:
                        pass
        
        return jsonify({
            'found': False,
            'hash': search_hash,
            'network': network,
            'message': 'Hash not found in last 200 transactions'
        })
    
    except Exception as e:
        return jsonify({'error': 'Verify failed', 'details': str(e)}), 500


@app.route('/api/network', methods=['GET'])
def network_info():
    """Return current network configuration (no auth required)."""
    return jsonify({
        'network': XRPL_NETWORK,
        'explorer': EXPLORER_URLS[XRPL_NETWORK].rstrip('/'),
        'ws_url': XRPL_WS_URLS[XRPL_NETWORK],
        'api_url': XRPL_URLS[XRPL_NETWORK]
    })
```

### How to Deploy

1. **Add the above code** to your existing `metrics_api.py` on Render
2. **Set environment variables** on Render dashboard:
   - `XRPL_NETWORK=testnet` (change to `mainnet` when ready)
   - `XRPL_MAINNET_SEED=your_mainnet_seed_here`
   - `SOLUS_API_KEY=your_generated_api_key`
3. **Redeploy** — the endpoint will be live at `https://solusprotocol.onrender.com/api/anchor`

### Test with curl

```bash
# Test anchoring (testnet)
curl -X POST https://solusprotocol.onrender.com/api/anchor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{
    "hash": "f0e366f13efcb0dd6d564e267a9efb6afed62eabce3abed64e830bfe25cacca1",
    "record_type": "discharge_summary"
  }'

# Test verification
curl -X POST https://solusprotocol.onrender.com/api/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{
    "hash": "f0e366f13efcb0dd6d564e267a9efb6afed62eabce3abed64e830bfe25cacca1"
  }'

# Check network config
curl https://solusprotocol.onrender.com/api/network
```

---

## 6. Frontend Changes

When switching to mainnet, replace the client-side XRPL calls with backend API calls:

### Before (Testnet — Client-Side)
```javascript
// ❌ INSECURE: Wallet seed in browser JavaScript
const client = new xrpl.Client("wss://s.altnet.rippletest.net:51233");
await client.connect();
const wallet = xrpl.Wallet.fromSeed("sEd75GpyfXbSLGUShjwvViXoo6xaGuZ");
const tx = { TransactionType: "AccountSet", Account: wallet.classicAddress, ... };
const result = await client.submitAndWait(tx, { wallet });
```

### After (Mainnet — Server-Side via API)
```javascript
// ✅ SECURE: Hash sent to backend, signing happens server-side
async function anchorFromPlayground() {
    const response = await fetch('https://solusprotocol.onrender.com/api/anchor', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'YOUR_PRODUCTION_API_KEY'
        },
        body: JSON.stringify({
            hash: pgCurrentHash,
            record_type: recordType
        })
    });
    const data = await response.json();
    if (data.success) {
        // Show success: data.tx_hash, data.explorer_url, data.ledger_index
    } else {
        // Show error: data.error
    }
}
```

### URL Changes Summary

| Component | Testnet | Mainnet |
|-----------|---------|---------|
| WebSocket | `wss://s.altnet.rippletest.net:51233` | `wss://xrplcluster.com` |
| REST API | `https://s.altnet.rippletest.net:51234/` | `https://xrplcluster.com/` |
| Explorer | `https://testnet.xrpl.org` | `https://livenet.xrpl.org` |
| Faucet | `https://faucet.altnet.rippletest.net` | N/A (not available) |
| Backend | Same Render URL | Same Render URL |

### What to Remove from Frontend

1. **Remove** the xrpl.js CDN `<script>` tag (no longer needed)
2. **Remove** `strToHex()` function (server handles encoding)
3. **Remove** `getPlaygroundWallet()` function (server handles wallet)
4. **Remove** `updateWsStatus()` calls related to XRPL connection
5. **Replace** all `xrpl.Client`, `Wallet.fromSeed`, `submitAndWait` calls with `fetch()`
6. **Update** explorer link base URL

---

## 7. Security Considerations

### Environment Variable Security
- Store `XRPL_MAINNET_SEED` only in Render's encrypted environment variables
- Never log the seed in application logs
- Use separate seeds for testnet and mainnet
- Rotate the API key periodically

### API Key Management
- Generate a strong API key: `python3 -c "import secrets; print('sk_live_' + secrets.token_hex(32))"`
- Store in frontend as a config variable (not hardcoded in source)
- Consider using short-lived tokens (JWT) for production
- API key protects against unauthorized anchoring, not data exposure

### Rate Limiting
- Default: 100 anchors per minute per API key
- Use Redis for distributed rate limiting in production
- Consider per-user rate limits for multi-tenant scenarios

### CORS Configuration
```python
# In metrics_api.py, restrict CORS to your domain
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://solusprotocol.vercel.app", "https://solusprotocol.com"]
    }
})
```

### HIPAA Compliance
- **Only the SHA-256 hash** is sent to the backend and XRPL — never the actual record content
- The hash is a one-way function; the original record cannot be reconstructed
- All API communication must use HTTPS
- Backend logs should not contain hash-to-record mappings
- See [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) for full details

---

## 8. Testing the Migration

### Test Plan

```bash
# 1. Test backend in testnet mode
export XRPL_NETWORK=testnet
python metrics_api.py

# 2. Anchor a test record
curl -X POST http://localhost:5050/api/anchor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{"hash": "a" * 64, "record_type": "lab_results"}'

# 3. Verify it
curl -X POST http://localhost:5050/api/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{"hash": "a" * 64}'

# 4. Switch to mainnet and repeat
export XRPL_NETWORK=mainnet
export XRPL_MAINNET_SEED=your_real_seed
# Repeat steps 2-3
```

### Smoke Test Checklist
- [ ] Backend starts without errors
- [ ] `/api/network` returns correct network
- [ ] `/api/anchor` returns valid TX hash
- [ ] TX hash appears on XRPL Explorer
- [ ] `/api/verify` finds the anchored record
- [ ] Rate limiting rejects excessive requests
- [ ] Invalid API key returns 401
- [ ] Invalid hash returns 400
- [ ] Frontend fetch() calls work end-to-end

---

## 9. Rollback Plan

If issues arise after mainnet launch:

1. **Set `XRPL_NETWORK=testnet`** on Render — backend immediately uses testnet again
2. **Redeploy previous frontend commit** — reverts to client-side xrpl.js signing on testnet
3. **No data loss** — all mainnet transactions are permanent and immutable
4. **Monitor** XRPL account balance and refund if needed

---

## 10. Cost Estimation

### Transaction Costs
| Volume | Cost per TX | Daily Cost | Monthly Cost |
|--------|------------|------------|--------------|
| 100/day | ~0.000012 XRP | 0.0012 XRP | 0.036 XRP |
| 1,000/day | ~0.000012 XRP | 0.012 XRP | 0.36 XRP |
| 10,000/day | ~0.000012 XRP | 0.12 XRP | 3.6 XRP |
| 100,000/day | ~0.000012 XRP | 1.2 XRP | 36 XRP |

### At Current XRP Prices (~$2)
- **100 anchors/day:** ~$0.0024/month
- **10,000 anchors/day:** ~$7.20/month
- **100,000 anchors/day:** ~$72/month

### Account Reserve
- **Base reserve:** 10 XRP (locked, cannot be spent)
- **Recommended starting balance:** 50 XRP (~$100)
- **This covers:** ~3.3 million transactions before needing a refill

---

## 11. XRPL Amendment Resilience

The XRPL periodically activates protocol amendments (e.g., new transaction types, fee changes). SLS Protocol v2.9.3+ is designed to auto-adapt:

### Fallback WebSocket Nodes

The SDK connects to multiple XRPL nodes in priority order. If the primary node is unreachable (e.g., during an amendment activation window), the next node is tried automatically:

```
Priority 1: wss://s.altnet.rippletest.net:51233  (Testnet primary)
Priority 2: wss://testnet.xrpl-labs.com          (XRPL Labs mirror)
Priority 3: wss://xls20-sandbox.rippletest.net:51233  (XLS-20 sandbox)
```

For **mainnet**, configure:

```
Priority 1: wss://xrplcluster.com                (Community cluster)
Priority 2: wss://s1.ripple.com                   (Ripple node 1)
Priority 3: wss://s2.ripple.com                   (Ripple node 2)
```

### xrpl.js API Version Handling

xrpl.js v4.0.0+ defaults to XRPL API v2, which changes the response format:

| Field | API v1 (`result.result.*`) | API v2 (`result.result.tx_json.*`) |
|-------|---|---|
| Transaction Hash | `result.result.hash` | `result.result.tx_json.hash` |
| Ledger Index | `result.result.ledger_index` | `result.result.tx_json.ledger_index` |

Solus v2.9.3 uses the `extractTxHash()` and `extractLedgerIndex()` helper functions that check all known paths, ensuring compatibility across xrpl.js versions and API versions.

### Amendment Monitoring

Before anchoring, the backend should check for `amendmentBlocked` errors:

```python
try:
    result = client.request(ServerInfo())
    amendments = result.result.get('info', {}).get('amendment_blocked', False)
    if amendments:
        # Switch to fallback node or queue for retry
        pass
except Exception:
    pass
```

### Best Practices

1. **Pin xrpl.js version** in production (currently v4.5.0)
2. **Monitor XRPL amendment votes** at [xrpl.org/amendments](https://xrpl.org/known-amendments.html)
3. **Test on Testnet first** when a new amendment activates — testnet usually gets amendments 2 weeks before mainnet
4. **Use `connectXrplWithFallback()`** instead of direct `new xrpl.Client()` calls

---

## Quick Reference Card

```
╔══════════════════════════════════════════════════════════════╗
║                MAINNET MIGRATION CHECKLIST                   ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  □ Generate mainnet wallet                                   ║
║  □ Fund with 50+ XRP                                         ║
║  □ Set XRPL_MAINNET_SEED env var on Render                   ║
║  □ Set SOLUS_API_KEY env var on Render                       ║
║  □ Deploy backend with /api/anchor endpoint                  ║
║  □ Test with XRPL_NETWORK=testnet first                      ║
║  □ Update frontend to use fetch() instead of xrpl.js         ║
║  □ Update explorer URLs to livenet.xrpl.org                  ║
║  □ Set XRPL_NETWORK=mainnet                                  ║
║  □ Deploy frontend to Vercel                                 ║
║  □ Smoke test: anchor + verify one record                    ║
║  □ Set up balance monitoring alerts                          ║
║  □ Configure fallback WebSocket nodes                        ║
║  □ Test amendment resilience on Testnet                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 12. SVCN Care Network Migration

### Current State (Testnet)
The SVCN Care Network (`demo-app/index.html`) performs **real XRPL anchoring** for all care scenarios and sandbox modules:

| Module | Memo Format | Record Types |
|--------|-------------|-------------|
| Secure Messenger | `solus:message:HASH` | `secure_message`, `urgent_message` |
| Consent Manager | `solus:consent:grant:HASH` | `consent_grant`, `consent_revoke` |
| Care Handoff | `solus:handoff:TYPE:HASH` | `care_handoff` |
| Wearable Monitor | `solus:wearable_anomaly:HASH` | `wearable_anomaly` |
| EHR Simulator | `solus:ehr_event:HASH` | `ehr_event` |
| Federated Batch | `solus:federated_batch:HASH` | `federated_batch` |
| Backup & Recovery | `solus:backup_export:HASH` | `backup_export`, `backup_verify` |

### Migration Steps

#### Step 1: Replace Client-Side Signing with Backend API
Currently, `svcnAnchorToXRPL()` connects directly to XRPL WebSocket nodes from the browser:

```javascript
// TESTNET (current) — client-side
const client = new xrpl.Client('wss://s.altnet.rippletest.net:51233');
const wallet = xrpl.Wallet.fromSeed(walletSeed, { algorithm: 'ed25519' });
```

**Mainnet migration:** Replace with `fetch()` to the server-side `/api/anchor` endpoint:

```javascript
// MAINNET — server-side signing
async function svcnAnchorToXRPL(dataHash, memoType, recordType) {
    const memoData = `solus:${memoType}:${dataHash}`;
    const response = await fetch('https://solusprotocol.onrender.com/api/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SOLUS_API_KEY },
        body: JSON.stringify({ hash: dataHash, memo_data: memoData, record_type: recordType })
    });
    const result = await response.json();
    return { txHash: result.tx_hash, explorerUrl: `https://livenet.xrpl.org/transactions/${result.tx_hash}` };
}
```

#### Step 2: Update Scenario Engine
The `svcnRunScenario()` function calls `svcnAnchorToXRPL()` at each `xrpl-type` step. After migration:
- No code changes needed in the scenario engine (it calls the same function)
- The backend handles server-side signing and fee management
- Explorer URLs auto-switch to `livenet.xrpl.org`

#### Step 3: Update Explorer URLs
```javascript
// Before (testnet)
'https://testnet.xrpl.org/transactions/' + txHash

// After (mainnet)
'https://livenet.xrpl.org/transactions/' + txHash
```

#### Step 4: SVCN Python Modules
The Python SVCN modules (`solus_comms.py`, `solus_backup.py`, `solus_anomaly.py`) already use the `SolusSDK` class which supports both testnet and mainnet:

```python
# Testnet (current)
sdk = SolusSDK(testnet=True, wallet_seed="sEd...")

# Mainnet (production)
sdk = SolusSDK(testnet=False, wallet_seed=os.environ['XRPL_MAINNET_SEED'])
```

No structural changes needed — just change `testnet=True` to `testnet=False` and use environment variables for secrets.

### SVCN Compliance Considerations
- All SVCN anchor transactions use **memo fields only** (no XRP transfer needed on mainnet if using AccountSet transactions)
- The Audit & Proof tab's compliance evidence generator works identically on mainnet
- Break-glass events, consent anchors, and care handoffs retain full immutability on mainnet
- On-chain re-verification works by reading memo data from mainnet ledger

---

## 13. SLS Protocol EHR Migration

### Current State (Testnet — v2.10.0)
The SLS Protocol EHR system (`solus_ehr.py` + `demo-app/index.html`) anchors all healthcare data operations to XRPL:

| EHR Operation | XRPL Record Type | FHIR Mapping | Added In |
|---------------|------------------|-------------|----------|
| Patient Registration | `EHR_RECORD` | Patient | v2.9.7 |
| Record Create | `{type}.upper()` | Varies by type | v2.9.7 |
| Record Update | `EHR_UPDATE` | — | v2.9.7 |
| Access Grant | `CONSENT_GRANT` | Consent | v2.9.7 |
| Access Revoke | `CONSENT_REVOKE` | Consent | v2.9.7 |
| FHIR Export | `EHR_TRANSFER` | Bundle | v2.9.8 |
| HL7 Generation | `EHR_TRANSFER` | — | v2.9.8 |
| Appointment Create | `SCHEDULING` | Appointment | v2.9.8 |
| Billing Claim Submit | `BILLING` | Claim | v2.9.8 |
| Claim Auto-Adjudication | `BILLING` | ClaimResponse | v2.10.0 |
| Claim Resubmission | `BILLING` | Claim | v2.10.0 |
| Eligibility Verification | `ELIGIBILITY` | CoverageEligibilityResponse | v2.10.0 |
| XLS-20 Consent NFT Mint | `CONSENT` | Consent | v2.10.0 |
| XLS-20 Consent NFT Revoke | `CONSENT` | Consent | v2.10.0 |
| Hash Integrity Failure | `INTEGRITY` | AuditEvent | v2.10.0 |
| Break-Glass | `EMERGENCY` | — | v2.9.7 |
| Compliance Report | `EHR_RECORD` | — | v2.9.8 |
| Legacy Import | `EHR_IMPORT` | — | v2.9.8 |
| Chronic Care Review | `CHRONIC_CARE` | CarePlan | v2.9.8 |
| Encounter Note | `ENCOUNTER` | Encounter | v2.9.8 |
| Medication Order | `MEDICATION` | MedicationRequest | v2.9.8 |
| Progress Note | `PROGRESS_NOTE` | DocumentReference | v2.9.8 |
| Clinical Note | `CLINICAL_NOTE` | DocumentReference | v2.9.8 |

### EHR Scenario Engine (v2.10.0)
The demo app includes 12 pre-built EHR scenarios that execute real XRPL anchoring:

| ID | Scenario | Persona | XRPL Anchors | Record Types |
|----|----------|---------|--------------|-------------|
| e1 | Hospital Admission: Chest Pain | Hospital | 5 | VITALS, LAB_RESULTS, CONSENT_GRANT, EHR_RECORD |
| e2 | Lab Results & Auto-Notification | Clinic | 3 | LAB_RESULTS, PRESCRIPTION, SCHEDULING |
| e3 | Prescription Workflow (e-Prescribe) | Clinic | 2 | PRESCRIPTION |
| e4 | Multi-Department Surgical Workflow | Hospital | 5 | SURGERY, CARE_HANDOFF, DISCHARGE |
| e5 | Emergency Stroke Code | Emergency | 4 | EMERGENCY, IMAGING, PRESCRIPTION, EHR_RECORD |
| e6 | Insurance Claim Auto-Adjudication | Billing | 2 | BILLING |
| e7 | Patient Record Transfer | Hospital | 2 | EHR_TRANSFER, EHR_RECORD |
| e8 | Chronic Care Management | Clinic | 2 | CHRONIC_CARE, SCHEDULING |
| e9 | Maternity Ward Delivery | Hospital | 4 | VITALS, PROCEDURE, EHR_RECORD |
| e10 | Pediatric Well-Child Visit | Clinic | 3 | IMMUNIZATION, VITALS, SCHEDULING |
| e11 | Mental Health Intake | Behavioral | 3 | MENTAL_HEALTH, CONSENT_GRANT, CLINICAL_NOTE |
| e12 | Oncology Treatment Cycle | Oncology | 4 | MEDICATION, LAB_RESULTS, IMAGING, PROGRESS_NOTE |

### Wallet Unification (v2.10.0)
All three demo app systems use the same wallet via `getPlaygroundWallet()`:
- **SDK Playground:** `anchorFromPlayground()` → `getPlaygroundWallet(client)`
- **SVCN Care Network:** `svcnAnchorToXRPL()` → `getPlaygroundWallet(client)`
- **EHR System:** `ehrAnchorToXRPL()` → `getPlaygroundWallet(client)`

All produce memos in the standardized format `solus:RECORD_TYPE:SHA256_HASH` using `AccountSet` transactions. On mainnet, all three will migrate to the same backend `/api/anchor` endpoint.

### Migration Steps

#### Step 1: Python SDK Migration
```python
# Testnet (current)
ehr = SolusEHR(wallet_seed="sEd...", testnet=True, anchor_enabled=True)

# Mainnet (production)
ehr = SolusEHR(
    wallet_seed=os.environ['XRPL_MAINNET_SEED'],
    testnet=False,
    anchor_enabled=True,
    xrpl_rpc_url="https://xrplcluster.com/"
)
```

#### Step 2: Demo App EHR Screen Migration
Replace `ehrAnchorToXRPL()` with backend API call:

```javascript
async function ehrAnchorToXRPL(dataHash, recordType) {
    const memoData = `solus:${recordType.toLowerCase()}:${dataHash}`;
    const response = await fetch('https://solusprotocol.onrender.com/api/anchor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': SOLUS_API_KEY },
        body: JSON.stringify({ hash: dataHash, memo_data: memoData, record_type: recordType })
    });
    return await response.json();
}
```

#### Step 3: EHR-Specific Security
- **PHI Protection:** All patient data remains encrypted off-chain. Only SHA-256 hashes are written to XRPL memos.
- **Encryption Keys:** Must use production-grade key management (AWS KMS, Azure Key Vault, or HashiCorp Vault) instead of Fernet auto-generated keys.
- **Access Control:** RBAC grants are anchored immutably — on mainnet, these become permanent compliance evidence.
- **Break-Glass:** Emergency access events on mainnet create permanent, auditable records that satisfy HIPAA § 164.312(b) audit requirements.

#### Step 4: FHIR & HL7 Interop
- FHIR R4 Bundles include `meta.tag` with `system: "https://solusprotocol.com/hash"` pointing to the on-chain hash. On mainnet, these become verifiable against the live XRPL.
- HL7 v2 messages include `ZSP` custom Z-segments with `SOLUS_HASH|{hash}|XRPL_ANCHORED`.
- Replace `"XRPL_ANCHORED"` with `"XRPL_MAINNET_ANCHORED"` in production HL7 messages.

### EHR Data Flow (Mainnet)
```
Patient Data → AES-256 Encrypt → Off-Chain Storage
                    ↓
            SHA-256 Hash
                    ↓
    POST /api/anchor (server-side XRPL signing)
                    ↓
        XRPL Mainnet → Immutable Proof
                    ↓
    Metrics API reads & categorizes record type
```

---

## 14. Metrics API Migration

### Current State
The Metrics API (`metrics_api.py`) reads transactions from the XRPL Testnet account and categorizes them using `categorize_record()`. It parses memo data in two formats:

1. **SDK Playground:** `RECORD_TYPE:hash` (e.g., `SURGERY:abc123...`)
2. **SVCN/EHR:** `solus:TYPE:hash` (e.g., `solus:message:abc123...`, `solus:BILLING:abc123...`)

### Migration Steps

#### Step 1: Update XRPL Account & URL
```python
# Testnet (current)
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234/"
XRPL_TESTNET_ACCOUNT = "rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA"

# Mainnet (production)
XRPL_MAINNET_URL = os.environ.get("XRPL_MAINNET_URL", "https://xrplcluster.com/")
XRPL_MAINNET_ACCOUNT = os.environ.get("XRPL_MAINNET_ACCOUNT", "rMainnetAddress...")
```

#### Step 2: Record Type Categorization
The `categorize_record()` function handles all 130+ record types across SDK, SVCN, and EHR. The `solus:TYPE:hash` format parser checks:
1. First segment → if `SOLUS`, look at second segment
2. Multi-segment types (e.g., `solus:consent:grant:hash` → `CONSENT_GRANT`)
3. Explicit type_map with 130+ categories
4. Keyword-based fallback matching

No code changes needed — the categorization works identically on mainnet.

#### Step 3: Historical Data
On mainnet, the Metrics API will start with zero transactions. Consider:
- Keeping testnet metrics as a separate archive endpoint
- Building a migration script that maps testnet TX hashes to their record types for reference
- Displaying a "Since Mainnet Launch" date on the metrics dashboard

---

## 15. Visual Calendar & Scheduling (v2.10.0)

### What Exists (Demo)
- Month-grid calendar with prev/next navigation
- Appointment dot indicators on calendar dates
- Duration selection, recurring appointment types (weekly, biweekly, monthly, quarterly), appointment notes
- Each appointment creation calls `ehrAnchorToXRPL(hash, 'SCHEDULING')`

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Calendar Data | In-memory `ehrStore.appointments` | PostgreSQL/FHIR Appointment resource |
| Recurring Logic | Frontend generates single appointment | Backend cron with `rrule` library generates series |
| Notifications | Toast messages | Twilio SMS + SendGrid email reminders |
| Provider Availability | Any slot available | Google Calendar / Calendly API integration for real provider schedules |
| Cancellation | No implementation yet | Cancel + anchor cancellation hash to XRPL for audit trail |
| XRPL Anchoring | `AccountSet` with memo `solus:SCHEDULING:HASH` | Same — via `/api/anchor` endpoint (server-side signing) |

### XRPL Anchor on Mainnet
Each appointment action anchors identically:
```
solus:SCHEDULING:{SHA256 of appointment JSON}
```
This creates immutable proof that an appointment was created, modified, or cancelled at a specific time — valuable for no-show disputes, compliance audits, and continuity-of-care evidence.

---

## 16. ICD-10/CPT Billing & Claim Lifecycle (v2.10.0)

### What Exists (Demo)
- 24 ICD-10 codes with autocomplete (E11.65 Type 2 Diabetes, I10 HTN, J06.9 URI, M54.5 Low Back Pain, etc.)
- 20 CPT codes with fee amounts and autocomplete (99213 Office Visit, 99285 ER Critical, 71046 Chest X-ray, etc.)
- Payer selection (Medicare, Medicaid, BCBS, United, Aetna, Cigna, Humana, Self-Pay)
- Place of service codes (Office 11, Inpatient 21, Outpatient 22, ER 23, Telehealth 02, Lab 81)
- Claim auto-adjudication simulation (70% approved, 15% partial, 15% denied with denial reasons)
- Claim resubmission with corrections
- Claims CSV export
- Each claim submission + adjudication result anchored via `ehrAnchorToXRPL(hash, 'BILLING')`

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| ICD-10 Codes | 24 hardcoded codes | CMS ICD-10-CM API (80,000+ codes) or NLM UMLS API |
| CPT Codes | 20 hardcoded with fees | AMA CPT API (10,000+ codes) — requires AMA license for full set |
| Fee Schedule | Static fee per CPT code | CMS Physician Fee Schedule API + payer-specific contracted rates |
| Claim Submission | In-memory, simulated adjudication | EDI 837 Professional/Institutional via clearinghouse (Availity, Change Healthcare, Trizetto) |
| Adjudication | Random 70/15/15 split | Real 835 ERA/EOB remittance from payer |
| Denial Management | Mock denial reasons | X12 CARC/RARC reason codes from payer |
| Payer Eligibility | Simulated 270/271 (see §17) | Real EDI 270/271 via clearinghouse |
| XRPL Anchoring | `solus:BILLING:HASH` | Same — hash of claim JSON + adjudication result anchored on mainnet |

### Why Anchoring Billing Data Matters
1. **SOX-compliant audit trails** — immutable proof of every claim state change
2. **Fraud detection** — cross-reference on-chain hashes to detect duplicate claims
3. **Denial appeal evidence** — prove exact claim content and submission timestamp
4. **Revenue cycle transparency** — insurers can verify claim integrity without accessing PHI

### Clearinghouse Integration (Production)
```python
# Example: Submit 837P claim via Availity API
import requests

def submit_claim_837(claim_data):
    # 1. Generate EDI 837 Professional format
    edi_837 = generate_edi_837(claim_data)
    
    # 2. Hash the claim for XRPL anchoring
    claim_hash = hashlib.sha256(edi_837.encode()).hexdigest()
    
    # 3. Submit to clearinghouse
    response = requests.post('https://api.availity.com/v1/claims', 
        headers={'Authorization': f'Bearer {AVAILITY_TOKEN}'},
        data=edi_837
    )
    
    # 4. Anchor claim hash to XRPL
    anchor_to_xrpl(claim_hash, 'BILLING')
    
    # 5. When 835 ERA comes back, hash and anchor the adjudication result too
    return response
```

---

## 17. Insurance Eligibility Verification & Anchoring (v2.10.0)

### What Exists (Demo)
- Simulated 270/271 EDI eligibility response
- Returns: eligibility status, group number, copay amount, deductible amount, deductible met status
- Optional "Anchor Eligibility Proof" toggle — when enabled, hashes and anchors the 271 response to XRPL as `ELIGIBILITY` record type

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Eligibility Request | Simulated with random values | EDI 270 via clearinghouse (Availity, Change Healthcare) |
| Eligibility Response | Mock 271 with hardcoded copay/deductible | Real 271 from payer with actual benefit details |
| Anchoring | Optional toggle, `solus:ELIGIBILITY:HASH` | Same anchor format on mainnet |
| Response Time | Instant (simulated) | 2-10 seconds (real payer lookup) |

### Why Anchor Eligibility Checks?
Anchoring is **optional** but valuable for:
- **Billing disputes** — prove coverage was verified before services were rendered
- **Audit compliance** — demonstrate due diligence on eligibility verification
- **Denial appeals** — immutable proof the payer confirmed coverage at a specific timestamp
- **Multi-provider coordination** — share verifiable eligibility proof across care team

### Real-World Integration
```python
# Availity Real-Time Eligibility API
def check_eligibility_real(patient, payer_id, service_type):
    response = requests.post('https://api.availity.com/v1/coverages', json={
        'payer_id': payer_id,
        'subscriber': {'member_id': patient['insurance_id'], 'dob': patient['dob']},
        'service_type': service_type  # '30' for health benefit plan coverage
    }, headers={'Authorization': f'Bearer {AVAILITY_TOKEN}'})
    
    eligibility = response.json()
    
    # Hash the response for optional XRPL anchoring
    elig_hash = hashlib.sha256(json.dumps(eligibility).encode()).hexdigest()
    
    # Anchor if user opted in
    if anchor_eligibility:
        anchor_to_xrpl(elig_hash, 'ELIGIBILITY')
    
    return eligibility
```

---

## 18. Drug Interaction Checker (v2.10.0)

### What Exists (Demo)
- 10 hardcoded drug interaction pairs with severity levels (high/moderate/low):
  - warfarin + aspirin (high), warfarin + ibuprofen (high)
  - lisinopril + potassium (moderate), metformin + contrast dye (high)
  - simvastatin + amlodipine (moderate), SSRI + tramadol (high)
  - ciprofloxacin + antacids (moderate), methotrexate + NSAIDs (high)
  - digoxin + amiodarone (high), clopidogrel + omeprazole (moderate)
- Cross-references medication list against known interactions
- UI panel in Records tab with text input + results display

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Interaction Database | 10 hardcoded pairs | NIH RxNorm API (68,000+ drugs) + NLM DailyMed + DrugBank API |
| Lookup Method | String matching on drug names | RxCUI normalization → RxNorm interaction endpoint |
| Severity Data | Static high/moderate/low | FDA Adverse Event Reporting System (FAERS) severity scoring |
| Alert System | Toast notification | CDS Hooks integration for real-time clinical decision support |
| XRPL Anchoring | Not anchored | Optional: anchor interaction check result for clinical liability proof |

### Production Integration
```python
# NIH RxNorm Interaction API (free, no API key needed)
def check_interactions_rxnorm(drug_names):
    rxcuis = []
    for drug in drug_names:
        # Step 1: Get RxCUI for each drug
        r = requests.get(f'https://rxnav.nlm.nih.gov/REST/rxcui.json?name={drug}')
        rxcui = r.json().get('idGroup', {}).get('rxnormId', [None])[0]
        if rxcui:
            rxcuis.append(rxcui)
    
    # Step 2: Check interactions between all pairs
    if len(rxcuis) >= 2:
        r = requests.get(f'https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis={"+".join(rxcuis)}')
        return r.json().get('fullInteractionTypeGroup', [])
    return []
```

### CDS Hooks Integration (Future)
For real clinical use, drug interaction checking would integrate with CDS Hooks (HL7 standard):
```json
{
  "hookInstance": "uuid",
  "hook": "medication-prescribe",
  "context": {
    "medications": [{"resourceType": "MedicationRequest", "medicationCodeableConcept": {...}}]
  }
}
```
The CDS service returns `cards` with interaction warnings, severity, and suggested alternatives.

---

## 19. XLS-20 NFT Consent Tokens (v2.10.0)

### What Exists (Demo)
- Mint XLS-20 NFT as tamper-proof consent token
- NFT metadata: standard (XLS-20), issuer, flags (tfTransferable + tfBurnable = 9), IPFS URI
- Fields: patient, grantee provider, access level (read/read-write/full/emergency), expiration (24h to 1 year)
- Revocation: burns the NFT, anchors revocation to XRPL
- Each mint/revoke anchored via `ehrAnchorToXRPL(hash, 'CONSENT')`
- UI panel with patient/grantee/level/expiry selectors + mint button

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| NFT Minting | Simulated (hash anchored, no real NFT) | Real `NFTokenMint` transaction on XRPL mainnet |
| NFT Burning | Simulated revocation | Real `NFTokenBurn` transaction |
| Token ID | Random string `NFT-xxxx` | Actual XRPL NFToken ID from ledger response |
| IPFS Storage | Fake URI `ipfs://consent/{id}/{ts}` | Real IPFS/Arweave pinning of consent metadata (encrypted) |
| Flags | Hardcoded 9 | `tfTransferable` (8) + `tfBurnable` (1) = 9 (correct for consent tokens) |
| Taxon | Not set | Unique taxon per consent category (e.g., 1 = read, 2 = write, 3 = full) |

### Why NFTs for Consent?
Traditional consent systems store grants in databases that can be silently altered. XLS-20 NFTs provide:
1. **Immutability** — consent grant is permanently recorded on XRPL
2. **Revocability** — burning the NFT is also permanently recorded
3. **Transferability** — consent can be transferred between providers (flag 8)
4. **Time-boundedness** — metadata includes expiration; expired consents can be auto-burned
5. **Patient control** — patient holds the NFT and decides when to burn (revoke)

### XRPL XLS-20 Transaction Format (Mainnet)
```python
import xrpl
from xrpl.models.transactions import NFTokenMint, NFTokenBurn

# Mint consent NFT
mint_tx = NFTokenMint(
    account=wallet.classic_address,
    nftoken_taxon=1,  # 1 = read-only consent
    flags=9,  # tfTransferable + tfBurnable
    uri=xrpl.utils.str_to_hex(f"ipfs://{ipfs_hash}"),
    memos=[xrpl.models.transactions.Memo(
        memo_type=xrpl.utils.str_to_hex("solus/consent"),
        memo_data=xrpl.utils.str_to_hex(f"solus:CONSENT:{consent_hash}")
    )]
)

# Revoke consent NFT
burn_tx = NFTokenBurn(
    account=wallet.classic_address,
    nftoken_id=nft_token_id,
    memos=[xrpl.models.transactions.Memo(
        memo_type=xrpl.utils.str_to_hex("solus/consent-revoke"),
        memo_data=xrpl.utils.str_to_hex(f"solus:CONSENT_REVOKE:{revocation_hash}")
    )]
)
```

### IPFS Metadata Schema
```json
{
  "standard": "XLS-20",
  "type": "healthcare_consent",
  "patient_hash": "SHA256 of patient demographics (never raw PHI)",
  "grantee_hash": "SHA256 of provider identifier",
  "access_level": "read-only",
  "issued_at": "2026-02-08T14:30:00Z",
  "expires_at": "2026-03-08T14:30:00Z",
  "issuer": "rMainnetAddress...",
  "protocol": "solus-protocol",
  "version": "2.10.0"
}
```

---

## 20. Gamification & Guardian Level System (v2.10.0)

### What Exists (Demo)
- 10 badges with emoji icons and unlock thresholds:
  - ⚓ First Anchor (1 anchor), 🔰 Data Guardian (10), 🛡️ Silver Guardian (50), 👑 Gold Guardian (100)
  - 📁 Record Keeper (5 records), 💰 Claim Master (3 claims), 📅 Scheduler (3 appointments)
  - 🔒 HIPAA Hero (1 compliance report), 🔄 Interop Pro (1 FHIR/HL7 export), ▶️ Scenario Runner (3 scenarios)
- 5 Guardian Levels with progress bar: New User → Novice Anchor → Data Guardian → Silver Guardian → Gold Guardian
- Badge display grid in Audit tab
- Toast notifications on badge unlock
- Badges saved to localStorage

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Badge Storage | localStorage | PostgreSQL user_badges table + XRPL NFT (optional: mint achievement NFTs) |
| Threshold Tracking | `ehrStore.stats` counters | Server-side event aggregation (Kafka/Redis streams) |
| Notifications | Toast in browser | Push notifications (Firebase Cloud Messaging) + email digests |
| Leaderboards | None | Organization-level leaderboard (anonymized) for compliance gamification |
| XRPL Integration | No anchoring | Optional: anchor badge milestones as achievement NFTs (XLS-20) |

### Why Gamification in Healthcare?
- **Provider engagement** — EHR adoption is notoriously low; badges incentivize consistent use
- **Compliance tracking** — "HIPAA Hero" badge proves a provider generated compliance reports
- **Onboarding acceleration** — new users naturally explore features to unlock badges
- **Audit evidence** — badge history shows system usage patterns (valuable for CEHRT attestation)

---

## 21. Hash Mismatch & Integrity Testing (v2.10.0)

### What Exists (Demo)
- Button in Audit tab simulates a tampered record
- Shows detailed mismatch alert: original hash vs. recomputed hash
- Anchors the integrity failure event to XRPL as `INTEGRITY` record type
- Logs to EHR audit trail

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Tamper Detection | Simulates by adding `tampered: true` to record JSON | Periodic integrity scans comparing stored hashes vs. recomputed hashes |
| Alert System | In-app modal | PagerDuty/Opsgenie alert → immediate security incident response |
| Forensics | Shows original vs. tampered hash | Full diff of what changed, when, and by whom (access log correlation) |
| XRPL Anchoring | `solus:INTEGRITY:HASH` | Same — integrity failure events are permanently recorded on mainnet |
| Compliance | Demo only | HIPAA § 164.312(c)(2) requires mechanism to authenticate ePHI — this IS that mechanism |

### Integrity Scan Architecture (Production)
```python
# Nightly integrity verification job
def run_integrity_scan():
    for record in get_all_records():
        current_hash = hashlib.sha256(json.dumps(record.data).encode()).hexdigest()
        if current_hash != record.stored_hash:
            # 1. Alert security team
            send_pagerduty_alert(record.id, record.stored_hash, current_hash)
            
            # 2. Anchor integrity failure to XRPL (immutable evidence)
            failure_data = {
                'record_id': record.id,
                'original_hash': record.stored_hash,
                'recomputed_hash': current_hash,
                'detected_at': datetime.utcnow().isoformat()
            }
            failure_hash = hashlib.sha256(json.dumps(failure_data).encode()).hexdigest()
            anchor_to_xrpl(failure_hash, 'INTEGRITY')
            
            # 3. Lock the record for investigation
            record.status = 'quarantined'
            record.save()
```

This is the core value proposition of SLS Protocol — **every record has an on-chain hash that can be independently verified at any time.** If a database is compromised, the XRPL hashes reveal which records were altered.

---

## 22. Multi-Factor Authentication (v2.10.0)

### What Exists (Demo)
- 6-digit code MFA overlay triggered when 2FA toggle is enabled in Profile settings
- Demo shows the code on screen for testing
- MFA challenge runs before biometric verification in login flow

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Code Generation | Random 6-digit shown on screen | TOTP (RFC 6238) via Google Authenticator / Authy |
| Code Delivery | Displayed in UI | SMS (Twilio) or authenticator app or hardware key (WebAuthn/FIDO2) |
| Session Management | No real session | JWT tokens with 15-min expiry + refresh tokens |
| Backup Codes | Not implemented | 10 one-time backup codes generated at MFA enrollment |
| HIPAA Requirement | Demo toggle | HIPAA § 164.312(d) requires person/entity authentication — MFA satisfies this |

### Production MFA Flow
```
1. User enters password → POST /auth/login → returns { mfa_required: true, session_token: "..." }
2. App shows MFA input → User enters 6-digit code from authenticator
3. POST /auth/verify-mfa { session_token, code } → returns { access_token, refresh_token }
4. All subsequent API calls use Authorization: Bearer {access_token}
5. Anchor MFA event: hash of { user_id, timestamp, method: "totp" } → XRPL for audit trail
```

---

## 23. Settings Persistence & PWA Service Worker (v2.10.0)

### Settings Persistence
| Setting | Demo State | Production State |
|---------|-----------|-----------------|
| Dark Mode | localStorage `solus_dark_mode` | User preferences API (synced across devices) |
| Notifications | UI toggle only | Firebase Cloud Messaging subscription management |
| Badges | localStorage `solus_badges` | Server-side badge store + optional NFT minting |
| Onboarding | localStorage `solus_onboarded` | Server-side user flags |

### PWA Service Worker
**Current:** `demo-app/sw.js` (v2.10.0) — cache-first strategy with network-first for XRPL API calls.

| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Caching | Static assets only | Service worker + IndexedDB for offline record access |
| Push Notifications | Not implemented | Firebase Cloud Messaging via `PushManager` |
| Background Sync | Not implemented | `SyncManager` for queueing anchors when offline → submit when reconnected |
| Install Prompt | Standard browser prompt | Custom "Add to Home Screen" banner with deferred prompt |

### Offline Anchoring Queue (Production)
```javascript
// When offline: queue anchor requests in IndexedDB
self.addEventListener('sync', event => {
    if (event.tag === 'solus-anchor-queue') {
        event.waitUntil(
            getQueuedAnchors().then(queue => 
                Promise.all(queue.map(item => 
                    fetch('/api/anchor', { method: 'POST', body: JSON.stringify(item) })
                        .then(() => removeFromQueue(item.id))
                ))
            )
        );
    }
});
```

---

## 24. In-App Feedback System (v2.10.0)

### What Exists (Demo)
- Star rating (1-5) with visual highlighting
- Feature request dropdown (EHR, Billing, Scheduling, Interop, Security, Other)
- Free-text feedback input
- Accessible from More screen → "Send Feedback" button

### Real-World Migration
| Component | Demo State | Production State |
|-----------|-----------|-----------------|
| Submission | `showToast()` confirmation | POST to feedback API → Slack webhook + Jira ticket auto-creation |
| Storage | Not stored | PostgreSQL `feedback` table with user_id, rating, category, text, timestamp |
| Analytics | None | Aggregate NPS score, feature request frequency analysis, sentiment analysis |
| Response | None | Automated email acknowledgment + follow-up within 48h |

---

## 25. ONC/CEHRT Compliance Roadmap

### Current Classification
SLS Protocol is a **medical data integrity layer** — not a standalone certified EHR system. It does not currently hold ONC CEHRT (Certified EHR Technology) designation.

### What CEHRT Requires (and Our Status)

| ONC CEHRT Criterion | Solus Status | Gap |
|---------------------|-------------|-----|
| CPOE (Computerized Provider Order Entry) | ⬜ Not implemented | Requires medication/lab/imaging order workflows |
| Clinical Decision Support (CDS) | 🟡 Drug interactions only (10 pairs) | Requires evidence-based CDS rules engine + CDS Hooks |
| Demographics Recording | ✅ Patient registration with demographics | Needs preferred language, race, ethnicity fields |
| Problem List | 🟡 Conditions via ICD-10 on claims | Requires standalone problem list management |
| Medication List | ⬜ Not implemented | Requires active medication list, not just prescriptions |
| Medication Allergy List | 🟡 Allergy record type exists | Requires coded allergy list with RxNorm |
| Vital Signs Recording | ✅ Observation/vitals records | Needs LOINC-coded vital signs |
| Smoking Status | ⬜ Not implemented | Requires structured smoking status capture |
| Lab Results Integration | ✅ Lab result records + FHIR export | Needs LOINC-coded lab results |
| Patient Education | ⬜ Not implemented | Requires patient education resource delivery |
| Health Information Exchange | ✅ FHIR R4 + HL7 v2 export | Needs bidirectional exchange (currently export-only) |
| Security (Access Control) | ✅ RBAC + break-glass + audit + XRPL anchoring | ✅ Exceeds requirements |
| Audit Logging | ✅ Full audit trail + blockchain proof | ✅ Exceeds requirements |
| Integrity | ✅ SHA-256 hash verification | ✅ Exceeds requirements |
| Authentication | ✅ Password + biometric + MFA | ✅ Meets requirements |

### Roadmap to CEHRT (Estimated 12-18 Months)
1. **Phase 1 (Q2 2026):** CPOE module, structured problem/medication/allergy lists
2. **Phase 2 (Q3 2026):** CDS rules engine with CDS Hooks, LOINC-coded vitals and labs
3. **Phase 3 (Q4 2026):** Bidirectional HIE (TEFCA/Carequality), patient education module
4. **Phase 4 (Q1 2027):** ONC Health IT Certification Program application + testing
5. **Dependencies:** Requires funding, dedicated compliance officer, testing partner (Drummond Group or ICSA Labs)

### Where SLS Protocol Already Exceeds CEHRT
- **Blockchain-backed audit logging** — no certified EHR system provides immutable on-chain proof of every action
- **Hash integrity verification** — real-time tamper detection across all records
- **Patient-controlled consent NFTs** — no certified EHR offers XLS-20 NFT-based consent management
- **Cost transparency** — ~$0.001 per verification vs. millions in legacy EHR licensing

---

## 26. Freemium Pricing Model

### Tier Structure (Mainnet)

| Tier | Price | Anchors/Month | Features |
|------|-------|---------------|----------|
| **Free** | $0 | 100 | XRPL anchoring, FHIR/HL7 export, audit logging, API access |
| **Pro** | $499/mo | Unlimited | Everything in Free + priority support + BAA + custom integrations |
| **Enterprise** | Custom | Unlimited | Everything in Pro + dedicated infrastructure + SLA + on-prem option |

### Revenue Model
- **$SLS utility token** powers all on-chain transactions (~$0.001 per anchor)
- **Pro subscriptions** provide recurring revenue for support and infrastructure
- **Enterprise contracts** fund custom integrations for hospital systems
- **Free tier** enables pilots, testing, and developer adoption (100 anchors/month = plenty for evaluation)

### $SLS Token Economics on Mainnet
```
Anchor Fee:     ~0.000012 XRP per transaction (network fee)
$SLS Fee:       ~0.01 $SLS per anchor (protocol fee)
Patient Rebate: ~0.002 $SLS per record shared with provider
Provider Fee:   ~0.005 $SLS per verification request
```

---

## 27. PWA Push Notifications (v2.10.1)

### Current (Testnet Demo)
Push notifications use the browser's Notification API with local scheduling. No server-side push infrastructure is needed for the demo — alerts fire client-side at timed intervals.

```javascript
// Demo implementation — client-side only
Notification.requestPermission().then(perm => {
  if (perm === 'granted') {
    new Notification('Appointment Reminder', {
      body: 'Patient follow-up in 30 minutes',
      icon: '/demo-app/icon-192.png',
      tag: 'appointment-reminder'
    });
  }
});
```

### Mainnet — Production Push Infrastructure

| Component | Testnet (Demo) | Mainnet (Production) |
|-----------|---------------|---------------------|
| **Permission** | `Notification.requestPermission()` | Same — browser standard |
| **Push Server** | None (local scheduling) | VAPID-authenticated push server |
| **Subscription** | Not stored | PushSubscription stored in encrypted DB |
| **Delivery** | `setTimeout()` scheduling | FCM (Android/Chrome) + APNs (iOS/Safari) |
| **Payload** | Hardcoded demo messages | Real-time event-driven from EHR backend |
| **Encryption** | None | RFC 8291 (Web Push Encryption) |
| **Background Sync** | Service worker `sync` event | Service worker + IndexedDB queue |

### Migration Steps
1. **Generate VAPID Keys** — `web-push generate-vapid-keys` (Node.js) or Python `pywebpush`
2. **Store VAPID Keys** — Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` as env vars on Render
3. **Backend Push Endpoint** — `POST /api/push/subscribe` to store `PushSubscription` objects (encrypted at rest)
4. **Event Triggers** — Wire EHR events (appointment T-30min, claim status change, critical lab, integrity alert) to push dispatch
5. **FCM Integration** — Register Firebase project, obtain server key, configure `gcm_sender_id` in manifest.json
6. **APNs Integration** — For iOS Safari 16.4+ PWA push support, register Apple Developer Certificate
7. **Offline Anchor Sync** — Implement `BackgroundSyncPlugin` to queue anchors in IndexedDB when offline, replay on reconnection

### HIPAA Considerations
- Push payloads must **never** contain PHI in the notification body (use generic text like "New update available" with in-app detail)
- PushSubscription endpoints should be stored in HIPAA-compliant encrypted storage
- All push server logs must exclude patient identifiers

---

## 28. Cohort Analytics & Population Health (v2.10.1)

### Current (Testnet Demo)
The cohort analytics dashboard renders population health visualizations using client-side data from `localStorage`. When insufficient real data exists, the system generates simulated representative data for demonstration purposes.

### Dashboard Modules

| Module | Description | Data Source (Demo) | Data Source (Mainnet) |
|--------|-------------|-------------------|----------------------|
| **Age Distribution** | Bar chart of patient age buckets (0-17, 18-34, 35-49, 50-64, 65-79, 80+) | In-memory patient records | PostgreSQL patient demographics (de-identified) |
| **Condition Prevalence** | ICD-10 condition prevalence bars with percentage | 8 simulated conditions (I10, E11.9, J06.9, M54.5, etc.) | Aggregate ICD-10 codes from claims database |
| **Record Type Breakdown** | Grid showing count per record category | localStorage record array | Metrics API `/api/records/breakdown` |
| **Anchoring Trends** | 7-day bar chart of daily anchor volume | Simulated daily counts | XRPL transaction query by date range |
| **Population Health Insights** | 5 AI-driven insight cards | Static analysis of demo data | ML pipeline (chronic disease prediction, care gaps, utilization) |

### Mainnet Migration Steps
1. **Database Backend** — Deploy PostgreSQL (HIPAA-compliant hosting) for patient demographics and record metadata
2. **De-identification Layer** — All analytics queries must pass through a HIPAA Safe Harbor de-identification filter (remove 18 PHI identifiers per 45 CFR §164.514(b))
3. **Aggregate-Only API** — `GET /api/analytics/cohort` returns only aggregate statistics (no individual records); minimum cohort size of 10 patients to prevent re-identification
4. **Real ICD-10 Integration** — Connect to CMS ICD-10-CM API for validated code lookups
5. **XRPL Trend Queries** — Use Clio server API to query historical anchoring transactions by date range and memo type
6. **ML Pipeline** — Deploy scikit-learn or TensorFlow Lite models for population health predictions (chronic disease risk scoring, care gap identification, utilization forecasting)
7. **Caching** — Redis cache with 15-minute TTL for aggregate analytics to reduce database load

### Data Governance
- All cohort analytics operate on **de-identified aggregate data only**
- Individual patient records are never exposed through analytics endpoints
- Minimum cohort sizes enforced to prevent statistical re-identification
- Analytics audit log: every query is logged with requester, timestamp, and query parameters

---

## 29. Stress Testing & Scalability Benchmarks (v2.10.1)

### Current (Testnet Demo)
The stress test module simulates SHA-256 hashing for batches of 1,000 to 1,000,000 records using the Web Crypto API (`crypto.subtle.digest`). Processing occurs in chunks of 5,000 via `requestAnimationFrame` to maintain UI responsiveness.

### Benchmark Results (Client-Side, Browser)

| Batch Size | Typical Time | Hashes/sec | Est. XRPL Cost |
|-----------|-------------|-----------|----------------|
| 1,000 | ~0.3s | ~3,300/s | $0.012 |
| 10,000 | ~2.5s | ~4,000/s | $0.12 |
| 100,000 | ~22s | ~4,500/s | $1.20 |
| 1,000,000 | ~3.5min | ~4,700/s | $12.00 |

### Mainnet — Production Scalability

| Component | Demo | Production |
|-----------|------|------------|
| **Hashing** | Browser Web Crypto API | Server-side (Node.js `crypto` or Rust `sha2` crate) |
| **Throughput** | ~4,700 hashes/sec | 50,000–500,000 hashes/sec (server-side) |
| **Batching** | Individual simulated hashes | Merkle tree root anchoring (1 XRPL tx per batch) |
| **XRPL Submission** | Not submitted (simulation only) | Batch Merkle root → single XRPL Memo transaction |
| **Concurrency** | Single browser thread | Horizontal scaling with worker pools |
| **Cost** | $0.000012/record (estimated) | $0.000012/batch (Merkle root = 1 tx regardless of batch size) |

### Merkle Tree Batching for Mainnet

```
Records:    [H1] [H2] [H3] [H4] [H5] [H6] [H7] [H8]
              \  /      \  /      \  /      \  /
Level 1:   [H1+H2]  [H3+H4]  [H5+H6]  [H7+H8]
                \      /            \      /
Level 2:    [H1234]              [H5678]
                    \            /
Merkle Root:      [H12345678]
                       ↓
              Single XRPL Transaction
              Cost: ~0.000012 XRP
              Proves: 8 records in 1 tx
```

### Migration Steps
1. **Server-Side Hashing** — Move SHA-256 computation to backend using Node.js `crypto.createHash('sha256')` or Rust for maximum throughput
2. **Merkle Tree Library** — Implement `merkle-tree-solidity`-compatible tree builder (or custom) to batch N records into a single root hash
3. **Batch Scheduler** — Cron job or event-driven batch processor (e.g., every 5 minutes or every 1,000 records, whichever comes first)
4. **Proof Generation** — Store Merkle proofs per record so any individual record can be verified against the on-chain root
5. **XRPL Throughput** — XRPL handles ~1,500 TPS; with Merkle batching at 1,000 records/batch, effective throughput = 1,500,000 records/sec
6. **Horizontal Scaling** — Deploy hash worker pool behind a load balancer; each worker processes batches independently
7. **Monitoring** — Prometheus metrics for batch processing latency, queue depth, and XRPL submission success rate

---

## 30. AI Predictions & Insights Engine (v2.10.4)

### Current (Testnet Demo)
The AI Predictions Engine provides intelligent health insights across all three user roles (Patient, Provider, EHR Admin). Predictions are generated client-side using pattern analysis of patient records, appointment history, and health metrics.

### AI Components

| Component | Function | Demo Implementation | Mainnet Implementation |
|-----------|----------|---------------------|------------------------|
| **aiDrugWarning()** | Drug interaction analysis | FDA API lookup + local severity scoring | FDA API + ML interaction classifier |
| **aiCostEstimate()** | Pre-visit cost prediction | CPT-based cost averaging | ML model trained on claims data |
| **aiSchedulingSuggestions()** | Smart appointment recommendations | Rule-based gap detection | ML scheduling optimizer |
| **aiReadinessScore()** | Pre-appointment preparation score | Weighted checklist completion | NLP analysis of patient messages |
| **aiLabAnalysis()** | Lab result trend analysis | Statistical trend detection | Time-series forecasting models |
| **getAIPredictions()** | Consolidated prediction array | Pattern-based static predictions | Real-time ML inference pipeline |

### AI Insight Cards (Role-Specific)

**Patient Dashboard:**
```javascript
// Example AI insights for patients
[
  { type: 'risk', message: 'Based on recent readings, blood pressure trending 12% higher' },
  { type: 'savings', message: 'Switching to generic Metoprolol could save $47/month' },
  { type: 'prevention', message: '3 overdue preventive screenings detected' },
  { type: 'scheduling', message: 'Optimal appointment time: Tuesday 10am (lowest wait)' }
]
```

**Provider Dashboard:**
```javascript
// Example AI insights for providers
[
  { type: 'critical', message: '3 patients with HbA1c > 9.0 need urgent follow-up' },
  { type: 'compliance', message: 'Care gap alert: 12 patients overdue for mammogram' },
  { type: 'efficiency', message: 'Double-booking detected on 3/15 at 2pm slot' },
  { type: 'billing', message: '8 claims approaching filing deadline (< 30 days)' }
]
```

**EHR Admin Dashboard:**
```javascript
// Example AI insights for EHR administrators
[
  { type: 'integrity', message: '2 records flagged for hash mismatch review' },
  { type: 'usage', message: 'API usage up 34% — consider rate limit adjustment' },
  { type: 'cost', message: 'Projected $SLS token usage: 12,400 anchors this month' },
  { type: 'compliance', message: 'HIPAA audit log export due in 12 days' }
]
```

### Mainnet Migration Steps
1. **ML Model Training** — Train prediction models on de-identified claims data (diabetes risk, readmission risk, cost prediction)
2. **Inference API** — Deploy FastAPI + TensorFlow Serving for sub-100ms inference
3. **Vector Embeddings** — Use OpenAI embeddings or local BERT model for patient condition/medication similarity scoring
4. **Real-Time Alerts** — Wire AI engine to push notification service for critical predictions
5. **Audit Trail** — All AI predictions logged with model version, confidence score, and input features (de-identified)
6. **Explainability** — SHAP values or LIME explanations for regulatory compliance (FDA SaMD guidance)
7. **A/B Testing** — Track prediction accuracy and clinician acceptance rates

### HIPAA & AI Governance
- AI models trained only on de-identified data meeting Safe Harbor or Expert Determination standards
- No direct PHI used in model training; only aggregate statistical features
- All AI predictions include confidence intervals and "AI-generated" labeling
- Human-in-the-loop for any clinical decision support (no autonomous treatment recommendations)

---

## 31. Enhanced Scheduling System (v2.10.4)

### Current (Testnet Demo)
The enhanced scheduling system provides visual calendar management with drag-and-drop appointment editing, conflict detection, and AI-powered scheduling suggestions across all user roles.

### Scheduling Features

| Feature | Description | Demo | Mainnet |
|---------|-------------|------|---------|
| **Visual Calendar** | Interactive month/week/day views with appointment cards | FullCalendar.js client-side | FullCalendar + server-side persistence |
| **Conflict Detection** | Real-time overlap and double-booking alerts | Client-side time comparison | PostgreSQL constraint + triggers |
| **AI Suggestions** | Smart slot recommendations based on patterns | Rule-based suggestions | ML scheduling optimizer |
| **Recurring Appointments** | Series scheduling with exception handling | localStorage series storage | iCal RRULE server-side |
| **Waitlist Management** | Automatic slot offers on cancellations | In-memory waitlist | Redis-backed priority queue |
| **Multi-Provider** | Cross-provider availability view | Single-provider demo | Provider availability matrix |

### Calendar Data Model

```javascript
// Appointment schema
{
  id: "apt_12345",
  patientId: "pat_67890",
  providerId: "prov_11111",
  type: "followup|initial|procedure|telehealth",
  start: "2026-03-15T10:00:00Z",
  end: "2026-03-15T10:30:00Z",
  status: "scheduled|confirmed|cancelled|completed|no-show",
  location: "Room 204|Telehealth",
  notes: "Follow-up for diabetes management",
  recurRule: "RRULE:FREQ=WEEKLY;COUNT=4",    // Optional recurring
  anchorHash: "sha256:abc123...",             // XRPL anchor reference
  anchorTxHash: "1A2B3C..."                   // XRPL transaction hash
}
```

### Scheduling Actions (XRPL-Anchored)

| Action | XRPL Memo Type | $SLS Fee |
|--------|---------------|----------|
| Create Appointment | `sls:scheduling:create` | 0.01 $SLS |
| Modify Appointment | `sls:scheduling:modify` | 0.01 $SLS |
| Cancel Appointment | `sls:scheduling:cancel` | 0.005 $SLS |
| Confirm Appointment | `sls:scheduling:confirm` | 0.005 $SLS |
| No-Show Record | `sls:scheduling:noshow` | 0.01 $SLS |

### Mainnet Migration Steps
1. **PostgreSQL Schema** — Deploy appointments table with provider/patient foreign keys and XRPL anchor references
2. **Conflict Constraints** — Add database-level check constraints for overlapping appointments per provider
3. **iCal Integration** — Export appointments as ICS files for patient calendar sync (Google, Apple, Outlook)
4. **SMS/Email Reminders** — Integrate Twilio (SMS) and SendGrid (email) for automated reminders at T-48h, T-24h, T-1h
5. **Telehealth Integration** — Generate Zoom/Teams links for telehealth appointments with automatic embedding
6. **Waitlist Service** — Deploy Redis-backed waitlist with automatic slot matching on cancellations
7. **FHIR Scheduling** — Implement FHIR R4 Appointment and Schedule resources for EHR interoperability

### AI Scheduling Optimization
```python
# Example scheduling ML features
features = {
  'day_of_week': appointment.start.weekday(),
  'hour_of_day': appointment.start.hour,
  'provider_avg_delay_mins': get_provider_delay(provider_id),
  'patient_noshow_probability': predict_noshow(patient_id),
  'appointment_type_duration_variance': get_type_variance(type),
  'weather_impact_score': get_weather_score(date, location)
}
# Predict: optimal slot, expected wait time, no-show risk
```

---

## Migration Checklist (v2.10.5 — Comprehensive)

```
╔══════════════════════════════════════════════════════════════════╗
║         MAINNET MIGRATION CHECKLIST — v2.10.5                   ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  INFRASTRUCTURE                                                  ║
║  □ Generate mainnet wallet                                       ║
║  □ Fund with 50+ XRP (~$100)                                     ║
║  □ Set XRPL_MAINNET_SEED env var on Render                      ║
║  □ Set XRPL_MAINNET_ACCOUNT env var on Render                   ║
║  □ Set SOLUS_API_KEY env var on Render                           ║
║  □ Deploy backend with /api/anchor endpoint                      ║
║  □ Configure production encryption keys (AWS KMS / Vault)        ║
║  □ Set up Redis for distributed rate limiting                    ║
║  □ Configure fallback WebSocket nodes                            ║
║                                                                  ║
║  SDK & CORE                                                      ║
║  □ Update SolusSDK: testnet=False                                ║
║  □ Update SolusEHR: testnet=False + production keys              ║
║  □ Test with XRPL_NETWORK=testnet first                          ║
║                                                                  ║
║  DEMO APP / FRONTEND                                             ║
║  □ Update anchorFromPlayground() → fetch() API call              ║
║  □ Update svcnAnchorToXRPL() → fetch() API call                 ║
║  □ Update ehrAnchorToXRPL() → fetch() API call                  ║
║  □ Update all explorer URLs to livenet.xrpl.org                  ║
║  □ Remove embedded wallet seed from frontend JS                  ║
║  □ Deploy frontend                                               ║
║                                                                  ║
║  EHR FEATURES (v2.10.0)                                          ║
║  □ Connect ICD-10 autocomplete to CMS API                        ║
║  □ Connect CPT autocomplete to AMA API (license required)        ║
║  □ Connect eligibility check to Availity/Change Healthcare       ║
║  □ Connect drug interaction checker to RxNorm API                ║
║  □ Connect claim submission to EDI 837 clearinghouse             ║
║  □ Implement real TOTP MFA (Google Authenticator / Authy)        ║
║  □ Implement real XLS-20 NFTokenMint for consent tokens          ║
║  □ Set up IPFS/Arweave pinning for consent NFT metadata          ║
║  □ Implement Firebase Cloud Messaging for push notifications     ║
║  □ Implement Background Sync for offline anchor queueing         ║
║  □ Connect feedback form to Slack webhook + Jira                 ║
║                                                                  ║
║  PUSH NOTIFICATIONS (v2.10.1)                                    ║
║  □ Generate VAPID keys and set env vars                          ║
║  □ Deploy push subscription endpoint (POST /api/push/subscribe) ║
║  □ Wire EHR events to push dispatch                              ║
║  □ Configure FCM for Android/Chrome push                         ║
║  □ Configure APNs for iOS Safari 16.4+ push                     ║
║  □ Implement BackgroundSyncPlugin for offline anchors            ║
║  □ Verify push payloads contain no PHI                           ║
║                                                                  ║
║  ANALYTICS & STRESS TESTING (v2.10.1)                            ║
║  □ Deploy PostgreSQL for de-identified analytics                 ║
║  □ Implement HIPAA Safe Harbor de-identification layer           ║
║  □ Build aggregate-only analytics API endpoints                  ║
║  □ Connect real ICD-10 codes to CMS API                          ║
║  □ Deploy server-side Merkle tree batch hashing                  ║
║  □ Implement batch scheduler (5min / 1K records)                 ║
║  □ Generate and store per-record Merkle proofs                   ║
║  □ Set up Prometheus monitoring for batch processing             ║
║                                                                  ║
║  METRICS API                                                     ║
║  □ Update XRPL_URL to mainnet RPC                                ║
║  □ Update XRPL_ACCOUNT to mainnet address                        ║
║  □ Verify all 130+ record type categories work on mainnet        ║
║  □ Deploy metrics API to Render                                  ║
║                                                                  ║
║  VERIFICATION                                                    ║
║  □ Smoke test: anchor + verify one record (SDK Playground)       ║
║  □ Smoke test: run SVCN scenario with XRPL anchoring             ║
║  □ Smoke test: EHR register patient + create record              ║
║  □ Smoke test: run EHR scenario (e1-e12)                         ║
║  □ Smoke test: submit claim + verify adjudication anchor         ║
║  □ Smoke test: mint + revoke consent NFT                         ║
║  □ Smoke test: eligibility check + optional anchor               ║
║  □ Smoke test: drug interaction check                            ║
║  □ Smoke test: hash mismatch / integrity failure                 ║
║  □ Smoke test: push notification permission + delivery           ║
║  □ Smoke test: cohort analytics with real patient data           ║
║  □ Smoke test: stress test 10K records server-side               ║
║  □ Verify Metrics API categorizes all record types               ║
║  □ Set up XRP balance monitoring alerts (warn at 10 XRP)         ║
║  □ Test amendment resilience on Testnet                           ║
║                                                                  ║
║  COMPLIANCE                                                      ║
║  □ Execute BAA with hosting providers (Render, Vercel)           ║
║  □ Complete HIPAA Security Risk Assessment                       ║
║  □ Begin ONC CEHRT readiness evaluation                          ║
║  □ Engage Drummond Group or ICSA Labs for certification testing  ║
║                                                                  ║
║  AI PREDICTIONS (v2.10.4)                                        ║
║  □ Train ML models on de-identified claims data                  ║
║  □ Deploy FastAPI + TensorFlow Serving inference endpoints       ║
║  □ Implement SHAP/LIME explainability for AI predictions         ║
║  □ Wire AI alerts to push notification service                   ║
║  □ Add confidence scores and AI-generated labeling               ║
║  □ Smoke test: AI drug warning accuracy                          ║
║  □ Smoke test: AI scheduling suggestions                         ║
║                                                                  ║
║  ENHANCED SCHEDULING (v2.10.4)                                   ║
║  □ Deploy PostgreSQL appointments table with constraints         ║
║  □ Implement iCal export (ICS) for patient calendar sync         ║
║  □ Integrate Twilio/SendGrid for appointment reminders           ║
║  □ Deploy Redis-backed waitlist service                          ║
║  □ Implement FHIR R4 Appointment/Schedule resources              ║
║  □ Smoke test: appointment CRUD + XRPL anchoring                 ║
║  □ Smoke test: conflict detection on double-booking              ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

*Last updated: v2.10.5 — February 2026*
*See also: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) | [SECURITY.md](SECURITY.md) | [HIPAA_COMPLIANCE.md](HIPAA_COMPLIANCE.md) | [WHITEPAPER.md](WHITEPAPER.md)*
