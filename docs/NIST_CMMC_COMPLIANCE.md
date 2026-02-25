# NIST & CMMC Compliance Documentation

## Overview

S4 Ledger is designed to align with NIST SP 800-171 and CMMC Level 2 requirements. **S4 Systems, LLC is pursuing CMMC Level 2 certification.** The hash-only architecture ensures that no Controlled Unclassified Information (CUI), Covered Defense Information (CDI), or sensitive data is ever stored on-chain.

## Hash-Only Architecture

- **Data Minimization:** Only SHA-256 hashes are anchored to the XRP Ledger — never original data
- **Irreversibility:** SHA-256 hashes cannot be reversed to recover the source data
- **CUI Protection:** No CUI leaves the customer's network boundary
- **ITAR/EAR Safe:** No technical data is transmitted or stored on the blockchain

## NIST SP 800-171 Alignment

| Control Family | S4 Ledger Alignment |
|---|---|
| 3.1 Access Control | No CUI accessible — hash-only |
| 3.3 Audit & Accountability | Immutable, timestamped audit trail on XRPL |
| 3.4 Configuration Management | Configuration baseline anchoring |
| 3.5 Identification & Authentication | XRPL wallet-based authentication |
| 3.13 System & Communications Protection | TLS 1.3 encryption on all connections |
| 3.14 System & Information Integrity | Core service — integrity verification |

## CMMC Level 2 Alignment

S4 Systems, LLC is pursuing CMMC Level 2 certification. S4 Ledger provides the following CMMC-aligned controls:

- Immutable proof of record integrity (Practice AU.L2-3.3.1)
- Tamper-evident audit trails (Practice AU.L2-3.3.2)
- Configuration baseline verification (Practice CM.L2-3.4.1)
- Independent integrity verification using public ledger

## DFARS 252.204-7012

Since S4 Ledger does not receive, store, or process Covered Defense Information (CDI), DFARS CDI protection requirements do not apply to the hashed data on the XRP Ledger.

## Policy

- All contributors must follow the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md)
- For compliance inquiries: info@s4ledger.com


---

## v12 Compliance Updates (2026-02-22)

### SBOM Compliance (EO 14028)
S4 Ledger now includes native SBOM (Software Bill of Materials) viewing and management:
- Supports CycloneDX 1.5 and SPDX 2.3 formats
- Tracks embedded software components across weapon systems (firmware, RTOS, middleware, drivers, third-party libraries)
- CVE cross-referencing for vulnerability awareness
- **Blockchain attestation**: Each SBOM snapshot is SHA-256 hashed and anchored to XRPL for tamper-proof versioning
- Directly addresses CMMC Level 2 software supply chain security requirements

### Enhanced Audit Trail (NIST 800-171 3.3.1, 3.3.2)
- **Digital Thread Traceability**: Every record now shows complete provenance chain from source tool through blockchain verification
- **Zero-Trust Audit Watermark**: All exports include verification headers linking back to the blockchain anchor

### Supply Chain Risk Management (NIST 800-161)
- **AI Threat Intelligence Score**: Automated weighted analysis of supply chain vulnerabilities
- Tracks single-source dependencies, GIDEP alerts, lead time anomalies
- Composite scoring (0-100) with RED/AMBER/GREEN classification

