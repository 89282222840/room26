<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();
try{
    if(!isset($_GET['p'],$_GET['file'])||!is_string($_GET['p'])||!is_string($_GET['file']))fail('Фото не найдено.',404);
    $p=project($_GET['p']);$item=document_by_filename(photo_project($p),$_GET['file']);
    if(!in_array($item['extension'],['jpg','png','webp','gif','avif'],true)||strpos($item['mime'],'image/')!==0)fail('Фото не найдено.',404);
    $source=project_path($p['id']).'/photo/'.asset_filename('photo',$item,'source');if(!is_file($source))fail('Фото не найдено.',404);
    $version=photo_cache_version($item);$mtime=(int)filemtime($source);$size=(int)filesize($source);$etag='"'.$item['id'].'-'.$version.'-'.$size.'-'.$mtime.'"';
    header('Content-Type: '.$item['mime']);header('ETag: '.$etag);header('Last-Modified: '.gmdate('D, d M Y H:i:s',$mtime).' GMT');header_remove('Content-Disposition');
    if(($_GET['v']??null)===$version){header('Cache-Control: public, max-age=31536000, immutable');header('Expires: '.gmdate('D, d M Y H:i:s',time()+31536000).' GMT');}
    else{header('Cache-Control: no-cache');header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');}
    $noneMatch=$_SERVER['HTTP_IF_NONE_MATCH']??null;$modifiedSince=$_SERVER['HTTP_IF_MODIFIED_SINCE']??null;
    if(($noneMatch!==null&&(trim($noneMatch)==='*'||in_array($etag,array_map(function($tag){return preg_replace('/^W\//','',trim($tag));},explode(',',$noneMatch)),true)))||($noneMatch===null&&$modifiedSince!==null&&strtotime($modifiedSince)!==false&&strtotime($modifiedSince)>=$mtime)){http_response_code(304);exit;}
    header('Content-Length: '.$size);
    if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);
}catch(Throwable $error){http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Фото не найдено.';}
