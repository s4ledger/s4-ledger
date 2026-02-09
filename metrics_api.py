import xrpl
import xrpl.clients
import xrpl.models.requests
import datetime
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

XRPL_TESTNET_ACCOUNT = "rJPqcx8wUBM58ajPUoz1dReKkTT6hqrqJA"
XRPL_TESTNET_URL = "https://s.altnet.rippletest.net:51234/"

@app.route('/')
def home():
    return '<h1>Solus Protocol Metrics API</h1><p><a href="/metrics">/metrics</a> | <a href="/transactions">/transactions</a></p>'

def categorize_record(memo_data):
    """Categorize medical records - covers all global healthcare record types.
    
    First checks for explicit record_type prefix (e.g., 'SURGERY:hash...'),
    then falls back to keyword matching for legacy records.
    """
    # Check for explicit record_type prefix (new SDK format: RECORD_TYPE:hash)
    # Also handles SVCN format: solus:TYPE:HASH and solus:TYPE:SUBTYPE:HASH
    if ':' in memo_data and len(memo_data.split(':')[0]) < 30:
        parts = memo_data.split(':')
        explicit_type = parts[0].upper()
        # If prefix is SOLUS (protocol marker), use the second/third segments as the type
        if explicit_type == 'SOLUS' and len(parts) >= 3:
            # Handle multi-segment types: solus:consent:grant:HASH → CONSENT_GRANT
            if len(parts) >= 4 and len(parts[2]) < 30:
                explicit_type = (parts[1] + '_' + parts[2]).upper()
            else:
                explicit_type = parts[1].upper()
        # Map explicit types to display names (keep underscores for matching)
        type_map = {
            'SURGERY': 'Surgery',
            'VITALS': 'Vitals',
            'LAB': 'Lab Results',
            'LAB_RESULTS': 'Lab Results',
            'IMAGING': 'Imaging',
            'ALLERGY': 'Allergies',
            'ALLERGIES': 'Allergies',
            'PRESCRIPTION': 'Prescription',
            'RX': 'Prescription',
            'IMMUNIZATION': 'Immunization',
            'VACCINE': 'Immunization',
            'PATIENT_MESSAGE': 'Patient Message',
            'MESSAGE': 'Patient Message',
            'SECURE_MESSAGE': 'Secure Message',
            'URGENT_MESSAGE': 'Secure Message',
            'CLINICAL_NOTE': 'Clinical Notes',
            'CLINICAL NOTES': 'Clinical Notes',
            'NOTES': 'Clinical Notes',
            'DISCHARGE': 'Discharge',
            'EMERGENCY': 'Emergency',
            'ER': 'Emergency',
            'MENTAL_HEALTH': 'Mental Health',
            'THERAPY': 'Mental Health',
            'REFERRAL': 'Referral',
            'CONSULT': 'Referral',
            'CARE_PLAN': 'Care Plan',
            'CONSENT': 'Consent',
            'CONSENT_GRANT': 'Consent',
            'CONSENT_REVOKE': 'Consent',
            'EPIC': 'EHR Integration',
            'ORACLE_HEALTH': 'EHR Integration',
            'CERNER': 'EHR Integration',
            'MEDITECH': 'EHR Integration',
            'EHR': 'EHR Integration',
            'EHR_EVENT': 'EHR Integration',
            'TELEMEDICINE': 'Telemedicine',
            'TELEHEALTH': 'Telemedicine',
            'PEDIATRIC': 'Pediatric',
            'MATERNAL': 'Pediatric',
            'POST_OP': 'Post-Op',
            'POSTOP': 'Post-Op',
            'CHRONIC': 'Chronic Care',
            'CHRONIC_CARE': 'Chronic Care',
            'PREVENTIVE': 'Preventive',
            'WELLNESS': 'Preventive',
            'ADMIN': 'Administrative',
            # SVCN Care Network record types
            'CARE_HANDOFF': 'Care Handoff',
            'HANDOFF': 'Care Handoff',
            'WEARABLE_ANOMALY': 'Wearable Anomaly',
            'ANOMALY': 'Wearable Anomaly',
            'FEDERATED_BATCH': 'Federated Batch',
            'BATCH': 'Federated Batch',
            'BACKUP_EXPORT': 'Backup & Recovery',
            'BACKUP_VERIFY': 'Backup & Recovery',
            'BACKUP': 'Backup & Recovery',
            # Solus Protocol EHR record types
            'EHR_RECORD': 'EHR Record',
            'EHR_UPDATE': 'EHR Update',
            'EHR_QUERY': 'EHR Query',
            'EHR_TRANSFER': 'EHR Transfer',
            'EHR_IMPORT': 'EHR Import',
            'FHIR_IMPORT': 'EHR Import',
            'SCHEDULING': 'Scheduling',
            'BILLING': 'Billing',
        }
        if explicit_type in type_map:
            return type_map[explicit_type]
    
    # Fall back to keyword matching for legacy records
    memo_lower = memo_data.lower()
    
    # Vitals & Measurements
    if any(kw in memo_lower for kw in ["vitals", "bp", "blood pressure", "heart rate", "temperature", "pulse", "oxygen", "spo2", "weight", "height", "bmi"]):
        return "Vitals"
    
    # Laboratory
    elif any(kw in memo_lower for kw in ["lab", "blood test", "urinalysis", "biopsy", "pathology", "cbc", "hemoglobin", "glucose", "cholesterol", "lipid", "metabolic panel", "culture", "specimen"]):
        return "Lab Results"
    
    # Imaging & Radiology
    elif any(kw in memo_lower for kw in ["imaging", "mri", "ct scan", "x-ray", "xray", "ultrasound", "radiology", "mammogram", "pet scan", "echocardiogram", "echo", "ekg", "ecg", "sonogram"]):
        return "Imaging"
    
    # Surgery & Procedures
    elif any(kw in memo_lower for kw in ["surgery", "operation", "procedure", "anesthesia", "surgical", "laparoscopic", "biopsy procedure", "endoscopy", "colonoscopy", "arthroscopy"]):
        return "Surgery"
    
    # Post-Op & Recovery
    elif any(kw in memo_lower for kw in ["post-op", "postop", "recovery", "follow-up", "post-operative", "wound care"]):
        return "Post-Op"
    
    # Allergies & Adverse Reactions
    elif any(kw in memo_lower for kw in ["allergy", "allergies", "allergic", "adverse reaction", "drug allergy", "food allergy", "anaphylaxis", "sensitivity"]):
        return "Allergies"
    
    # Medications & Prescriptions
    elif any(kw in memo_lower for kw in ["prescription", "medication", "rx", "drug", "pharmacy", "dosage", "refill", "dispense", "medicine"]):
        return "Prescription"
    
    # Immunizations & Vaccines
    elif any(kw in memo_lower for kw in ["immunization", "vaccine", "vaccination", "booster", "flu shot", "covid vaccine", "hepatitis", "mmr", "tdap", "polio"]):
        return "Immunization"
    
    # Patient Messages & Communications
    elif any(kw in memo_lower for kw in ["patient message", "secure message", "message to", "message from", "patient inquiry", "patient question", "patient portal", "mychart"]):
        return "Patient Message"
    
    # Clinical Notes & Documentation
    elif any(kw in memo_lower for kw in ["clinical note", "progress note", "soap note", "physician note", "nurse note", "provider note", "chart note", "documentation"]):
        return "Clinical Notes"
    
    # Discharge & Transitions
    elif any(kw in memo_lower for kw in ["discharge", "released", "checkout", "transition of care", "discharge summary", "discharge instructions"]):
        return "Discharge"
    
    # Emergency & Urgent Care
    elif any(kw in memo_lower for kw in ["emergency", "er ", "trauma", "urgent", "critical", "acute", "911", "ambulance", "ems"]):
        return "Emergency"
    
    # Mental Health & Behavioral
    elif any(kw in memo_lower for kw in ["mental", "psychiatric", "therapy", "counseling", "anxiety", "depression", "behavioral", "psychology", "psychotherapy", "substance abuse"]):
        return "Mental Health"
    
    # Referrals & Consultations
    elif any(kw in memo_lower for kw in ["referral", "consult", "consultation", "specialist", "referred to", "second opinion"]):
        return "Referral"
    
    # Care Plans & Treatment Plans
    elif any(kw in memo_lower for kw in ["care plan", "treatment plan", "care coordination", "care management", "chronic care", "disease management"]):
        return "Care Plan"
    
    # Consent & Authorization
    elif any(kw in memo_lower for kw in ["consent", "authorization", "hipaa", "release of information", "patient consent", "informed consent", "roi"]):
        return "Consent"
    
    # SVCN Care Network - Care Handoffs
    elif any(kw in memo_lower for kw in ["handoff", "hand-off", "care transfer", "care transition", "transfer of care", "shift change"]):
        return "Care Handoff"
    
    # SVCN Care Network - Wearable & IoT Anomalies
    elif any(kw in memo_lower for kw in ["anomaly", "wearable", "iot", "device alert", "sensor", "threshold"]):
        return "Wearable Anomaly"
    
    # SVCN Care Network - Federated Batch Processing
    elif any(kw in memo_lower for kw in ["batch", "federated", "bulk anchor", "multi-record"]):
        return "Federated Batch"
    
    # SVCN Care Network - Backup & Recovery
    elif any(kw in memo_lower for kw in ["backup", "recovery", "export", "archive", "disaster recovery", "data recovery"]):
        return "Backup & Recovery"
    
    # EHR System Integrations
    elif any(kw in memo_lower for kw in ["epic", "oracle health", "cerner", "meditech", "athenahealth", "allscripts", "eclinicalworks", "nextgen", "ehr", "emr"]):
        return "EHR Integration"
    
    # Telemedicine & Virtual Care
    elif any(kw in memo_lower for kw in ["telemedicine", "telehealth", "virtual", "remote consult", "video visit", "e-visit"]):
        return "Telemedicine"
    
    # Pediatric & Maternal
    elif any(kw in memo_lower for kw in ["pediatric", "child", "infant", "newborn", "prenatal", "maternal", "pregnancy", "obstetric", "neonatal", "well-child"]):
        return "Pediatric"
    
    # Chronic Conditions & Disease Management
    elif any(kw in memo_lower for kw in ["diabetes", "hypertension", "asthma", "copd", "heart failure", "chronic", "ongoing condition"]):
        return "Chronic Care"
    
    # Preventive & Wellness
    elif any(kw in memo_lower for kw in ["preventive", "wellness", "annual exam", "physical exam", "screening", "health maintenance", "checkup"]):
        return "Preventive"
    
    # Billing & Administrative (if included in records)
    elif any(kw in memo_lower for kw in ["insurance", "claim", "billing", "prior auth", "preauthorization", "eligibility"]):
        return "Administrative"
    
    else:
        return "Other"

