<?php
declare(strict_types=1);
require __DIR__ . '/../lib/core.php';
require __DIR__ . '/../lib/auth.php';
public_headers();
$selected = null;
if ($authenticated && isset($_GET['p']) && is_string($_GET['p'])) {
    try { $selected = project($_GET['p']); } catch (Throwable $ex) { http_response_code(404); $error = 'Проект не найден.'; }
}
$labels = ['360'=>'Виртуальный тур','3d'=>'3D-модели','doc'=>'Документы','photo'=>'Фото'];
?>
<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Админка — ROOM26</title><link rel="stylesheet" href="<?=e(css_url())?>"></head>
<body class="<?= $authenticated?'':'login' ?>">
<?php if (!$authenticated): ?>
<main><div class="brand">ROOM26 / 360</div><h1>Вход в админку</h1>
<?php if($error): ?><p class="error" role="alert"><?=e($error)?></p><?php endif ?>
<form method="post" action="/admin/"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><label for="username">Логин</label><input id="username" name="username" autocomplete="username" maxlength="100" required><label for="password">Пароль</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required><button>Войти</button></form></main>
<?php else: ?>
<div class="shell"><header class="topbar"><a class="brand" href="/admin/">ROOM26 / 360</a><div class="actions"><?php if(!$selected): ?><button id="new-project" disabled>Новый проект</button><?php endif ?><?php if(!$selected): ?><form class="inline" method="post" action="/admin/"><input type="hidden" name="csrf" value="<?=e($_SESSION['csrf'])?>"><input type="hidden" name="action" value="logout"><button class="secondary">Выйти</button></form><?php endif ?></div></header>
<?php if($error): ?><p class="error" role="alert"><?=e($error)?></p><?php endif ?>
<?php if(!$selected): ?>
<h1>Проекты</h1><p class="muted">Панорамы, модели и документы — в одном месте.</p><div class="grid">
<?php foreach(projects() as $p): ?><article class="card project-card"><a class="project-cover" href="/admin/?p=<?=e($p['id'])?>"><img src="<?=e(project_image($p))?>" width="1200" height="630" alt="<?=e('Открыть проект «'.$p['name'].'»')?>" loading="lazy" decoding="async"></a><h2><?=e($p['name'])?></h2><div class="muted small"><?=count($p['items']['360'])?> панорам · <?=count($p['items']['3d'])?> моделей · <?=count($p['items']['doc'])?> документов · <?=count($p['items']['photo'])?> фото</div><div class="actions"><a class="button" href="?p=<?=e($p['id'])?>">Открыть</a><a href="/pro/<?=e($p['id'])?>/" target="_blank" rel="noopener">Для клиента ↗</a></div></article><?php endforeach ?>
</div><?php if(!projects()): ?><p class="empty">Пока нет проектов. Нажмите «Новый проект», чтобы начать.</p><?php endif ?>
<?php else: $p=$selected; ?>
<a href="/admin/">← Все проекты</a><h1><?=e($p['name'])?></h1><p class="project-link"><a href="/pro/<?=e($p['id'])?>/" target="_blank" rel="noopener"><?=e(SITE_URL)?>/pro/<?=e($p['id'])?>/ ↗</a> <button class="secondary" data-copy="<?=e(SITE_URL.'/pro/'.$p['id'].'/')?>">Скопировать ссылку</button></p>
<section class="card" aria-labelledby="project-settings-title"><h2 id="project-settings-title">Настройки проекта</h2><form id="project-settings" class="form-grid">
<div class="wide"><label for="project-name">Название проекта</label><input id="project-name" name="name" value="<?=e($p['name'])?>" maxlength="200" required></div>
<div class="wide"><label for="description">Короткое описание</label><input id="description" name="description" type="text" maxlength="48" value="<?=e($p['description'])?>"></div>
<div class="wide actions"><button type="submit">Сохранить настройки</button></div>
</form></section>
<?php foreach($labels as $type=>$label):$type=(string)$type; ?>
<?php if($type==='360'):$summary=panorama_tour_status($p); ?>
<section class="card" id="section-360"><div class="section-header"><h2>Виртуальный тур</h2><div id="panorama-tour-count" class="small"><?=e($summary['count'])?>, <span class="tour-status-<?=$summary['connected']?'ok':'warning'?>"><?=e($summary['label'])?></span></div></div>
<div class="actions"><button type="button" id="panorama-tour-edit"><?=$p['items']['360']?'Редактировать тур':'Создать тур'?></button><a id="panorama-tour-preview" href="/pro/<?=e($p['id'])?>/360/" target="_blank" rel="noopener" <?=$p['items']['360']?'':'hidden'?>>Посмотреть тур ↗</a></div></section>
<?php continue;endif ?>

