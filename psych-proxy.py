#!/usr/bin/env python3
"""
PsychAssist CORS Proxy — forwards requests to the Anthropic API.

Browsers block direct calls to api.anthropic.com because of CORS headers.
This tiny server sits on localhost and relays the request, adding the
correct CORS headers so the browser is happy.

Usage:
    python psych-proxy.py            # starts on http://localhost:5005
    python psych-proxy.py 8080       # starts on http://localhost:8080

Then in PsychAssist Settings set Proxy URL to:
    http://localhost:5005/v1/messages
"""

import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.error import HTTPError

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5005
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"


class ProxyHandler(BaseHTTPRequestHandler):
    """Handles CORS preflight and proxies POST to Anthropic."""

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers",
                         "Content-Type, x-api-key, anthropic-version")

    def do_OPTIONS(self):
        """CORS preflight."""
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        """Forward the request to Anthropic and relay the response."""
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length)

        # Build upstream request
        req = Request(ANTHROPIC_URL, data=body, method="POST")
        req.add_header("Content-Type", "application/json")

        # Forward auth headers from the browser
        api_key = self.headers.get("x-api-key", "")
        if api_key:
            req.add_header("x-api-key", api_key)
        anthropic_version = self.headers.get("anthropic-version", "2023-06-01")
        req.add_header("anthropic-version", anthropic_version)

        try:
            with urlopen(req) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                self._cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(resp_body)
        except HTTPError as e:
            error_body = e.read()
            self.send_response(e.code)
            self._cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(error_body)

    def log_message(self, fmt, *args):
        print(f"[proxy] {args[0]}")


def main():
    server = HTTPServer(("127.0.0.1", PORT), ProxyHandler)
    print(f"PsychAssist CORS Proxy running on http://localhost:{PORT}")
    print(f"Set proxy URL in app to: http://localhost:{PORT}/v1/messages")
    print("Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nProxy stopped.")


if __name__ == "__main__":
    main()
