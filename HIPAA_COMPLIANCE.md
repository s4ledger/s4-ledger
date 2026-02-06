# HIPAA Compliance Documentation

## Overview
Solus Protocol is designed to support HIPAA compliance by ensuring that no Protected Health Information (PHI) is ever stored on-chain. All sensitive data is encrypted off-chain, and only SHA-256 hashes (fingerprints) are anchored to the XRPL.

## Key Safeguards
- **Data Minimization:** Only hashes of records are stored on-chain; no PHI is ever exposed.
- **Encryption:** All PHI is encrypted using strong symmetric encryption (Fernet/AES-256) before any processing or anchoring.
- **Access Controls:** Only authorized users with the correct wallet seed/encryption key can decrypt records.
- **Audit Trails:** All anchoring events are logged and can be independently verified on the XRPL.
- **Breach Notification:** Any suspected breach will be disclosed in accordance with HIPAA requirements.

## Technical Safeguards
- End-to-end encryption for all PHI.
- No PHI in logs, memos, or on-chain data.
- Deterministic encryption key derived from wallet seed for reproducibility and auditability.

## Policy
- All contributors and users must follow the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md).
- For full HIPAA policy and BAA requests, contact: support@solusprotocol.com
