<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();$ext=isset($_GET['ext'])&&is_string($_GET['ext'])?strtoupper($_GET['ext']):'FILE';
header('Content-Type: image/svg+xml; charset=utf-8');header('Cache-Control: public, max-age=86400');echo document_icon_svg($ext);
