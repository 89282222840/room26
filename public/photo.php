<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();
try{
    if(!isset($_GET['p'],$_GET['file'])||!is_string($_GET['p'])||!is_string($_GET['file']))fail('Фото не найдено.',404);
    $p=project($_GET['p']);$item=document_by_filename(photo_project($p),$_GET['file']);
    if(!in_array($item['extension'],['jpg','png','webp','gif','avif'],true)||strpos($item['mime'],'image/')!==0)fail('Фото не найдено.',404);
    $source=project_path($p['id']).'/photo/'.$item['id'].'.'.$item['extension'];if(!is_file($source))fail('Фото не найдено.',404);
    header('Content-Type: '.$item['mime']);header('Content-Length: '.filesize($source));header('Cache-Control: no-cache');header_remove('Content-Disposition');
    if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);
}catch(Throwable $error){http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Фото не найдено.';}