@app.route('/metrics')
def get_metrics():
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        txs = []
        marker = None
        # Paginate through all transactions (XRPL uses marker-based pagination)
        while True:
            if marker:
                req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=400, marker=marker)
            else:
                req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=400)
            response = client.request(req)
            txs.extend(response.result.get("transactions", []))
            marker = response.result.get("marker")
            if not marker:
                break
            # Safety limit to prevent infinite loops (max 10,000 transactions)
            if len(txs) >= 10000:
                break
    except Exception as e:
        return jsonify({"error": f"Failed to fetch XRPL data: {e}"})

    individual_records = []
    records_by_type = {}
    total_hashes = 0
    last_hash = None

    for tx in txs:
        # Handle both old (tx) and new (tx_json) xrpl-py response formats
        tx_obj = tx.get("tx_json", tx.get("tx", {}))
        tx_hash = tx.get("hash", tx_obj.get("hash", ""))
        tx_date = tx_obj.get("date")
        
        if tx_date and tx_date > 0:
            try:
                timestamp = tx_date + 946684800
                date = datetime.datetime.utcfromtimestamp(timestamp)
                date_iso = date.isoformat() + "Z"
                date_display = date.strftime("%b %d, %H:%M:%S")
                date_minute = date.strftime("%H:%M")
                date_hour = date.strftime("%b %d %H:00")
                date_day = date.strftime("%b %d")
                date_week = date.strftime("%Y-W%U")
                date_month = date.strftime("%b %Y")
            except:
                date_iso = date_display = date_minute = date_hour = date_day = date_week = date_month = "Unknown"
        else:
            date_iso = date_display = date_minute = date_hour = date_day = date_week = date_month = "Unknown"

        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except:
                    pass

        if memo_data:
            total_hashes += 1
            last_hash = memo_data[:64] if len(memo_data) >= 64 else memo_data
            record_type = categorize_record(memo_data)
            records_by_type[record_type] = records_by_type.get(record_type, 0) + 1
            
            individual_records.append({
                "timestamp_iso": date_iso,
                "timestamp_display": date_display,
                "minute": date_minute,
                "hour": date_hour,
                "day": date_day,
                "week": date_week,
                "month": date_month,
                "hash": memo_data[:32] + "..." if len(memo_data) > 32 else memo_data,
                "tx_hash": tx_hash,
                "record_type": record_type,
                "fee": 0.01
            })

    individual_records.sort(key=lambda x: x["timestamp_iso"] or "", reverse=False)
    
    def aggregate_by(records, key):
        agg = {}
        for r in records:
            k = r.get(key, "Unknown")
            agg[k] = agg.get(k, 0) + 1
        return agg
    
    def aggregate_fees_by(records, key):
        agg = {}
        for r in records:
            k = r.get(key, "Unknown")
            agg[k] = agg.get(k, 0) + r.get("fee", 0.01)
        return agg

    return jsonify({
        "individual_records": individual_records,
        "hashes_by_minute": aggregate_by(individual_records, "minute"),
        "hashes_by_hour": aggregate_by(individual_records, "hour"),
        "hashes_by_day": aggregate_by(individual_records, "day"),
        "hashes_by_week": aggregate_by(individual_records, "week"),
        "hashes_by_month": aggregate_by(individual_records, "month"),
        "fees_by_minute": aggregate_fees_by(individual_records, "minute"),
        "fees_by_hour": aggregate_fees_by(individual_records, "hour"),
        "fees_by_day": aggregate_fees_by(individual_records, "day"),
        "fees_by_week": aggregate_fees_by(individual_records, "week"),
        "fees_by_month": aggregate_fees_by(individual_records, "month"),
        "records_by_type": records_by_type,
        "total_hashes": total_hashes,
        "last_hash": last_hash,
        "total_fees": round(total_hashes * 0.01, 4)
    })

