# S4 Ledger — Subscription & Onboarding Guide

**The blockchain-powered ILS platform built for defense logistics.**

> Every record anchored. Every decision proven. Every audit ready.

---

## What Is S4 Ledger?

S4 Ledger is a defense logistics platform that anchors Integrated Logistics Support (ILS) records to the XRP Ledger — creating immutable, timestamped proof of every provisioning decision, compliance milestone, CDRL delivery, and DMSMS resolution.

Instead of filing records in spreadsheets that can be altered, lost, or disputed, S4 Ledger hashes each record (SHA-256) and writes that hash to a public blockchain. The result: **tamper-proof audit trails that satisfy DCMA, DLA, C3PAO, and IG inspections instantly.**

---

## How It Works

```
1. You upload or create a logistics record (CDRL, parts data, readiness calculation, etc.)
2. S4 Ledger generates a SHA-256 hash of that record
3. The hash is anchored to the XRP Ledger via an XRPL Memo transaction
4. You receive an immutable XRPL transaction ID as proof
5. Anyone can verify the record's integrity at any time — no logins required
```

**Cost per anchor: 0.01 SLS** (our utility token on the XRP Ledger)

---

## The ILS Workspace — 14 Tools Included

Every subscription tier includes access to the full ILS Workspace:

| # | Tool | What It Does |
|---|------|-------------|
| 1 | **ILS Gap Analysis** | Upload DRLs, DI docs, provisioning data — get automated readiness scoring across all 12 ILS elements |
| 2 | **DMSMS Tracker** | Track obsolescence cases, at-risk parts, resolution costs, and anchor decisions per DoDI 4245.14 |
| 3 | **Readiness Calculator** | Calculate Ao, MTBF, MTTR, MLDT per MIL-STD-1390D — anchor results for milestone briefings |
| 4 | **ROI Calculator** | Quantify cost savings from S4 Ledger adoption — use in proposals and business case briefings |
| 5 | **Lifecycle Cost Estimator** | Estimate O&S costs across 20-year weapon system lifecycles |
| 6 | **Compliance Scorecard** | Real-time posture across CMMC Level 2, NIST 800-171, DFARS 252.204, FAR 46, MIL-STD-1388 |
| 7 | **Audit Record Vault** | Every record you stamp is saved here with its blockchain verification. Export for audits anytime |
| 8 | **Defense Document Library** | Searchable reference library of 100+ defense standards — MIL-STDs, regulations, instructions |
| 9 | **Supply Chain Risk Engine** | Automated supply chain risk scoring and mitigation recommendations |
| 10 | **Audit Report Generator** | One-click audit report generation with blockchain-verified evidence packages |
| 11 | **Predictive Maintenance AI** | Analyze patterns to predict when equipment will need maintenance before it fails |
| 12 | **Submissions & PTD** | AI-powered submission review — compares vendor data against baselines, flags discrepancies |
| 13 | **AI Agent** | LLM-powered assistant trained on all 12 ILS elements, 30+ defense systems, and 6 compliance frameworks |
| 14 | **SBOM Viewer** | Software Bill of Materials viewer for analyzing software component dependencies and known vulnerabilities |

> **Looking for parts cross-reference, contract tracking, provisioning, warranty management, scheduling, configuration management, or database import?** These tools are available in **HarborLink**, S4 Systems' companion collaboration portal.

**File upload support**: All tools accept CSV, XLSX, XLS, PDF, DOCX, and TXT files. Drag-and-drop enabled. All processing happens client-side — no classified data leaves your browser.

---

## Subscription Tiers

### Pilot — FREE
> *Try S4 Ledger with zero commitment. No credit card required.*

| Feature | Included |
|---------|----------|
| Monthly SLS allocation | 100 SLS |
| Anchoring capacity | Up to 10,000 anchors |
| XRPL wallet | Auto-provisioned |
| ILS Workspace | All 14 tools |
| AI Agent | Demo mode (local pattern matching) |
| SDK & REST API | Full access |
| Support | Community |

**Best for**: Individual engineers evaluating the platform, academic researchers, or small-scale proof-of-concept work.

---

### Starter — $999/month
> *For program offices and small contractors getting started with blockchain-backed ILS.*

| Feature | Included |
|---------|----------|
| Monthly SLS allocation | 25,000 SLS |
| Anchoring capacity | Up to 2,500,000 anchors |
| XRPL wallet | Auto-provisioned |
| ILS Workspace | All 14 tools |
| AI Agent | Full LLM access (cloud-backed) |
| SDK & REST API | Full access |
| Support | Email support |

**Best for**: Single-program offices, small defense contractors (< 200 employees), or organizations managing 1–3 active contracts.

**What 25,000 SLS gets you**: At 0.01 SLS per anchor, that's **2.5 million anchoring operations per month** — enough to anchor every CDRL delivery, parts transaction, readiness calculation, and compliance snapshot across multiple programs.

---

### Professional — $2,499/month ⭐ Most Popular
> *For multi-program organizations that need full-scale ILS automation with priority support.*

| Feature | Included |
|---------|----------|
| Monthly SLS allocation | 100,000 SLS |
| Anchoring capacity | Up to 10,000,000 anchors |
| XRPL wallet | Auto-provisioned |
| ILS Workspace | All 14 tools |
| AI Agent | Full LLM access (cloud-backed) |
| SDK & REST API | Full access |
| CDRL & supply chain modules | Included |
| Support | Priority support |

**Best for**: Mid-size defense contractors, NAVSEA/NAVAIR program offices, shipyards, and organizations managing 4–10 active programs.

