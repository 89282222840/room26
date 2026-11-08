<?php
declare(strict_types=1);
function document_mime(string $filename): string {
    $types = [
        'pdf'=>'application/pdf', 'jpg'=>'image/jpeg', 'jpeg'=>'image/jpeg', 'png'=>'image/png',
        'gif'=>'image/gif', 'webp'=>'image/webp', 'avif'=>'image/avif', 'bmp'=>'image/bmp',
        'tif'=>'image/tiff', 'tiff'=>'image/tiff', 'ico'=>'image/x-icon',
        'txt'=>'text/plain; charset=utf-8', 'csv'=>'text/csv; charset=utf-8', 'json'=>'application/json',
        'xml'=>'text/plain; charset=utf-8', 'html'=>'text/plain; charset=utf-8', 'htm'=>'text/plain; charset=utf-8',
        'svg'=>'text/plain; charset=utf-8', 'js'=>'text/plain; charset=utf-8', 'css'=>'text/plain; charset=utf-8',
        'php'=>'text/plain; charset=utf-8', 'phtml'=>'text/plain; charset=utf-8',
        'doc'=>'application/msword', 'docx'=>'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls'=>'application/vnd.ms-excel', 'xlsx'=>'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt'=>'application/vnd.ms-powerpoint', 'pptx'=>'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'dwg'=>'image/vnd.dwg', 'dxf'=>'image/vnd.dxf', 'zip'=>'application/zip', 'rar'=>'application/vnd.rar',
        '7z'=>'application/x-7z-compressed', 'mp4'=>'video/mp4', 'webm'=>'video/webm', 'mp3'=>'audio/mpeg', 'wav'=>'audio/wav',
    ];
    return $types[strtolower(pathinfo($filename,PATHINFO_EXTENSION))] ?? 'application/octet-stream';
}
function serve_document(array $p, array $item): void {
    $source=project_path($p['id']).'/doc/'.$item['id'].'.bin';
    if(!is_file($source))fail('Файл не найден.',404);
    $size=filesize($source);$start=0;$end=max(0,$size-1);
    $etag='"'.$item['id'].'-'.$size.'-'.filemtime($source).'"';
    header('Content-Type: '.document_mime($item['filename']));
    // No attachment/download header: the browser handles the actual content type.
    header_remove('Content-Disposition');
    header('X-Content-Type-Options: nosniff');
    header_remove('Content-Security-Policy');
    header('Cache-Control: no-cache');header('ETag: '.$etag);header('Accept-Ranges: bytes');
    if (!isset($_SERVER['HTTP_RANGE']) && ($_SERVER['HTTP_IF_NONE_MATCH']??'')===$etag) {http_response_code(304);exit;}
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range=$_SERVER['HTTP_RANGE'];$valid=preg_match('/^bytes=(\d*)-(\d*)$/D',$range,$match);
        if($valid && ($match[1]!=='' || $match[2]!=='')) {
            if($match[1]===''){$start=max(0,$size-(int)$match[2]);}else{$start=(int)$match[1];if($match[2]!=='')$end=min($end,(int)$match[2]);}
        } else $start=$size;
        if($size===0 || $start>$end || $start>=$size || ($valid && $match[1]==='' && (int)$match[2]===0)) {
            http_response_code(416);header('Content-Range: bytes */'.$size);header('Content-Length: 0');exit;
        }
        http_response_code(206);header('Content-Range: bytes '.$start.'-'.$end.'/'.$size);
    }
    $remaining=$size===0?0:$end-$start+1;header('Content-Length: '.$remaining);
    if($_SERVER['REQUEST_METHOD']==='HEAD')exit;
    $handle=fopen($source,'rb');if(!$handle)fail('Файл не найден.',404);
    if($start>0)fseek($handle,$start);
    while($remaining>0 && !feof($handle) && !connection_aborted()){
        $data=fread($handle,min(1048576,$remaining));if($data===false||$data==='')break;
        echo $data;$remaining-=strlen($data);
    }
    fclose($handle);exit;
}
