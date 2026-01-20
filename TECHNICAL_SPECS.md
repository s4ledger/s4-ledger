# Solus Protocol: Technical Specifications
**Architecture: Data Anchoring via XRP Ledger (XRPL)**

## 1. Hashing Algorithm
Solus uses **SHA-256** for all medical record fingerprints.
* **Input:** Normalized JSON or PDF binary of the EHR.
* **Output:** 64-character hexadecimal string.

## 2. XRPL Transaction Structure
Solus utilizes the `Memos` field in a standard XRPL transaction to anchor data.

```json
{
  "TransactionType": "Payment",
  "Account": "SOLUS_GATEWAY_ADDRESS",
  "Destination": "SOLUS_SINK_ADDRESS",
  "Amount": "1", 
  "Memos": [
    {
      "Memo": {
        "MemoType": "6865616c74682e616e63686f72", // HEX: "health.anchor"
        "MemoData": "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", // SHA-256 Hash
        "MemoFormat": "746578742f706c61696e" // HEX: "text/plain"
      }
    }
  ]
}
