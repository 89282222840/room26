<?php
declare(strict_types=1);
require __DIR__ . '/../lib/core.php';
require __DIR__ . '/../lib/auth.php';
public_headers();
$selected = null;
if ($authenticated && isset($_GET['p']) && is_string($_GET['p'])) {
    try { $selected = project($_GET['p']); } catch (Throwable $ex) { http_response_code(404); $error = 'Проект не найден.'; }
}
$labels = ['360'=>'Панорамы 360°','3d'=>'3D-модели','doc'=>'Документы'];
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
<?php foreach(projects() as $p): ?><article class="card project-card"><a class="project-cover" href="/admin/?p=<?=e($p['id'])?>"><img src="<?=e(project_image($p))?>" width="1200" height="630" alt="<?=e('Открыть проект «'.$p['name'].'»')?>" loading="lazy" decoding="async"></a><h2><?=e($p['name'])?></h2><div class="muted small"><?=count($p['items']['360'])?> панорам · <?=count($p['items']['3d'])?> моделей · <?=count($p['items']['doc'])?> документов</div><div class="actions"><a class="button" href="?p=<?=e($p['id'])?>">Открыть</a><a href="/pro/<?=e($p['id'])?>/" target="_blank" rel="noopener">Для клиента ↗</a></div></article><?php endforeach ?>
</div><?php if(!projects()): ?><p class="empty">Пока нет проектов. Нажмите «Новый проект», чтобы начать.</p><?php endif ?>
<?php else: $p=$selected; ?>
<a href="/admin/">← Все проекты</a><h1><?=e($p['name'])?></h1><p class="project-link"><a href="/pro/<?=e($p['id'])?>/" target="_blank" rel="noopener"><?=e(SITE_URL)?>/pro/<?=e($p['id'])?>/ ↗</a> <button class="secondary" data-copy="<?=e(SITE_URL.'/pro/'.$p['id'].'/')?>">Скопировать ссылку</button></p>
<section class="card" aria-labelledby="project-settings-title"><h2 id="project-settings-title">Настройки проекта</h2><form id="project-settings" class="form-grid">
<div class="wide"><label for="project-name">Название проекта</label><input id="project-name" name="name" value="<?=e($p['name'])?>" maxlength="200" required></div>
<div class="wide"><label for="description">Короткое описание</label><input id="description" name="description" type="text" maxlength="48" value="<?=e($p['description'])?>"></div>
<div class="wide actions"><button type="submit">Сохранить настройки</button></div>
</form></section>
<?php foreach($labels as $type=>$label):$type=(string)$type; ?>
<section class="card" id="section-<?=$type?>"><div class="section-header"><h2><?=e($label)?></h2><span class="muted small"><?=count($p['items'][$type])?> объектов</span></div>
<form class="upload" data-type="<?=$type?>"><label for="files-<?=$type?>"><?=$type==='360'?'Добавить панорамы (JPG, PNG, WebP, формат 2:1)':($type==='3d'?'Добавить модели GLB':'Добавить файлы любых форматов')?></label><p class="upload-drop-hint muted small" id="upload-hint-<?=$type?>">Перетащите файлы сюда или выберите их</p><input type="file" aria-describedby="upload-hint-<?=$type?>" id="files-<?=$type?>" name="files" multiple required <?=$type==='360'?'accept="image/jpeg,image/png,image/webp"':($type==='3d'?'accept=".glb"':'')?>><button>Загрузить</button><p class="muted small"><?php if($type==='doc'): ?>Файлы будут доступны по прямым ссылкам.<?php else: ?>JPG-превью 400 × 200 и обложка ссылки создаются автоматически.<?php endif ?> Лимит одного файла на сервере: <?=e(ini_get('upload_max_filesize'))?>; запроса: <?=e(ini_get('post_max_size'))?>.</p><div class="upload-status" role="status"></div><progress class="hidden" max="100" value="0"></progress></form>
<div class="object-list" data-type="<?=$type?>">
<?php foreach($p['items'][$type] as $item):$url=item_url($p,$type,$item); ?>
<article class="object-row" data-id="<?=e($item['id'])?>"><button class="drag-handle" type="button" draggable="true" aria-label="Переместить <?=e($item['name'])?>">⋮⋮</button>
<?php if($type!=='doc'): ?><img src="<?=e(asset_url($p,$type,$item,'thumb'))?>" width="400" height="200" alt="" loading="lazy"><?php endif ?>
<div class="object-info"><h3><?=e($item['name'])?></h3><div class="muted small"><?=e(size_label($item['size']))?> · <?=e(date('d.m.Y H:i',strtotime($item['uploaded'])))?> МСК</div><div class="actions"><a href="<?=e($type==='doc'?$url:$url)?>" target="_blank" rel="noopener"><?=$type==='doc'?'Открыть ↗':'Просмотр ↗'?></a><button class="secondary" data-copy="<?=e(SITE_URL.($type==='doc'?$url:$url))?>">Ссылка</button><button class="secondary" data-rename="<?=e($item['id'])?>" data-filename="<?=e($item['filename'])?>">Переименовать</button><button class="secondary" data-move="up" aria-label="Выше">↑</button><button class="secondary" data-move="down" aria-label="Ниже">↓</button><button class="danger" data-delete="<?=e($item['id'])?>">Удалить</button></div></div></article>
<?php endforeach ?></div></section>
<?php endforeach ?>
<div class="actions project-delete"><button type="button" class="danger" id="delete-project">Удалить проект</button></div>
<dialog id="rename-dialog" class="dialog" aria-labelledby="rename-title"><form id="rename-form"><h2 id="rename-title">Переименовать файл</h2><label for="rename-name">Новое имя</label><input id="rename-name" name="name" maxlength="200" required><p class="muted small" id="rename-extension"></p><div class="actions"><button type="submit">Сохранить</button><button type="button" class="secondary" id="rename-cancel">Отмена</button></div></form></dialog>
<dialog id="delete-project-dialog" class="dialog confirmation-dialog" aria-labelledby="delete-project-title" aria-describedby="delete-project-description">
<h2 id="delete-project-title">Удалить весь проект?</h2>
<p id="delete-project-description">Будут удалены панорамы, 3D-модели и документы без возможности восстановления!</p>
<div class="actions"><button type="button" class="danger" id="confirm-delete-project">Удалить</button><button type="button" class="secondary" id="cancel-delete-project" autofocus>Отмена</button></div>
</dialog>
<?php endif ?>
<dialog id="new-dialog" class="dialog"><form id="create-form"><h2>Новый проект</h2><label for="new-name">Название проекта</label><input id="new-name" name="name" maxlength="200" required><div class="actions"><button type="button" class="secondary" data-close>Отмена</button><button>Создать проект</button></div></form></dialog>
<?php json_script('admin-config',['csrf'=>$_SESSION['csrf'],'project'=>$selected]); ?>
<script type="module" src="/assets/admin.js?v=<?=e(substr(hash_file('sha256', __DIR__.'/../assets/admin.js'),0,12))?>"></script></div>
<?php endif ?></body></html>
