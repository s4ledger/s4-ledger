# S4 Ledger — User Training Guide

> Everything you need to know to start using S4 Ledger. Written in plain English — no technical background required.

---

## What is S4 Ledger?

S4 Ledger is a tool that **proves your records haven't been changed**. Think of it like a notary for digital files — once you "stamp" a record, anyone can verify it's authentic.

It was built for defense and government teams who need to track parts, maintenance, deliverables, and compliance — and prove that nothing was altered after the fact.

**Key idea:** S4 Ledger doesn't store your actual data publicly. It creates a digital fingerprint (called a "hash") and saves that fingerprint on a secure public ledger. Only someone with the original record can match it.

---

## Getting Started

### Step 1 — Create Your Account

1. Go to **s4ledger.com/s4-login** and click **Create Account**
2. Fill in your **work email**, **organization**, and **password**
3. Pick a subscription plan:
   - **Pilot** (Free) — 100 SLS, good for 10,000 record stamps
   - **Starter** ($999/month) — 25,000 SLS, good for 2,500,000 stamps
   - **Professional** ($2,499/month) — 100,000 SLS, good for 10,000,000 stamps
   - **Enterprise** ($9,999/month) — 500,000 SLS, unlimited stamps
4. Click **Create Account & Wallet**

### Step 2 — What Happens Automatically

When you create your account, the system does three things for you behind the scenes:

1. **Creates a digital wallet** — This is your personal account on the XRPL network. Think of it like an online account number.
2. **Funds it with a small reserve** — A small amount is set aside to keep your wallet active (this is handled for you).
3. **Sets up your SLS connection** — Your wallet is linked to the SLS token so you can receive and use it.

You don't need to do any of this manually — it all happens in seconds when you sign up.

### Step 3 — Get SLS (Your Usage Credits)

SLS stands for **Secure Logistics Standard**. It's what powers every action you take on S4 Ledger — like fuel for the platform.

- Each time you stamp a record, it costs **0.01 SLS** (about one-hundredth of a penny)
- You get SLS through your subscription — the system buys it for you automatically
- **You never handle cryptocurrency directly** — you pay in dollars, and the system converts it for you behind the scenes

**How it works:** Your subscription payment (USD) is automatically converted to SLS through a secure exchange. The SLS is delivered straight to your wallet. You just use the platform — the conversion happens automatically.

---

## The 5 Main Tabs

When you open S4 Ledger, you'll see five tabs across the top. Here's what each one does:

---

### Tab 1 — Anchor (Stamp a Record)

**What it does:** Takes any text or record and creates a permanent, tamper-proof stamp on the blockchain.

**How to use it:**
1. Click the **Anchor** tab
2. Type or paste the record you want to stamp (examples below)
3. Pick a **Record Type** from the dropdown — like "Supply Chain," "Maintenance," or "Custody Transfer"
4. Click **Anchor to XRPL**
5. You'll see a confirmation with a link to verify it anytime

**Example records you might stamp:**
- "Part received: NSN 5340-01-123-4567, Qty 50, from DLA"
- "Maintenance completed: Engine overhaul, Hull 72"
- "Custody transfer: Lot AAE-2024-0847 to USS Gerald Ford"

**Why it matters:** Once stamped, nobody can change that record without it being obvious. If someone tries, the verification will show a mismatch. This is critical for audits, inspections, and accountability.

**Tip:** If your record contains sensitive information (like CUI or FOUO), toggle on **Encrypt First** before stamping. This encrypts the data before creating the fingerprint — extra protection.

---

### Tab 2 — Verify (Check a Record)

**What it does:** Proves that a record hasn't been changed since it was stamped.

**How to use it:**
1. Click the **Verify** tab
2. Paste the **exact original text** of the record
3. Enter the **transaction ID** you got when you first stamped it
4. Click **Verify**
5. You'll get one of two results:
   - **MATCH** — The record is authentic and hasn't been changed
   - **MISMATCH** — Something is different from the original

**Important:** Verification is character-exact. Even an extra space or different capitalization will show as a mismatch. This isn't a bug — it's a feature. It proves nothing was altered.

---

### Tab 3 — Transaction Log

