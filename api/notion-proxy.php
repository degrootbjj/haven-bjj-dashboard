<?php
// Haven BJJ Dashboard — Notion API Proxy
// Proxies requests to Notion API with authentication
// Usage: notion-proxy.php?path=blocks/{id}/children or notion-proxy.php?path=pages/{id}

error_reporting(E_ALL & ~E_DEPRECATED);

require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();

header('Content-Type: application/json');

$path = $_GET['path'] ?? '';
if (!$path) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing path parameter']);
    exit;
}

// Only allow blocks and pages endpoints
if (!preg_match('/^(blocks|pages)\/[a-f0-9-]+/', $path)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid Notion API path']);
    exit;
}

// Build query string (pass through start_cursor, page_size etc.)
$queryParams = $_GET;
unset($queryParams['path']);
$queryString = http_build_query($queryParams);

$url = 'https://api.notion.com/v1/' . $path;
if ($queryString) {
    $url .= '?' . $queryString;
}

// Call Notion API
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . NOTION_API_KEY,
        'Notion-Version: ' . NOTION_API_VERSION,
        'Content-Type: application/json',
    ],
    CURLOPT_TIMEOUT => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Notion API request failed: ' . $curlError]);
    exit;
}

http_response_code($httpCode);
echo $response;
