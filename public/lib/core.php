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
    $p['items']['photo']=$p['items']['photo']??[];
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
        if (is_array($p)) { $p['items']['photo']=$p['items']['photo']??[]; $list[] = $p; }
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
function document_base_name(string $name): string {
    // Keep dots and file extensions, but avoid URL path segments such as . and ...
    $name = basename(str_replace(chr(92), '/', $name));
    return $name === '' || $name[0] === '.' ? 'file' . $name : $name;
}
function document_suffix(string $name, string $id): string {
    $extension = pathinfo($name, PATHINFO_EXTENSION);
    return ($extension === '' ? $name : substr($name, 0, -strlen($extension)-1)) . '-' . $id . ($extension === '' ? '' : '.' . $extension);
}
function document_filename(array $p, array $item): string {
    if (!empty($item['public_filename'])) return $item['public_filename'];
    $name = document_base_name($item['filename']);
    // Legacy uploads need no migration; duplicate names get stable ID suffixes.
    foreach ($p['items']['doc'] as $other) {
        if ($other['id'] === $item['id']) continue;
        if (in_array($name, $other['previous_filenames'] ?? [], true)) return document_suffix($name, $item['id']);
        if (!empty($other['public_filename'])) {
            if ($other['public_filename'] === $name) return document_suffix($name, $item['id']);
        } elseif (document_base_name($other['filename']) === $name
            && strcmp(($other['uploaded'] ?? '') . $other['id'], ($item['uploaded'] ?? '') . $item['id']) < 0) {
            return document_suffix($name, $item['id']);
        }
    }
    return $name;
}
function new_document_filename(array $p, array $item): string {
    $name = document_base_name($item['filename']);
    $used = [];
    foreach ($p['items']['doc'] as $other) {
        $used[] = document_filename($p, $other);
        foreach ($other['previous_filenames'] ?? [] as $alias) $used[] = $alias;
        if (empty($other['public_filename'])) $used[] = document_suffix(document_base_name($other['filename']), $other['id']);
    }
    if (in_array($name, $used, true)) $name = document_suffix($name, $item['id']);
    $candidate = $name; $n = 2;
    while (in_array($candidate, $used, true)) $candidate = document_suffix($name, (string)$n++);
    return $candidate;
}
function document_by_filename(array $p, string $filename): array {
    if ($filename === '' || strpos($filename, '/') !== false || strpos($filename, chr(92)) !== false) fail('Файл не найден.', 404);
    foreach ($p['items']['doc'] as $item) if (document_filename($p, $item) === $filename) return $item;
    foreach ($p['items']['doc'] as $item) if (in_array($filename, $item['previous_filenames'] ?? [], true)) return $item;
    // Keep an old collision-suffixed link valid after another legacy upload is removed.
    foreach ($p['items']['doc'] as $item) if (empty($item['public_filename']) && document_suffix(document_base_name($item['filename']), $item['id']) === $filename) return $item;
    fail('Файл не найден.', 404);
}
function photo_project(array $p): array { $p['items']['doc']=$p['items']['photo']??[];return $p; }
function photo_filename(array $p,array $item): string { return document_filename(photo_project($p),$item); }
function photo_caption(array $item): string { return $item['name'] ?: (pathinfo($item['filename'],PATHINFO_FILENAME) ?: $item['filename']); }
function item_url(array $p, string $type, array $item): string { if($type==='photo')return '/pro/'.$p['id'].'/photo/'.rawurlencode(photo_filename($p,$item)); return $type === 'doc' ? '/pro/' . $p['id'] . '/doc/' . rawurlencode(document_filename($p, $item)) : '/pro/' . $p['id'] . '/' . $type . '/?item=' . $item['id']; }
function asset_filename(string $type,array $item,string $kind): string {
    $id=$item['id'];$default=$id.($kind==='edges'?'-edges.bin':($kind==='source'?'.'.$item['extension']:'-'.$kind.'.jpg'));
    if(!in_array($type,['360','3d','photo'],true))return $default;
    $ext=$type==='3d'?'glb':($type==='photo'?'(?:jpg|png|webp|gif|avif)':'(?:jpg|png|webp)');
    if($kind==='source'&&!empty($item['source_file'])&&preg_match('/^'.$id.'-[a-f0-9]{12}\.'.$ext.'$/D',$item['source_file']))return $item['source_file'];
    if(in_array($kind,['thumb','og'],true)&&!empty($item['preview_file'])&&preg_match('/^'.$id.'-[a-f0-9]{12}$/D',$item['preview_file']))return $item['preview_file'].'-'.$kind.'.jpg';
    if($kind==='edges'&&$type==='3d'&&!empty($item['edge_file'])&&preg_match('/^'.$id.'-[a-f0-9]{12}-edges\.bin$/D',$item['edge_file']))return $item['edge_file'];
    return $default;
}
function asset_url(array $p, string $type, array $item, string $kind): string { return '/media.php?' . http_build_query(array_filter(['p'=>$p['id'], 'type'=>$type, 'item'=>$item['id'], 'kind'=>$kind, 'v'=>$kind==='edges'?($item['edge_revision']??null):($kind!=='source'?($item['preview_version']??null):($item['source_version']??null))],function($value){return $value!==null;}), '', '&', PHP_QUERY_RFC3986); }
function find_item(array $p, string $type, string $id): array {
    foreach ($p['items'][$type] ?? [] as $item) if ($item['id'] === $id) return $item;
    fail('Объект не найден.', 404);
}
function start_item(array $p, string $type): ?array {
    return $p['items'][$type][0] ?? null;
}
function project_image(array $p): string {
    foreach (['360', '3d', 'photo'] as $type) {
        $item = start_item($p, $type);
        if ($item) return asset_url($p, $type, $item, 'og');
    }
    return '/assets/project-cover.jpg';
}