**What 100,000 SLS gets you**: **10 million anchoring operations per month.** Enough for enterprise-scale operations with automated anchoring on every transaction.

---

### Enterprise — $9,999/month
> *For large defense primes, fleet commands, and organizations requiring dedicated infrastructure.*

| Feature | Included |
|---------|----------|
| Monthly SLS allocation | 500,000 SLS |
| Anchoring capacity | **Unlimited** |
| XRPL wallets | Dedicated wallets (multiple) |
| ILS Workspace | All 14 tools |
| AI Agent | Full LLM access (cloud-backed) |
| Custom integrations | Included |
| Volume SLS pricing | Available |
| Support | **Dedicated support + SLA** |

**Best for**: Defense primes (Lockheed Martin, Raytheon, HII, etc.), Type Commander staffs, major program executive offices (PEO Ships, PEO IWS, PEO Aviation), and multi-site deployments.

**What you get beyond Professional**: Unlimited anchoring, dedicated support with SLA guarantees, custom API integrations with your existing systems (SAP, Oracle, Windchill, etc.), and volume SLS pricing for high-throughput operations.

---

## What Every Subscription Includes

### 1. XRPL Wallet — Auto-Provisioned
When you subscribe, S4 Ledger automatically provisions a secp256k1 wallet on the XRP Ledger with:
- **SLS TrustLine** — connects your wallet to the SLS token issuer
- **SLS delivery** — your monthly SLS allocation is delivered from the S4 Treasury wallet
- **Xaman compatible** — import your seed into the Xaman mobile app for self-custody

### 2. SLS Token Delivery
SLS tokens are delivered directly from the S4 Systems Treasury wallet to your custodial wallet. There is no exchange, no DEX, no trading required. Your subscription fee covers everything.

### 3. Client-Side Security
All document processing happens in your browser. PDFs, spreadsheets, and Word documents are parsed locally using pdf.js, mammoth.js, and SheetJS. **No classified or CUI data is transmitted to S4 servers.** Only SHA-256 hashes are anchored to the XRPL.

### 4. AI Agent
The AI Agent is backed by enterprise LLM providers (Azure OpenAI for FedRAMP environments, plus OpenAI and Anthropic fallbacks). It understands:
- All 12 ILS elements (Maintenance Planning, Supply Support, PHS&T, Technical Data, Training, Support Equipment, Manpower & Personnel, Facilities, Configuration Management, Computer Resources, Packaging/Handling/Storage/Transportation, and Design Interface)
- 30+ defense acronyms and frameworks
- 24+ weapon system platforms
- CMMC, NIST, DFARS, ITAR compliance requirements

---

## How to Subscribe

### Step 1 — Create an Account
Visit [s4ledger.com/s4-login](https://s4ledger.com/s4-login/) and create your account with an email address.

### Step 2 — Choose Your Tier
Select the subscription tier that matches your organization's needs. Start with Pilot (free) if you want to evaluate first.

### Step 3 — Payment
Paid tiers are billed monthly via Stripe. Accepted: credit/debit cards, ACH transfers. Enterprise contracts available for wire transfer / purchase order billing.

### Step 4 — Wallet Provisioned
Upon subscription, your XRPL wallet is automatically created and funded with your monthly SLS allocation. You'll receive your wallet address and can optionally export your seed for self-custody.

### Step 5 — Start Anchoring
Open the ILS Workspace, upload your documents, run analyses, and anchor results to the XRP Ledger. Every anchor costs 0.01 SLS and creates an immutable record.

---

## Enterprise & Government Contracting

For organizations that require:
- **BAA (Business Associate Agreement)** — available upon request
- **FedRAMP-eligible hosting** — Azure OpenAI for AI Agent in FedRAMP environments
- **ITAR compliance** — all processing is client-side; no CUI leaves the browser
- **Custom integrations** — connect S4 Ledger to your existing PLM, ERP, or MES systems
- **On-premise deployment** — available for Enterprise tier (contact sales)
- **GSA Schedule / SEWP V** — in progress for government procurement vehicles

**Contact**: info@s4ledger.com | [s4ledger.com/s4-contact](https://s4ledger.com/s4-contact/)

---

## Frequently Asked Questions

**Q: Do I need to buy SLS tokens separately?**
No. SLS tokens are included with your subscription and delivered automatically from the S4 Treasury. There is no exchange or trading involved.

**Q: What happens if I run out of SLS?**
You can purchase additional SLS top-offs through the platform, or upgrade your subscription tier. SLS does not expire — unused tokens roll over.

**Q: Is my data safe?**
Yes. All document processing happens client-side in your browser. Only SHA-256 hashes (not the original data) are anchored to the XRPL. Hashes cannot be reversed to reveal the original content.

**Q: Can I downgrade or cancel?**
Yes. You can change tiers or cancel at any time. Existing anchored records remain on the XRPL permanently — they are immutable.

**Q: What file formats are supported?**
CSV, XLSX, XLS, PDF, DOCX, TXT, TSV, XML, and JSON. All are parsed client-side using open-source libraries (SheetJS, pdf.js, mammoth.js).

**Q: Do I need a CAC to use S4 Ledger?**
No. S4 Ledger is a commercial SaaS platform. For organizations that require CAC authentication, Enterprise tier includes custom SSO/IdP integration support.

---

© 2026 S4 Systems, LLC. Charleston, SC.


---

## v12 Feature Updates (2026-02-22)
All subscription tiers now include:
- SBOM Viewer with blockchain attestation
- AI Threat Intelligence Scoring
- Predictive Failure Timeline
- Digital Thread Traceability
- Zero-Trust Audit Watermark on exports
- Real-time Collaboration Indicators
- Access to 34 Navy programs
