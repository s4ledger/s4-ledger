import hashlib

fake_record = """
Patient ID: FAKE-PAT-00001
Name: Alex Testperson
DOB: 1995-03-15
Provider: Test Clinic XYZ
Date: 2026-02-05
Diagnosis: Routine wellness check - all clear
Blood Pressure: 118/76
Notes: No medications, exercise daily.
"""

record_bytes = fake_record.encode('utf-8')
hash_obj = hashlib.sha256(record_bytes)
record_hash = hash_obj.hexdigest()

print("Record Hash:", record_hash)