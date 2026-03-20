<?php
error_reporting(E_ALL & ~E_DEPRECATED);
require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();

$dataFile = __DIR__ . '/../data/rooster_drafts.json';

function loadDrafts() {
    global $dataFile;
    if (file_exists($dataFile)) {
        $content = file_get_contents($dataFile);
        return json_decode($content, true) ?: [];
    }
    return [];
}

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'load') {
    $month = $_GET['month'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid month format']);
        exit;
    }
    $drafts = loadDrafts();
    header('Content-Type: application/json');
    echo json_encode($drafts[$month] ?? null);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'save') {
    verifyCsrfToken();
    $input = json_decode(file_get_contents('php://input'), true);
    $month = $input['month'] ?? '';
    if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid month format']);
        exit;
    }
    $data = $input['data'] ?? null;
    if (!$data) {
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'No data provided']);
        exit;
    }

    $drafts = loadDrafts();
    $drafts[$month] = $data;

    // Ensure data directory exists
    $dir = dirname($dataFile);
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }

    file_put_contents($dataFile, json_encode($drafts, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'saved' => date('Y-m-d H:i:s')]);
    exit;
}

http_response_code(400);
header('Content-Type: application/json');
echo json_encode(['error' => 'Invalid request']);
