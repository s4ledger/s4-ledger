# anchor_test.py
# This version works EVEN IF solus_sdk.py has the auto-running example at the bottom
# It overrides the bad hardcoded test_seed immediately after import

import solus_sdk
SolusSDK = solus_sdk.SolusSDK

# ────────────────────────────────────────────────
# YOUR REAL TESTNET SEED — PASTE THE FULL ONE HERE
# Instructions:
# 1. Go to https://testnet.xrpl.org/
# 2. Generate new credentials
# 3. Copy ONLY the family seed / secret (starts with sEd, usually exactly 51 characters)
# 4. Replace the line below — no extra spaces or line breaks!
# ────────────────────────────────────────────────
REAL_SEED = "sEdT9vPQ4QCA4TtDSZqAGTv9ABL2uLS"

# Debug check — run this to confirm before anything else crashes
print("=== SEED CHECK ===")
print(f"Length: {len(REAL_SEED)}   ← should be 51")
print(f"Prefix: {REAL_SEED[:5]}    ← should start with 'sEd'")
if len(REAL_SEED) != 51 or not REAL_SEED.startswith("sEd"):
    # Try to be flexible: attempt to construct a Wallet from the seed using the SDK.
    try:
        sdk_for_check = SolusSDK(testnet=True)
        sdk_for_check.wallet_from_seed(REAL_SEED)
        print("Seed failed basic length check but Wallet.from_seed succeeded → proceeding\n")
    except Exception as e:
        if not getattr(solus_sdk, 'XRPL_AVAILABLE', True):
            print("WARNING: Seed looks invalid/truncated, but XRPL package is not installed. Continuing with mock XRPL client for local testing.\n")
        else:
            print("ERROR: Seed is invalid or truncated and Wallet.from_seed failed:")
            print(e)
            exit(1)
else:
    print("Seed looks correct length & prefix → proceeding\n")

# (If desired) override any test seed inside the SDK module for example runs
solus_sdk.test_seed = REAL_SEED

# Now safe to use the SDK (import won't crash anymore)
sdk = SolusSDK(
    wallet_seed=REAL_SEED,   # also pass it normally for your own calls
    testnet=True
    # Optional: xrpl_rpc_url="https://s.altnet.rippletest.net:51234/",
    # api_key="valid_mock_key" if needed for fiat_mode
)

# Your patient record
fake_record = """Patient: John Doe
DOB: 1985-03-15
Visit: 2026-01-20
Diagnosis: Hypertension, mild
Notes: BP 145/92, prescribed Lisinopril 10mg daily
Allergies: None known
Follow-up: 2026-04-15
..."""

print("Running secure_patient_record with your real seed...")

try:
    result = sdk.secure_patient_record(
        record_text=fake_record,
        encrypt_first=False,
        fiat_mode=False   # change to True to test the simulated USD path
    )
    print("\nSuccess! Result:")
    print(result)
except Exception as e:
    print("\nExecution failed:")
    print(str(e))
    print("\nMost common fix if still 'Invalid checksum':")
    print("- Regenerate seed from faucet and paste FULL 51 chars")
    print("- Or edit solus_sdk.py → Wallet.from_seed(..., algorithm='ED25519')")