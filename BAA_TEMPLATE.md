# S4 Ledger — Defense Data Integrity Agreement (DDIA)

**Template — Version 1.0**

---

## Purpose

This Defense Data Integrity Agreement (DDIA) establishes the terms under which S4 Ledger provides hash-based integrity verification services for defense logistics data. This template is intended for use between S4 Ledger (the "Service Provider") and defense contractors, government agencies, or their authorized representatives (the "Customer").

---

## 1. Service Description

S4 Ledger provides **hash anchoring services** for defense logistics records, including but not limited to:

- Supply chain records (receipts, certificates of conformance, chain of custody)
- Maintenance records (3-M, SCLSIS, MRC completions, inspection results)
- Technical data packages (TDP revisions, engineering drawings)
- Contract deliverables (CDRLs, DIDs, SOW documentation)
- Configuration baselines (hardware/software configuration items)
- Audit artifacts (inspection reports, compliance evidence)

---

## 2. Data Handling

### 2.1 Hash-Only Architecture

S4 Ledger processes **only SHA-256 hashes** of Customer data. At no point does S4 Ledger:

- Receive, store, process, or transmit the original data
- Access Customer systems or databases directly
- Retain any information from which original data can be derived

### 2.2 What Is Anchored

| Stored On-Chain | NOT Stored Anywhere |
|---|---|
| 64-character SHA-256 hash | Original documents or files |
| XRPL transaction timestamp | Part numbers, NSNs, serial numbers |
| Transaction metadata (record type, non-sensitive tags) | Personnel names, SSNs, PII |
| | Contract dollar amounts |
| | Classified or CUI-marked content |
| | ITAR/EAR-controlled technical data |

### 2.3 Hash Generation

Hashing is performed **on the Customer's infrastructure** using the S4 Ledger SDK. The hash is generated locally before any data leaves the Customer's network boundary. Only the resulting 64-character hash string is transmitted to the XRP Ledger.

---

## 3. Controlled Unclassified Information (CUI)

### 3.1 CUI Handling

S4 Ledger's hash-only architecture ensures that **no CUI is stored, processed, or transmitted** by the service. SHA-256 hashes are irreversible — the original data cannot be recovered from the hash.

### 3.2 NIST 800-171 Alignment

S4 Ledger's architecture aligns with NIST SP 800-171 requirements for CUI protection:

| NIST 800-171 Family | S4 Ledger Alignment |
|---|---|
| Access Control (3.1) | No CUI accessible — hash-only |
| Audit & Accountability (3.3) | Provides immutable audit trail |
| Configuration Management (3.4) | Anchors baseline integrity |
| Identification & Authentication (3.5) | XRPL wallet-based authentication |
| System & Communications Protection (3.13) | TLS 1.3 for all transmissions |
| System & Information Integrity (3.14) | Core service — integrity verification |

### 3.3 CMMC Compatibility

S4 Ledger is designed to be compatible with CMMC Level 2+ environments. The service supplements, rather than replaces, a Customer's CMMC compliance posture.

---

## 4. DFARS 252.204-7012 Compliance

Since S4 Ledger does not receive, store, or process Covered Defense Information (CDI), the DFARS clause requirements for CDI protection do not apply to the hashed data on the XRP Ledger. Customers remain responsible for protecting CDI within their own systems.

---

## 5. ITAR / EAR Considerations

### 5.1 No Technical Data On-Chain

S4 Ledger does not transmit, store, or make accessible any technical data as defined under the International Traffic in Arms Regulations (ITAR, 22 CFR 120-130) or the Export Administration Regulations (EAR, 15 CFR 730-774).

### 5.2 Customer Responsibility

Customers are responsible for ensuring that:

- Only SHA-256 hashes are submitted to the S4 Ledger SDK
- No ITAR/EAR-controlled data is included in transaction memo fields
- Hash generation occurs within appropriately controlled environments

---

## 6. Classification

### 6.1 No Classified Data

S4 Ledger is designed for **unclassified** defense logistics data only. This service **must not** be used to hash, anchor, or verify:

- Classified information at any level (CONFIDENTIAL, SECRET, TOP SECRET, SCI)
- Classified system configurations or architectures
- Any data requiring protection under DoW 5200.01

### 6.2 Customer Obligation

The Customer warrants that no classified data will be processed through the S4 Ledger service.

---

## 7. Data Retention

| Data Type | Retention | Location |
|---|---|---|
| XRPL transaction hashes | Permanent (immutable) | XRP Ledger (public) |
| Customer account information | Duration of agreement + 1 year | S4 Ledger systems |
| Original data / documents | Not applicable | Customer systems only |
| SDK usage logs | 90 days | Customer's local environment |

---

## 8. Incident Response

In the event of a security incident affecting S4 Ledger systems:

1. **Detection & Containment:** Within 1 hour of discovery
2. **Customer Notification:** Within 24 hours
3. **Impact Assessment:** Within 72 hours
4. **Remediation Plan:** Within 7 days
5. **Post-Incident Report:** Within 30 days

Note: Since S4 Ledger does not hold Customer data, the impact scope of any incident is limited to service availability, not data exposure.

---

## 9. Term & Termination

### 9.1 Term

This Agreement is effective for [______] months from the date of execution, with automatic renewal unless either party provides 30 days' written notice.

### 9.2 Effect of Termination

Upon termination:

- Customer's SDK access keys are deactivated
- No data deletion is required (hashes on XRPL are permanent and non-sensitive)
- Customer retains the ability to independently verify any previously anchored records using any XRPL node or explorer

---

## 10. Liability & Warranty

### 10.1 Service Warranty

S4 Ledger warrants that:

- Hashes will be anchored to the XRP Ledger accurately
- The SDK will generate SHA-256 hashes consistent with NIST FIPS 180-4
- All transmissions will use TLS 1.3 encryption

### 10.2 Limitation of Liability

S4 Ledger's total liability under this Agreement shall not exceed the fees paid by Customer in the 12 months preceding the claim.

### 10.3 XRPL Disclaimer

S4 Ledger does not control the XRP Ledger network. While the XRPL has maintained 99.99%+ uptime since 2012, S4 Ledger cannot guarantee XRPL availability.

---

## 11. Governing Law

This Agreement shall be governed by the laws of the State of South Carolina, United States of America.

---

## Signatures

| Role | Name | Signature | Date |
|---|---|---|---|
| **S4 Ledger Representative** | _________________ | _________________ | ________ |
| **Customer Representative** | _________________ | _________________ | ________ |
| **Customer ISSO / Security** | _________________ | _________________ | ________ |

---

**S4 Ledger**  
Charleston, SC  
info@s4ledger.com  
https://s4ledger.com

---

© 2026 S4 Ledger. All rights reserved.
