<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
public_headers();
try {
    foreach (['p','type','item','kind'] as $field) if (!isset($_GET[$field]) || !is_string($_GET[$field])) fail('Файл не найден.',404);
    $type=$_GET['type'];$kind=$_GET['kind'];
    if(!in_array($type,['360','3d','photo'],true)||!in_array($kind,['thumb','og','source'],true))fail('Файл не найден.',404);
    $p=project($_GET['p']);$item=find_item($p,$type,$_GET['item']);
    $extension=$item['extension'];if(!in_array($extension,['jpg','png','webp','gif','avif','glb'],true))fail('Файл не найден.',404);
    $filename=$item['id'].($kind==='source'?'.'.$extension:'-'.$kind.'.jpg');
    $source=project_path($p['id']).'/'.$type.'/'.$filename;
    if(!is_file($source))fail('Файл не найден.',404);
    header('Content-Type: '.($kind==='source'?$item['mime']:'image/jpeg'));
    header('Content-Disposition: inline');header('Content-Length: '.filesize($source));header('Cache-Control: public, max-age=86400');
    if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);
} catch(Throwable $error) {http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Файл не найден.';}
