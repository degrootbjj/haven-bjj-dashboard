<?php
// Haven BJJ Dashboard — Data API
// GET  ?type=dashboard|mailchimp  → returns JSON data
// POST ?type=dashboard|mailchimp  → merges {ym, entry} into data file

error_reporting(E_ALL & ~E_DEPRECATED);

require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();

header('Content-Type: application/json');

$type = $_GET['type'] ?? '';
$validTypes = ['dashboard' => 'dashboard_data.json', 'mailchimp' => 'mailchimp_data.json'];

if (!isset($validTypes[$type])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid type. Use ?type=dashboard or ?type=mailchimp']);
    exit;
}

$filePath = DATA_DIR . $validTypes[$type];

// Ensure data directory and file exist
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
if (!file_exists($filePath)) {
    file_put_contents($filePath, '{}');
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Return the JSON data
    $json = file_get_contents($filePath);
    echo $json;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Require CSRF token
    requireCsrf();

    // Read request body
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input || !isset($input['ym']) || !isset($input['entry'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing ym or entry in request body']);
        exit;
    }

    $ym = $input['ym'];
    $entry = $input['entry'];

    // Validate ym format (YYYY-MM)
    if (!preg_match('/^\d{4}-\d{2}$/', $ym)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid ym format. Expected YYYY-MM']);
        exit;
    }

    // Read, merge, write with file locking
    $fp = fopen($filePath, 'c+');
    if (!$fp) {
        http_response_code(500);
        echo json_encode(['error' => 'Cannot open data file']);
        exit;
    }

    if (flock($fp, LOCK_EX)) {
        $contents = stream_get_contents($fp);
        $data = json_decode($contents, true) ?: [];

        // Merge: preserve existing fields, update with new non-null values
        $existing = $data[$ym] ?? [];
        foreach ($entry as $key => $val) {
            if ($val !== null) {
                $existing[$key] = $val;
            }
        }
        $data[$ym] = $existing;

        // Sort by key (year-month)
        ksort($data);

        // Write back
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);

        echo json_encode(['ok' => true, 'ym' => $ym, 'total_keys' => count($data)]);
    } else {
        fclose($fp);
        http_response_code(500);
        echo json_encode(['error' => 'Could not acquire file lock']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
