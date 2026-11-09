<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/documents.php';
public_headers();
try {
    $path = parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);
    if (!is_string($path) || !preg_match('~^/pro/([a-f0-9]{6})(?:/(360|3d|doc|photo)(?:/([^/]+)(?:/(download))?)?)?/?$~D',$path,$matches)) fail('Страница не найдена.',404);
    $p=project($matches[1]);$type=$matches[2]??'';$file=$matches[3]??'';
    if ($file !== '') {
        if($type==='doc' && valid_id($file) && ($matches[4]??'')==='download') {
            serve_document($p, find_item($p, $type, $file));
        } elseif(in_array($type,['360','3d'],true) && preg_match('/^([a-f0-9]{6})(?:(-thumb|-og)\.jpg|\.(jpg|png|webp|glb))$/D',$file,$asset)) {
            $item=find_item($p,$type,$asset[1]);$suffix=$asset[2]??'';
            $expected=$item['id'].($suffix!==''?$suffix.'.jpg':'.'.$item['extension']);
            if($expected!==$file)fail('Файл не найден.',404);
            $source=project_path($p['id']).'/'.$type.'/'.$expected;$mime=$suffix!==''?'image/jpeg':$item['mime'];$disposition='inline';
        } else fail('Файл не найден.',404);
        if(!is_file($source))fail('Файл не найден.',404);
        header('Content-Type: '.$mime);header('Content-Disposition: '.$disposition);header('Content-Length: '.filesize($source));header('Cache-Control: public, max-age=86400');
        if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);exit;
    }
    $showProjectLink = ((int)!empty($p['items']['360']) + (int)!empty($p['items']['3d']) + (int)!empty($p['items']['doc']) + (int)!empty($p['items']['photo'])) > 1;
    $base='/pro/'.$p['id'].'/';$canonical=$base.($type!==''?$type.'/':'');
    $current=null;$items=[];
    if(in_array($type,['360','3d'],true)) {
        $id=$_GET['item']??'';if(!is_string($id))fail('Объект не найден.',404);
        $current=$id!==''?find_item($p,$type,$id):start_item($p,$type);
        if(!$current)fail('В этом разделе пока нет объектов.',404);
        if($id!=='')$canonical.='?item='.$current['id'];
        foreach($p['items'][$type] as $item)$items[]=['id'=>$item['id'],'name'=>$item['name'],'url'=>item_url($p,$type,$item),'thumb'=>asset_url($p,$type,$item,'thumb'),'og'=>asset_url($p,$type,$item,'og'),'source'=>asset_url($p,$type,$item,'source'),'views'=>$item['views']??null,'edgeCache'=>$type==='3d'&&($item['edge_version']??0)===2?asset_url($p,'3d',$item,'edges'):null];
    }
    if(substr($path,-1)!=='/') {header('Location: '.$canonical,true,301);exit;}
    $title=$current?$current['name']:($type==='doc'?'Документы — '.$p['name']:($type==='photo'?'Фото — '.$p['name']:$p['name']));
    $description=$p['description']?:($current?$p['name'].' — '.$current['name']:'Панорамы, 3D-модели и документы проекта «'.$p['name'].'».');
    $image=$current?asset_url($p,$type,$current,'og'):project_image($p);
    header('Content-Type: text/html; charset=utf-8');header('Cache-Control: no-cache');
} catch(Throwable $error) {
    http_response_code(404);echo '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Не найдено — ROOM26</title><link rel="stylesheet" href="/assets/site.css"><main class="shell"><h1>Страница не найдена</h1><p>Проверьте ссылку или уточните её у автора проекта.</p></main></html>';exit;
}
?>
<!doctype html><html lang="ru"><head><?php head_tags($title,$description,$image,$canonical); ?>

