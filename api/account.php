<?php
// Haven BJJ Dashboard — Account API
// GET  ?action=profile    → user profile data
// POST ?action=password   → change password
// POST ?action=avatar     → upload profile photo
// POST ?action=theme      → set light/dark theme

error_reporting(E_ALL & ~E_DEPRECATED);

require_once __DIR__ . '/../includes/session.php';
requireAuthAPI();

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$username = $_SESSION['user'];
$prefsFile = DATA_DIR . 'preferences.json';
$usersFile = DATA_DIR . 'users.json';
$avatarDir = DATA_DIR . 'avatars/';

// Ensure directories exist
if (!is_dir($avatarDir)) {
    mkdir($avatarDir, 0755, true);
}

// Helper: read preferences
function readPrefs(): array {
    global $prefsFile;
    if (!file_exists($prefsFile)) return [];
    $data = json_decode(file_get_contents($prefsFile), true);
    return is_array($data) ? $data : [];
}

// Helper: write preferences
function writePrefs(array $data): void {
    global $prefsFile;
    file_put_contents($prefsFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// ── GET: Profile ──────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'profile') {
    $prefs = readPrefs();
    $userPrefs = $prefs[$username] ?? [];

    // Check if avatar exists
    $hasAvatar = false;
    $avatarUrl = '';
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $ext) {
        if (file_exists($avatarDir . $username . '.' . $ext)) {
            $hasAvatar = true;
            $avatarUrl = 'data/avatars/' . $username . '.' . $ext . '?t=' . filemtime($avatarDir . $username . '.' . $ext);
            break;
        }
    }

    echo json_encode([
        'username' => $username,
        'hasAvatar' => $hasAvatar,
        'avatarUrl' => $avatarUrl,
        'theme' => $userPrefs['theme'] ?? 'light',
    ]);
    exit;
}

// All POST actions require CSRF
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Avatar upload uses multipart, CSRF comes from header
    requireCsrf();
}

// ── POST: Change Password ─────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'password') {
    $input = json_decode(file_get_contents('php://input'), true);
    $current = $input['current'] ?? '';
    $new = $input['new'] ?? '';

    if (!$current || !$new) {
        http_response_code(400);
        echo json_encode(['error' => 'Vul beide velden in']);
        exit;
    }

    if (strlen($new) < 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Nieuw wachtwoord moet minimaal 6 tekens zijn']);
        exit;
    }

    // Verify current password
    $users = USERS;
    if (!isset($users[$username]) || !password_verify($current, $users[$username])) {
        http_response_code(403);
        echo json_encode(['error' => 'Huidig wachtwoord is onjuist']);
        exit;
    }

    // Hash new password and save
    $users[$username] = password_hash($new, PASSWORD_BCRYPT);

    $fp = fopen($usersFile, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        echo json_encode(['ok' => true, 'message' => 'Wachtwoord gewijzigd']);
    } else {
        if ($fp) fclose($fp);
        http_response_code(500);
        echo json_encode(['error' => 'Kon wachtwoord niet opslaan']);
    }
    exit;
}

// ── POST: Upload Avatar ───────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'avatar') {
    if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        http_response_code(400);
        echo json_encode(['error' => 'Geen bestand ontvangen']);
        exit;
    }

    $file = $_FILES['avatar'];
    $maxSize = 5 * 1024 * 1024; // 5MB

    if ($file['size'] > $maxSize) {
        http_response_code(400);
        echo json_encode(['error' => 'Bestand is te groot (max 5MB)']);
        exit;
    }

    // Validate image type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
    ];

    if (!isset($allowedMimes[$mime])) {
        http_response_code(400);
        echo json_encode(['error' => 'Alleen JPG, PNG of WebP toegestaan']);
        exit;
    }

    $ext = $allowedMimes[$mime];

    // Remove old avatars for this user
    foreach (['jpg', 'jpeg', 'png', 'webp'] as $oldExt) {
        $oldFile = $avatarDir . $username . '.' . $oldExt;
        if (file_exists($oldFile)) unlink($oldFile);
    }

    // Save new avatar
    $destPath = $avatarDir . $username . '.' . $ext;
    if (move_uploaded_file($file['tmp_name'], $destPath)) {
        $avatarUrl = 'data/avatars/' . $username . '.' . $ext . '?t=' . time();
        echo json_encode(['ok' => true, 'avatarUrl' => $avatarUrl]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Kon bestand niet opslaan']);
    }
    exit;
}

// ── POST: Set Theme ───────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'theme') {
    $input = json_decode(file_get_contents('php://input'), true);
    $theme = $input['theme'] ?? '';

    if (!in_array($theme, ['light', 'dark'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Ongeldige thema keuze']);
        exit;
    }

    $prefs = readPrefs();
    if (!isset($prefs[$username])) $prefs[$username] = [];
    $prefs[$username]['theme'] = $theme;
    writePrefs($prefs);

    echo json_encode(['ok' => true, 'theme' => $theme]);
    exit;
}

http_response_code(400);
echo json_encode(['error' => 'Ongeldige actie. Gebruik ?action=profile|password|avatar|theme']);
