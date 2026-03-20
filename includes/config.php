<?php
// Haven BJJ Dashboard — Configuration
// ⚠️ Change these values for each installation!

// User accounts: loaded from data/users.json (editable via Account page)
// Fallback to hardcoded if JSON doesn't exist yet
$usersFile = __DIR__ . '/../data/users.json';
if (file_exists($usersFile)) {
    $usersData = json_decode(file_get_contents($usersFile), true);
    if (is_array($usersData) && count($usersData) > 0) {
        define('USERS', $usersData);
    }
}
if (!defined('USERS')) {
    define('USERS', [
        'daniel' => '$2b$12$W0QYd7Q17qJieGp.H702rOYx6h2c2Ipc7NrU868Nu54qrFxATRVWi',
    ]);
}

// Session settings
define('SESSION_LIFETIME', 86400); // 24 hours

// CSRF secret (change this to a random string for each installation)
define('CSRF_SECRET', 'hv_bjj_csrf_2026_xK9mPqR7wL3nT5vB');

// Notion API
define('NOTION_API_KEY', 'ntn_I4762409521S2jhhbHClTBWTOX2rpu0MeW0SBAm7YmCaAW');
define('NOTION_API_VERSION', '2022-06-28');
define('NOTION_PAGES', [
    'THEMES'  => 'c8af81f52edf4274869de23b6d3b8c93',
    'COACHES' => '5d59a0400b0947c0ad5d18d9e913f5f2',
    'BALIE'   => '5d7bb6a39949439e8df0d584ee6fde56',
]);

// Gym branding (used in login page and header)
define('GYM_NAME', 'Haven BJJ');

// Data directory (relative to this file's parent directory)
define('DATA_DIR', __DIR__ . '/../data/');

// API keys & secrets (not in git)
if (file_exists(__DIR__ . '/secrets.php')) {
    require_once __DIR__ . '/secrets.php';
}

// Anthropic API — loaded from secrets.php, fallback to empty
if (!defined('ANTHROPIC_API_KEY')) {
    define('ANTHROPIC_API_KEY', '');
}