function panorama_tour_status(array $p): array {
    $items=$p['items']['360'];$n=count($items);$mod=$n%100;$word=$mod>=11&&$mod<=14?'панорам':($n%10===1?'панорама':($n%10>=2&&$n%10<=4?'панорамы':'панорам'));
    $ids=array_fill_keys(array_column($items,'id'),true);$out=[];$in=[];$links=0;
    foreach($p['panorama_tour']['points']??[] as $source=>$list)foreach($list as $point){if(isset($ids[$source],$ids[$point['target']])){$out[$source][]=$point['target'];$in[$point['target']][]=(string)$source;$links++;}}
    $start=$p['panorama_tour']['start']??null;if(!isset($ids[$start??'']))$start=$items[0]['id']??null;
    $walk=function(array $edges)use($start):int{$seen=[];$todo=$start===null?[]:[$start];while($todo){$id=array_pop($todo);if(isset($seen[$id]))continue;$seen[$id]=true;foreach($edges[$id]??[] as $next)$todo[]=$next;}return count($seen);};
    $connected=$links>0&&$walk($out)===$n&&$walk($in)===$n;
    return ['count'=>$n.' '.$word,'label'=>$links===0?'без переходов':($connected?'тур связан':'есть разрывы'),'connected'=>$connected];
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
function asset_version(string $file): string { $path=__DIR__.'/../assets/'.$file;return is_file($path)?substr(hash_file('sha256',$path),0,12):'initial'; }
function css_url(): string { return '/assets/site.css?v=' . substr(hash_file('sha256', __DIR__ . '/../assets/site.css'), 0, 12); }
function head_tags(string $title, string $description, string $image, string $path): void {
    $description = $description !== '' ? $description : 'Панорамы 360°, 3D-модели и документы проекта.';
    echo '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . e($title) . ' — ROOM26</title><meta name="description" content="' . e($description) . '">';
    foreach (['og:type'=>'website', 'og:locale'=>'ru_RU', 'og:site_name'=>'ROOM26', 'og:title'=>$title, 'og:description'=>$description, 'og:url'=>SITE_URL.$path, 'og:image'=>SITE_URL.$image, 'og:image:secure_url'=>SITE_URL.$image, 'og:image:type'=>'image/jpeg', 'og:image:width'=>'1200', 'og:image:height'=>'630', 'og:image:alt'=>$title, 'twitter:card'=>'summary_large_image', 'twitter:title'=>$title, 'twitter:description'=>$description, 'twitter:image'=>SITE_URL.$image] as $name=>$value) {
        echo '<meta ' . (strpos($name, 'og:') === 0 ? 'property' : 'name') . '="' . e($name) . '" content="' . e($value) . '">';
    }
    echo '<link rel="canonical" href="' . e(SITE_URL.$path) . '"><link rel="stylesheet" href="' . e(css_url()) . '">';
}
function json_script(string $id, $data): void { echo '<script type="application/json" id="'.e($id).'">'.json_encode($data, JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES).'</script>'; }

require_once __DIR__.'/document-previews.php';