**What it does:** Shows a history of everything you've stamped in the current session.

Each entry shows the time, type of record, the fingerprint (hash), a link to the transaction, and how much SLS was used. You can search, filter, and export the log as a spreadsheet.

---

### Tab 4 — ILS Workspace (14 Analysis Tools)

This is the powerhouse of S4 Ledger. It contains **14 specialized tools** designed for defense logistics professionals. Here's what each one does in plain English:

| # | Tool | What It Does |
|---|------|-------------|
| 1 | **Gap Analysis** | Upload your program documents (DRL spreadsheets, PDFs, Word docs). The system checks them against what's required and scores your coverage. It tells you exactly what's missing, what's critical, and what to fix first. |
| 2 | **Action Items** | Shows all the things that need attention — sorted by urgency (critical, warning, info) with cost estimates. |
| 3 | **DMSMS Checker** | Enter part numbers (NSNs) and find out if they're still being manufactured, at risk, or obsolete. Helps prevent supply problems. |
| 4 | **Readiness Calculator** | Plug in equipment reliability numbers and calculate how "available" your system will be. Uses standard DoD formulas. |
| 5 | **ROI Calculator** | Calculate how much money and time S4 Ledger saves your organization. Generates briefing-ready numbers. |
| 6 | **Lifecycle Cost** | Estimate the total cost of owning and maintaining a system over its entire life — from purchase through sustainment. |
| 7 | **Audit Vault** | Every record you stamp is saved here with its blockchain verification. Export for audits anytime. |
| 8 | **Document Library** | Searchable reference library of defense standards — MIL-STDs, regulations, instructions. |
| 9 | **Compliance Dashboard** | See your compliance score across NIST 800-171, CMMC, DFARS, and more. Letter grade for executives. |
| 10 | **Supply Chain Risk** | See which parts have single-source suppliers, geographic risks, or other vulnerabilities. |
| 11 | **Audit Reports** | Generate formal audit reports automatically — stamped to the blockchain for tamper-proof storage. |
| 12 | **Predictive Maintenance** | Analyze patterns to predict when equipment will need maintenance before it fails. |
| 13 | **ILIE** | AI-powered submission review — compares vendor data against baselines, flags discrepancies with severity ratings. |
| 14 | **SBOM Viewer** | Software Bill of Materials viewer — analyze software component dependencies and known vulnerabilities. |

> **Note:** Tools for parts cross-reference, contract tracking, provisioning, warranty management, scheduling, configuration management, and database import are available in **HarborLink**, S4 Systems' companion collaboration portal.

#### How Document Analysis Works

The system can read your actual files — spreadsheets, PDFs, and Word documents — and automatically:

- **Find what's there** — Scans for DI numbers, part numbers, deliverable titles
- **Find what's missing** — Compares your documents against what your program requires
- **Detect discrepancies** — When you upload multiple documents, it cross-references them to find conflicts, mismatches, or duplicate entries
- **Score your readiness** — Gives you a percentage score and letter grade showing how complete your program is
- **Generate action items** — Tells you exactly what to fix, in order of importance

**Real-world example:** Upload your DRL spreadsheet and your tech manual index. The system will automatically check if every required deliverable has a matching entry, flag any DI numbers that appear in one document but not the other, and highlight any descriptions that don't match.

#### The AI Assistant

Every tool page has a floating **AI Assistant** button in the bottom-right corner. Click it to ask questions in plain English:

- "What are my critical gaps?"
- "Draft a corrective action request"
- "Compare my documents for discrepancies"
- "What DI numbers am I missing?"
- "Explain what DMSMS means"
- "Suggest my next steps"

The assistant reads your analysis results and gives you specific answers based on your actual data — not generic responses.

---

### Tab 5 — My Wallet

**What it does:** Shows your account balance and subscription status.

You'll see:
- **SLS Balance** — How many SLS credits you have left
- **Usage Chart** — How you've been using the platform over time (toggle by hour, day, week, month, year)
- **Request SLS** — Request additional SLS from your Admin (Admin and Manager roles manage allocation)
- **Network** — Confirms you're on the live production network

