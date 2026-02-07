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
    memo_lower = memo_data.lower()
    if any(kw in memo_lower for kw in ["vitals", "bp", "blood pressure", "heart rate", "temperature"]):
        return "Vitals"
    elif any(kw in memo_lower for kw in ["post-op", "postop", "recovery", "follow-up"]):
        return "Post-Op"
    elif any(kw in memo_lower for kw in ["lab", "blood test", "urinalysis", "biopsy", "pathology", "cbc", "hemoglobin"]):
        return "Lab Results"
    elif any(kw in memo_lower for kw in ["imaging", "mri", "ct scan", "x-ray", "xray", "ultrasound", "radiology"]):
        return "Imaging"
    elif any(kw in memo_lower for kw in ["discharge", "released", "checkout"]):
        return "Discharge"
    elif any(kw in memo_lower for kw in ["mental", "psychiatric", "therapy", "counseling", "anxiety", "depression"]):
        return "Mental Health"
    elif any(kw in memo_lower for kw in ["emergency", "er ", "trauma", "urgent", "critical"]):
        return "Emergency"
    elif any(kw in memo_lower for kw in ["prescription", "medication", "rx", "drug", "pharmacy"]):
        return "Prescription"
    elif any(kw in memo_lower for kw in ["surgery", "operation", "procedure", "anesthesia"]):
        return "Surgery"
    elif any(kw in memo_lower for kw in ["telemedicine", "telehealth", "virtual", "remote consult"]):
        return "Telemedicine"
    elif any(kw in memo_lower for kw in ["pediatric", "child", "infant", "newborn", "vaccination"]):
        return "Pediatric"
    else:
        return "Other"

@app.route('/metrics')
def get_metrics():
    try:
        client = xrpl.clients.JsonRpcClient(XRPL_TESTNET_URL)
        req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=200)
        response = client.request(req)
        txs = response.result.get("transactions", [])
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
        req = xrpl.models.requests.AccountTx(account=XRPL_TESTNET_ACCOUNT, limit=50)
        response = client.request(req)
        txs = response.result.get("transactions", [])
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