</head><body class="<?=$current?'viewer-page':''?>">
<?php if($current): ?>
<div id="viewer" class="viewer" aria-label="<?=e($type==='360'?'Просмотр панорамы':'Просмотр 3D-модели')?>"></div><div id="object-title" class="viewer-title"><?=e($current['name'])?></div><div id="viewer-status" class="viewer-status" role="status">Загрузка…</div>
<?php if($showProjectLink || count($items)>1 || $type==='3d'): ?><nav class="viewer-controls<?=$type==='3d'?' model-controls':''?>" aria-label="Управление просмотром"><?php if($showProjectLink): ?><a class="button secondary" href="<?=e($base)?>">Проект</a><?php endif ?><?php if(count($items)>1): ?><button id="previous" aria-label="Предыдущий объект">←</button><button id="next" aria-label="Следующий объект">→</button><?php endif ?><?php if(count($items)>1): ?><button id="show-list"><?=$type==='360'?'Все панорамы':'Все модели'?></button><?php endif ?><?php if($type==='3d'): ?><button id="floor-grid" aria-pressed="false" hidden>Сетка</button><?php endif ?></nav><?php endif ?>
<dialog id="object-list" class="dialog viewer-list"><div class="section-header"><h2><?=$type==='360'?'Панорамы 360°':'3D-модели'?></h2><button class="secondary" id="close-list">Закрыть</button></div><div class="grid"><?php foreach($items as $item): ?><button class="select-item" data-item="<?=e($item['id'])?>" aria-current="<?=$item['id']===$current['id']?'true':'false'?>"><img width="400" height="200" src="<?=e($item['thumb'])?>" alt="" loading="lazy"><span><?=e($item['name'])?></span></button><?php endforeach ?></div></dialog>
<?php json_script('viewer-config',['type'=>$type,'items'=>$items,'current'=>$current['id'],'projectName'=>$p['name'],'description'=>$description,'versions'=>['model'=>asset_version('model.js'),'panorama'=>asset_version('panorama.js')]]); ?><script type="module" src="/assets/viewer.js?v=<?=e(substr(hash_file('sha256', __DIR__.'/assets/viewer.js'),0,12))?>"></script>
<noscript><div class="viewer-status">Для просмотра включите JavaScript в браузере.</div></noscript>
<?php else: ?>
<main class="shell<?=$type==='photo'?' photo-shell':''?>"><header class="topbar"><span class="brand">ROOM26 / 360</span><?php if(in_array($type,['doc','photo'],true) && $showProjectLink): ?><a href="<?=e($base)?>">← Проект</a><?php endif ?></header><h1><?=e($type==='doc'?'Документы':($type==='photo'?'Фото':$p['name']))?></h1>
<?php if($type==='photo'): ?><p class="muted"><?=e($p['name'])?></p>
<div class="photo-gallery"><?php foreach($p['items']['photo'] as $index=>$photo): ?><a class="photo-gallery-link" href="<?=e(item_url($p,'photo',$photo))?>" data-photo-index="<?=$index?>" aria-label="<?=e(photo_caption($photo))?>"><img src="<?=e(item_url($p,'photo',$photo))?>" alt="<?=e(photo_caption($photo))?>" width="<?=(int)($photo['width']??1200)?>" height="<?=(int)($photo['height']??800)?>" loading="lazy" decoding="async"><span class="photo-caption"><?=e(photo_caption($photo))?></span></a><?php endforeach ?></div>
<dialog id="photo-lightbox" class="photo-lightbox" aria-label="Полноэкранный просмотр фото"><button type="button" class="photo-lightbox-close" id="photo-lightbox-close" aria-label="Закрыть фото" autofocus>×</button><figure class="photo-lightbox-figure" id="photo-lightbox-figure"><img id="photo-lightbox-image" alt=""><figcaption class="photo-caption" id="photo-lightbox-caption"></figcaption></figure><div id="photo-lightbox-status" class="photo-lightbox-status" role="status" hidden>Загрузка…</div><?php if(count($p['items']['photo'])>1): ?><button type="button" class="photo-lightbox-arrow photo-prev" id="photo-prev" aria-label="Предыдущее фото">←</button><button type="button" class="photo-lightbox-arrow photo-next" id="photo-next" aria-label="Следующее фото">→</button><?php endif ?></dialog>
<?php json_script('photo-config',array_map(function($photo)use($p){return ['source'=>item_url($p,'photo',$photo),'caption'=>photo_caption($photo)];},$p['items']['photo'])); ?><script type="module" src="/assets/photos.js?v=<?=e(asset_version('photos.js'))?>"></script>
<?php elseif($type==='doc'): ?><p class="muted"><?=e($p['name'])?></p><ul class="file-list"><?php foreach($p['items']['doc'] as $item): ?><li class="file-row"><div><a class="file-name" href="<?=e(item_url($p,'doc',$item))?>"><?=e($item['filename'])?></a><div class="muted small"><?=e(size_label($item['size']))?> · Загружен <?=e(date('d.m.Y H:i',strtotime($item['uploaded'])))?> МСК</div></div></li><?php endforeach ?></ul><?php if(!$p['items']['doc']): ?><p class="empty">Пока нет документов.</p><?php endif ?>
<?php else: ?>
<?php if($p['description']!==''): ?><p class="project-description muted"><?=e($p['description'])?></p><?php endif ?><div class="grid">
<?php foreach(['360'=>'Виртуальный тур','3d'=>'3D-модели'] as $kind=>$label):$kind=(string)$kind;$first=start_item($p,$kind);if(!$first)continue; ?><a class="card entry" href="<?=e($base.$kind.'/')?>"><img width="400" height="200" src="<?=e(asset_url($p,$kind,$first,'thumb'))?>" alt=""><h2><?=e($label)?></h2><span class="muted"><?=count($p['items'][$kind])?> объектов</span><span class="arrow">Открыть →</span></a><?php endforeach ?>
<?php if($p['items']['photo']):$firstPhoto=$p['items']['photo'][0]; ?><a class="card entry" href="<?=e($base)?>photo/"><img src="<?=e(item_url($p,'photo',$firstPhoto))?>" alt="Фото" loading="lazy"><h2>Фото</h2><span class="muted"><?=count($p['items']['photo'])?> фото</span><span class="arrow">Открыть →</span></a><?php endif ?>
<?php if($p['items']['doc']): ?><a class="card entry" href="<?=e($base)?>doc/"><h2>Документы</h2><span class="muted"><?=count($p['items']['doc'])?> файлов</span><span class="arrow">Открыть →</span></a><?php endif ?></div>
<?php if(!$p['items']['360']&&!$p['items']['3d']&&!$p['items']['doc']&&!$p['items']['photo']): ?><p class="empty">Материалы проекта скоро появятся.</p><?php endif ?>
<?php endif ?></main><?php endif ?></body></html>
