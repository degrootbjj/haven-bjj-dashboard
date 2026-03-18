#!/usr/bin/env python3
"""Notion API proxy server - runs on port 3002"""
import http.server
import json
import re
import ssl
import urllib.request

PORT = 3002
NOTION_API = 'https://api.notion.com'
NOTION_VERSION = '2022-06-28'
API_KEY = 'ntn_I4762409521S2jhhbHClTBWTOX2rpu0MeW0SBAm7YmCaAW'

class NotionProxy(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        blocks_match = re.match(r'^/blocks/([^/]+)/children', self.path)
        pages_match = re.match(r'^/pages/([^/?]+)', self.path)

        if blocks_match:
            notion_path = f'/v1/blocks/{blocks_match.group(1)}/children?page_size=100'
        elif pages_match:
            notion_path = f'/v1/pages/{pages_match.group(1)}'
        else:
            self.send_response(404)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
            return

        try:
            req = urllib.request.Request(
                f'{NOTION_API}{notion_path}',
                headers={
                    'Authorization': f'Bearer {API_KEY}',
                    'Notion-Version': NOTION_VERSION,
                    'Content-Type': 'application/json'
                }
            )
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self._cors()
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, format, *args):
        pass  # Suppress request logs

if __name__ == '__main__':
    server = http.server.HTTPServer(('', PORT), NotionProxy)
    print(f'Notion proxy running on http://localhost:{PORT}')
    server.serve_forever()
