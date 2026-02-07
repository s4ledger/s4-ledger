import xrpl
import xrpl.clients
import xrpl.models.requests
import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from solus_sdk import SolusSDK

app = Flask(__name__)
CORS(app)
@app.route('/')
def home():
        return '''
        <html>
            <head><title>Solus Protocol Metrics API</title></head>
            <body>
                <h1>Solus Protocol Metrics API</h1>
                <p>This is the backend API for real-time metrics.</p>
                <p>To view metrics data, visit <a href="/metrics">/metrics</a>.</p>
            </body>
        </html>
        '''
XRPL_ACCOUNT = "r95GyZac4butvVcsTWUPpxzekmyzaHsTA5"  # Replace with your issuer/account

@app.route('/metrics')
def get_metrics():
    # Use SDK prototype to generate demo metrics each time
    sdk = SolusSDK(api_key="valid_mock_key", testnet=True)
    test_record = "Patient: John Doe\nDOB: 1985-03-15\nVisit: 2026-01-20\nDiagnosis: Hypertension, mild"
    test_seed = "sEdYourTestnetSeedHere"  # Replace with a valid testnet seed if available
    try:
        result = sdk.secure_patient_record(test_record, test_seed, encrypt_first=True, fiat_mode=True)
        hash_val = result["hash"]
        tx_results = result["tx_results"]
    except Exception as e:
        hash_val = None
        tx_results = {"error": str(e)}
    # Demo metrics structure
    demo_metrics = {
        "hashes_by_week": {"2026-06": 1},
        "records_by_type": {"Vitals": 1},
        "sls_fees": {"2026-06": 0.01},
        "tx_volume": {"2026-06": 1},
        "last_hash": hash_val,
        "tx_results": tx_results
    }
    return jsonify(demo_metrics)

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
