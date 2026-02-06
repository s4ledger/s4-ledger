import requests

def notify_partner(anchor_hash, partner_url):
    payload = {"hash": anchor_hash, "timestamp": "2026-02-05T18:00:00Z"}
    response = requests.post(partner_url, json=payload)
    print("Webhook sent, response:", response.status_code)
