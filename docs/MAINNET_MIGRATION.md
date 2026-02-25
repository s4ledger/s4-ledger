# S4 Ledger — XRPL Mainnet Migration Guide

> **Status:** **$SLS Token: LIVE on XRPL Mainnet.** Token issuance, trustlines, and AMM pools are operational. COMPLETE — All 14 ILS tools anchor to XRPL Mainnet with explorer links (v4.0) server-side signing deployment (see Section 2).

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
12. [S4 Ledger Network Migration](#12-svcn-care-network-migration)
13. [S4 Ledger DLRS Migration](#13-sls-protocol-dlrs-migration)
14. [Metrics API Migration](#14-metrics-api-migration)
15. [Visual Calendar & Scheduling](#15-visual-calendar--scheduling-v2100)
16. [FSC/CLIN Billing & Contract Lifecycle](#16-fscclin-billing--contract-lifecycle-v2100)
17. [Insurance Eligibility Verification & Anchoring](#17-insurance-eligibility-verification--anchoring-v2100)
18. [HAZMAT Compatibility Checker](#18-hazmat-compatibility-checker-v2100)
19. [XLS-20 NFT Access Tokens](#19-xls-20-nft-access-tokens-v2100)
20. [Gamification & Guardian Level System](#20-gamification--guardian-level-system-v2100)
21. [Hash Mismatch & Integrity Testing](#21-hash-mismatch--integrity-testing-v2100)
22. [Multi-Factor Authentication](#22-multi-factor-authentication-v2100)
23. [Settings Persistence & PWA Service Worker](#23-settings-persistence--pwa-service-worker-v2100)
24. [In-App Feedback System](#24-in-app-feedback-system-v2100)
25. [CMMC Level 2 Compliance Roadmap](#25-cmmc-level-2-compliance-roadmap)
26. [Freemium Pricing Model](#26-freemium-pricing-model)
27. [PWA Push Notifications (v2.10.1)](#27-pwa-push-notifications-v2101)
28. [Cohort Analytics & Population Health (v2.10.1)](#28-cohort-analytics--population-health-v2101)
29. [Stress Testing & Scalability Benchmarks (v2.10.1)](#29-stress-testing--scalability-benchmarks-v2101)
30. [AI Predictions & Insights Engine (v2.10.4)](#30-ai-predictions--insights-engine-v2104)
31. [Enhanced Scheduling System (v2.10.4)](#31-enhanced-scheduling-system-v2104)
32. [Platform Database & New Tools (v3.3.0)](#32-platform-database--new-tools-v330)
33. [ILS Workspace & Cross-Tool Integration (v3.5.0)](#33-ils-intelligence-hub--cross-tool-integration-v350)
34. [Audit Record Vault, Defense Document Library & Compliance Scorecard (v3.7.0)](#34-audit-record-vault-defense-document-library--compliance-scorecard-v370)

---

## 1. Overview

### Previous State (Testnet — Before v4.0)
- **Network:** XRPL Testnet
- **WebSocket:** `wss://s.altnet.rippletest.net:51233`
- **REST API:** `https://s.altnet.rippletest.net:51234/`
- **Explorer:** `https://testnet.xrpl.org`
- **Signing:** Client-side (wallet seed embedded in browser JavaScript)
- **Account:** `rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA`
- **Cost:** Free (testnet XRP from faucet)

### Current State (Mainnet — v4.0 Live)
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
5. **NIST/CMMC compliance** requires server-side access controls

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

The **SLS (Secure Logistics Standard) Issuer** is the mainnet account that will submit all anchor transactions.

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
S4_API_KEY=sk_live_________________________________     # API key for frontend auth
S4_RATE_LIMIT=100                                       # Max anchors per minute
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
  curl -X POST https://s4ledger.onrender.com/api/anchor \
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
S4_API_KEY = os.environ.get('S4_API_KEY', 'sk_test_demo_key_not_for_production')
RATE_LIMIT = int(os.environ.get('S4_RATE_LIMIT', '100'))

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
        if not api_key or api_key != S4_API_KEY:
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
            "record_type": "inspection|depot_repair|fleet_status|...",
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
        'inspection', 'depot_repair', 'fleet_status', 'calibration', 'supply_receipt',
        'training', 'maintenance_log', 'transfer_summary', 'casrep',
        'readiness', 'logistics_transfer', 'access_grant', 'contract_claim',
        'hazmat_cert', 'msds_record', 'ordnance_lot', 'config_baseline', 'spare_parts',
        'hazmat_alert', 'deployment_message', 'custom_record', 'dlrs_sync',
        'equipment_reading', 'special_program', 'remote_support'
    ]
    if record_type not in allowed_types:
        record_type = 'custom_record'
    
    try:
        # Build memo data
        memo_data_str = f's4:{record_type}:{record_hash}'
        memo_type_hex = memo_data_str.encode().hex()  # This is for MemoData
        memo_type_str = 's4/anchor'
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
            "memo_data": "s4:lab_results:abc123...",
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
   - `XRPL_NETWORK=mainnet` (change to `mainnet` when ready)
   - `XRPL_MAINNET_SEED=your_mainnet_seed_here`
   - `S4_API_KEY=your_generated_api_key`
3. **Redeploy** — the endpoint will be live at `https://s4ledger.onrender.com/api/anchor`

### Test with curl

```bash
# Test anchoring (testnet)
curl -X POST https://s4ledger.onrender.com/api/anchor \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{
    "hash": "f0e366f13efcb0dd6d564e267a9efb6afed62eabce3abed64e830bfe25cacca1",
    "record_type": "transfer_summary"
  }'

# Test verification
curl -X POST https://s4ledger.onrender.com/api/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk_test_demo_key_not_for_production" \
  -d '{
    "hash": "f0e366f13efcb0dd6d564e267a9efb6afed62eabce3abed64e830bfe25cacca1"
  }'

# Check network config
curl https://s4ledger.onrender.com/api/network
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
    const response = await fetch('https://s4ledger.onrender.com/api/anchor', {
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
        "origins": ["https://s4ledger.vercel.app", "https://s4ledger.com"]
    }
})
```

### NIST Compliance
- **Only the SHA-256 hash** is sent to the backend and XRPL — never the actual record content
- The hash is a one-way function; the original record cannot be reconstructed
- All API communication must use HTTPS
- Backend logs should not contain hash-to-record mappings
- See [NIST_COMPLIANCE.md](NIST_COMPLIANCE.md) for full details

---

## 8. Testing the Migration

### Test Plan

```bash
# 1. Test backend in testnet mode
export XRPL_NETWORK=mainnet
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

1. **Set `XRPL_NETWORK=mainnet`** on Render — backend immediately uses testnet again
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

The XRPL periodically activates protocol amendments (e.g., new transaction types, fee changes). S4 Ledger v2.9.3+ is designed to auto-adapt:

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

S4 Ledger v2.9.3 uses the `extractTxHash()` and `extractLedgerIndex()` helper functions that check all known paths, ensuring compatibility across xrpl.js versions and API versions.

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
║  □ Set S4_API_KEY env var on Render                       ║
║  □ Deploy backend with /api/anchor endpoint                  ║
║  □ Test with XRPL_NETWORK=mainnet first                      ║
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

---

> **Note:** Legacy healthcare-era sections (v2.x/v3.x) have been removed. S4 Ledger is now exclusively focused on defense logistics verification. See [CHANGELOG.md](CHANGELOG.md) for full version history.
