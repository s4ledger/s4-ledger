#!/usr/bin/env python3
"""Run test scenarios with delays to populate metrics dashboard"""

from solus_sdk import SolusSDK
import time

sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    ("Vitals Check 1", "Patient: Jane Smith | Vitals: BP 120/80, HR 72, Temp 98.6F | Visit: 2026-02-06 14:30"),
    ("Lab Results 1", "Patient: John Doe | Lab: CBC Complete | WBC 6.8, RBC 4.9, Hemoglobin 14.5 | Status: Normal"),
    ("Post-Op Recovery", "Patient: Maria Garcia | Post-Op Day 2 | Surgery: Knee Replacement | Recovery: Good"),
    ("MRI Imaging", "Patient: Robert Chen | MRI Brain Scan | Findings: No abnormalities | Date: 2026-02-06"),
    ("Discharge Note", "Patient: Emily Wilson | Discharged | Reason: Pneumonia resolved | Follow-up: 2 weeks"),
    ("Mental Health Eval", "Patient: David Lee | Mental Health Assessment | Diagnosis: Anxiety | Therapy recommended"),
    ("Emergency Visit", "Patient: Sarah Brown | Emergency Room | Chest pain workup | Cardiac negative | Discharged"),
    ("Prescription Rx", "Patient: Mike Johnson | Prescription: Metformin 500mg | Diabetes management | Pharmacy: Walgreens"),
    ("Surgery Report", "Patient: Lisa Anderson | Surgery: Laparoscopic Appendectomy | Duration: 45 min | Success"),
    ("Telemedicine Call", "Patient: Kevin Thomas | Telemedicine Visit | Skin rash evaluation | Prescribed: Hydrocortisone"),
    ("Pediatric Vaccine", "Patient: Baby Emma (6mo) | Pediatric Visit | Vaccination: DTaP, HepB | No reaction"),
    ("X-Ray Report", "Patient: Chris White | X-Ray Chest PA | Findings: Clear lung fields | No acute disease"),
]

print("=" * 60)
print("SOLUS PROTOCOL - RUNNING TEST SCENARIOS")
print("=" * 60)
print(f"Total scenarios: {len(scenarios)}")
print("Delay between scenarios: 30 seconds")
print("=" * 60)

for i, (name, record) in enumerate(scenarios):
    print(f"\n[{i+1}/{len(scenarios)}] Anchoring: {name}")
    try:
        result = sdk.secure_patient_record(record, test_seed, encrypt_first=True, fiat_mode=False)
        print(f"  SUCCESS: {result['hash'][:32]}...")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    if i < len(scenarios) - 1:
        print(f"  Waiting 30 seconds before next scenario...")
        time.sleep(30)

print("\n" + "=" * 60)
print("ALL SCENARIOS COMPLETE!")
print("View metrics at: https://solusprotocol.com/metrics.html")
print("=" * 60)