<section class="card" id="section-<?=$type?>"><div class="section-header"><h2><?=e($label)?></h2><span class="muted small"><?=count($p['items'][$type])?> объектов</span></div>
<form class="upload<?=$type==='photo'?' photo-upload':(in_array($type,['3d','doc'],true)?' model-upload':'')?>" data-type="<?=$type?>"><label for="files-<?=$type?>"><?=$type==='360'?'Добавить панорамы (JPG, PNG, WebP, формат 2:1)':($type==='3d'?'Добавить модели GLB':($type==='photo'?'Добавить фото (JPG, PNG, WebP, GIF, AVIF)':'Добавить файлы любых форматов'))?></label><p class="upload-drop-hint muted small" id="upload-hint-<?=$type?>">Перетащите файлы сюда или выберите их</p><input type="file" hidden aria-describedby="upload-hint-<?=$type?>" id="files-<?=$type?>" name="files" multiple required <?=$type==='360'?'accept="image/jpeg,image/png,image/webp"':($type==='3d'?'accept=".glb"':($type==='photo'?'accept="image/jpeg,image/png,image/webp,image/gif,image/avif"':''))?>><button type="button" class="choose-files" aria-controls="files-<?=$type?>" aria-describedby="upload-hint-<?=$type?>"><?=in_array($type,['photo','3d','doc'],true)?'Добавить':'Выбрать файлы'?></button><p class="muted small"><?php if($type==='doc'): ?>Файлы будут доступны по прямым ссылкам.<?php else: ?>JPG-превью 400 × 200 и обложка ссылки создаются автоматически.<?php endif ?> Лимит одного файла на сервере: <?=e(ini_get('upload_max_filesize'))?>; запроса: <?=e(ini_get('post_max_size'))?>.</p><div class="upload-status" role="status"></div><progress class="hidden" max="100" value="0"></progress></form>
<div class="object-list <?=$type==='photo'?'photo-admin-grid':($type==='3d'?'model-admin-grid':($type==='doc'?'document-admin-grid':''))?>" data-type="<?=$type?>">
<?php foreach($p['items'][$type] as $index=>$item):$url=item_url($p,$type,$item); ?>
<?php if($type==='photo'): ?>
<article class="photo-tile" data-id="<?=e($item['id'])?>" data-url="<?=e($url)?>">
<a class="photo-tile-image" href="<?=e($url)?>" target="_blank" rel="noopener" draggable="false" aria-label="<?=e(photo_caption($item))?>"><img src="<?=e(photo_source_url($p,$item))?>" width="<?=(int)($item['width']??1200)?>" height="<?=(int)($item['height']??800)?>" loading="lazy" decoding="async" draggable="false" alt="<?=e(photo_caption($item))?>"><span class="photo-tile-caption pano-tour-caption"><?=e(photo_caption($item))?></span></a>
<span class="photo-tile-number" aria-hidden="true"><?=$index+1?></span>
<button type="button" class="pano-tour-more photo-more" aria-label="<?=e('Действия: '.photo_caption($item))?>" aria-haspopup="dialog" aria-expanded="false">⋮</button>
</article>
<?php continue;endif ?>
<?php if($type==='3d'): ?>
<article class="object-row model-tile" data-id="<?=e($item['id'])?>">
<a class="object-preview model-tile-image" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener" draggable="false" aria-label="<?=e('Открыть '.$item['name'])?>"><img src="<?=e(asset_url($p,'3d',$item,'thumb'))?>" width="400" height="200" alt="" loading="lazy" draggable="false"></a>
<span class="model-tile-number" aria-hidden="true"><?=$index+1?></span><h3 class="model-tile-caption"><a class="object-filename" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener"><?=e($item['name'])?></a></h3>
<button type="button" class="pano-tour-more model-more" aria-label="<?=e('Действия: '.$item['name'])?>" aria-haspopup="dialog" aria-expanded="false">⋮</button>
<div class="pano-item-menu model-item-menu" role="dialog" aria-label="Действия с моделью" hidden><div class="pano-item-info"><?=e(number_format($item['size']/1048576,1,'.','').' мб, '.date('d.m.Y, H:i',strtotime($item['replaced']??$item['uploaded'])))?></div><hr>
<a href="<?=e($url)?>" target="_blank" rel="noopener">Открыть</a>
<button type="button" data-rename="<?=e($item['id'])?>" data-filename="<?=e($item['filename'])?>">Переименовать</button>
<button type="button" data-camera="<?=e($item['id'])?>">Ракурс по умолчанию</button>
<button type="button" data-tour="<?=e($item['id'])?>">Настроить тур</button>
<button type="button" data-replace-model="<?=e($item['id'])?>">Заменить модель</button>
<button type="button" class="danger" data-delete="<?=e($item['id'])?>">Удалить</button></div>
</article>
<?php continue;endif ?>
<?php if($type==='doc'): $url=document_source_url($p,$item); ?>
<article class="object-row document-tile" data-id="<?=e($item['id'])?>">
<a class="document-tile-image" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener" draggable="false"><img src="<?=e(document_preview_url($p,$item))?>"<?=document_preview_attributes($p,$item)?> width="400" height="300" alt="" loading="lazy" draggable="false"></a>
<span class="document-tile-number" aria-hidden="true"><?=$index+1?></span><h3><a class="object-filename" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener"><?=e($item['filename'])?></a></h3>
<button type="button" class="pano-tour-more document-more" aria-label="<?=e('Действия: '.$item['filename'])?>" aria-haspopup="dialog" aria-expanded="false">⋮</button>
<div class="pano-item-menu document-item-menu" role="dialog" aria-label="Действия с документом" hidden><div class="pano-item-info"><?=e(date('d.m.Y, H:i',strtotime($item['uploaded'])).', '.size_label($item['size']))?></div><hr>
<a data-item-link href="<?=e($url)?>" target="_blank" rel="noopener">Открыть</a><button type="button" data-rename="<?=e($item['id'])?>" data-filename="<?=e($item['filename'])?>">Переименовать</button><button type="button" class="danger" data-delete="<?=e($item['id'])?>">Удалить</button></div>
</article>
<?php continue;endif ?>
<article class="object-row" data-id="<?=e($item['id'])?>"><button class="drag-handle" type="button" draggable="true" aria-label="Переместить <?=e($item['name'])?>">⋮⋮</button>
<?php if($type!=='doc'): ?><a class="object-preview" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener" aria-label="<?=e('Просмотр '.$item['filename'])?>"><img src="<?=e(asset_url($p,$type,$item,'thumb'))?>" width="400" height="200" alt="" loading="lazy"></a><?php endif ?>
<div class="object-info"><h3><a class="object-filename" data-item-link href="<?=e($url)?>" target="_blank" rel="noopener"><?=e($item['filename'])?></a></h3><div class="muted small"><?=e(size_label($item['size']))?> · <?=e(date('d.m.Y H:i',strtotime($item['uploaded'])))?> МСК</div><div class="actions"><button class="secondary" data-copy="<?=e(SITE_URL.($type==='doc'?$url:$url))?>">Ссылка</button><button class="secondary" data-rename="<?=e($item['id'])?>" data-filename="<?=e($item['filename'])?>">Переименовать</button><?php if($type!=='doc'): ?><button class="secondary" type="button" data-camera="<?=e($item['id'])?>">Настроить ракурс</button><?php endif ?><?php if($type==='360'): ?><button class="secondary" type="button" data-replace-panorama="<?=e($item['id'])?>">Заменить панораму</button><?php endif ?><?php if($type==='3d'): ?><button class="secondary" type="button" data-replace-model="<?=e($item['id'])?>">Заменить модель</button><button class="secondary" type="button" data-tour="<?=e($item['id'])?>">Настроить тур</button><?php endif ?><button class="secondary" data-move="up" aria-label="Выше">↑</button><button class="secondary" data-move="down" aria-label="Ниже">↓</button><button class="danger" data-delete="<?=e($item['id'])?>">Удалить</button></div></div></article>
<?php endforeach ?></div></section>
<?php endforeach ?>
<div class="actions project-delete"><button type="button" class="danger" id="delete-project">Удалить проект</button></div>
<dialog id="camera-dialog" class="dialog camera-dialog" aria-labelledby="camera-title">
<header class="camera-toolbar"><h2 id="camera-title">Настроить ракурс</h2><div class="actions" role="group" aria-label="Экран просмотра"><button type="button" class="secondary" data-camera-mode="mobile" aria-pressed="true">Смартфон · 393 × 740</button><button type="button" class="secondary" data-camera-mode="desktop" aria-pressed="false">ПК · 1280 × 720</button></div><button type="button" class="secondary" id="camera-close">Закрыть</button></header>
<div class="camera-workspace" id="camera-workspace"><div class="camera-frame" id="camera-frame"><div id="camera-stage" class="camera-stage"></div></div><div class="camera-loading" id="camera-loading" role="status">Загрузка…</div><div class="camera-zoom"><button type="button" class="secondary" id="camera-zoom-in" aria-label="Приблизить">+</button><button type="button" class="secondary" id="camera-zoom-out" aria-label="Отдалить">−</button></div></div>
<footer class="actions camera-footer"><button type="button" class="secondary" id="camera-reset">Сбросить вид</button><button type="button" id="camera-save">Сохранить ракурсы</button></footer>
</dialog>
<dialog id="tour-dialog" class="dialog tour-dialog" aria-labelledby="tour-editor-title">
<header class="tour-editor-toolbar"><h2 id="tour-editor-title">Настроить тур</h2><button type="button" class="secondary" id="tour-editor-close">Закрыть</button></header>
<div class="tour-editor-tools"><div class="actions" aria-label="Редактирование тура"><button type="button" class="secondary" data-tour-tool="select" aria-pressed="true">Выбрать</button><button type="button" class="secondary" data-tour-tool="add" aria-pressed="false">Добавить точку</button><button type="button" class="danger" id="tour-editor-delete" disabled>Удалить выбранное</button><button type="button" class="secondary" id="tour-editor-top">Вид сверху</button></div></div>
<p class="muted small tour-editor-help" id="tour-editor-help">Выберите точку входа. Её можно перетащить по полу или ступени.</p>
<div class="tour-editor-stage" id="tour-editor-stage" tabindex="0"><div id="tour-editor-loading" class="tour-editor-loading" role="status">Загрузка…</div></div>
<footer class="tour-editor-footer"><span class="muted small" id="tour-editor-count" role="status"></span><button type="button" id="tour-editor-save" disabled>Сохранить тур</button></footer>
</dialog>
<dialog id="caption-dialog" class="dialog" aria-labelledby="caption-title"><form id="caption-form"><h2 id="caption-title">Переименовать фото</h2><label for="photo-caption">Название</label><input id="photo-caption" name="name" maxlength="200" required><div class="actions"><button type="submit">Сохранить</button><button type="button" class="secondary" id="caption-cancel">Отмена</button></div></form></dialog>
<dialog id="rename-dialog" class="dialog" aria-labelledby="rename-title"><form id="rename-form"><h2 id="rename-title">Переименовать файл</h2><label for="rename-name">Новое имя</label><input id="rename-name" name="name" maxlength="200" required><p class="muted small" id="rename-extension"></p><div class="actions"><button type="submit">Сохранить</button><button type="button" class="secondary" id="rename-cancel">Отмена</button></div></form></dialog>
<dialog id="delete-project-dialog" class="dialog confirmation-dialog" aria-labelledby="delete-project-title" aria-describedby="delete-project-description">
<h2 id="delete-project-title">Удалить весь проект?</h2>
<p id="delete-project-description">Будут удалены панорамы, 3D-модели и документы без возможности восстановления!</p>
<div class="actions"><button type="button" class="danger" id="confirm-delete-project">Удалить</button><button type="button" class="secondary" id="cancel-delete-project" autofocus>Отмена</button></div>
</dialog>
<?php endif ?>
<dialog id="new-dialog" class="dialog"><form id="create-form"><h2>Новый проект</h2><label for="new-name">Название проекта</label><input id="new-name" name="name" maxlength="200" required><div class="actions"><button type="button" class="secondary" data-close>Отмена</button><button>Создать проект</button></div></form></dialog>
<?php json_script('admin-config',['csrf'=>$_SESSION['csrf'],'project'=>$selected,'versions'=>['model'=>asset_version('model.js'),'panorama'=>asset_version('panorama.js'),'editor'=>asset_version('camera-editor.js'),'tourEditor'=>asset_version('tour-editor.js'),'panoramaTour'=>asset_version('panorama-tour-editor.js'),'photoAdmin'=>asset_version('photo-admin.js'),'modelAdmin'=>asset_version('model-admin.js'),'documentAdmin'=>asset_version('document-admin.js')]]); ?>
<script type="module" src="/assets/admin.js?v=<?=e(substr(hash_file('sha256', __DIR__.'/../assets/admin.js'),0,12))?>"></script></div>
<?php endif ?></body></html>
