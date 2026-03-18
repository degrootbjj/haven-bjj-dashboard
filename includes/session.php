<?php
// Haven BJJ Dashboard — Session Management

require_once __DIR__ . '/config.php';

// Configure session before starting
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.gc_maxlifetime', SESSION_LIFETIME);

// Only set secure cookie on HTTPS (allow HTTP for local development)
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    ini_set('session.cookie_secure', 1);
}

session_start();

/**
 * Check if user is authenticated. Returns true/false.
 */
function isAuthenticated(): bool {
    return !empty($_SESSION['user']);
}

/**
 * Require authentication. Redirects to login if not logged in.
 */
function requireAuth(): void {
    if (!isAuthenticated()) {
        header('Location: login.php');
        exit;
    }
}

/**
 * Require auth for API endpoints. Returns 401 JSON if not logged in.
 */
function requireAuthAPI(): void {
    if (!isAuthenticated()) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
}

/**
 * Generate or retrieve CSRF token for this session.
 */
function getCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token from request header.
 */
function verifyCsrfToken(): bool {
    $token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

/**
 * Require valid CSRF token. Returns 403 if invalid.
 */
function requireCsrf(): void {
    if (!verifyCsrfToken()) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Invalid CSRF token']);
        exit;
    }
}

/**
 * Attempt login. Returns true on success, false on failure.
 */
function attemptLogin(string $username, string $password): bool {
    $users = USERS;
    if (!isset($users[$username])) {
        // Constant-time comparison to prevent username enumeration
        password_verify($password, '$2y$12$invalidsaltinvalidsaltinvalidsaltinvalidsaltinvali');
        return false;
    }

    if (password_verify($password, $users[$username])) {
        // Regenerate session ID to prevent fixation
        session_regenerate_id(true);
        $_SESSION['user'] = $username;
        $_SESSION['login_time'] = time();
        getCsrfToken(); // Generate CSRF token on login
        return true;
    }

    return false;
}

/**
 * Logout: destroy session completely.
 */
function logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}
