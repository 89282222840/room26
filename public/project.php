<?php
declare(strict_types=1);
require __DIR__ . '/lib/core.php';
require __DIR__ . '/lib/documents.php';
function panorama_control_icon(string $name): string {
    $arrow=in_array($name,['next','previous'],true);$desktop=$arrow?64:60;$desktopHeight=$arrow?48:60;$mobile=$arrow?39:40;$base='/assets/panorama-ui/';
    return '<span class="panorama-icon-art" aria-hidden="true"><img class="panorama-icon-desktop" src="'.$base.'desktop-'.$name.'.svg" width="'.$desktop.'" height="'.$desktopHeight.'" alt="" draggable="false"><img class="panorama-icon-mobile" src="'.$base.'mobile-'.$name.'.svg" width="'.$mobile.'" height="40" alt="" draggable="false"></span>';
}
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
            $stored=asset_filename($type,$item,$suffix===''?'source':($suffix==='-thumb'?'thumb':'og'));
            $source=project_path($p['id']).'/'.$type.'/'.$stored;$mime=$suffix!==''?'image/jpeg':$item['mime'];$disposition='inline';
        } else fail('Файл не найден.',404);
        if(!is_file($source))fail('Файл не найден.',404);
        header('Content-Type: '.$mime);header('Content-Disposition: '.$disposition);
        if(!media_cache_headers($source,asset_cache_version($item,$suffix===''?'source':($suffix==='-thumb'?'thumb':'og'))))exit;
        if($_SERVER['REQUEST_METHOD']!=='HEAD')readfile($source);exit;
    }
    $showProjectLink = ((int)!empty($p['items']['360']) + (int)!empty($p['items']['3d']) + (int)!empty($p['items']['doc']) + (int)!empty($p['items']['photo'])) > 1;
    $base='/pro/'.$p['id'].'/';$canonical=$base.($type!==''?$type.'/':'');
    $current=null;$items=[];
    if(in_array($type,['360','3d'],true)) {
        $id=$_GET['item']??'';if(!is_string($id))fail('Объект не найден.',404);
        $current=$id!==''?find_item($p,$type,$id):start_item($p,$type);
        if($id===''&&$type==='360'&&!empty($p['panorama_tour']['start'])){foreach($p['items']['360'] as $candidate)if($candidate['id']===$p['panorama_tour']['start'])$current=$candidate;}
        if(!$current)fail('В этом разделе пока нет объектов.',404);
        if($id!=='')$canonical.='?item='.$current['id'];
        foreach($p['items'][$type] as $item)$items[]=['id'=>$item['id'],'name'=>$item['name'],'url'=>item_url($p,$type,$item),'thumb'=>asset_url($p,$type,$item,'thumb'),'og'=>asset_url($p,$type,$item,'og'),'source'=>asset_url($p,$type,$item,'source'),'views'=>$item['views']??null,'tour'=>$type==='3d'?($item['tour']??null):null,'edgeCache'=>$type==='3d'&&($item['edge_version']??0)===5?asset_url($p,'3d',$item,'edges'):null];
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

<?php if($current): ?><link rel="stylesheet" href="/assets/panorama-ui.css?v=<?=e(asset_version('panorama-ui.css'))?>"><?php endif ?>
<?php if($current&&$type==='3d'): ?><link rel="stylesheet" href="/assets/model-ui.css?v=<?=e(asset_version('model-ui.css'))?>"><?php endif ?>
</head><body class="<?=$current?'viewer-page panorama-page'.($type==='3d'?' model-page':''):''?>">
<?php if($current): ?>
<div id="viewer" class="viewer" aria-label="<?=e($type==='360'?'Просмотр панорамы':'Просмотр 3D-модели')?>"></div><div id="object-title" <?=$type==='3d'?'hidden':''?> class="viewer-title<?=$type==='360'?' panorama-title':''?>"><?=e($current['name'])?></div><div id="viewer-status" class="viewer-status<?=$type==='3d'?' is-loading':''?>" role="status"><?php if($type==='3d'): ?>Загрузка<span class="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span><?php else: ?>Загрузка…<?php endif ?></div>
<?php if($type==='360'): ?>
<?php if($showProjectLink): ?><a class="panorama-back panorama-icon-button" href="<?=e($base)?>" aria-label="Вернуться к проекту"><?=panorama_control_icon('back')?></a><?php endif ?>
<?php if(count($items)>1): ?><nav class="viewer-controls panorama-controls" aria-label="Управление панорамой"><button type="button" id="previous" class="panorama-icon-button" aria-label="Предыдущая панорама"><?=panorama_control_icon('previous')?></button><button type="button" id="show-list" aria-haspopup="dialog" aria-controls="object-list" aria-expanded="false">Вид</button><button type="button" id="next" class="panorama-icon-button" aria-label="Следующая панорама"><?=panorama_control_icon('next')?></button></nav><?php endif ?>
<dialog id="object-list" class="panorama-picker" aria-labelledby="panorama-picker-title">
<div class="panorama-picker-shade" aria-hidden="true"></div>
<button type="button" id="close-list" class="panorama-picker-close panorama-icon-button" aria-label="Закрыть выбор панорамы" autofocus><?=panorama_control_icon('close')?></button>
<section class="panorama-sheet"><h2 id="panorama-picker-title" class="panorama-sr-only">Выбор панорамы</h2><div class="panorama-sheet-handle" role="button" tabindex="0" aria-label="Потяните вниз, чтобы закрыть список панорам"><span></span></div>
<div class="panorama-sheet-scroll"><div class="panorama-picker-grid"><?php foreach($items as $item): ?><button type="button" class="select-item" data-item="<?=e($item['id'])?>" aria-current="<?=$item['id']===$current['id']?'true':'false'?>"><img width="400" height="200" src="<?=e($item['thumb'])?>" alt="" loading="lazy" draggable="false"><span><?=e($item['name'])?></span></button><?php endforeach ?></div></div></section></dialog>
<?php else: ?>
<?php if($showProjectLink): ?><a class="panorama-back panorama-icon-button" href="<?=e($base)?>" aria-label="Вернуться к проекту"><?=panorama_control_icon('back')?></a><?php endif ?>
<nav class="viewer-controls panorama-controls model-controls" aria-label="Управление 3D-моделью" hidden>
<?php if(count($items)>1): ?><button type="button" id="show-list" aria-haspopup="dialog" aria-controls="object-list" aria-expanded="false">Модель</button><?php endif ?>
<button type="button" id="model-tour" aria-label="Точки виртуального тура" aria-pressed="false" hidden>Тур</button>
<button type="button" id="floor-grid" aria-label="Размерная сетка" title="Размерная сетка" aria-pressed="false" hidden>Сетка</button>
</nav>
<dialog id="object-list" class="panorama-picker model-picker" aria-labelledby="model-picker-title">
<div class="panorama-picker-shade" aria-hidden="true"></div>
<button type="button" id="close-list" class="panorama-picker-close panorama-icon-button" aria-label="Закрыть выбор модели" autofocus><?=panorama_control_icon('close')?></button>
<section class="panorama-sheet"><h2 id="model-picker-title" class="panorama-sr-only">Выбор 3D-модели</h2><div class="panorama-sheet-handle" role="button" tabindex="0" aria-label="Потяните вниз, чтобы закрыть список моделей"><span></span></div>
<div class="panorama-sheet-scroll"><div class="panorama-picker-grid"><?php foreach($items as $item): ?><button type="button" class="select-item" data-item="<?=e($item['id'])?>" aria-current="<?=$item['id']===$current['id']?'true':'false'?>"><img width="400" height="200" src="<?=e($item['thumb'])?>" alt="" loading="lazy" draggable="false"><span><?=e($item['name'])?></span></button><?php endforeach ?></div></div></section></dialog>
<?php endif ?>
<?php json_script('viewer-config',['type'=>$type,'items'=>$items,'current'=>$current['id'],'chooseModelOnStart'=>$type==='3d'&&count($items)>1&&($_GET['item']??'')==='','panoramaTour'=>$type==='360'?($p['panorama_tour']??null):null,'projectName'=>$p['name'],'description'=>$description,'versions'=>['model'=>asset_version('model.js'),'panorama'=>asset_version('panorama.js')]]); ?><script type="module" src="/assets/viewer.js?v=<?=e(substr(hash_file('sha256', __DIR__.'/assets/viewer.js'),0,12))?>"></script>
<noscript><div class="viewer-status">Для просмотра включите JavaScript в браузере.</div></noscript>
<?php else: ?>
<main class="shell<?=$type==='photo'?' photo-shell':''?>"><header class="topbar"><span class="brand">ROOM26 / 360</span><?php if(in_array($type,['doc','photo'],true) && $showProjectLink): ?><a href="<?=e($base)?>">← Проект</a><?php endif ?></header><h1><?=e($type==='doc'?'Документы':($type==='photo'?'Фото':$p['name']))?></h1>
<?php if($type==='photo'): ?><p class="muted"><?=e($p['name'])?></p>
<div class="photo-gallery"><?php foreach($p['items']['photo'] as $index=>$photo): ?><a class="photo-gallery-link" href="<?=e(item_url($p,'photo',$photo))?>" data-photo-index="<?=$index?>" aria-label="<?=e(photo_caption($photo))?>"><img src="<?=e(photo_source_url($p,$photo))?>" alt="<?=e(photo_caption($photo))?>" width="<?=(int)($photo['width']??1200)?>" height="<?=(int)($photo['height']??800)?>" loading="lazy" decoding="async"><span class="photo-caption"><?=e(photo_caption($photo))?></span></a><?php endforeach ?></div>
<dialog id="photo-lightbox" class="photo-lightbox" aria-label="Полноэкранный просмотр фото"><button type="button" class="photo-lightbox-close" id="photo-lightbox-close" aria-label="Закрыть фото" autofocus>×</button><figure class="photo-lightbox-figure" id="photo-lightbox-figure"><img id="photo-lightbox-image" alt=""><figcaption class="photo-caption" id="photo-lightbox-caption"></figcaption></figure><div id="photo-lightbox-status" class="photo-lightbox-status" role="status" hidden>Загрузка…</div><?php if(count($p['items']['photo'])>1): ?><button type="button" class="photo-lightbox-arrow photo-prev" id="photo-prev" aria-label="Предыдущее фото">←</button><button type="button" class="photo-lightbox-arrow photo-next" id="photo-next" aria-label="Следующее фото">→</button><?php endif ?></dialog>
<?php json_script('photo-config',array_map(function($photo)use($p){return ['source'=>photo_source_url($p,$photo),'caption'=>photo_caption($photo)];},$p['items']['photo'])); ?><script type="module" src="/assets/photos.js?v=<?=e(asset_version('photos.js'))?>"></script>
<?php elseif($type==='doc'): ?><p class="muted"><?=e($p['name'])?></p><div class="document-gallery"><?php foreach($p['items']['doc'] as $item): ?><article class="document-card"><a class="document-card-image" href="<?=e(document_source_url($p,$item))?>"><img src="<?=e(document_preview_url($p,$item))?>"<?=document_preview_attributes($p,$item)?> width="400" height="300" alt="" loading="lazy"></a><a class="document-card-name" href="<?=e(document_source_url($p,$item))?>"><?=e($item['filename'])?></a><a class="document-card-download" href="<?=e(document_source_url($p,$item).'&download=1')?>" download="<?=e($item['filename'])?>">Скачать</a><div class="muted small"><?=e(size_label($item['size']))?> · <?=e(date('d.m.Y, H:i',strtotime($item['uploaded'])))?></div></article><?php endforeach ?></div><?php if(!$p['items']['doc']): ?><p class="empty">Пока нет документов.</p><?php endif ?><script type="module" src="/assets/documents.js?v=<?=e(asset_version('documents.js'))?>"></script>
<?php else: ?>
<?php if($p['description']!==''): ?><p class="project-description muted"><?=e($p['description'])?></p><?php endif ?><div class="grid">
<?php foreach(['360'=>'Виртуальный тур','3d'=>'3D-модели'] as $kind=>$label):$kind=(string)$kind;$first=start_item($p,$kind);if(!$first)continue; ?><a class="card entry" href="<?=e($base.$kind.'/')?>"><img width="400" height="200" src="<?=e(asset_url($p,$kind,$first,'thumb'))?>" alt=""><h2><?=e($label)?></h2><span class="muted"><?=count($p['items'][$kind])?> объектов</span><span class="arrow">Открыть →</span></a><?php endforeach ?>
<?php if($p['items']['photo']):$firstPhoto=$p['items']['photo'][0]; ?><a class="card entry" href="<?=e($base)?>photo/"><img src="<?=e(photo_source_url($p,$firstPhoto))?>" alt="Фото" loading="lazy"><h2>Фото</h2><span class="muted"><?=count($p['items']['photo'])?> фото</span><span class="arrow">Открыть →</span></a><?php endif ?>
<?php if($p['items']['doc']): ?><a class="card entry" href="<?=e($base)?>doc/"><img class="document-project-cover" width="600" height="450" src="<?=e(document_cover_url($p))?>" alt=""><h2>Документы</h2><span class="muted"><?=count($p['items']['doc'])?> файлов</span><span class="arrow">Открыть →</span></a><?php endif ?></div>
<?php if(!$p['items']['360']&&!$p['items']['3d']&&!$p['items']['doc']&&!$p['items']['photo']): ?><p class="empty">Материалы проекта скоро появятся.</p><?php endif ?>
<?php endif ?></main><?php endif ?></body></html>
