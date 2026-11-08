<?php
declare(strict_types=1);

// PHP 7.3+. No database or client-side scripts required.
$secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$local = in_array($_SERVER['REMOTE_ADDR'] ?? '', ['127.0.0.1', '::1'], true);
if (!$secure && !$local) {
    header('Location: https://360.room26.ru/admin/', true, 303);
    exit;
}
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('X-Robots-Tag: noindex, nofollow');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_name('room26_admin');
session_set_cookie_params([
    'lifetime' => 0, 'path' => '/admin/', 'secure' => $secure,
    'httponly' => true, 'samesite' => 'Strict',
]);
if (!session_start()) {
    http_response_code(503);
    exit('Вход временно недоступен. Попробуйте позже.');
}
if (isset($_SESSION['last_seen']) && time() - $_SESSION['last_seen'] > 1800) {
    $_SESSION = [];
    session_regenerate_id(true);
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
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
                    && password_verify($password, '$2y$12$tbHC2pZM9eU1HW/O0mCt6uZYXlYgJSHqVmDo5AFcyQngdhr5J0MUC');
                if (is_string($username) && hash_equals('Irina', $username) && $valid) {
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
function escape(string $value): string {
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}
?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= $authenticated ? 'Админка' : 'Вход' ?> — ROOM26</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; background: #101820; color: #f4f6f8; font-family: system-ui, sans-serif; }
    main { width: 100%; max-width: 400px; }
    .brand { color: #85dbc5; font-size: 13px; letter-spacing: .18em; }
    h1 { font-size: 32px; margin: 16px 0 32px; }
    label { display: block; margin: 20px 0 8px; }
    input { width: 100%; padding: 14px; background: #1b2833; border: 1px solid #526472; border-radius: 8px; color: #fff; font: inherit; }
    button { width: 100%; padding: 14px; border: 0; border-radius: 8px; background: #85dbc5; color: #101820; font: inherit; font-weight: 600; cursor: pointer; }
    .login button { margin-top: 28px; }
    input:focus-visible, button:focus-visible { outline: 3px solid #c7fff1; outline-offset: 3px; }
    button:hover { background: #a6e8d7; }
    .error { padding: 12px; border: 1px solid #c97b7b; border-radius: 8px; color: #ffd0d0; line-height: 1.5; }
  </style>
</head>
<body>
<main>
<?php if ($error !== ''): ?>
  <p class="error" role="alert"><?= escape($error) ?></p>
<?php endif; ?>
<?php if ($authenticated): ?>
  <form method="post" action="/admin/">
    <input type="hidden" name="csrf" value="<?= escape($_SESSION['csrf']) ?>">
    <input type="hidden" name="action" value="logout">
    <button type="submit">Выйти</button>
  </form>
<?php else: ?>
  <div class="brand">ROOM26 / 360</div>
  <h1>Вход в админку</h1>
  <form class="login" method="post" action="/admin/">
    <input type="hidden" name="csrf" value="<?= escape($_SESSION['csrf']) ?>">
    <label for="username">Логин</label>
    <input id="username" name="username" autocomplete="username" maxlength="100" required>
    <label for="password">Пароль</label>
    <input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required>
    <button type="submit">Войти</button>
  </form>
<?php endif; ?>
</main>
</body>
</html>
