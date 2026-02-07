"""
Solus Protocol SDK — v2.8.0 Comprehensive Anchoring Test
Anchors 25 varied medical records to XRPL Testnet with record_type categorization.
Each scenario uses the store_hash_with_sls_fee memo format: RECORD_TYPE:sha256hash
"""

import time
import random
from solus_sdk import SolusSDK

sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
SEED = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"

scenarios = [
    # === Clinical ===
    {"name": "Annual Physical — Maria Lopez", "type": "VITALS",
     "record": "Patient: Maria Lopez | DOB: 1985-06-12 | BP: 122/78 | HR: 68bpm | Temp: 98.4F | SpO2: 99% | Weight: 145lbs | Height: 5'6\" | Provider: Dr. Patel | Date: 2026-02-08"},
    {"name": "Comprehensive Metabolic Panel", "type": "LAB_RESULTS",
     "record": "Patient: James Chen | CMP Results | Glucose: 94 mg/dL | BUN: 14 | Creatinine: 0.9 | Sodium: 140 | Potassium: 4.1 | Calcium: 9.6 | Total Protein: 7.2 | ALT: 22 | AST: 19 | Lab: Quest Diagnostics | Date: 2026-02-08"},
    {"name": "Knee MRI — Sports Injury", "type": "IMAGING",
     "record": "Patient: Tyler Brooks | MRI Left Knee | Findings: Partial ACL tear, grade 2 medial meniscus tear | Recommendation: Orthopedic consult for surgical evaluation | Radiologist: Dr. Kim | Date: 2026-02-08"},
    {"name": "Laparoscopic Appendectomy", "type": "SURGERY",
     "record": "Patient: Olivia Martinez | Surgery: Laparoscopic Appendectomy | Anesthesia: General | Duration: 38 min | EBL: 25mL | Complications: None | Disposition: Observation 23hr | Surgeon: Dr. Nakamura | Date: 2026-02-07"},
    {"name": "Amoxicillin Prescription", "type": "PRESCRIPTIONS",
     "record": "Patient: Daniel Foster | Rx: Amoxicillin 500mg | Sig: 1 cap PO TID x 10 days | Dx: Acute bacterial sinusitis | Allergies: NKDA | Pharmacy: Walgreens #4521 | Prescriber: Dr. Singh | Date: 2026-02-08"},
    {"name": "Progress Note — Diabetes F/U", "type": "CLINICAL_NOTES",
     "record": "Patient: Nancy Wu | Visit Type: Follow-up | Dx: Type 2 DM (E11.65) | A1C: 6.9% (improved from 7.4%) | Current Meds: Metformin 1000mg BID | Plan: Continue current regimen, recheck A1C in 3 months | Provider: Dr. Alvarez | Date: 2026-02-08"},

    # === Emergency & Acute ===
    {"name": "ER Visit — Laceration Repair", "type": "EMERGENCY",
     "record": "Patient: Kevin O'Brien | ED Visit | CC: Right hand laceration from kitchen knife | Exam: 4cm linear laceration, no tendon injury | Tx: 6 sutures, wound care, tetanus booster | Dispo: Home with f/u in 10 days | ED MD: Dr. Ramirez | Date: 2026-02-08"},
    {"name": "Hospital Discharge — Pneumonia", "type": "DISCHARGE",
     "record": "Patient: Gloria Hernandez | Discharge Summary | Admission: 2026-02-04 | Dx: Community-acquired pneumonia, left lower lobe | Tx: IV Ceftriaxone x 3 days, transitioned to PO Azithromycin | Discharge: Stable, afebrile x 48hr | F/U: PCP in 1 week | Date: 2026-02-08"},
    {"name": "Post-Op Day 2 — Hip Replacement", "type": "POST_OP",
     "record": "Patient: Richard Evans | Post-Op Day 2 | Surgery: Total Left Hip Arthroplasty | Pain: 4/10, well-controlled with Tylenol | PT: Ambulated 50 feet with walker | Wound: Clean, dry, intact | Plan: Continue PT, target discharge POD3 | Date: 2026-02-08"},

    # === Preventive & Chronic ===
    {"name": "Influenza Vaccine 2025-2026", "type": "IMMUNIZATION",
     "record": "Patient: Sophia Kim | Vaccine: Influenza (Quadrivalent) | Manufacturer: Sanofi Pasteur | Lot: UV4829 | Site: Left deltoid IM | VIS provided | Adverse reactions: None at 15 min observation | Admin: RN Taylor | Date: 2026-02-08"},
    {"name": "Annual Wellness Visit", "type": "PREVENTIVE_CARE",
     "record": "Patient: William Turner | Medicare Annual Wellness Visit | BMI: 28.3 | PHQ-2: 0/6 (negative) | Fall Risk: Low | Advance Directive: On file | Screenings due: Colonoscopy (age 50+), PSA discussed | Provider: Dr. Collins | Date: 2026-02-08"},
    {"name": "Asthma Management Plan", "type": "CHRONIC_CARE",
     "record": "Patient: Isabella Reyes | Dx: Persistent mild asthma (J45.30) | Controller: Fluticasone 110mcg 2 puffs BID | Rescue: Albuterol PRN | Peak Flow: 420 L/min (95% predicted) | Asthma Control Test: 22/25 (well-controlled) | Next review: 3 months | Date: 2026-02-08"},
    {"name": "Chronic Pain Care Plan", "type": "CARE_PLAN",
     "record": "Patient: George Mitchell | Care Plan: Chronic low back pain | Multimodal approach: PT 2x/week, NSAIDs PRN, CBT for pain coping | Opioid risk assessment: Low (ORT score 3) | Functional goals: Walk 30 min daily, return to gardening | Review: Monthly | Date: 2026-02-08"},

    # === Specialty ===
    {"name": "CBT Session Note", "type": "MENTAL_HEALTH",
     "record": "Patient: Ashley Cooper | Session 8/12 | Dx: Generalized Anxiety Disorder (F41.1) | GAD-7: 9 (mild, down from 16) | Focus: Cognitive restructuring of catastrophic thinking | Homework: Daily thought record, progressive muscle relaxation | Therapist: Dr. Huang | Date: 2026-02-08"},
    {"name": "Telehealth Dermatology Consult", "type": "TELEMEDICINE",
     "record": "Patient: Marcus Johnson | Telehealth Visit | CC: New mole on upper back | Assessment: 6mm irregularly bordered pigmented lesion | Plan: In-person visit for dermoscopy and possible biopsy within 2 weeks | Derm: Dr. Patel | Platform: Solus Protocol Telehealth | Date: 2026-02-08"},
    {"name": "Well-Child Check — 12 Months", "type": "PEDIATRIC",
     "record": "Patient: Baby Liam (12 months) | Well-Child Visit | Weight: 22 lbs (65th %ile) | Height: 30 in (55th %ile) | HC: 46.5 cm (70th %ile) | Milestones: Pulling to stand, 3 words, pincer grasp | Vaccines: MMR, Varicella, Hep A | Peds: Dr. Goodwin | Date: 2026-02-08"},
    {"name": "Allergy Testing Results", "type": "ALLERGIES",
     "record": "Patient: Sarah O'Connor | Allergy Panel (Skin Prick) | Positive: Dust mites (4+), Cat dander (3+), Timothy grass (2+) | Negative: Peanut, Tree nuts, Shellfish, Latex | Plan: Sublingual immunotherapy, HEPA filter at home | Allergist: Dr. Franklin | Date: 2026-02-08"},

    # === Administrative ===
    {"name": "Cardiology Referral", "type": "REFERRAL",
     "record": "Patient: Robert Yang | Referral: Cardiology | Reason: New onset AFib detected on routine ECG | Urgency: Priority (within 1 week) | Current Meds: Aspirin 81mg | Referring: Dr. Collins | Referred To: Dr. Vasquez, Heartcare Associates | Date: 2026-02-08"},
    {"name": "Surgical Consent Form", "type": "CONSENT",
     "record": "Patient: Patricia Adams | Consent for: Right Total Knee Arthroplasty | Risks discussed: Infection, DVT, nerve damage, implant failure | Alternatives discussed: Conservative management, partial knee | Patient verbalized understanding, signed consent | Witness: RN Davis | Date: 2026-02-08"},
    {"name": "Patient Portal Message", "type": "PATIENT_MESSAGE",
     "record": "Patient: Thomas Lee | Message to Dr. Alvarez | Subject: Medication side effects | Body: 'Doctor, since starting the Metformin I've been experiencing some stomach upset. Should I take it with food or switch to extended release?' | Status: Read, replied within 4 hours | Date: 2026-02-08"},
    {"name": "Insurance Pre-Authorization", "type": "ADMINISTRATIVE",
     "record": "Patient: Laura Diaz | Pre-Auth Request | Procedure: Lumbar MRI without contrast | Dx: Radiculopathy (M54.16) | Insurance: Blue Cross Blue Shield | Auth #: PA-2026-0208-4421 | Status: Approved | Valid through: 2026-03-10 | Date: 2026-02-08"},
    {"name": "Epic EHR Integration Log", "type": "EHR_INTEGRATION",
     "record": "System: Epic MyChart Integration | Event: Batch record sync | Records synced: 847 | Failed: 0 | Duration: 12.3s | API Key: solus_live_***3f7a | Endpoint: /api/v1/anchor/batch | Status: 200 OK | Timestamp: 2026-02-08T14:30:00Z"},

    # === Additional — Diverse scenarios ===
    {"name": "Echocardiogram Report", "type": "IMAGING",
     "record": "Patient: Frank Sullivan | Echo Report | EF: 58% (normal) | LV: Normal size and function | Valves: Mild mitral regurgitation | No pericardial effusion | Conclusion: Normal LV systolic function, mild MR | Cardio: Dr. Vasquez | Date: 2026-02-07"},
    {"name": "Hemoglobin A1C Trending", "type": "LAB_RESULTS",
     "record": "Patient: Angela Torres | A1C Trend | Feb 2025: 8.1% | May 2025: 7.6% | Aug 2025: 7.2% | Nov 2025: 6.9% | Feb 2026: 6.7% | Status: Consistent improvement | Target: <7.0% (achieved) | Provider: Dr. Alvarez | Date: 2026-02-08"},
    {"name": "COVID-19 Booster — 2026 Update", "type": "IMMUNIZATION",
     "record": "Patient: David Park | Vaccine: COVID-19 mRNA Booster (Updated 2025-2026) | Manufacturer: Moderna | Lot: 047C26A | Dose: 0.5 mL IM Left Deltoid | Prior doses: 4 | Observation 15 min: No adverse reaction | Admin: Pharmacist RPh | Date: 2026-02-08"},
]

