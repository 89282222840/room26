<?php
declare(strict_types=1);
require __DIR__ . '/../lib/core.php';
// API never accepts credentials or redirects to a login page.
define('ROOM26_API', true);
require __DIR__ . '/../lib/auth.php';
if (!$authenticated) json_out(['error'=>'Войдите в админку.'], 401);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') json_out(['error'=>'Используйте POST.'], 405);
if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) json_out(['error'=>'Размер запроса превышает лимит хостинга: ' . ini_get('post_max_size')], 413);
if (!isset($_POST['csrf']) || !is_string($_POST['csrf']) || !hash_equals($_SESSION['csrf'], $_POST['csrf'])) json_out(['error'=>'Обновите страницу и попробуйте снова.'], 403);
session_write_close();
function uploaded(string $field): array {
    $f = $_FILES[$field] ?? null;
    if (!$f || is_array($f['error']) || $f['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($f['tmp_name'])) fail('Не удалось загрузить файл. Проверьте размер и лимиты хостинга.');
    if ((int)$f['size'] < 1) fail('Пустой файл.');
    return $f;
}
function jpeg_upload(string $field, string $target, int $width, int $height): void {
    $f = uploaded($field); $info = @getimagesize($f['tmp_name']);
    if ($f['size'] > 5*1024*1024 || !$info || $info[0] !== $width || $info[1] !== $height || $info[2] !== IMAGETYPE_JPEG) fail('Не удалось создать JPG-превью.');
    if (!move_uploaded_file($f['tmp_name'], $target) || !chmod($target, 0644)) fail('Не удалось сохранить превью.', 500);
}
function edge_cache_upload(string $target): void {
    $file=uploaded('edge_cache');
    if($file['size']>64*1024*1024)fail('Файл обводки слишком большой.');
    $raw=file_get_contents($file['tmp_name']);
    if(substr($raw,0,2)===chr(31).chr(139)){
        if(!function_exists('gzdecode'))fail('Сжатая обводка не поддерживается хостингом.');
        $raw=@gzdecode($raw,64*1024*1024+1);if($raw===false)fail('Повреждённый архив обводки.');
    }
    $length=strlen($raw);if($length>64*1024*1024)fail('Файл обводки слишком большой.');
    $prefix=substr($raw,0,12);
    if(strlen($prefix)!==12||substr($prefix,0,8)!=='R26E0005')fail('Некорректный файл обводки.');
    $size=unpack('Vsize',substr($prefix,8,4))['size'];
    if($size<1||$size>1048576||$size+12>$length)fail('Некорректный заголовок обводки.');
    $header=json_decode(substr($raw,12,$size),true);
    if(!is_array($header)||($header['version']??null)!==5||!isset($header['entries'])||!is_array($header['entries'])||count($header['entries'])>50000)fail('Некорректная версия обводки.');
    $expected=(12+$size+3)&~3;$keys=[];
    foreach($header['entries'] as $entry){
        if(!is_array($entry)||!isset($entry['key'],$entry['signature'],$entry['near'],$entry['far'])||!is_string($entry['key'])||!preg_match('/^g[0-9]{1,6}$/D',$entry['key'])||isset($keys[$entry['key']])||!is_string($entry['signature'])||!preg_match('~^[0-9]{1,10}/[0-9]{1,10}$~D',$entry['signature'])||!is_int($entry['near'])||!is_int($entry['far'])||$entry['near']<0||$entry['far']<0||$entry['far']>$entry['near'])fail('Некорректные данные обводки.');
        $keys[$entry['key']]=true;$expected+=$entry['near']*24+$entry['far']*4;
        if($expected>$length)fail('Повреждённый файл обводки.');
    }
    if($expected!==$length)fail('Повреждённый файл обводки.');
    if(file_put_contents($target,function_exists('gzencode')?gzencode($raw,6):$raw)===false||!chmod($target,0600))fail('Не удалось сохранить обводку.',500);
}
function saved_tour(): array {
    $raw=json_decode(text_field('tour',300000),true);
    if(!is_array($raw)||!isset($raw['points'],$raw['links'])||!is_array($raw['points'])||!is_array($raw['links'])||count($raw['points'])>500||count($raw['links'])>2000)fail('Некорректные точки или связи тура.');
    $points=[];$ids=[];
    foreach($raw['points'] as $point){
        if(!is_array($point)||!isset($point['id'],$point['position'])||!is_string($point['id'])||!preg_match('/^[a-f0-9]{6}$/D',$point['id'])||isset($ids[$point['id']])||!is_array($point['position'])||array_keys($point['position'])!==[0,1,2])fail('Некорректная точка тура.');
        $position=[];foreach($point['position'] as $value){if((!is_int($value)&&!is_float($value))||!is_finite((float)$value)||abs($value)>1e10)fail('Некорректные координаты точки.');$position[]=(float)$value;}
        $ids[$point['id']]=true;$points[]=['id'=>$point['id'],'position'=>$position];
    }
    $links=[];$seen=[];
    foreach($raw['links'] as $link){
        if(!is_array($link)||array_keys($link)!==[0,1]||!is_string($link[0])||!is_string($link[1])||$link[0]===$link[1]||!isset($ids[$link[0]],$ids[$link[1]]))fail('Связь должна соединять две существующие точки.');
        sort($link,SORT_STRING);$key=implode('/',$link);if(isset($seen[$key]))fail('Повторяющаяся связь тура.');$seen[$key]=true;$links[]=$link;
    }
    return ['points'=>$points,'links'=>$links];
}
function saved_panorama_tour(array $p): array {
    $raw=json_decode(text_field('tour',400000),true);
    if(!is_array($raw)||!isset($raw['points'])||!is_array($raw['points'])||count($raw['points'])>1000)fail('Некорректный тур.');
    $known=array_column($p['items']['360'],null,'id');$start=$raw['start']??null;
    if($start!==null&&(!is_string($start)||!isset($known[$start])))fail('Стартовая панорама не найдена.');
    $points=[];$ids=[];$total=0;
    $num=function($v,float $min,float $max):float{if((!is_int($v)&&!is_float($v))||!is_finite((float)$v)||$v<$min||$v>$max)fail('Некорректный ракурс точки.');return(float)$v;};
    foreach($raw['points'] as $source=>$list){
        if(!isset($known[$source])||!is_array($list)||count($list)>500)fail('Панорама или точки не найдены.');
        $out=[];foreach($list as $point){
            if(++$total>5000||!is_array($point)||!isset($point['id'],$point['target'],$point['view'])||!is_string($point['id'])||!valid_id($point['id'])||isset($ids[$point['id']])||!is_string($point['target'])||(string)$source===$point['target']||!isset($known[$point['target']])||!is_array($point['view']))fail('Некорректный переход.');
            $ids[$point['id']]=true;$v=$point['view'];
            $out[]=['id'=>$point['id'],'target'=>$point['target'],'yaw'=>$num($point['yaw']??null,-180,180),'pitch'=>$num($point['pitch']??null,-90,90),'view'=>['yaw'=>$num($v['yaw']??null,-3600,3600),'pitch'=>$num($v['pitch']??null,-90,90),'hfov'=>$num($v['hfov']??null,10,120)]];
        }$points[$source]=$out;
    }return ['start'=>$start,'points'=>(object)$points];
}
function saved_views(string $type): array {
    $raw=json_decode(text_field('views',5000),true);if(!is_array($raw))fail('Некорректные ракурсы.');$result=[];
    foreach(['mobile','desktop'] as $profile){
        $v=$raw[$profile]??null;if(!is_array($v))fail('Нужно сохранить ракурсы смартфона и ПК.');
        $number=function($value,float $min,float $max): float {
            if((!is_int($value)&&!is_float($value))||!is_finite((float)$value)||$value<$min||$value>$max)fail('Некорректные параметры камеры.');return (float)$value;
        };
        if($type==='360')$result[$profile]=['yaw'=>$number($v['yaw']??null,-3600,3600),'pitch'=>$number($v['pitch']??null,-90,90),'hfov'=>$number($v['hfov']??null,10,120)];
        else{
            $out=[];foreach(['position','target'] as $key){if(!isset($v[$key])||!is_array($v[$key])||count($v[$key])!==3||array_keys($v[$key])!==[0,1,2])fail('Некорректная позиция камеры.');$out[$key]=array_map(function($n)use($number){return $number($n,-1e15,1e15);},$v[$key]);}
            $distance=0;for($i=0;$i<3;$i++)$distance+=pow($out['position'][$i]-$out['target'][$i],2);if($distance<1e-20)fail('Камера должна находиться вне точки наблюдения.');
            $out['fov']=$number($v['fov']??null,5,120);$out['zoom']=$number($v['zoom']??null,.01,100);$result[$profile]=$out;
        }
    }
    return $result;
}
function remove_tree(string $dir): void {
    foreach (new FilesystemIterator($dir, FilesystemIterator::SKIP_DOTS) as $f) {
        if ($f->isDir() && !$f->isLink()) remove_tree($f->getPathname()); else unlink($f->getPathname());
    }
    rmdir($dir);
}
$lock = null;
try {
    if (!is_dir(STORAGE) && !mkdir(STORAGE, 0755, true)) fail('Нет доступа к папке проектов.', 500);
    chmod(STORAGE, 0755);
    $lock = fopen(STORAGE . '/.write.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) fail('Не удалось заблокировать запись.', 503);
    $action = text_field('action', 30);
    if ($action === 'create') {
        $name = text_field('name', 200); if ($name === '') fail('Введите название проекта.');
        $id = uid(STORAGE); $dir = project_path($id);
        if (!mkdir($dir, 0755)) fail('Не удалось создать проект.', 500);
        chmod($dir, 0755);
        foreach (['360','3d','doc','photo'] as $type) { mkdir($dir . '/' . $type, 0755); chmod($dir . '/' . $type, 0755); }
        $p = ['id'=>$id, 'name'=>$name, 'description'=>'', 'created'=>date(DATE_ATOM), 'items'=>['360'=>[], '3d'=>[], 'doc'=>[], 'photo'=>[]]];
        save_project($p);
    } else {
        $p = project(text_field('project', 6));
        if ($action === 'delete_project') {
            remove_tree(project_path($p['id']));
            flock($lock, LOCK_UN); fclose($lock); $lock = null;
            json_out(['deleted'=>true]);
        } elseif ($action === 'get_project') {
            // Authenticated refresh before opening the tour editor.
        } elseif ($action === 'save') {
            $name = text_field('name', 200); if ($name === '') fail('Введите название проекта.');
            $description = text_field('description', 48);
            $length = preg_match_all('/./us', $description, $characters);
            if ($length === false || $length > 48 || preg_match('/[\r\n]/', $description)) fail('Описание должно быть однострочным и не длиннее 48 символов.');
            $p['name'] = $name; $p['description'] = $description;
            save_project($p);
        } elseif ($action === 'upload') {
            $type = text_field('type', 5); if (!in_array($type, ['360','3d','doc','photo'],true)) fail('Неверный раздел.');
            $file = uploaded('file');
            $filename = basename(str_replace(chr(92), '/', $file['name']));
            $filename = preg_replace('/[\x00-\x1f\x7f]/', '', $filename);
            if ($filename === '' || strlen($filename) > 700) fail('Недопустимое имя файла.');
            if ($type === '360' || $type === 'photo') {
                $info = @getimagesize($file['tmp_name']);
                $imageTypes=[IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_WEBP];if($type==='photo'){$imageTypes[]=IMAGETYPE_GIF;if(defined('IMAGETYPE_AVIF'))$imageTypes[]=constant('IMAGETYPE_AVIF');}
                if(!$info||!in_array($info[2],$imageTypes,true))fail('Загрузите изображение JPG, PNG, WebP, GIF или AVIF.');
                if($type==='360' && abs($info[0]/$info[1]-2)>.1)fail('Нужна эквидистантная панорама с соотношением сторон 2:1.');
                $mime=$info['mime'];
            } elseif ($type === '3d') {
                $handle = fopen($file['tmp_name'], 'rb'); $header = fread($handle, 12); fclose($handle);
                if (strlen($header)!==12 || substr($header,0,4)!=='glTF') fail('Загрузите модель в формате GLB.');
                $glb = unpack('Vversion/Vlength', substr($header,4));
                if ($glb['version'] !== 2 || $glb['length'] !== (int)$file['size']) fail('Повреждённый GLB-файл.');
                $mime = 'model/gltf-binary';
            } else $mime = 'application/octet-stream';
            $parent = project_path($p['id']) . '/' . $type;
            if(!is_dir($parent)){if(!mkdir($parent,0755))fail('Не удалось создать раздел.',500);chmod($parent,0755);}
            $existingIds = array_column($p['items'][$type], 'id');
            do { $id = bin2hex(random_bytes(3)); } while (in_array($id, $existingIds, true));
            $prefix = $parent . '/' . $id;
            $imageExtensions=[IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_WEBP=>'webp',IMAGETYPE_GIF=>'gif'];if(defined('IMAGETYPE_AVIF'))$imageExtensions[constant('IMAGETYPE_AVIF')]='avif';
            $extension = $type === 'doc' ? 'bin' : ($type === '3d' ? 'glb' : $imageExtensions[$info[2]]);
            try {
                if ($type !== 'doc') { jpeg_upload('thumb',$prefix.'-thumb.jpg',400,200); jpeg_upload('og',$prefix.'-og.jpg',1200,630); }
                if (!move_uploaded_file($file['tmp_name'], $prefix.'.'.$extension)) fail('Не удалось сохранить файл.',500);
                if (!chmod($prefix.'.'.$extension, $type === 'doc' ? 0600 : 0644)) fail('Не удалось установить права файла.', 500);
                $name = $type === 'doc' ? $filename : pathinfo($filename, PATHINFO_FILENAME);
                $item = ['id'=>$id, 'name'=>$name, 'filename'=>$filename, 'size'=>(int)$file['size'], 'mime'=>$mime, 'extension'=>$extension, 'uploaded'=>date(DATE_ATOM)];
                if ($type === 'doc') $item['public_filename'] = new_document_filename($p, $item);
                if($type==='photo'){$item['name']=$name?:$filename;$item['width']=$info[0];$item['height']=$info[1];$item['public_filename']=new_document_filename(photo_project($p),$item);}
                if($type==='3d'&&isset($_FILES['edge_cache'])){edge_cache_upload($prefix.'-edges.bin');$item['edge_version']=5;$item['edge_revision']=bin2hex(random_bytes(6));}
                $p['items'][$type][] = $item;
                save_project($p);
            } catch (Throwable $error) { foreach (glob($prefix . '.*') ?: [] as $path) unlink($path); foreach (glob($prefix . '-*.jpg') ?: [] as $path) unlink($path);if(is_file($prefix.'-edges.bin'))unlink($prefix.'-edges.bin'); throw $error; }
        } elseif ($action === 'save_edges') {
            $id=text_field('item',6);$item=find_item($p,'3d',$id);
            if((string)$item['size']!==text_field('source_size',30)||($item['source_version']??'')!==text_field('source_version',40))fail('Модель изменилась. Обновите страницу.',409);
            $folder=project_path($p['id']).'/3d/';$version=bin2hex(random_bytes(6));$filename=$id.'-'.$version.'-edges.bin';$target=$folder.$filename;$committed=false;
            try{
                edge_cache_upload($target);
                foreach($p['items']['3d'] as &$stored)if($stored['id']===$id){$stored['edge_version']=5;$stored['edge_revision']=$version;$stored['edge_file']=$filename;}unset($stored);save_project($p);$committed=true;
                $old=$folder.asset_filename('3d',$item,'edges');if(is_file($old))unlink($old);
            }finally{if(!$committed&&is_file($target))unlink($target);}
        } elseif ($action === 'reorder') {
            $type = text_field('type',5); if (!in_array($type,['360','3d','doc','photo'],true)) fail('Неверный раздел.');
            $ids = json_decode(text_field('order', 100000),true);
            $items = $p['items'][$type]; $old = array_column($items,'id');
            if (!is_array($ids) || count($ids)!==count($old) || count(array_unique($ids))!==count($old) || array_diff($ids,$old)) fail('Список изменился. Обновите страницу.');
            $map = array_column($items,null,'id'); $p['items'][$type]=array_map(function($id)use($map){return $map[$id];},$ids); save_project($p);
        } elseif ($action === 'replace_model') {
            $id=text_field('item',6);$old=find_item($p,'3d',$id);$file=uploaded('file');
            if(($old['source_version']??'')!==text_field('source_version',40)||(string)$old['size']!==text_field('source_size',30))fail('Модель уже заменена. Обновите страницу.',409);
            $handle=fopen($file['tmp_name'],'rb');$header=fread($handle,12);fclose($handle);
            if(strlen($header)!==12||substr($header,0,4)!=='glTF')fail('Загрузите модель в формате GLB.');
            $glb=unpack('Vversion/Vlength',substr($header,4));if($glb['version']!==2||$glb['length']!==(int)$file['size'])fail('Повреждённый GLB-файл.');
            $folder=project_path($p['id']).'/3d/';$version=bin2hex(random_bytes(6));$base=$id.'-'.$version;$created=[];$committed=false;
            try{
                $target=$folder.$base.'.glb';$created[]=$target;if(!move_uploaded_file($file['tmp_name'],$target)||!chmod($target,0644))fail('Не удалось сохранить модель.',500);
                foreach(['thumb'=>[400,200],'og'=>[1200,630]] as $kind=>$dimensions){$target=$folder.$base.'-'.$kind.'.jpg';$created[]=$target;jpeg_upload($kind,$target,$dimensions[0],$dimensions[1]);}
                $hasEdges=isset($_FILES['edge_cache']);if($hasEdges){$target=$folder.$base.'-edges.bin';$created[]=$target;edge_cache_upload($target);}
                foreach($p['items']['3d'] as &$item)if($item['id']===$id){
                    $item['size']=(int)$file['size'];$item['mime']='model/gltf-binary';$item['extension']='glb';$item['source_file']=$base.'.glb';$item['source_version']=$version;$item['preview_file']=$base;$item['preview_version']=$version;$item['replaced']=date(DATE_ATOM);$item['tour_revision']=bin2hex(random_bytes(6));
                    unset($item['edge_version'],$item['edge_revision'],$item['edge_file']);if($hasEdges){$item['edge_version']=5;$item['edge_revision']=$version;$item['edge_file']=$base.'-edges.bin';}
                }unset($item);save_project($p);$committed=true;
                foreach(['source','thumb','og','edges'] as $kind){$path=$folder.asset_filename('3d',$old,$kind);if(is_file($path))unlink($path);}
            }finally{if(!$committed)foreach($created as $path)if(is_file($path))unlink($path);}
        } elseif ($action === 'replace_panorama') {
            $id=text_field('item',6);$old=find_item($p,'360',$id);$file=uploaded('file');$info=@getimagesize($file['tmp_name']);
            if(!$info||!in_array($info[2],[IMAGETYPE_JPEG,IMAGETYPE_PNG,IMAGETYPE_WEBP],true)||abs($info[0]/$info[1]-2)>.1)fail('Нужна панорама JPG, PNG или WebP с соотношением 2:1.');
            if(($old['source_version']??'')!==text_field('source_version',40))fail('Панорама уже заменена. Обновите страницу.',409);
            $ext=[IMAGETYPE_JPEG=>'jpg',IMAGETYPE_PNG=>'png',IMAGETYPE_WEBP=>'webp'][$info[2]];$version=bin2hex(random_bytes(6));$folder=project_path($p['id']).'/360/';$base=$id.'-'.$version;$created=[];$committed=false;
            try{
                $source=$folder.$base.'.'.$ext;$created[]=$source;if(!move_uploaded_file($file['tmp_name'],$source)||!chmod($source,0644))fail('Не удалось сохранить панораму.',500);
                foreach(['thumb'=>[400,200],'og'=>[1200,630]] as $kind=>$dimensions){$target=$folder.$base.'-'.$kind.'.jpg';$created[]=$target;jpeg_upload($kind,$target,$dimensions[0],$dimensions[1]);}
                foreach($p['items']['360'] as &$item)if($item['id']===$id){$item['size']=(int)$file['size'];$item['mime']=$info['mime'];$item['extension']=$ext;$item['source_file']=$base.'.'.$ext;$item['source_version']=$version;$item['preview_file']=$base;$item['preview_version']=$version;$item['replaced']=date(DATE_ATOM);}unset($item);
                save_project($p);$committed=true;
                $oldBase=$old['preview_file']??$id;
                foreach([$folder.($old['source_file']??($id.'.'.$old['extension'])),$folder.$oldBase.'-thumb.jpg',$folder.$oldBase.'-og.jpg'] as $path)if(is_file($path))unlink($path);
            }finally{if(!$committed)foreach($created as $path)if(is_file($path))unlink($path);}
        } elseif ($action === 'save_panorama_tour') {
            $request=text_field('request_id',40);if(!preg_match('/^[a-f0-9]{24}$/D',$request))fail('Некорректный запрос.');
            if(($p['panorama_tour_request']??'')!==$request){
                if(($p['panorama_tour_revision']??'')!==text_field('revision',40))fail('Тур изменён в другой вкладке. Обновите страницу.',409);
                $p['panorama_tour']=saved_panorama_tour($p);$p['panorama_tour_revision']=bin2hex(random_bytes(6));$p['panorama_tour_request']=$request;save_project($p);
            }
        } elseif ($action === 'save_tour') {
            $id=text_field('item',6);$item=find_item($p,'3d',$id);
            if((string)$item['size']!==text_field('source_size',30)||($item['source_version']??'')!==text_field('source_version',40))fail('Модель изменилась. Обновите страницу.',409);
            if(($item['tour_revision']??'')!==text_field('tour_revision',40))fail('Тур уже изменён. Обновите страницу перед сохранением.',409);
            $tour=saved_tour();
            foreach($p['items']['3d'] as &$stored)if($stored['id']===$id){$stored['tour']=$tour;$stored['tour_revision']=bin2hex(random_bytes(6));}unset($stored);save_project($p);
        } elseif ($action === 'save_views') {
            $type=text_field('type',5);if(!in_array($type,['360','3d'],true))fail('Неверный раздел.');
            $id=text_field('item',6);$sourceItem=find_item($p,$type,$id);if($type==='3d'&&($sourceItem['source_version']??'')!==text_field('source_version',40))fail('Модель изменилась. Обновите страницу.',409);$views=saved_views($type);
            foreach($p['items'][$type] as &$item)if($item['id']===$id)$item['views']=$views;unset($item);
            if($type==='3d'){
                $prefix=project_path($p['id']).'/3d/'.$id;$temp=project_path($p['id']).'/3d/.preview-'.bin2hex(random_bytes(6));
                try{
                    jpeg_upload('thumb',$temp.'-thumb.jpg',400,200);jpeg_upload('og',$temp.'-og.jpg',1200,630);
                    if(!rename($temp.'-thumb.jpg',project_path($p['id']).'/3d/'.asset_filename('3d',$sourceItem,'thumb'))||!rename($temp.'-og.jpg',project_path($p['id']).'/3d/'.asset_filename('3d',$sourceItem,'og')))fail('Не удалось обновить превью.',500);
                    foreach($p['items']['3d'] as &$item)if($item['id']===$id)$item['preview_version']=bin2hex(random_bytes(6));unset($item);save_project($p);
                }finally{foreach([$temp.'-thumb.jpg',$temp.'-og.jpg'] as $file)if(is_file($file))unlink($file);}
            }else save_project($p);
        } elseif ($action === 'caption') {
            $id=text_field('item',6);find_item($p,'photo',$id);$name=text_field('name',200);$length=preg_match_all('/./us',$name,$characters);
            if($name===''||$length===false||$length>200||preg_match('/[\r\n]/',$name))fail('Введите подпись до 200 символов.');
            foreach($p['items']['photo'] as &$item)if($item['id']===$id)$item['name']=$name;unset($item);save_project($p);
        } elseif ($action === 'rename') {
            $type = text_field('type',5); if (!in_array($type,['360','3d','doc'],true)) fail('Неверный раздел.');
            $id=text_field('item',6);$item=find_item($p,$type,$id);$name=text_field('name',200);
            $length=preg_match_all('/./us',$name,$characters);
            if($name==='' || $length===false || $length>200 || strpos($name,'/')!==false || strpos($name,chr(92))!==false || preg_match('/[\x00-\x1f\x7f]/',$name)) fail('Введите корректное имя файла без разделителей пути.');
            $extension=pathinfo($item['filename'],PATHINFO_EXTENSION);
            if($extension!=='' && strcasecmp(substr($name,-strlen($extension)-1),'.'.$extension)===0) $name=substr($name,0,-strlen($extension)-1);
            $name=trim($name);if($name==='' || $name==='.' || $name==='..')fail('Введите имя файла.');
            $old=$item;$item['filename']=$name.($extension!==''?'.'.$extension:'');
            $item['name']=$type==='doc'?$item['filename']:$name;
            if($type==='doc'){
                $oldUrlName=document_filename($p,$old);
                $others=$p;$others['items']['doc']=array_values(array_filter($p['items']['doc'],function($other)use($id){return $other['id']!==$id;}));
                $item['public_filename']=new_document_filename($others,$item);
                $aliases=array_merge($old['previous_filenames']??[],[$oldUrlName]);
                if(empty($old['public_filename']))$aliases[]=document_suffix(document_base_name($old['filename']),$id);
                $item['previous_filenames']=array_values(array_diff(array_unique($aliases),[$item['public_filename']]));
            }
            foreach($p['items'][$type] as &$stored)if($stored['id']===$id)$stored=$item;unset($stored);save_project($p);
        } elseif ($action === 'delete_item') {
            $type=text_field('type',5);if(!in_array($type,['360','3d','doc','photo'],true))fail('Неверный раздел.');
            $id=text_field('item',6);find_item($p,$type,$id);
            $p['items'][$type]=array_values(array_filter($p['items'][$type],function($item)use($id){return $item['id']!==$id;}));
            if($type==='360'&&isset($p['panorama_tour'])){
                unset($p['panorama_tour']['points'][$id]);
                foreach($p['panorama_tour']['points'] as &$list)$list=array_values(array_filter($list,function($point)use($id){return $point['target']!==$id;}));unset($list);
                if(($p['panorama_tour']['start']??null)===$id)$p['panorama_tour']['start']=null;
                $p['panorama_tour_revision']=bin2hex(random_bytes(6));unset($p['panorama_tour_request']);
            }
            save_project($p);$prefix=project_path($p['id']).'/'.$type.'/'.$id;foreach(array_merge(glob($prefix.'.*')?:[],glob($prefix.'-*.jpg')?:[],glob($prefix.'-*.png')?:[],glob($prefix.'-*.webp')?:[],glob($prefix.'-edges.bin')?:[],glob($prefix.'-*.glb')?:[],glob($prefix.'-*-edges.bin')?:[]) as $path)unlink($path);
        } else fail('Неизвестное действие.');
    }
    flock($lock,LOCK_UN);fclose($lock);$lock=null;
    json_out(['project'=>$p]);
} catch (Throwable $error) {
    if (is_resource($lock)) { flock($lock,LOCK_UN);fclose($lock); }
    $code = $error instanceof RuntimeException && in_array($error->getCode(),[400,401,403,404,409,413,429,500,503],true) ? $error->getCode() : 500;
    json_out(['error'=>$code===500 ? 'Не удалось сохранить изменения. Проверьте свободное место и права записи на хостинге.' : $error->getMessage()],$code);
}
