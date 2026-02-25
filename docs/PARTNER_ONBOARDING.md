# S4 Ledger Partner Onboarding Guide

## Step-by-Step Integration

1. **Contact** info@s4ledger.com to initiate partnership discussion
2. **Sign DDIA** — Defense Data Integrity Agreement (template: [BAA_TEMPLATE.md](BAA_TEMPLATE.md))
3. **Set up XRPL wallet** and $SLS trustline
4. **Install S4 Ledger SDK:**
   ```bash
   pip install s4-ledger-sdk
   ```
5. **Integrate into your system** — Anchor hashes from your logistics, maintenance, or supply chain records:
   ```python
   from s4_sdk import S4Ledger
   ledger = S4Ledger(wallet_seed="sYourXRPLSecret")
   result = ledger.anchor_hash(
       data="your_record_data",
       record_type="supply_chain_receipt"
   )
   ```
6. **Configure webhooks** for anchor confirmation notifications (optional)
7. **Verify records** against the XRPL at any time

## Integration Targets

| System | Integration Method |
|---|---|
| GCSS-MC | SDK + file export anchoring |
| DPAS | SDK + API bridge |
| 3-M / SCLSIS | SDK + MRC completion anchoring |
| Contractor ERP | SDK + REST API (Phase 4) |
| CDMD-OA | SDK + configuration baseline anchoring |

## API Access (Live — 65 endpoints)

- REST API with key-based authentication
- Tier-based rate limits (1K / 10K / 100K anchors per month)
- Batch endpoints for high-volume operations
- Webhook notifications

## Support

For onboarding help: info@s4ledger.com | [s4ledger.com](https://s4ledger.com)


---

## v12 Partner Update (2026-02-22)
- Platform now includes 14 ILS tools (added SBOM Viewer)
- 34 Navy programs available for partner evaluation
- AI Threat Scoring and Failure Timeline enhance risk management demos
- Zero-Trust Audit Watermark on all exports strengthens compliance positioning