def run_all():
    print("=" * 60)
    print("  SOLUS PROTOCOL v2.8.0 — COMPREHENSIVE ANCHORING TEST")
    print("  25 Medical Records → XRPL Testnet")
    print("=" * 60)

    success = 0
    failed = 0
    results = []

    for i, sc in enumerate(scenarios, 1):
        print(f"\n[{i:02d}/25] 🔗 {sc['type']}: {sc['name']}")
        try:
            result = sdk.secure_patient_record(
                sc["record"],
                SEED,
                encrypt_first=True,
                fiat_mode=False,
                record_type=sc["type"]
            )
            print(f"       ✅ Hash: {result['hash'][:40]}...")
            success += 1
            results.append({"scenario": sc["name"], "type": sc["type"], "hash": result["hash"], "status": "success"})
            # Small delay to avoid rate limiting
            time.sleep(1.2)
        except Exception as e:
            print(f"       ❌ Error: {e}")
            failed += 1
            results.append({"scenario": sc["name"], "type": sc["type"], "hash": None, "status": f"error: {e}"})
            time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"  RESULTS: {success}/25 anchored successfully | {failed} failed")
    print("=" * 60)

    # Summary by record type
    types = {}
    for r in results:
        types[r["type"]] = types.get(r["type"], 0) + (1 if r["status"] == "success" else 0)
    
    print("\n📊 Records by Type:")
    for t, count in sorted(types.items(), key=lambda x: -x[1]):
        print(f"   {t}: {count}")

    print(f"\n🌐 View metrics: https://solusprotocol.com/metrics.html")
    print(f"🔍 XRPL Explorer: https://testnet.xrpl.org/accounts/rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA")
    print(f"📱 Demo App: https://solusprotocol.vercel.app/demo-app/")

if __name__ == "__main__":
    run_all()
