<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
public_headers();
try {
    if(!isset($_GET['p'],$_GET['item'])||!is_string($_GET['p'])||!is_string($_GET['item']))fail('Файл не найден.',404);
    $p=project($_GET['p']);$item=find_item($p,'doc',$_GET['item']);
    $source=project_path($p['id']).'/doc/'.$item['id'].'.bin';
    if(!is_file($source))fail('Файл не найден.',404);
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="download.bin"; filename*=UTF-8\'\''.rawurlencode($item['filename']));
    header('Content-Length: '.filesize($source));header('Cache-Control: public, max-age=86400');
    if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);
} catch(Throwable $error) {http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Файл не найден.';}
