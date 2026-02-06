import requests
from solus_sdk import SolusSDK

# --- User Inputs ---
# Paste the encrypted record (as stored or from log)
encrypted_text = "<PASTE_ENCRYPTED_TEXT_HERE>"
# Paste the transaction hash from the log or explorer
tx_hash = "<PASTE_TX_HASH_HERE>"
# Your wallet seed (for decryption)
wallet_seed = "<PASTE_YOUR_SEED_HERE>"

# --- Decrypt and Hash ---
sdk = SolusSDK(wallet_seed=wallet_seed, testnet=True)
decrypted = sdk.decrypt(encrypted_text)
recomputed_hash = sdk.create_record_hash(decrypted)
print("Decrypted record:\n", decrypted)
print("Recomputed SHA-256 hash:", recomputed_hash.upper())

# --- Fetch Memo from XRPL Testnet ---
url = f"https://testnet.xrpl.org/api/v1/transactions/{tx_hash}"
resp = requests.get(url)
data = resp.json()

# Find memo (hex) in transaction
try:
    memos = data['transaction']['Memos']
    memo_hex = memos[0]['Memo']['MemoData']
    print("Memo from XRPL (hex):", memo_hex)
    if memo_hex.upper() == recomputed_hash.upper():
        print("\n✅ Record verified: Hash matches XRPL memo!")
    else:
        print("\n❌ Verification failed: Hash does not match memo.")
except Exception as e:
    print("Could not fetch or parse memo from XRPL transaction:", e)
