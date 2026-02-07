#!/usr/bin/env python3
"""Quick test script with longer delays between transactions"""

from solus_sdk import SolusSDK
import time

sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    ("Surgery", "SURGERY", "Hip replacement surgery - Dr. Chen"),
    ("Vitals", "VITALS", "BP 120/80 HR 72 SpO2 99%"),
    ("Lab", "LAB", "CBC Blood test complete"),
    ("Allergy", "ALLERGY", "Penicillin allergy CRITICAL"),
    ("Imaging", "IMAGING", "MRI Brain scan results"),
    ("Patient Message", "PATIENT_MESSAGE", "Patient portal secure message"),
    ("Epic EHR", "EPIC", "Epic MyChart integration"),
    ("Prescription", "PRESCRIPTION", "Lisinopril 10mg prescribed"),
    ("Discharge", "DISCHARGE", "Patient discharged stable"),
    ("Emergency", "EMERGENCY", "ER visit - chest pain eval"),
]

print("=" * 60)
print("Solus Protocol - Quick Typed Scenarios Test")
print("=" * 60)

success = 0
failed = 0

for i, (name, record_type, text) in enumerate(scenarios, 1):
    print(f"\n[{i}/10] {name} ({record_type})...")
    try:
        result = sdk.secure_patient_record(text, wallet_seed=test_seed, record_type=record_type)
        if "tesSUCCESS" in str(result):
            print(f"  SUCCESS - Hash: {result['hash'][:16]}...")
            success += 1
        else:
            print(f"  FAILED - {result}")
            failed += 1
    except Exception as e:
        print(f"  ERROR - {e}")
        failed += 1
    
    # Longer delay to avoid ledger timing issues
    if i < len(scenarios):
        print("  Waiting 6 seconds...")
        time.sleep(6)

print("\n" + "=" * 60)
print(f"RESULTS: {success} succeeded, {failed} failed")
print("=" * 60)
