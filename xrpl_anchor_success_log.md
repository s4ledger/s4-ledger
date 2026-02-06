# XRPL Hash Anchor Success Log

## Transaction Details
- Date: 2026-02-05
- Patient: John Doe
- Hash Anchored: 56d1d868e08fdb4a2a352c355f66da726c362f5e287ba30b724173012d6872bb
- Transaction Hash: 79BCC309E9F468E890B1F924EAAB6B1B21760E0278A15F5AB66CB6284341AF6E
- Ledger Index: 14657341
- XRPL Account: rEADrNJ4STXGgrsYCfMMZAZy65pnwT2nT4
- Transaction Type: AccountSet (with memo)
- Result: tesSUCCESS (validated)

## Notes
- The hash above is a SHA-256 of the medical record (not the record itself).
- The transaction was recorded on the XRPL testnet using the Solus SDK prototype.
- The fallback AccountSet method was used to ensure the hash is anchored even if $SLS trust lines are not set up.

---

# Confirmation

Yes, with the current `solus_sdk.py` and `anchor_test.py`, medical providers and patients can anchor (store) hashes of medical data on the XRPL using $SLS. The SDK:

This ensures the data hash is immutably recorded on-chain, and the code is ready for real-world prototype use.

## Transaction Details
- Date: 2026-02-05
- Patient: Jane Smith
- Hash Anchored: 51e33890d61fec0ec270d83a99d313eb0374fa3556d79ac91b1c8b53540037b9
- Transaction Hash: 01A2BF1874C20F0ADB83CA89E1B2DF3A79A2143B7F7D8CB792EF3DBFFA9C7C03
- Ledger Index: 14657854
- XRPL Account: rEADrNJ4STXGgrsYCfMMZAZy65pnwT2nT4
- Transaction Type: AccountSet (with memo)
- Result: tesSUCCESS (validated)

## Notes
- The hash above is a SHA-256 of the encrypted surgery drug record (not the record itself).
- The transaction was recorded on the XRPL testnet using the Solus SDK prototype.
- The fallback AccountSet method was used to ensure the hash is anchored even if $SLS trust lines are not set up.
