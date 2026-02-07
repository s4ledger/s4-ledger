#!/usr/bin/env python3
"""Simple test with 5 diverse record types"""

from solus_sdk import SolusSDK
import time
import sys

sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    ("Surgery", "SURGERY", "Appendectomy performed by Dr. Chen"),
    ("Lab", "LAB", "Blood panel results - all normal"),
    ("Patient Message", "PATIENT_MESSAGE", "Secure message from patient portal"),
    ("Epic EHR", "EPIC", "Epic MyChart integrated record"),
    ("Emergency", "EMERGENCY", "ER visit - patient stable"),
]

print("Testing 5 diverse record types...")
print("=" * 50)

success = 0
for i, (name, record_type, text) in enumerate(scenarios):
    print(f"[{i+1}/5] {name}...", end=" ", flush=True)
    try:
        result = sdk.secure_patient_record(text, wallet_seed=test_seed, record_type=record_type)
        if "tesSUCCESS" in str(result):
            print("SUCCESS")
            success += 1
        else:
            print("FAILED")
    except Exception as e:
        print(f"ERROR: {e}")
    
    if i < len(scenarios) - 1:
        time.sleep(8)  # 8 second delay

print("=" * 50)
print(f"Result: {success}/5 succeeded")