@app.route('/transactions')
def get_transactions():
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        txs = []
        marker = None
        # Paginate through all transactions (same as /metrics)
        while True:
            if marker:
                req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=400, marker=marker)
            else:
                req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=400)
            response = client.request(req)
            txs.extend(response.result.get("transactions", []))
            marker = response.result.get("marker")
            if not marker:
                break
            if len(txs) >= 10000:
                break
    except Exception as e:
        return jsonify({"error": f"Failed to fetch XRPL data: {e}"})

    transactions = []
    for tx in txs:
        # Handle both old (tx) and new (tx_json) xrpl-py response formats
        tx_obj = tx.get("tx_json", tx.get("tx", {}))
        tx_hash = tx.get("hash", tx_obj.get("hash", ""))
        tx_date = tx_obj.get("date")
        
        if tx_date and tx_date > 0:
            try:
                date = datetime.datetime.utcfromtimestamp(tx_date + 946684800)
                date_str = date.strftime("%Y-%m-%d %H:%M:%S UTC")
            except:
                date_str = "Unknown"
        else:
            date_str = "Unknown"

        memos = tx_obj.get("Memos", [])
        memo_data = ""
        if memos:
            memo = memos[0].get("Memo", {})
            memo_data = memo.get("MemoData", "")
            if memo_data:
                try:
                    memo_data = bytes.fromhex(memo_data).decode("utf-8", errors="ignore")
                except:
                    pass

        if memo_data:
            transactions.append({
                "hash": tx_hash,
                "date": date_str,
                "memo": memo_data[:64] + "..." if len(memo_data) > 64 else memo_data,
                "explorer_url": f"https://testnet.xrpl.org/transactions/{tx_hash}",
                "record_type": categorize_record(memo_data)
            })

    return jsonify({"transactions": transactions, "count": len(transactions)})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
