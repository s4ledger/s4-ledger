from solus_sdk import SolusSDK
sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
test_record = "Patient: John Doe\nVitals: BP 120/80\nVisit: 2026-02-06\nDiagnosis: Hypertension"
test_seed = "sEd75GpyfXbSLGUShjwvViXoo6xaGuZ"
result = sdk.secure_patient_record(test_record, test_seed, encrypt_first=True, fiat_mode=False)
print(result)