// Notion API proxy server - runs on port 3002
// Avoids CORS issues and keeps API key server-side
const http = require('http');
const https = require('https');

const PORT = 3002;
const NOTION_API = 'https://api.notion.com';
const NOTION_VERSION = '2022-06-28';
const API_KEY = 'ntn_I4762409521S2jhhbHClTBWTOX2rpu0MeW0SBAm7YmCaAW';

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Route: /blocks/:id/children
    const blocksMatch = req.url.match(/^\/blocks\/([^/]+)\/children/);
    // Route: /pages/:id
    const pagesMatch = req.url.match(/^\/pages\/([^/?]+)/);

    let notionPath;
    if (blocksMatch) {
        notionPath = `/v1/blocks/${blocksMatch[1]}/children?page_size=100`;
    } else if (pagesMatch) {
        notionPath = `/v1/pages/${pagesMatch[1]}`;
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    const options = {
        hostname: 'api.notion.com',
        path: notionPath,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Notion-Version': NOTION_VERSION,
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = https.request(options, (proxyRes) => {
        let body = '';
        proxyRes.on('data', chunk => body += chunk);
        proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(body);
        });
    });

    proxyReq.on('error', (err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
    });

    proxyReq.end();
});

server.listen(PORT, () => {
    console.log(`Notion proxy running on http://localhost:${PORT}`);
});