**Who manages SLS:**
- **Admins and Leadership** — Full SLS allocation and management access
- **Program Managers** — Can manage allocations with approval limits
- **Standard Users** — Can use SLS but cannot manage allocations (this prevents unauthorized spending)

---

## How SLS Works (In Plain English)

SLS stands for **Secure Logistics Standard**. It's the "fuel" that powers every action on S4 Ledger.

- Each stamp costs **0.01 SLS** (about $0.0001)
- SLS is delivered from the S4 Treasury as part of your subscription
- Your plan allocation is refreshed automatically each billing cycle
- Every SLS delivery is recorded on the blockchain — fully auditable

**SLS is NOT:**
- An investment
- A stock or equity
- Something that can gain or lose value for you
- A security of any kind

**SLS IS:**
- A usage credit — like buying stamps at the post office
- Consumed when you use the platform
- Delivered as part of your subscription from the S4 Treasury
- Fully compliant with SEC and FinCEN regulations

---

## Security Tips

- **Never share your wallet seed** (secret key) — it controls your wallet like a password
- Store your seed in a secure place (password manager, safe, offline)
- Never put your seed in an email, chat, or shared document
- Use **Encrypt First** for any sensitive information before stamping
- Assign user roles carefully — not everyone needs admin access
- Review user access quarterly

---

## Frequently Asked Questions

**Q: Can I delete a stamped record?**
No — and that's by design. Stamped records are permanent. If you need to correct something, you create a new "correction" record. Both the original and the correction stay on the ledger, creating a complete audit trail.

**Q: What if verification shows MISMATCH?**
It doesn't always mean tampering. Even an extra space or different line ending will cause a mismatch. Make sure the text is exactly identical to what was originally stamped — character for character.

**Q: Can I use S4 Ledger for classified data?**
Use "Encrypt First" for CUI and FOUO. For classified data, consult your security officer. The fingerprint itself reveals nothing about the content, but your organization's policies still apply.

**Q: What file types can I upload?**
CSV, Excel (XLSX/XLS), PDF, Word (DOCX), TXT, and TSV files. The system reads and analyzes the content automatically.

**Q: How do I get more SLS?**
Ask your Admin or Program Manager to request additional allocation through the Wallet tab. Or upgrade your subscription plan for a higher monthly SLS allowance.

**Q: Can other people see my records?**
They can see that a transaction happened and see the fingerprint, but the fingerprint reveals nothing about the original content. Only someone with the original text can verify it.

**Q: What are the 24+ supported DoD databases?**
NSERC-IDE, MERLIN, NAVAIR AMS-PMT, COMPASS, CDMD-OA, NDE, MBPS, PEO-MLB, CSPT, GCSS, DPAS, DLA/FLIS, NAVSUP, GCSS-Army, LMP, AESIP, REMIS, LIMS-EV, D200A, GCSS-MC, ATLASS, ALMIS, CG-ONE, USSF-LMS, PIEE.

---

## Need Help?

- **Email:** support@s4ledger.com
- **Website:** s4ledger.com/s4-contact
- **SDK Documentation:** s4ledger.com/sdk

---

*S4 Ledger v5.2.0 | S4 Systems, LLC. SLS (Secure Logistics Standard) is a utility token delivered as part of your subscription — not equity or an investment.*


---

## v12 New Features Training (2026-02-22)

### SBOM Viewer
1. Navigate to Anchor-S4 → SBOM Viewer
2. Select a platform from the dropdown
3. Click "Scan Components" to load software components
4. Review CVE status and severity for each component
5. Export in CycloneDX or SPDX format
6. Click "Anchor SBOM to XRPL" to create blockchain attestation

### AI Threat Intelligence
- Automatically appears in Supply Chain Risk Engine after loading risk data
- Shows composite threat score (0-100) with RED/AMBER/GREEN classification
- Tracks single-source dependencies, GIDEP alerts, and lead time spikes

### Digital Thread
- In Audit Vault, click the purple thread icon on any record
- Shows complete provenance chain from source through verification

### Failure Timeline
- In Predictive Maintenance, run predictions to see 12-month forecast
- Stacked bar chart shows predicted failures by severity per month
