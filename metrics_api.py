import xrpl
import xrpl.clients
import xrpl.models.requests
import datetime
from flask import Flask, jsonify

app = Flask(__name__)
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
    client = xrpl.clients.JsonRpcClient("https://xrplcluster.com")
    req = xrpl.models.requests.AccountTx(account=XRPL_ACCOUNT, limit=200)
    response = client.request(req)
    txs = response.result.get("transactions", [])
    hashes_by_week = {}
    records_by_type = {}
    sls_fees = {}
    tx_volume = {}
    for tx in txs:
        tx_obj = tx["tx"]
        date = datetime.datetime.fromtimestamp(tx_obj["date"] + 946684800)
        week = date.strftime("%Y-%U")
        memo = tx_obj.get("Memos", [{}])[0].get("Memo", {}).get("MemoData", "")
        # Demo parsing: count hashes, records, fees
        hashes_by_week[week] = hashes_by_week.get(week, 0) + 1
        tx_volume[week] = tx_volume.get(week, 0) + 1
        # Optionally parse memo for record type/fee
        if memo:
            if "Vitals" in memo:
                records_by_type["Vitals"] = records_by_type.get("Vitals", 0) + 1
            elif "Post-Op" in memo:
                records_by_type["Post-Op"] = records_by_type.get("Post-Op", 0) + 1
            # Add more types as needed
            if "$SLS" in memo:
                sls_fees[week] = sls_fees.get(week, 0) + 0.01  # Demo fee
    return jsonify({
        "hashes_by_week": hashes_by_week,
        "records_by_type": records_by_type,
        "sls_fees": sls_fees,
        "tx_volume": tx_volume
    })

if __name__ == '__main__':
    import os
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
