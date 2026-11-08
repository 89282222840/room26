<?php
declare(strict_types=1);
require __DIR__ . '/../lib/core.php';
// API never accepts credentials or redirects to a login page.
define('ROOM26_API', true);
require __DIR__ . '/../lib/auth.php';
if (!$authenticated) json_out(['error'=>'Войдите в админку.'], 401);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error'=>'Используйте POST.'], 405);
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) json_out(['error'=>'Размер запроса превышает лимит хостинга: ' . ini_get('post_max_size')], 413);
if (!isset($_POST['csrf']) || !is_string($_POST['csrf']) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) json_out(['error'=>'Обновите страницу и попробуйте снова.'], 403);
session_write_close();
function uploaded(string $field): array {
    $f = $_FILES[$field] ?? null;
    if (!$f || is_array($f['error']) || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Не удалось загрузить файл. Проверьте размер и лимиты хостинга.');
    if ((int)$f['size'] < 1) fail('Пустой файл.');
    return $f;
}
function jpeg_upload(string $field, string $target, int $width, int $height): void {
    $f = uploaded($field); $info = @getimagesize($f['tmp_name']);
    if ($f['size'] > 5*1024*1024 || !$info || $info[0] !== $width || $info[1] !== $height || $info[2] !== IMAGETYPE_JPEG) fail('Не удалось создать JPG-превью.');
    if (!move_uploaded_file($f['tmp_name'], $target) || !chmod($target, 0644)) fail('Не удалось сохранить превью.', 500);
}
function remove_tree(string $dir): void {
    foreach (new FilesystemIterator($dir, FilesystemIterator::SKIP_DOTS) as $f) {
        if ($f->isDir() && !$f->isLink()) remove_tree($f->getPathname()); else unlink($f->getPathname());
    }
    rmdir($dir);
}
$lock = null;
try {
    if (!is_dir(STORAGE) && !mkdir(STORAGE, 0755, true)) fail('Нет доступа к папке проектов.', 500);
    chmod(STORAGE, 0755);
    $lock = fopen(STORAGE . '/.write.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) fail('Не удалось заблокировать запись.', 503);
    $action = text_field('action', 30);
    if ($action === 'create') {
        $name = text_field('name', 200); if ($name === '') fail('Введите название проекта.');
        $id = uid(STORAGE); $dir = project_path($id);
        if (!mkdir($dir, 0755)) fail('Не удалось создать проект.', 500);
        chmod($dir, 0755);
        foreach (['360','3d','doc'] as $type) { mkdir($dir . '/' . $type, 0755); chmod($dir . '/' . $type, 0755); }
        $p = ['id'=>$id, 'name'=>$name, 'description'=>'', 'created'=>date(DATE_ATOM), 'items'=>['360'=>[], '3d'=>[], 'doc'=>[]]];
        save_project($p);
    } else {
        $p = project(text_field('project', 6));
        if ($action === 'delete_project') {
            remove_tree(project_path($p['id']));
            flock($lock, LOCK_UN); fclose($lock); $lock = null;
            json_out(['deleted'=>true]);
        } elseif ($action === 'save') {
            $name = text_field('name', 200); if ($name === '') fail('Введите название проекта.');
            $p['name'] = $name; $p['description'] = text_field('description', 2000);
            save_project($p);
        } elseif ($action === 'upload') {
            $type = text_field('type', 3); if (!in_array($type, ['360','3d','doc'],true)) fail('Неверный раздел.');
            $file = uploaded('file');
            $filename = basename(str_replace('\\', '/', $file['name']));
            $filename = preg_replace('/[\x00-\x1f\x7f]/', '', $filename);
            if ($filename === '' || strlen($filename) > 700) fail('Недопустимое имя файла.');
            if ($type === '360') {
                $info = @getimagesize($file['tmp_name']);
                if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP],true)) fail('Панорама должна быть JPG, PNG или WebP.');
                if (abs($info[0] / $info[1] - 2) > 0.1) fail('Нужна эквидистантная панорама с соотношением сторон 2:1.');
                $mime = $info['mime'];
            } elseif ($type === '3d') {
                $handle = fopen($file['tmp_name'], 'rb'); $header = fread($handle, 12); fclose($handle);
                if (strlen($header)!==12 || substr($header,0,4)!=='glTF') fail('Загрузите модель в формате GLB.');
                $glb = unpack('Vversion/Vlength', substr($header,4));
                if ($glb['version'] !== 2 || $glb['length'] !== (int)$file['size']) fail('Повреждённый GLB-файл.');
                $mime = 'model/gltf-binary';
            } else $mime = 'application/octet-stream';
            $parent = project_path($p['id']) . '/' . $type;
            $existingIds = array_column($p['items'][$type], 'id');
            do { $id = bin2hex(random_bytes(3)); } while (in_array($id, $existingIds, true));
            $prefix = $parent . '/' . $id;
            $extension = $type === 'doc' ? 'bin' : ($type === '3d' ? 'glb' : [IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_WEBP=>'webp'][$info[2]]);
            try {
                if ($type !== 'doc') { jpeg_upload('thumb',$prefix.'-thumb.jpg',400,200); jpeg_upload('og',$prefix.'-og.jpg',1200,630); }
                if (!move_uploaded_file($file['tmp_name'], $prefix.'.'.$extension)) fail('Не удалось сохранить файл.',500);
                if (!chmod($prefix.'.'.$extension, $type === 'doc' ? 0600 : 0644)) fail('Не удалось установить права файла.', 500);
                $name = $type === 'doc' ? $filename : pathinfo($filename, PATHINFO_FILENAME);
                $item = ['id'=>$id, 'name'=>$name, 'filename'=>$filename, 'size'=>(int)$file['size'], 'mime'=>$mime, 'extension'=>$extension, 'uploaded'=>date(DATE_ATOM)];
                $p['items'][$type][] = $item;
                save_project($p);
            } catch (Throwable $error) { foreach (glob($prefix . '.*') ?: [] as $path) unlink($path); foreach (glob($prefix . '-*.jpg') ?: [] as $path) unlink($path); throw $error; }
        } elseif ($action === 'reorder') {
            $type = text_field('type',3); if (!in_array($type,['360','3d','doc'],true)) fail('Неверный раздел.');
            $ids = json_decode(text_field('order', 100000),true);
            $items = $p['items'][$type]; $old = array_column($items,'id');
            if (!is_array($ids) || count($ids)!==count($old) || count(array_unique($ids))!==count($old) || array_diff($ids,$old)) fail('Список изменился. Обновите страницу.');
            $map = array_column($items,null,'id'); $p['items'][$type]=array_map(function($id)use($map){return $map[$id];},$ids); save_project($p);
        } elseif ($action === 'rename') {
            $type = text_field('type',3); if (!in_array($type,['3d','doc'],true)) fail('Название панорамы соответствует имени файла.');
            $id=text_field('item',6);find_item($p,$type,$id);$name=text_field('name',200);if($name==='')fail('Введите название.');
            foreach($p['items'][$type] as &$item)if($item['id']===$id)$item['name']=$name;unset($item);save_project($p);
        } elseif ($action === 'delete_item') {
            $type=text_field('type',3);if(!in_array($type,['360','3d','doc'],true))fail('Неверный раздел.');
            $id=text_field('item',6);find_item($p,$type,$id);
            $p['items'][$type]=array_values(array_filter($p['items'][$type],function($item)use($id){return $item['id']!==$id;}));
            save_project($p);$prefix=project_path($p['id']).'/'.$type.'/'.$id;foreach(array_merge(glob($prefix.'.*')?:[],glob($prefix.'-*.jpg')?:[]) as $path)unlink($path);
        } else fail('Неизвестное действие.');
    }
    flock($lock,LOCK_UN);fclose($lock);$lock=null;
    json_out(['project'=>$p]);
} catch (Throwable $error) {
    if (is_resource($lock)) { flock($lock,LOCK_UN);fclose($lock); }
    $code = $error instanceof RuntimeException && in_array($error->getCode(),[400,401,403,404,409,413,429,500,503],true) ? $error->getCode() : 500;
    json_out(['error'=>$code===500 ? 'Не удалось сохранить изменения. Проверьте свободное место и права записи на хостинге.' : $error->getMessage()],$code);
}
