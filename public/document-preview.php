<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();try{$p=project(is_string($_GET['p']??null)?$_GET['p']:'');$item=find_item($p,'doc',is_string($_GET['item']??null)?$_GET['item']:'');$path=project_path($p['id']).'/doc/'.$item['id'].'-thumb.jpg';if(empty($item['doc_preview'])||!is_file($path))fail('Эскиз не найден.',404);header('Content-Type: image/jpeg');if(!media_cache_headers($path,(string)$item['doc_preview']))exit;if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($path);}catch(Throwable $e){http_response_code(404);}
