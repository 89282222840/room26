<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();try{$p=project(is_string($_GET['p']??null)?$_GET['p']:'');$svg=document_cover_svg($p);header('Content-Type: image/svg+xml; charset=utf-8');header('Cache-Control: no-cache');echo $svg;}catch(Throwable $e){http_response_code(404);}
