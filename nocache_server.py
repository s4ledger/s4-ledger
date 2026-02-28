#!/usr/bin/env python3
"""Simple HTTP server with no-cache headers to prevent browser caching."""
import http.server
import socketserver

PORT = 8200

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"Serving on http://localhost:{PORT}")
    httpd.serve_forever()
