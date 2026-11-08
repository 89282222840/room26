<?php
declare(strict_types=1);

// Shared PHP session and authentication.
// Shared hosting can terminate TLS before the PHP worker.
$secure = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || strtolower(trim(explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')[0])) === 'https'
    || strtolower($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '') === 'on'
    || in_array(strtolower($_SERVER['HTTP_X_HTTPS'] ?? ''), ['1', 'on', 'https'], true)
    || strtolower($_SERVER['HTTP_X_SCHEME'] ?? '') === 'https'
    || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$secure && !$local) {
    header('Location: https://360.room26.ru/admin/', true, 303);
    exit;
}
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

header('X-Robots-Tag: noindex, nofollow');
ini_set('session.gc_maxlifetime', '86400');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
// A dedicated directory keeps other applications from collecting these sessions.
$sessionDirectory = dirname(__DIR__, 2) . '/.room26-sessions';
if (!is_dir($sessionDirectory)) { @mkdir($sessionDirectory, 0700, true); }
if (!is_dir($sessionDirectory) || !is_writable($sessionDirectory)) { http_response_code(503); exit('Session storage unavailable'); }
session_save_path($sessionDirectory);
session_name('room26_admin');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/admin/', 'secure' => $secure,
    'httponly' => true, 'samesite' => 'Strict',
]);
if (!session_start()) {
    http_response_code(503);
    exit('Вход временно недоступен. Попробуйте позже.');
}
if (isset($_SESSION['last_seen']) && time() - $_SESSION['last_seen'] >= 86400) {
    $_SESSION = [];
    session_regenerate_id(true);
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$authFile = dirname(__DIR__, 2) . '/.room26-auth.json';
$credentials = is_file($authFile) ? json_decode((string)file_get_contents($authFile), true) : null;
if (!is_array($credentials) || empty($credentials['username']) || empty($credentials['password_hash'])) {
    http_response_code(503);
    exit('Авторизация временно недоступна.');
}
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !defined('ROOM26_API')) {
    $token = $_POST['csrf'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf'], $token)) {
        http_response_code(403);
        $error = 'Обновите страницу и попробуйте ещё раз.';
    } elseif (($_POST['action'] ?? '') === 'logout') {
        $_SESSION = [];
        setcookie(session_name(), '', [
            'expires' => time() - 3600, 'path' => '/admin/',
            'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict',
        ]);
        session_destroy();
        header('Location: /admin/', true, 303);
        exit;
    } elseif (empty($_SESSION['authenticated'])) {
        // Shared per-IP counter survives cookie resets. Store outside the web root.
        $key = hash('sha256', __FILE__ . '|' . ($_SERVER['REMOTE_ADDR'] ?? ''));
        $counter = @fopen(sys_get_temp_dir() . '/room26-login-' . $key, 'c+');
        if (!$counter || !flock($counter, LOCK_EX)) {
            http_response_code(503);
            $error = 'Вход временно недоступен. Попробуйте позже.';
        } else {
            $state = json_decode(stream_get_contents($counter), true);
            if (!is_array($state) || time() - ($state['start'] ?? 0) >= 900) {
                $state = ['start' => time(), 'attempts' => 0];
            }
            if ($state['attempts'] >= 10) {
                http_response_code(429);
                header('Retry-After: ' . max(1, 900 - (time() - $state['start'])));
                $error = 'Слишком много попыток. Попробуйте через 15 минут.';
            } else {
                $username = $_POST['username'] ?? '';
                $password = $_POST['password'] ?? '';
                $valid = is_string($password) && strlen($password) <= 1024
                    && password_verify($password, $credentials['password_hash']);
                if (is_string($username) && hash_equals($credentials['username'], $username) && $valid) {
                    session_regenerate_id(true);
                    $_SESSION = ['authenticated' => true, 'last_seen' => time(),
                        'csrf' => bin2hex(random_bytes(32))];
                    $state = ['start' => time(), 'attempts' => 0];
                } else {
                    $state['attempts']++;
                    $error = 'Неверный логин или пароль.';
                }
            }
            rewind($counter);
            ftruncate($counter, 0);
            fwrite($counter, json_encode($state));
            fflush($counter);
            flock($counter, LOCK_UN);
            fclose($counter);
            if (!empty($_SESSION['authenticated'])) {
                header('Location: /admin/', true, 303);
                exit;
            }
        }
    }
}
$authenticated = !empty($_SESSION['authenticated']);
if ($authenticated) {
    $_SESSION['last_seen'] = time();
}
