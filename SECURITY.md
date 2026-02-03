# Solus Protocol Security Policy

## 1. Introduction and Responsible Disclosure

At Solus Protocol, the security of our decentralized infrastructure, built on the XRP Ledger (XRPL), is paramount. We are committed to safeguarding the integrity, confidentiality, and availability of medical data through our protocol, which enables tamper-proof anchoring and patient-controlled access without exposing sensitive Protected Health Information (PHI). We recognize the vital role of the security research community in identifying potential vulnerabilities and appreciate ethical disclosures that help us enhance our system's robustness.

This policy outlines our approach to vulnerability reporting, scope, and commitments to researchers. By participating, you agree to follow these guidelines in good faith. Solus Protocol adheres to principles of responsible disclosure, ensuring that reported issues are addressed promptly while minimizing risks to users and stakeholders.

## 2. Reporting a Vulnerability

To maintain the highest standards of security and protect our users, **please do not disclose vulnerabilities publicly (e.g., via GitHub issues, social media, or forums) until we have had sufficient time to investigate and remediate.** Public disclosure before resolution may void safe harbor protections (see Section 5).

### Preferred Reporting Channels

Report vulnerabilities privately through one of the following secure methods:

**Email:** support@solusprotocol.com (preferred for detailed reports).

**PGP Encryption:** Use our PGP key for encrypted communications. [Link to PGP Key or Fingerprint: e.g., Fingerprint: ABCD 1234 5678 9ABC DEF0 1234 5678 9ABC DEF0] (available on our website or Keybase.io/solusprotocol).

**Subject Line:** Use "Vulnerability Report: [Brief Non-Sensitive Description]" to ensure priority handling.

If you require an alternative secure channel (e.g., Signal or encrypted platform), include your contact preferences in the initial email, and we will accommodate.

### What to Include in Your Report

To facilitate a swift and effective response, please provide as much detail as possible while avoiding the inclusion of sensitive data:

* **Description:** A clear, concise explanation of the vulnerability, including its type (e.g., buffer overflow, SQL injection, cryptographic weakness).
* **Reproduction Steps:** Step-by-step instructions to replicate the issue, including any proof-of-concept (PoC) code, scripts, or screenshots. Specify the environment (e.g., XRPL testnet/mainnet, SDK version, OS/browser).
* **Impact Assessment:** Potential consequences, such as data exposure, unauthorized access, denial of service, or financial loss. Quantify if possible (e.g., "Could allow tampering of hashed medical records").
* **Affected Components:** Identify specific parts of the protocol (e.g., hashing logic, XRPL memo fields, SDK encryption module).
* **Discovery Details:** How and when you found the issue (optional, but helpful for our internal review).
* **Supporting Files:** Attach non-sensitive files (e.g., PoC scripts) via encrypted zip if needed.

We encourage reports in English, but we can accommodate other languages with translation assistance.

### Confidentiality During Reporting

All reports are treated as confidential. We will not share your identity or report details without your explicit consent, except as required by law or to coordinate with trusted third parties (e.g., XRPL Foundation for ledger-related issues).

## 3. Scope

This policy applies to vulnerabilities in Solus Protocol's owned and operated components. We define "in-scope" and "out-of-scope" to focus efforts on high-impact areas.

### In-Scope Vulnerabilities

* Solus Core Protocol: Data anchoring logic, hashing mechanisms, and XRPL transaction handling.
* Solus API and Gateway Services: Endpoints for SDK integrations, including authentication and data verification.
* Smart Contracts/AMM Pools: Any deployed on XRPL, including $SLS token issuance and treasury management.
* SDK Prototype: Encryption, hashing, and XRPL interaction modules in this repository.
* Website and Documentation: Security flaws in solusprotocol.com or associated repos that could lead to data exposure.

Vulnerabilities must be novel (not previously known to us) and demonstrable in a controlled environment.

### Out-of-Scope Vulnerabilities

* Denial of Service (DoS/DDoS) attacks or resource exhaustion (report to XRPL if ledger-wide).
* Social engineering, phishing, or attacks targeting Solus employees/contractors.
* Vulnerabilities in third-party dependencies (e.g., underlying XRPL protocol—report to Ripple/XRPL Foundation).
* Issues in non-official forks or unrelated projects.
* Theoretical vulnerabilities without a practical exploit PoC.
* Spam, automated scanner outputs, or low-severity issues (e.g., self-XSS).
* Attacks requiring physical access to devices or insider privileges.

If unsure about scope, contact us for clarification before testing.

## 4. Response Process and Timeline

Upon receiving your report:

* **Acknowledgment:** We will confirm receipt within **48 hours** (business days) and assign a unique tracking ID.
* **Triage:** Our security team will evaluate the report within **5 business days,** assessing severity (using CVSS scoring) and reproducibility.
* **Investigation & Remediation:** We aim to provide an initial response on validity within **10 business days.** If confirmed, we'll share a remediation timeline (typically 30-90 days for high-severity issues).
* **Disclosure Coordination:** We support coordinated disclosure. Once fixed, we'll credit you (if desired) in release notes or advisories.
* **Updates:** You'll receive regular status updates. If no response in expected timeframes, follow up via the original channel.

Severity Levels (Guideline):
* **Critical/High:** Immediate threats to data integrity/privacy—prioritized fix within 30 days.
* **Medium/Low:** Non-exploitable or mitigated issues—fixed in next release cycle.

## 5. Our Commitment and Safe Harbor

If you comply with this policy and act in good faith:

* **Safe Harbor Guarantee:** We will not pursue civil or criminal action against you, nor involve law enforcement, provided you:Do not access, exfiltrate, or destroy actual user data.
  *Avoid disruptive testing (e.g., no DoS or production impacts).
  *Give us reasonable time (at least 90 days) to resolve before public disclosure.
  *Do not exploit for personal gain.

* **Public Credit:** With your permission, we'll acknowledge your contribution in our Hall of Fame or security advisories.
* **No Retaliation:** We value ethical researchers and commit to treating all reports professionally.

Violations of this policy (e.g., public disclosure without coordination) may result in disqualification from safe harbor.

## 6. Additional Resources

* **Testing Guidelines:** Use testnet environments only (e.g., XRPL testnet for SDK prototypes). Avoid mainnet or real data.
* **Contact for Questions:** For policy clarifications, email support@solusprotocol.com with "Security Policy Inquiry" in the subject.
* **Updates to Policy:** This policy may evolve; check the latest version on GitHub.

We thank the security community for helping make Solus Protocol more secure. Together, we're building a safer future for healthcare data.


