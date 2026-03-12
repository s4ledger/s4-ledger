#!/usr/bin/env python3
"""
Local preview server that mimics Vercel production routing.
Serves static files from workspace root with rewrites for:
  /  → /prod-app/dist/index.html
  /demo → /prod-app/demo.html
  /demo-app → /demo-app/dist/index.html
All /s4-assets/, /prod-app/dist/assets/, etc. served naturally.
"""
import http.server
import socketserver
import os
import sys
import json
import hashlib
import time
import uuid

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.abspath(__file__))

# Rewrites matching vercel.json
REWRITES = {
    "/": "/demo-app/dist/index.html",
    "/demo": "/prod-app/demo.html",
    "/demo.html": "/prod-app/demo.html",
    "/demo-app": "/demo-app/dist/index.html",
    "/demo-app/": "/demo-app/dist/index.html",
    "/prod-app": "/prod-app/dist/index.html",
    "/prod-app/": "/prod-app/dist/index.html",
}

def _fake_tx_hash():
    return hashlib.sha256(str(time.time()).encode() + uuid.uuid4().bytes).hexdigest().upper()

def _handle_api(handler, path, body=None):
    """Return realistic mock API responses for local preview."""
    resp = {"status": "ok"}

    if path == "/api/anchor":
        tx_hash = _fake_tx_hash()
        fee_tx = _fake_tx_hash()
        record_type = ""
        hash_val = ""
        if body:
            try:
                data = json.loads(body)
                record_type = data.get("record_type", "")
                hash_val = data.get("hash", "")
            except: pass
        resp = {
            "status": "ok",
            "record": {
                "hash": hash_val,
                "record_type": record_type,
                "tx_hash": tx_hash,
                "network": "XRPL Mainnet",
                "explorer_url": f"https://livenet.xrpl.org/transactions/{tx_hash}",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "fee": 0.01
            },
            "fee_transfer": {
                "tx_hash": fee_tx,
                "amount": "0.01",
                "currency": "SLS"
            }
        }
    elif path == "/api/verify":
        resp = {"status": "ok", "verified": True, "match": True, "network": "XRPL Mainnet"}
    elif path == "/api/status" or path == "/api/health":
        resp = {"status": "ok", "version": "5.0.1", "xrpl": "connected", "network": "mainnet"}
    elif path.startswith("/api/demo"):
        resp = {"status": "ok", "session_id": "DEMO-" + uuid.uuid4().hex[:8].upper(),
                "subscription": {"tier": "Professional", "sls_allocation": 100000, "status": "active"},
                "wallet": {"address": "rDEMO" + uuid.uuid4().hex[:20], "balance": 100000}}
    elif path == "/api/metrics/performance":
        resp = {"status": "ok", "data": {"avg_anchor_time_ms": 2100, "uptime_pct": 99.97, "total_anchors": 1847}}
    elif path == "/api/ai-chat":
        # Try to proxy to real Vercel API to get live AI responses locally
        msg = ""
        if body:
            try:
                msg = json.loads(body).get("message", "")
            except: pass
        try:
            import urllib.request
            proxy_req = urllib.request.Request(
                "https://s4ledger.com/api/ai-chat",
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(proxy_req, timeout=35) as proxy_resp:
                return proxy_resp.read()
        except Exception:
            # Fallback: structured mock that matches the expected response shape
            sections = ["executive_summary", "milestones", "risks", "compliance", "next_steps"]
            mock_bullets = {
                "executive_summary": "\u2022 Program on track \u2014 94% readiness across all ILS elements\n\u2022 3 new data anchors verified on XRPL this period\n\u2022 Zero critical compliance gaps identified",
                "milestones": "\u2022 CDR milestone successfully completed ahead of schedule\n\u2022 SBOM v2.1 submitted and verified \u2014 all 847 components clean\n\u2022 Provisioning data package accepted by NAVSEA",
                "risks": "\u2022 DMSMS alert: 2 components entering obsolescence window (Q3 action required)\n\u2022 Supplier lead-time variance +12% \u2014 monitoring closely\n\u2022 Budget execution at 87% \u2014 within acceptable range",
                "compliance": "\u2022 CMMC Level 2+ audit passed \u2014 all 110 controls verified\n\u2022 EO 14028 SBOM requirements fully met\n\u2022 NIST SP 800-171 self-assessment score: 98/110",
                "next_steps": "\u2022 Schedule PDR for next reporting period\n\u2022 Complete DMSMS mitigation plan for flagged components\n\u2022 Submit quarterly logistics metrics to PEO"
            }
            parts = []
            for s in sections:
                parts.append("---SECTION: " + s + "---\n" + mock_bullets.get(s, "\u2022 Data pending"))
            resp = {"response": "\n\n".join(parts), "provider": "local-mock", "fallback": False}
    else:
        resp = {"status": "ok", "message": "Local preview mock - real API at s4ledger.com"}

    return json.dumps(resp).encode("utf-8")

class ProductionPreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        # Strip query string for rewrite matching
        path = self.path.split("?")[0].split("#")[0]

        # Apply rewrites
        if path in REWRITES:
            self.path = REWRITES[path]

        # API mock
        if self.path.startswith("/api"):
            data = _handle_api(self, self.path.split("?")[0])
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(data)
            return

        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0].split("#")[0]
        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len) if content_len > 0 else None
        data = _handle_api(self, path, body)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def end_headers(self):
        # No-cache to always see latest changes
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # CORS for local testing
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()

    def log_message(self, format, *args):
        # Quieter logging — only log non-200 or non-asset requests
        status = args[1] if len(args) > 1 else ""
        if str(status) != "200" or not any(self.path.endswith(ext) for ext in [".js", ".css", ".png", ".woff2", ".map"]):
            super().log_message(format, *args)

if __name__ == "__main__":
    # Allow port reuse
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), ProductionPreviewHandler) as httpd:
        print(f"\n  S4 Ledger — Production Preview Server")
        print(f"  ──────────────────────────────────────")
        print(f"  Prod App:  http://localhost:{PORT}/")
        print(f"  Demo:      http://localhost:{PORT}/demo")
        print(f"  Demo App:  http://localhost:{PORT}/demo-app")
        print(f"  Assets:    http://localhost:{PORT}/s4-assets/")
        print(f"\n  Serving from: {ROOT}")
        print(f"  Press Ctrl+C to stop\n")
        httpd.serve_forever()
