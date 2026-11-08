<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/documents.php';
public_headers();
try {
    if(!isset($_GET['p']) || !is_string($_GET['p']))fail('Файл не найден.',404);
    $p=project($_GET['p']);
    if (isset($_GET['file']) && is_string($_GET['file'])) $item=document_by_filename($p,$_GET['file']);
    elseif(isset($_GET['item']) && is_string($_GET['item'])) $item=find_item($p,'doc',$_GET['item']);
    else fail('Файл не найден.',404);
    serve_document($p,$item);
} catch(Throwable $error) {http_response_code(404);header('Content-Type: text/plain; charset=utf-8');echo 'Файл не найден.';}
