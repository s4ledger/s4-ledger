#!/usr/bin/env python3
"""Local preview server for prod-app that mirrors Vercel routing.
Serves from repo root so /prod-app/dist/assets/ paths work naturally,
and /s4-assets/ resolves from repo root too.
Requests to /prod-app/ or /prod-app/dist/ serve the built index.html.
"""
import http.server
import os
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
DIST = ROOT / "prod-app" / "dist"

class ProdPreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        # Strip query string for path resolution
        clean = self.path.split("?", 1)[0].split("#", 1)[0]

        # /prod-app/ or /prod-app/dist/ → serve dist/index.html
        if clean in ("/prod-app/", "/prod-app", "/prod-app/dist/", "/prod-app/dist"):
            self.path = "/prod-app/dist/index.html"

        # Check if the file exists on disk; if not and it looks like a page route, SPA fallback
        resolved = ROOT / clean.lstrip("/")
        if not resolved.exists() and not clean.startswith("/prod-app/dist/assets/"):
            self.path = "/prod-app/dist/index.html"

        return super().do_GET()

    def log_message(self, format, *args):
        pass  # quiet

if __name__ == "__main__":
    port = 8080
    print(f"Prod-app preview: http://localhost:{port}/prod-app/dist/")
    print(f"  Serving from repo root: {ROOT}")
    print(f"  Assets at: /prod-app/dist/assets/")
    print(f"  S4 assets at: /s4-assets/")
    s = http.server.HTTPServer(("", port), ProdPreviewHandler)
    s.serve_forever()
