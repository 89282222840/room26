<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
public_headers();
try {
    foreach (['p','type','item','kind'] as $field) if (!isset($_GET[$field]) || !is_string($_GET[$field])) fail('Файл не найден.',404);
    $type=$_GET['type'];$kind=$_GET['kind'];
    if(!in_array($type,['360','3d','photo'],true)||!in_array($kind,['thumb','og','source','edges'],true))fail('Файл не найден.',404);
    $p=project($_GET['p']);$item=find_item($p,$type,$_GET['item']);
    if($kind==='edges'&&($type!=='3d'||($item['edge_version']??0)!==5))fail('Файл не найден.',404);
    $extension=$item['extension'];if(!in_array($extension,['jpg','png','webp','gif','avif','glb'],true))fail('Файл не найден.',404);
    $filename=$item['id'].($kind==='edges'?'-edges.bin':($kind==='source'?'.'.$extension:'-'.$kind.'.jpg'));
    if($type==='360'){
        if($kind==='source'&&!empty($item['source_file'])&&preg_match('/^'.$item['id'].'-[a-f0-9]{12}\.(jpg|png|webp)$/D',$item['source_file']))$filename=$item['source_file'];
        elseif(in_array($kind,['thumb','og'],true)&&!empty($item['preview_file'])&&preg_match('/^'.$item['id'].'-[a-f0-9]{12}$/D',$item['preview_file']))$filename=$item['preview_file'].'-'.$kind.'.jpg';
    }
    $source=project_path($p['id']).'/'.$type.'/'.$filename;
    if(!is_file($source))fail('Файл не найден.',404);
    header('Content-Type: '.($kind==='edges'?'application/octet-stream':($kind==='source'?$item['mime']:'image/jpeg')));
    if($kind==='edges'){ $handle=fopen($source,'rb');$magic=fread($handle,2);fclose($handle);if($magic===chr(31).chr(139))header('Content-Encoding: gzip');}
    header('Content-Disposition: inline');header('Content-Length: '.filesize($source));header('Cache-Control: public, max-age=86400');
    if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);
} catch(Throwable $error) {http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Файл не найден.';}
