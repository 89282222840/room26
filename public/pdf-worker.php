<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';public_headers();$path=__DIR__.'/assets/vendor/pdfjs/pdf.worker.min.js.gz';
header('Content-Type: application/javascript');header('Content-Encoding: gzip');header('Cache-Control: public, max-age=31536000, immutable');header('Content-Length: '.filesize($path));if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($path);
