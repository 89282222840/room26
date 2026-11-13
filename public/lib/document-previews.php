<?php
declare(strict_types=1);
function document_extension(array $item): string {
    $ext=strtoupper(pathinfo($item['filename'],PATHINFO_EXTENSION));if($ext==='JPEG')$ext='JPG';
    return preg_match('/^[A-Z0-9]{1,10}$/D',$ext)?$ext:'FILE';
}
function document_color(string $ext): string {return ['PDF'=>'#ce4141','RVT'=>'#2569ad','DWG'=>'#b74538','JPG'=>'#8056b3','PNG'=>'#25836d'][$ext]??'#526879';}
function document_icon_svg(string $ext): string {
    $ext=preg_match('/^[A-Z0-9]{1,10}$/D',$ext)?$ext:'FILE';$color=document_color($ext);$font=strlen($ext)>5?42:64;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><rect width="600" height="450" fill="#e7edf2"/><path d="M202 62h143l63 64v258H202z" fill="#cbd5df" transform="translate(7 7)"/><path d="M202 62h143l63 64v258H202z" fill="white"/><path d="M345 62v64h63" fill="#d9e3eb"/><rect x="168" y="216" width="268" height="104" rx="12" fill="'.$color.'"/><text x="302" y="287" text-anchor="middle" font-family="Arial,sans-serif" font-size="'.$font.'" font-weight="700" fill="white">'.$ext.'</text><path d="M232 154h82m-82 28h115m-115 167h115" stroke="#c7d3dd" stroke-width="8" stroke-linecap="round"/></svg>';
}
function document_preview_url(array $p,array $item): string {
    if(!empty($item['doc_preview']))return '/document-preview.php?'.http_build_query(['p'=>$p['id'],'item'=>$item['id'],'v'=>$item['doc_preview']]);
    if(in_array(document_extension($item),['JPG','PNG','GIF','WEBP','AVIF'],true))return document_source_url($p,$item);
    return '/document-icon.php?ext='.rawurlencode(document_extension($item));
}
function document_preview_attributes(array $p,array $item): string {
    $attributes=' data-document-fallback="/document-icon.php?ext='.rawurlencode(document_extension($item)).'"';
    if(document_extension($item)==='PDF'&&empty($item['doc_preview']))$attributes.=' data-document-source="'.e(document_source_url($p,$item)).'"';return $attributes;
}
function document_cover_types(array $p): array {
    $present=[];foreach($p['items']['doc'] as $item)$present[document_extension($item)]=true;$types=[];
    foreach(['PDF','RVT','DWG','JPG','PNG'] as $ext)if(isset($present[$ext])){$types[]=$ext;unset($present[$ext]);}
    foreach(array_keys($present) as $ext)$types[]=$ext;return array_slice($types,0,5);
}
function document_cover_url(array $p): string {return '/document-cover.php?p='.$p['id'].'&v='.substr(hash('sha256',implode('/',document_cover_types($p))),0,12);}
function document_cover_svg(array $p): string {
    $types=document_cover_types($p);if(!$types)$types=['FILE'];$n=count($types);$svg='<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450"><rect width="600" height="450" fill="#e7edf2"/>';
    for($i=$n-1;$i>=0;$i--){$ext=$types[$i];$angle=($i-($n-1)/2)*7;$x=220+($i-($n-1)/2)*57;$y=92+abs($i-($n-1)/2)*8;$color=document_color($ext);$svg.='<g transform="translate('.$x.' '.$y.') rotate('.$angle.' 85 130)"><rect x="5" y="6" width="170" height="260" rx="10" fill="#b9c7d3"/><rect width="170" height="260" rx="10" fill="white" stroke="#c2cfda" stroke-width="2"/><path d="M26 50h74M26 76h104M26 102h104" stroke="#d3dfe8" stroke-width="6"/><rect x="0" y="146" width="170" height="80" rx="5" fill="'.$color.'"/><text x="85" y="198" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="'.(strlen($ext)>5?22:38).'" fill="white">'.$ext.'</text><text x="142" y="28" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="12" fill="'.$color.'">'.$ext.'</text></g>';}
    return $svg.'</svg>';
}
