<?php
declare(strict_types=1);
const SITE_URL = 'https://360.room26.ru';
const STORAGE = __DIR__ . '/../pro';
date_default_timezone_set('Europe/Moscow');
function e(string $v): string { return htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function json_out($data, int $status = 200): void {
    http_response_code($status); header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); exit;
}
function fail(string $message, int $code = 400): void { throw new RuntimeException($message, $code); }
function valid_id(string $id): bool { return (bool) preg_match('/^[a-f0-9]{6}$/D', $id); }
function project_path(string $id): string {
    if (!valid_id($id)) fail('Проект не найден.', 404);
    return STORAGE . '/' . $id;
}
function project(string $id): array {
    $path = project_path($id) . '/project.json';
    if (!is_file($path)) fail('Проект не найден.', 404);
    $p = json_decode((string)file_get_contents($path), true);
    if (!is_array($p)) fail('Не удалось прочитать проект.', 500);
    return $p;
}
function save_project(array $p): void {
    $path = project_path($p['id']) . '/project.json';
    $temp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $json = json_encode($p, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR);
    if (file_put_contents($temp, $json, LOCK_EX) === false || !rename($temp, $path)) fail('Не удалось сохранить проект.', 500);
}
function projects(): array {
    $list = [];
    foreach (glob(STORAGE . '/*/project.json') ?: [] as $file) {
        $p = json_decode((string)file_get_contents($file), true);
        if (is_array($p)) $list[] = $p;
    }
    usort($list, function ($a, $b) { return strcmp($b['created'], $a['created']); });
    return $list;
}
function uid(string $parent): string {
    do { $id = bin2hex(random_bytes(3)); } while (file_exists($parent . '/' . $id));
    return $id;
}
function text_field(string $key, int $max = 500): string {
    $value = $_POST[$key] ?? '';
    if (!is_string($value) || strlen($value) > $max * 4 || preg_match('/[\x00-\x08\x0b\x0c\x0e-\x1f]/', $value)) fail('Некорректное поле: ' . $key);
    return trim($value);
}
function item_url(array $p, string $type, array $item): string { return '/pro/' . $p['id'] . '/' . $type . '/' . ($type === 'doc' ? $item['id'] . '/download' : '?item=' . $item['id']); }
function asset_url(array $p, string $type, array $item, string $kind): string { return '/pro/' . $p['id'] . '/' . $type . '/' . $item['id'] . ($kind === 'source' ? ($type === '3d' ? '.glb' : '.' . $item['extension']) : '-' . $kind . '.jpg'); }
function find_item(array $p, string $type, string $id): array {
    foreach ($p['items'][$type] ?? [] as $item) if ($item['id'] === $id) return $item;
    fail('Объект не найден.', 404);
}
function start_item(array $p, string $type): ?array {
    $items = $p['items'][$type] ?? [];
    foreach ($items as $item) if ($item['id'] === ($p['start'][$type] ?? '')) return $item;
    return $items[0] ?? null;
}
function project_image(array $p): string {
    $cover = $p['cover'] ?? '';
    foreach (['360', '3d'] as $type) foreach ($p['items'][$type] as $item) {
        if ($cover === $type . '/' . $item['id']) return asset_url($p, $type, $item, 'og');
    }
    foreach (['360', '3d'] as $type) { $item = start_item($p, $type); if ($item) return asset_url($p, $type, $item, 'og'); }
    return '/assets/project-cover.jpg';
}
function size_label(int $bytes): string {
    foreach (['Б', 'КБ', 'МБ', 'ГБ'] as $unit) { if ($bytes < 1024 || $unit === 'ГБ') return round($bytes, $unit === 'Б' ? 0 : 1) . ' ' . $unit; $bytes /= 1024; }
    return '';
}
function public_headers(): void {
    header('X-Content-Type-Options: nosniff'); header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header("Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
}
function head_tags(string $title, string $description, string $image, string $path): void {
    $description = $description !== '' ? $description : 'Панорамы 360°, 3D-модели и документы проекта.';
    echo '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . e($title) . ' — ROOM26</title><meta name="description" content="' . e($description) . '">';
    foreach (['og:type'=>'website', 'og:locale'=>'ru_RU', 'og:site_name'=>'ROOM26', 'og:title'=>$title, 'og:description'=>$description, 'og:url'=>SITE_URL.$path, 'og:image'=>SITE_URL.$image, 'og:image:secure_url'=>SITE_URL.$image, 'og:image:type'=>'image/jpeg', 'og:image:width'=>'1200', 'og:image:height'=>'630', 'og:image:alt'=>$title, 'twitter:card'=>'summary_large_image', 'twitter:title'=>$title, 'twitter:description'=>$description, 'twitter:image'=>SITE_URL.$image] as $name=>$value) {
        echo '<meta ' . (strpos($name, 'og:') === 0 ? 'property' : 'name') . '="' . e($name) . '" content="' . e($value) . '">';
    }
    echo '<link rel="canonical" href="' . e(SITE_URL.$path) . '"><link rel="stylesheet" href="/assets/site.css">';
}
function json_script(string $id, $data): void { echo '<script type="application/json" id="'.e($id).'">'.json_encode($data, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script>'; }
