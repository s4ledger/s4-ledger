# S4 Ledger User Training Guide v4.0

> Complete step-by-step guide for every tool, feature, and workflow in S4 Ledger.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Wallet Setup](#2-wallet-setup)
3. [Anchor Records (Tab 1)](#3-anchor-records)
4. [Verify Records (Tab 2)](#4-verify-records)
5. [Transaction Log (Tab 3)](#5-transaction-log)
6. [ILS Workspace — 20 Tools (Tab 4)](#6-ils-workspace)
7. [My Wallet (Tab 5)](#7-my-wallet)
8. [CLI and SDK Usage](#8-cli-sdk)
9. [Security Best Practices](#9-security)
10. [Troubleshooting / FAQ](#10-faq)

---

## 1. Getting Started

### Step 1: Navigate to the Login Page
Go to **s4ledger.com/s4-login/** and click **Create Account**.

### Step 2: Create Your Account
Fill in the required fields:
- **Full Name** — Your legal name (used for audit records)
- **Organization** — Your company, agency, or command
- **Email** — Official/work email address
- **Password** — Minimum 12 characters with uppercase, lowercase, number, and symbol
- **Role** — Select your access level:
  - **Admin / Leadership** — Full access including SLS purchases
  - **Program Manager** — Full tools access with purchase approval limits
  - **Standard User** — View and use tools; cannot purchase SLS

### Step 3: Welcome
- Your account is provisioned with **100 SLS service credits** (Free Trial)
- An XRPL wallet is automatically created for you
- You are redirected to the **Demo App** with all 5 tabs active

### What Are SLS Service Credits?
SLS (Solus Ledger Service) credits are **prepaid utility tokens** — similar to AWS credits or Azure tokens. Each anchor operation costs **0.01 SLS** ($0.0001 USD). Your initial 100 SLS allows approximately **10,000 anchoring operations**.

> **Important:** SLS credits are NOT equity, NOT an investment, and NOT a security. They are prepaid service credits for blockchain anchoring operations per SEC/FinCEN compliance.

---

## 2. Wallet Setup

### Your XRPL Wallet
When your account is created, S4 Ledger provisions:
- An **XRPL mainnet wallet** with a unique address (starts with `r...`)
- A **trust line** to the SLS token issuer
- **100 SLS service credits** transferred from the S4 Operations wallet

### Viewing Your Wallet
1. Click the **My Wallet** tab in the Demo App
2. You will see:
   - **SLS Balance** — Your current service credit balance
   - **Network** — XRPL Mainnet (live blockchain)
   - **Wallet Address** — Your unique XRPL address
   - **Usage Chart** — SLS usage over time

### Purchasing Additional SLS
> Only **Admin/Leadership** and **Program Manager** roles can purchase SLS.

**How it works (no direct USD/SLS pair exists):**
1. **You pay with USD** — Via Stripe payment processing
2. **S4 processes the order** — Allocates SLS from the Operations wallet
3. **SLS delivered on-chain** — Transferred to your XRPL wallet
4. **Ready to use** — Credits appear in your balance immediately

**Pricing:** $0.01 per SLS credit. Subscription plans include monthly SLS allocations.

### Role-Based Purchase Controls

| Role | Permissions |
|------|------------|
| **Admin / Leadership** | Full purchase access, unlimited amounts |
| **Program Manager** | Purchase with approval limits (configurable) |
| **Standard User** | View balance only, use allocated SLS, cannot purchase |

---

## 3. Anchor Records (Tab 1)

### What Is Anchoring?
Anchoring creates an **immutable, tamper-proof record** on the XRP Ledger blockchain. The record content is:
1. **Hashed** (SHA-256) — The content becomes a fixed-length fingerprint
2. **Stored on-chain** — The hash is embedded in an XRPL transaction memo
3. **Permanently verifiable** — Anyone can verify the record was not altered

### How to Anchor a Record

1. **Click the "Anchor" tab** (anchor icon)
2. **Enter your record** in the text area. Examples:
   - `Part received: NSN 5340-01-123-4567 Qty 50 from DLA`
   - `Maintenance completed: Engine overhaul Hull 72`
   - `Custody transfer: Lot AAE-2024-0847 to USS Gerald Ford`
3. **Select Record Type** (dropdown):
   - `SUPPLY_CHAIN` — Parts receipt, inventory, shipping
   - `MAINTENANCE` — Repairs, overhauls, inspections
   - `CUSTODY_TRANSFER` — Transfer of custody/ownership
   - `ORDNANCE` — Ammunition lot tracking
   - `PREDICTIVE_MAINTENANCE` — Sensor-based predictions
   - `CROSS_COMMAND` — Multi-command logistics
4. **Optional: Toggle "Encrypt First"** — Encrypts the record before hashing (for CUI/FOUO data)
5. **Click "Anchor to XRPL"**
6. **Result panel shows:**
   - SHA-256 Hash (64-character hex string)
   - XRPL Transaction Hash (link to explorer)
   - SLS Fee Paid (0.01 SLS)
   - Timestamp (UTC)
   - Record Type tag
   - Link to view on XRPL Explorer

### Understanding the Result
- The **SHA-256 hash** is your record's unique fingerprint — if even one character changes, the hash changes completely
- The **XRPL Explorer link** lets you independently verify the transaction on the public blockchain
- Records are **append-only** — you cannot delete an anchored record (this is by design for audit integrity)
- Use **"Encrypt First"** for any sensitive data (CUI, FOUO, classified summaries)

---

## 4. Verify Records (Tab 2)

### What Is Verification?
Verification proves that a record has **not been tampered with** since it was anchored. It works by:
1. Re-hashing the original text
2. Comparing it to the hash stored on the blockchain
3. Reporting **MATCH** (verified) or **MISMATCH** (tampered)

### How to Verify a Record

1. **Click the "Verify" tab** (magnifying glass icon)
2. **Enter the original record text** — must be character-for-character identical to what was anchored
3. **Enter either:**
   - **XRPL Transaction Hash** — The TX hash from when it was anchored
   - **Expected SHA-256 Hash** — The known-good hash to compare against
4. **Click "Verify"**
5. **Result shows:**
   - **MATCH** — Record is authentic and untampered
   - **MISMATCH** — Record has been altered since anchoring
   - **NOT_FOUND** — Transaction hash not found on XRPL

### Verification Use Cases
- **Audit response** — Prove to auditors that records have not changed
- **Custody disputes** — Verify transfer records are authentic
- **Compliance checks** — Confirm maintenance records match what was filed
- **Supply chain integrity** — Verify parts receipts against original

---

## 5. Transaction Log (Tab 3)

A chronological record of all your anchoring operations in the current session. Each entry shows:
- **Timestamp** — When the operation occurred
- **Record Type** — SUPPLY_CHAIN, MAINTENANCE, etc.
- **SHA-256 Hash** — The hash that was anchored
- **TX Hash** — Link to the XRPL transaction
- **Status** — Success/Failed
- **SLS Fee** — Amount of SLS spent

You can **export as CSV**, **search** by record type/date/hash, and **click any TX hash** to open XRPL Explorer.

---

## 6. ILS Workspace — 20 Tools (Tab 4)

The ILS (Integrated Logistics Support) Workspace is a comprehensive suite of **20 defense logistics analysis tools**. Click the **ILS Workspace** tab to access them.

### Tool 1: Gap Analysis
**What:** Comprehensive ILS program assessment with scored categories (0-100): Reliability, Maintainability, Supply Support, Technical Data, Support Equipment.
**How:** Click Gap Analysis, review scored categories, expand for detailed findings.

### Tool 2: Action Items
**What:** Cross-tool action items aggregated with severity ratings (Critical/Warning/Info) and cost estimates.
**How:** Click Action Items, view by severity, filter by source tool.

### Tool 3: Calendar
**What:** Scheduled ILS events: DMSMS reviews, warranty expirations, readiness assessments, audit dates.
**How:** Click Calendar, navigate months, click any date to see events.

### Tool 4: DMSMS
**What:** Check parts for Diminishing Manufacturing Sources and Material Shortages risk per DoDI 4245.14.
**How:** Enter NSN(s) (format: XXXX-XX-XXX-XXXX), click Check DMSMS. Results show per-part risk: Active, At Risk, or Obsolete.

### Tool 5: Readiness Calculator
**What:** Calculate Operational Availability (Ao) and RAM metrics per MIL-STD-1390D.
**How:** Enter MTBF (hours), MTTR (hours), MLDT (hours), click Calculate. Returns Ao%, failure rate, annual failures, letter grade.

**Example:** MTBF=500, MTTR=4, MLDT=2 → Ao = 98.8% (Grade: A)

### Tool 6: Parts Lookup (NSN)
**What:** Look up National Stock Numbers in the Federal Logistics system.
**How:** Enter an NSN (e.g., 5340-01-123-4567), click Lookup. Returns FSC, NIIN, nomenclature, status, price, hash.

### Tool 7: ROI Calculator
**What:** Calculate return on investment for S4 Ledger deployment. Estimates labor savings (65%), error reduction (90%), and audit savings (70%).
**How:** Adjust parameters (programs, FTEs, rates, costs), click Calculate ROI.

### Tool 8: Lifecycle Cost Estimator
**What:** Estimate total ownership cost per DoD 5000.73 / MIL-STD-881F.
**How:** Enter acquisition cost, fleet size, service life, sustainment rate. Returns full cost breakdown.

### Tool 9: Warranty Tracker
**What:** Track warranty/contract status per FAR 46.7 / DFARS 246.7.
**How:** View items categorized as Active (green), Expiring Soon (yellow), Expired (red).

### Tool 10: Audit Vault
**What:** Secure repository for audit-ready documentation with blockchain verification.
**How:** View stored documents, click Verify on any document to confirm integrity against chain.

### Tool 11: Document Library
**What:** Organized ILS documentation: Technical Manuals, IPBs, Provisioning Docs.
**How:** Browse by category, search by keyword or document number.

### Tool 12: Compliance Dashboard
**What:** Track compliance across NIST 800-171, CMMC, DFARS, ITAR.
**How:** View score ring (percentage and letter grade), expand categories for detailed assessments.

### Tool 13: Provisioning Status
**What:** Track provisioning: PTD submissions, APL generation, NSN cataloging.
**How:** View completion percentage by program and step.

### Tool 14: Supply Chain Risk
**What:** Assess supply chain risk by supplier, geography, and single-source dependency.
**How:** View color-coded risk matrix with mitigation recommendations.

### Tool 15: Audit Reports
**What:** Generate formal audit reports anchored to XRPL for tamper-proof storage.
**How:** Select report type, configure scope, generate. Report is auto-anchored.

### Tool 16: Contracts
**What:** Manage contract data with blockchain verification. Track modifications and milestones.
**How:** View active contracts, track amendments, each milestone is anchored.

### Tool 17: Digital Thread
**What:** Visualize the end-to-end digital thread from design through sustainment.
**How:** Click nodes to see records and anchors. Verify any point against the chain.

### Tool 18: Predictive Maintenance
**What:** Analyze maintenance patterns to predict future failures.
**How:** View predictions with confidence levels, dates, and recommended actions.

### Tool 19: Defense Database Import
**What:** Import data from 22 DoD logistics databases in CSV, XML, or JSON format.
**How:**
1. Select source system from dropdown
2. Select file format (CSV/XML/JSON)
3. Paste data or upload file
4. Click Import and Preview
5. Optionally click Anchor All to anchor every record to XRPL

**Supported systems (22):** NSERC-IDE, MERLIN, NAVAIR AMS-PMT, COMPASS, CDMD-OA, NDE, MBPS, PEO-MLB, CSPT, GCSS, DPAS, DLA/FLIS, NAVSUP, GCSS-Army, LMP, AESIP, REMIS, LIMS-EV, D200A, GCSS-MC, ATLASS, ALMIS

### Tool 20: ILIE (ILS Information Exchange)
**What:** Formal ILS data exchange submissions with blockchain verification.
**How:** Create submission, add records, set approval chain, submit. Auto-anchored to XRPL.

---

## 7. My Wallet (Tab 5)

### What You See
- **SLS Balance** — Current service credit count (displayed in gold)
- **Network Badge** — XRPL Mainnet
- **Wallet Address** — Your unique XRPL address
- **Usage Chart** — Toggle: Hour / Day / Week / Month / Year
- **Purchase SLS** button (Admin/PM roles only)
- **SEC Regulatory Notice** — SLS utility token compliance statement

### How to Purchase SLS
1. Click **Purchase SLS**
2. Enter amount of SLS to purchase
3. Pay with USD via Stripe
4. S4 allocates SLS from Ops wallet and delivers on-chain
5. Credits appear immediately

### Role Restrictions
- **Admins**: Purchase any amount
- **Program Managers**: Purchase up to configured limit
- **Standard Users**: Cannot purchase — view and use only

---

## 8. CLI and SDK Usage

### Python SDK
```python
from s4_sdk import S4SDK

sdk = S4SDK(wallet_seed="sEdXXX", api_key="your_key", testnet=False)

# Anchor a record
result = sdk.anchor_record(
    "Part received: NSN 5340-01-123-4567 Qty 50",
    record_type="SUPPLY_CHAIN"
)

# Verify a record
check = sdk.verify_against_chain(
    "Part received: NSN 5340-01-123-4567 Qty 50",
    tx_hash=result["tx_results"]["fee_tx"]["hash"]
)

# ILS Tools
readiness = sdk.calculate_readiness(mtbf=500, mttr=4, mldt=2)
dmsms = sdk.check_dmsms(["5340-01-123-4567"])
roi = sdk.calculate_roi(programs=5, ftes=8)
```

### Command Line
```bash
# Anchor
python s4_sdk.py anchor --record "Part received" --seed "sEdXXX" --type SUPPLY_CHAIN

# Verify
python s4_cli.py verify "Part received" --expected abc123...

# Hash only (no blockchain)
python s4_cli.py hash "Record content"

# ILS analysis
python s4_sdk.py readiness --record "500,4,2"
python s4_sdk.py dmsms --record "5340-01-123-4567"
python s4_sdk.py roi
```

### REST API
```bash
# Anchor via API
curl -X POST https://s4ledger.com/api/anchor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"record": "Part received", "wallet_seed": "sEdXXX"}'

# Verify via API
curl -X POST https://s4ledger.com/api/verify \
  -H "Content-Type: application/json" \
  -d '{"record": "Part received", "tx_hash": "ABC123..."}'
```

Full SDK documentation: **[s4ledger.com/sdk](https://s4ledger.com/sdk/)**

---

## 9. Security Best Practices

- **Never share your wallet seed** — it controls your entire wallet
- Store seeds in environment variables or a secrets manager
- Never commit seeds to version control (Git)
- Use **Encrypt First** for any CUI/FOUO data before anchoring
- The hash is stored publicly on XRPL; the original content stays with you
- Assign roles appropriately — not everyone needs Admin access
- Only Admin/Leadership should manage SLS purchases
- Review user access quarterly
- All operations are logged with blockchain hashes for audit
- Records cannot be deleted or modified (append-only by design)
- Corrections create a new supersession record — both remain on-chain

---

## 10. Troubleshooting / FAQ

**Q: My anchor failed — what happened?**
Check: (1) SLS balance — need at least 0.01 SLS, (2) network connectivity, (3) valid wallet seed format.

**Q: Verification shows MISMATCH — is the record tampered?**
Not necessarily. Verification is character-exact. Even an extra space or different line ending causes mismatch. Ensure text is identical to what was originally anchored.

**Q: Can I delete an anchored record?**
No — by design. Use `correct_record()` to create a supersession record. Both remain on-chain for full audit trail.

**Q: How much does anchoring cost?**
0.01 SLS per anchor ($0.0001 USD). Your initial 100 SLS allows ~10,000 operations.

**Q: What XRPL network are we on?**
XRPL Mainnet — the live, production blockchain. Not a test network.

**Q: Can I use S4 Ledger for classified data?**
Use Encrypt First for CUI/FOUO. For classified, consult your security officer — the hash reveals nothing about content, but policies may restrict.

**Q: Who can see my records?**
Anyone can see the transaction and hash on XRPL Explorer. But the hash reveals nothing about the original content — only someone with the original text can verify it.

**Q: What are the 22 supported DoD databases?**
NSERC-IDE, MERLIN, NAVAIR AMS-PMT, COMPASS, CDMD-OA, NDE, MBPS, PEO-MLB, CSPT, GCSS, DPAS, DLA/FLIS, NAVSUP, GCSS-Army, LMP, AESIP, REMIS, LIMS-EV, D200A, GCSS-MC, ATLASS, ALMIS, CG-ONE, USSF-LMS, PIEE.

**Q: How do I get more SLS credits?**
Ask your Admin or Program Manager to purchase via the Wallet tab. Standard users cannot purchase directly.

---

*S4 Ledger v4.0.0 | 2026 S4 Systems, LLC. SLS is a utility token (prepaid service credit), not equity or an investment contract.*
