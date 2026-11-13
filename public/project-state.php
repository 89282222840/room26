<?php
declare(strict_types=1);
require __DIR__.'/lib/core.php';
public_headers();header('Content-Type: application/json; charset=utf-8');header('Cache-Control: no-cache');header('Expires: Thu, 01 Jan 1970 00:00:00 GMT');
try {
    $id=$_GET['p']??null;if(!is_string($id)||!valid_id($id)){http_response_code(400);echo '{"error":"invalid_project"}';exit;}
    if(!is_file(project_path($id).'/project.json')){http_response_code(410);echo '{"deleted":true}';exit;}
    $p=project($id);$items=[];
    foreach(['360','3d'] as $type)$items[$type]=public_viewer_items($p,$type);
    $items['photo']=array_map(function($item)use($p){return ['id'=>$item['id'],'source'=>photo_source_url($p,$item),'url'=>item_url($p,'photo',$item),'caption'=>photo_caption($item),'width'=>$item['width']??1200,'height'=>$item['height']??800];},$p['items']['photo']);
    $items['doc']=array_map(function($item)use($p){return ['id'=>$item['id'],'name'=>$item['filename'],'url'=>document_source_url($p,$item),'preview'=>document_preview_url($p,$item),'fallback'=>'/document-icon.php?ext='.rawurlencode(document_extension($item)),'pdf'=>document_extension($item)==='PDF'&&empty($item['doc_preview']),'info'=>size_label($item['size']).' · '.date('d.m.Y, H:i',strtotime($item['uploaded']))];},$p['items']['doc']);
    $body=json_encode(['project'=>$id,'items'=>$items,'panoramaTour'=>$p['panorama_tour']??null],JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_THROW_ON_ERROR);$etag='"'.hash('sha256',$body).'"';header('ETag: '.$etag);
    if(($_SERVER['HTTP_IF_NONE_MATCH']??'')===$etag){http_response_code(304);exit;}echo $body;
}catch(Throwable $error){http_response_code(503);echo '{"error":"temporarily_unavailable"}';}
