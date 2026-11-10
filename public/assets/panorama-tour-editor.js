import {panoramaView} from './panorama.js?v=3';
import {tourConnectivity,tourStatus,randomRequest} from './panorama-tour-data.js?v=2';
import {panoramaPreviews,panoramaInfo} from './panorama-files.js?v=1';
export async function openPanoramaTourEditor({project,api,onUpdate}){
 let items=project.items['360'];
 const clone=value=>JSON.parse(JSON.stringify(value));
 let data=clone(project.panorama_tour||{start:null,points:{}}),revision=project.panorama_tour_revision||'',current=items.find(i=>i.id===data.start)||items[0]||null,view=null,epoch=0,closed=false,version=0,savedVersion=0,sending=false,failure=false,conflict=false,pending=null,draftAvailable=true,drag=null,dragFrame=0,arrival=null,arrivalToken=0,editing=null;
 let working=false,errorRecovery=null,cameraEditing=false,cameraMode='desktop',cameraDrafts={},cameraPrevious=null,menu=null;
 const key='room26-panorama-tour:'+project.id;
 function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function button(text,handler,className='secondary'){const node=el('button',className,text);node.type='button';node.onclick=handler;return node;}
 const dialog=el('dialog','pano-tour-editor'),header=el('header','pano-tour-header'),heading=el('h2','', 'Виртуальный тур'),close=button('Закрыть',tryClose),body=el('div','pano-tour-body'),stage=el('div','pano-tour-stage'),surface=el('div','pano-tour-surface'),name=el('div','pano-tour-name'),loading=el('div','pano-tour-loading'),panel=el('div','pano-tour-panel'),tiles=el('div','pano-tour-tiles'),footer=el('footer','pano-tour-footer'),health=button('',showHealth,'pano-tour-health'),error=el('div','pano-tour-error'),errorText=el('span'),retry=button('Повторить',()=>{if(!conflict){failure=false;error.hidden=true;if(errorRecovery){const recover=errorRecovery;errorRecovery=null;recover();}else save();}});
 const frame=el('div','pano-camera-frame'),cameraTools=el('div','pano-camera-tools'),setCamera=button('Установить вид',beginCamera,'secondary pano-set-camera'),mobileClose=button('×',tryClose,'secondary pano-mobile-close'),cameraPC=button('ПК',()=>switchCamera('desktop')),cameraPhone=button('Смартфон',()=>switchCamera('mobile')),cameraSave=button('Готово',saveCamera),cameraCancel=button('Отмена',cancelCamera),add=button('Добавить',()=>chooseFiles()),uploadProgress=el('span','pano-upload-progress');
 mobileClose.setAttribute('aria-label','Закрыть редактор');cameraTools.append(cameraPC,cameraPhone,cameraSave,cameraCancel);cameraTools.hidden=true;
 const angle=el('dialog','pano-arrival-dialog'),angleHeader=el('header','pano-tour-header'),angleStage=el('div','pano-arrival-stage'),angleSurface=el('div','pano-tour-surface'),angleName=el('div','pano-tour-name'),angleLoading=el('div','pano-tour-loading','Загрузка…'),angleActions=el('footer','actions pano-arrival-actions'),done=button('Готово',commit),remove=button('Удалить',deletePoint,'danger'),cancel=button('Отмена',()=>angle.close());
 angleHeader.append(el('h2','','Выбери ракурс'));angleStage.append(angleSurface,angleName,angleLoading);angleActions.append(done,remove,cancel);angle.append(angleHeader,angleStage,angleActions);angle.setAttribute('aria-label','Ракурс перехода');
 const discard=button('Отбросить черновик и обновить',()=>{if(!confirm('Отбросить несохранённые изменения и загрузить тур с сервера?'))return;try{localStorage.removeItem(key);}catch{}savedVersion=version;dialog.close();location.reload();});discard.hidden=true;error.append(errorText,retry,discard);error.hidden=true;header.append(heading,close);frame.append(surface);stage.append(frame,name,loading,setCamera,mobileClose,cameraTools);footer.append(health,uploadProgress,add);panel.append(footer,tiles);body.append(stage,panel);dialog.append(header,body,error);dialog.setAttribute('aria-label','Редактор панорамного тура');document.body.append(dialog,angle);dialog.showModal();
 const tileMap=new Map();
 function source(item){return '/media.php?'+new URLSearchParams({p:project.id,type:'360',item:item.id,kind:'source',...(item.source_version?{v:item.source_version}:{})});}
 function setError(message,isConflict=false,recover=null){errorRecovery=recover;failure=true;conflict=isConflict;errorText.textContent=message;retry.hidden=isConflict;discard.hidden=!isConflict;error.hidden=false;}
 function storeDraft(){try{localStorage.setItem(key,JSON.stringify({data,revision,request:pending,version}));}catch{draftAvailable=false;}}
 try{const draft=JSON.parse(localStorage.getItem(key)||'null');if(draft){if(draft.revision===revision||draft.request?.id===project.panorama_tour_request){data=draft.data;pending=draft.request;version=draft.version||1;}else{setError('Есть несохранённый черновик другой версии тура. Закройте редактор и обновите страницу; черновик сохранён.',true);}}}catch{draftAvailable=false;}
 function changed(){version++;storeDraft();refresh();if(!failure)save();}
 async function save(){
  if(sending||closed||failure||savedVersion===version)return;sending=true;
  const request=pending||{id:randomRequest(),data:clone(data),revision,version};pending=request;storeDraft();
  try{
   const result=await api('save_panorama_tour',{tour:JSON.stringify(request.data),revision:request.revision,request_id:request.id});
   revision=result.project.panorama_tour_revision;savedVersion=request.version;pending=null;failure=false;error.hidden=true;onUpdate(result.project);
   if(savedVersion===version){try{localStorage.removeItem(key);}catch{}}else storeDraft();
  }catch(e){setError(e.message+(!draftAvailable?' Локальный черновик недоступен — не закрывайте страницу.':''),e.status===409);}
  finally{sending=false;if(!failure&&savedVersion!==version)save();}
 }
 function refresh(){
  const states=tourConnectivity(items,data);for(const state of states){const tile=tileMap.get(state.id);if(!tile)continue;
   const badges=tile.querySelector('.pano-tour-badges');badges.replaceChildren();
   for(const [condition,className,text,label]of [[state.incoming,'pano-in','↓ '+state.incoming,'Входящих: '+state.incoming],[state.outgoing,'pano-out','↑ '+state.outgoing,'Исходящих: '+state.outgoing],[state.complete,'pano-connected','✓','Доступна со старта и обратно']])if(condition){const badge=el('span',className,text);badge.title=label;badge.setAttribute('aria-label',label);badges.append(badge);}
   const star=tile.querySelector('.pano-tour-star');star.setAttribute('aria-pressed',String(data.start===state.id));star.title=data.start===state.id?'Снять стартовую панораму':'Сделать стартовой';tile.classList.toggle('is-current',current?.id===state.id);
  }
  const summary=tourStatus(items,data);health.textContent=(summary.connected?'✓ ':'')+summary.label;health.classList.toggle('is-connected',summary.connected);setCamera.disabled=!current||!view||working;add.disabled=working;for(const control of [cameraPC,cameraPhone,cameraSave])control.disabled=!view||working;
 }
 function showHealth(){const states=tourConnectivity(items,data),lines=states.filter(s=>!s.complete).map(s=>items.find(i=>i.id===s.id).name+': '+[!s.reachable?'недоступна со старта':'',!s.returnable?'нет пути к старту':''].filter(Boolean).join('; '));const info=el('dialog','dialog pano-health-dialog');info.append(el('h2','','Проверка маршрутов'),el('p','',!tourStatus(items,data).links?'В туре пока нет переходов.':lines.length?lines.join('\n'):'Все панорамы доступны, из каждой можно вернуться к стартовой.'),button('Закрыть',()=>info.close()));info.onclose=()=>info.remove();document.body.append(info);info.showModal();}
 function buildTiles(){tileMap.clear();tiles.replaceChildren(); for(const item of items){const tile=el('div','pano-tour-tile');tile.dataset.panorama=item.id;const image=el('img');image.src='/media.php?'+new URLSearchParams({p:project.id,type:'360',item:item.id,kind:'thumb',...(item.preview_version?{v:item.preview_version}:{})});image.alt=item.name;image.draggable=false;const caption=el('span','pano-tour-caption',item.name),badges=el('div','pano-tour-badges'),star=button('',event=>{event.stopPropagation();if(conflict||working)return;data.start=data.start===item.id?null:item.id;changed();},'pano-tour-star');const icon=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS('http://www.w3.org/2000/svg','polygon');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('aria-hidden','true');path.setAttribute('points','12,2 15.1,8.3 22,9.3 17,14.2 18.2,21.1 12,17.8 5.8,21.1 7,14.2 2,9.3 8.9,8.3');icon.append(path);star.append(icon);star.setAttribute('aria-label','Стартовая панорама: '+item.name);const more=button('⋮',event=>{event.stopPropagation();openMenu(item,more);},'pano-tour-more');more.setAttribute('aria-label','Действия: '+item.name);tile.append(image,caption,badges,star,more);tileMap.set(item.id,tile);tiles.append(tile);tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label','Открыть панораму '+item.name);tile.onkeydown=event=>{if(event.target===tile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(item);}};bindDrag(tile,{target:item.id},()=>select(item));}
 refresh();}
 async function select(item,arrivalView=null,keepCamera=false){
  if(drag?.active||closed||!item)return;if(cameraEditing&&!keepCamera){if(!confirm('Сменить панораму без сохранения вида?'))return;cancelCamera(false);}closeMenu();const token=++epoch;view?.dispose();view=null;surface.replaceChildren();current=item;name.textContent=item.name;loading.hidden=false;loading.textContent='Загрузка…';refresh();
  try{const next=await panoramaView(surface,source(item),{editor:true,view:arrivalView,views:arrivalView?null:item.views});if(closed||token!==epoch){next.dispose();return;}view=next;loading.hidden=true;if(!cameraEditing)paintPoints();refresh();}catch(e){if(token===epoch){loading.textContent=e.message;const retryLoad=button('Повторить',()=>select(item));loading.append(retryLoad);}}
 }
 function paintPoints(){if(!view)return;for(const point of data.points[current.id]||[])view.raw.addHotSpot({id:point.id,yaw:point.yaw,pitch:point.pitch,cssClass:'pano-tour-hotspot pano-edit-hotspot',createTooltipFunc:node=>{node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label','Перейти к панораме '+(items.find(i=>i.id===point.target)?.name||''));node.setAttribute('aria-description','Удерживайте на месте для редактирования, удерживайте и тяните для перемещения. Shift+Enter — редактировать.');bindDrag(node,{point,source:current.id},()=>follow(point),()=>openAngle(point,current.id,false));node.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();if(e.shiftKey)openAngle(point,current.id,false);else follow(point);}};}});}
 function follow(point){const target=items.find(i=>i.id===point.target);if(target)select(target,point.view);}
 async function openAngle(point,sourceId,isNew){
  if(conflict||closed)return;const target=items.find(i=>i.id===point.target);if(!target)return;angleName.textContent=target.name;editing={point:clone(point),source:sourceId,isNew};done.disabled=true;remove.hidden=isNew;angleLoading.hidden=false;angleLoading.textContent='Загрузка…';angleSurface.replaceChildren();angle.showModal();const token=++arrivalToken;
  try{const next=await panoramaView(angleSurface,source(target),{editor:true,view:point.view||target.views?.desktop||target.views?.mobile});if(token!==arrivalToken||!angle.open){next.dispose();return;}arrival=next;done.disabled=false;angleLoading.hidden=true;}catch(e){angleLoading.textContent=e.message;}
 }
 function commit(){if(!arrival||!editing||conflict)return;const {point,source:from,isNew}=editing;point.view=arrival.getView();if(isNew)(data.points[from]??=[]).push(point);else{const list=data.points[from]||[],index=list.findIndex(p=>p.id===point.id);if(index>=0)list[index]=point;view?.raw.removeHotSpot(point.id);}angle.close();changed();if(current.id===from)selectPreservingView();}
 function selectPreservingView(){const state=view?.getView();select(current).then(()=>{if(state&&!closed)view?.setView(state);});}
 function deletePoint(){if(!editing||conflict)return;const {point,source:from}=editing;data.points[from]=(data.points[from]||[]).filter(p=>p.id!==point.id);if(from===current.id)view?.raw.removeHotSpot(point.id);angle.close();changed();}
 angle.addEventListener('close',()=>{arrivalToken++;arrival?.dispose();arrival=null;editing=null;angleSurface.replaceChildren();});
 function coords(x,y){return view?.raw.mouseEventToCoords({clientX:x,clientY:y});}
 function inside(x,y){const r=surface.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
 function startDrag(candidate){if(conflict||working||cameraEditing||candidate.meta.point&&!view)return;candidate.active=true;candidate.hotspot=candidate.meta.point?view.raw.getConfig().hotSpots.find(point=>point.id===candidate.meta.point.id):null;view?.raw.stopMovement();candidate.ghost=el('div','pano-tour-drag-ghost','●');dialog.append(candidate.ghost);candidate.ghost.style.left=candidate.x+'px';candidate.ghost.style.top=candidate.y+'px';dragFrame=requestAnimationFrame(autoPan);}
 function autoPan(time){if(!drag?.active)return;const r=surface.getBoundingClientRect(),dt=Math.min((time-(drag.time||time))/1000,.04);drag.time=time;
  markDrop(drag);
  if(inside(drag.x,drag.y)&&view&&drag.meta.target!==current?.id){const zone=Math.min(55,r.width*.16,r.height*.18);let yaw=0,pitch=0;if(drag.x<r.left+zone)yaw=-(r.left+zone-drag.x)/zone;else if(drag.x>r.right-zone)yaw=(drag.x-r.right+zone)/zone;if(drag.y<r.top+zone)pitch=(r.top+zone-drag.y)/zone;else if(drag.y>r.bottom-zone)pitch=-(drag.y-r.bottom+zone)/zone;view.raw.lookAt(Math.max(-85,Math.min(85,view.raw.getPitch()+pitch*35*dt)),view.raw.getYaw()+yaw*45*dt,view.raw.getHfov(),false);if(drag.hotspot){const c=coords(drag.x,drag.y);drag.hotspot.pitch=c[0];drag.hotspot.yaw=c[1];}}
  dragFrame=requestAnimationFrame(autoPan);
 }
 function move(x,y,event){if(!drag)return;drag.x=x;drag.y=y;if(!drag.active&&Math.hypot(x-drag.startX,y-drag.startY)>7){clearTimeout(drag.timer);if(!drag.touch||drag.meta.point&&drag.held)startDrag(drag);else{drag=null;return;}}if(drag?.active){event.preventDefault();event.stopPropagation();drag.ghost.style.left=x+'px';drag.ghost.style.top=y+'px';}}
 function finish(cancelled=false){if(!drag)return;const d=drag;if(d.active)markDrop(d);drag=null;clearTimeout(d.timer);cancelAnimationFrame(dragFrame);d.ghost?.remove();clearDrop();if(!d.active){if(!cancelled&&Math.hypot(d.x-d.startX,d.y-d.startY)<7){if(d.meta.point&&d.held)d.hold();else d.tap();}return;}if(!cancelled&&d.meta.target&&d.drop){reorder(d.meta.target,d.drop);return;}if(cancelled||!inside(d.x,d.y)||d.meta.target===current?.id){if(d.meta.point)selectPreservingView();return;}const c=coords(d.x,d.y);if(!c)return;const pitch=Math.max(-90,Math.min(90,c[0])),yaw=((c[1]+180)%360+360)%360-180;
  if(d.meta.point){Object.assign(d.meta.point,{pitch,yaw});changed();selectPreservingView();}
  else{let id;do{id=randomRequest().slice(0,6);}while(Object.values(data.points).some(points=>points.some(point=>point.id===id)));openAngle({id,target:d.meta.target,pitch,yaw},current.id,true);}
 }
 function bindDrag(node,meta,tap,hold=()=>{}){
  function begin(x,y,touch,event){if(drag||conflict||working||cameraEditing)return;if(event.target.closest('button'))return;drag={meta,tap,hold,x,y,startX:x,startY:y,touch,active:false,held:false};if(touch||meta.point)drag.timer=setTimeout(()=>{if(!drag)return;drag.held=true;if(!meta.point)startDrag(drag);},350);if(meta.point){event.stopPropagation();if(!touch)event.preventDefault();}}
  node.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0)begin(e.clientX,e.clientY,false,e);},true);
  node.addEventListener('touchstart',e=>{if(e.touches.length===1)begin(e.touches[0].clientX,e.touches[0].clientY,true,e);},{passive:false,capture:true});
  node.addEventListener('click',e=>{if(!e.target.closest('button')){e.preventDefault();e.stopPropagation();}},true);
 }
 const pointerMove=e=>{if(e.pointerType!=='touch')move(e.clientX,e.clientY,e);},pointerUp=e=>{if(e.pointerType!=='touch')finish();},touchMove=e=>{if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY,e);else finish(true);},touchEnd=e=>{if(drag?.active||drag?.held){e.preventDefault();e.stopPropagation();}finish();},cancelDrag=()=>finish(true);
 window.addEventListener('pointermove',pointerMove,{capture:true,passive:false});window.addEventListener('pointerup',pointerUp,true);window.addEventListener('touchmove',touchMove,{capture:true,passive:false});window.addEventListener('touchend',touchEnd,{capture:true,passive:false});window.addEventListener('touchcancel',cancelDrag,true);window.addEventListener('pointercancel',cancelDrag,true);
 function beforeUnload(event){if(version!==savedVersion||working){event.preventDefault();event.returnValue='';}}
 window.addEventListener('beforeunload',beforeUnload);
 function tryClose(){if(working){errorText.textContent='Дождитесь завершения загрузки или сохранения.';error.hidden=false;return;}if(cameraEditing){if(!confirm('Закрыть настройку вида без сохранения?'))return;cancelCamera(false);}if(version!==savedVersion){if(failure){setError(conflict?errorText.textContent:'Не удалось сохранить изменения. Повторите запрос перед выходом.',conflict);return;}setError('Изменения ещё отправляются. Дождитесь завершения перед выходом.');if(sending)failure=false;return;}dialog.close();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();tryClose();});
 dialog.addEventListener('close',()=>{closed=true;epoch++;finish(true);closeMenu();frameObserver.disconnect();view?.dispose();angle.close();angle.remove();dialog.remove();window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('pointerup',pointerUp,true);window.removeEventListener('touchmove',touchMove,true);window.removeEventListener('touchend',touchEnd,true);window.removeEventListener('touchcancel',cancelDrag,true);window.removeEventListener('pointercancel',cancelDrag,true);});
 function emptyStage(){epoch++;view?.dispose();view=null;surface.replaceChildren();name.textContent='';loading.hidden=false;loading.textContent='Добавьте панорамы';refresh();}
 async function flush(){
  if(failure||conflict)throw Error('Сначала сохраните изменения тура или повторите запрос.');
  while(sending||savedVersion!==version){if(failure||conflict)throw Error('Не удалось сохранить тур. Повторите запрос.');if(!sending)save();await new Promise(resolve=>setTimeout(resolve,40));}
 }
 function adoptProject(next){
  project=next;items=next.items['360'];data=clone(next.panorama_tour||{start:null,points:{}});revision=next.panorama_tour_revision||'';
  current=items.find(i=>i.id===current?.id)||items[0]||null;name.textContent=current?.name||'';buildTiles();onUpdate(next);
 }
 function workingState(value){working=value;panel.inert=value;close.disabled=value;mobileClose.disabled=value;stage.classList.toggle('is-working',value);refresh();}
 async function manage(action,fields={}){
  if(working||closed)return false;workingState(true);closeMenu();
  try{await flush();const next=await api(action,fields);adoptProject(next.project);error.hidden=true;return true;}
  catch(e){setError(e.message,e.status===409,()=>manage('get_project'));return false;}
  finally{workingState(false);}
 }
 function chooseFiles(replace=null){
  if(working||conflict)return;const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=!replace;input.onchange=()=>uploadFiles([...input.files],replace);input.click();
 }
 async function uploadFiles(files,replace=null){
  if(!files.length||working||conflict)return;workingState(true);closeMenu();let done=0;const original=current?.id;
  try{await flush();for(const file of files){
    uploadProgress.textContent=`Загрузка ${done+1}/${files.length}`;const previews=await panoramaPreviews(file),body=new FormData();body.set('file',file);body.set('thumb',previews.thumb,'thumb.jpg');body.set('og',previews.og,'og.jpg');
    if(replace){body.set('item',replace.id);body.set('source_version',replace.source_version||'');}else body.set('type','360');
    const result=await api(replace?'replace_panorama':'upload',body);adoptProject(result.project);done++;
   }
   error.hidden=true;
  }catch(e){setError((done?`Загружено ${done} из ${files.length}. `:'')+e.message,e.status===409,async()=>{if(await manage('get_project')){if(current)select(current);else emptyStage();}});}
  finally{uploadProgress.textContent='';workingState(false);if(current&&(!original||replace?.id===current.id))await select(current);else if(!current)emptyStage();}
 }
 function hasFiles(event){return [...(event.dataTransfer?.types||[])].includes('Files');}
 dialog.addEventListener('dragover',event=>{if(hasFiles(event))event.preventDefault();});
 dialog.addEventListener('drop',event=>{if(hasFiles(event))event.preventDefault();});
 panel.addEventListener('dragover',event=>{if(!hasFiles(event))return;event.preventDefault();event.stopPropagation();if(!working&&!conflict){event.dataTransfer.dropEffect='copy';panel.classList.add('is-file-drop');}});
 panel.addEventListener('dragleave',event=>{if(!(event.relatedTarget instanceof Node)||!panel.contains(event.relatedTarget))panel.classList.remove('is-file-drop');});
 panel.addEventListener('drop',event=>{if(!hasFiles(event))return;event.preventDefault();event.stopPropagation();panel.classList.remove('is-file-drop');uploadFiles([...event.dataTransfer.files]);});
 function clearDrop(){stage.classList.remove('is-point-drop');for(const tile of tileMap.values())tile.classList.remove('pano-drop-before','pano-drop-after');}
 function markDrop(candidate){
  clearDrop();candidate.drop=null;if(!candidate.meta.target)return;stage.classList.toggle('is-point-drop',inside(candidate.x,candidate.y)&&candidate.meta.target!==current?.id);
  const r=tiles.getBoundingClientRect();if(candidate.x<r.left||candidate.x>r.right||candidate.y<r.top||candidate.y>r.bottom)return;
  const edge=36;if(candidate.y<r.top+edge)tiles.scrollTop-=8;else if(candidate.y>r.bottom-edge)tiles.scrollTop+=8;
  const target=document.elementsFromPoint(candidate.x,candidate.y).map(node=>node.closest?.('.pano-tour-tile')).find(node=>node&&tiles.contains(node));
  if(target){const box=target.getBoundingClientRect(),after=candidate.x>box.left+box.width/2;candidate.drop={id:target.dataset.panorama,after};target.classList.add(after?'pano-drop-after':'pano-drop-before');}
  else if(items.length)candidate.drop={id:items[items.length-1].id,after:true};
 }
 async function reorder(id,drop){
  if(id===drop.id)return;const order=items.map(i=>i.id).filter(value=>value!==id),index=order.indexOf(drop.id);if(index<0)return;order.splice(index+(drop.after?1:0),0,id);
  if(order.every((value,index)=>items[index].id===value))return;await manage('reorder',{type:'360',order:JSON.stringify(order)});
 }
 function closeMenu(){menu?.remove();menu=null;}
 function openMenu(item,anchor){
  closeMenu();if(working)return;menu=el('div','pano-item-menu');menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Действия с панорамой '+item.name);
  menu.append(el('div','pano-item-info',panoramaInfo(item)),el('hr'));
  const rename=button('Переименовать',async()=>{closeMenu();const value=await askName(item);if(value===null)return;await manage('rename',{type:'360',item:item.id,name:value});});
  const replace=button('Заменить изображение',()=>{closeMenu();chooseFiles(item);});
  const link=el('a','','Открыть панораму');link.href='/pro/'+project.id+'/360/?item='+item.id;link.target='_blank';link.rel='noopener';link.onclick=closeMenu;
  const remove=button('Удалить',async()=>{closeMenu();if(!confirm('Удалить панораму и все переходы из неё и на неё?'))return;const previous=current?.id;if(await manage('delete_item',{type:'360',item:item.id})){if(!current)emptyStage();else if(previous!==current.id)select(current);}},'danger');
  menu.append(rename,replace,link,remove);dialog.append(menu);const box=anchor.getBoundingClientRect(),size=menu.getBoundingClientRect();menu.style.left=Math.max(8,Math.min(innerWidth-size.width-8,box.right-size.width))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-size.height-8,box.bottom+4))+'px';rename.focus();
 }
 function askName(item){return new Promise(resolve=>{const modal=el('dialog','dialog pano-rename-dialog'),form=el('form'),label=el('label','','Название панорамы'),input=el('input'),actions=el('div','actions');input.value=item.name;input.maxLength=200;input.required=true;label.append(input);const save=button('Сохранить',null);save.type='submit';actions.append(save,button('Отмена',()=>modal.close()));form.append(el('h2','','Переименовать панораму'),label,actions);modal.append(form);document.body.append(modal);let value=null;form.onsubmit=event=>{event.preventDefault();if(!input.value.trim())return;value=input.value.trim();modal.close();};modal.onclose=()=>{modal.remove();resolve(value);};modal.showModal();input.select();});}
 dialog.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target)&&!event.target.closest('.pano-tour-more'))closeMenu();},true);
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu){event.preventDefault();event.stopPropagation();closeMenu();}},true);
 const frameObserver=new ResizeObserver(fitCamera);frameObserver.observe(stage);
 function fitCamera(){
  if(!cameraEditing){frame.removeAttribute('style');return;}const width=Math.max(1,stage.clientWidth-24),height=Math.max(1,stage.clientHeight-80),ratio=cameraMode==='mobile'?393/740:1280/720,w=Math.min(width,height*ratio),h=w/ratio;
  frame.style.width=w+'px';frame.style.height=h+'px';view?.resize();
 }
 function beginCamera(){
  if(!view||working||conflict)return;cameraPrevious=view.getView();cameraDrafts=clone(current.views||{});for(const profile of ['desktop','mobile'])cameraDrafts[profile]??={yaw:0,pitch:0,hfov:100};cameraMode=innerWidth<=767?'mobile':'desktop';cameraEditing=true;stage.classList.add('is-camera-setting');cameraTools.hidden=false;setCamera.hidden=true;updateCameraButtons();fitCamera();select(current,cameraDrafts[cameraMode],true);
 }
 function updateCameraButtons(){cameraPC.setAttribute('aria-pressed',String(cameraMode==='desktop'));cameraPhone.setAttribute('aria-pressed',String(cameraMode==='mobile'));}
 function switchCamera(profile){if(!cameraEditing||!view||working)return;cameraDrafts[cameraMode]=view.getView();cameraMode=profile;updateCameraButtons();fitCamera();view.setView(cameraDrafts[profile]);}
 function cancelCamera(reload=true,applied=false){if(!cameraEditing)return;cameraEditing=false;stage.classList.remove('is-camera-setting');cameraTools.hidden=true;setCamera.hidden=false;fitCamera();if(reload&&current)select(current,applied?cameraDrafts[innerWidth<=767?'mobile':'desktop']:cameraPrevious);}
 async function saveCamera(){if(!view||!cameraEditing||working)return;cameraDrafts[cameraMode]=view.getView();if(await manage('save_views',{type:'360',item:current.id,views:JSON.stringify(cameraDrafts)}))cancelCamera(true,true);}
 buildTiles();if(current)await select(current);else emptyStage();if(version&&!failure)save();
}
