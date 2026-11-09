import {panoramaView} from './panorama.js?v=2';
import {tourConnectivity,randomRequest} from './panorama-tour-data.js?v=1';
export async function openPanoramaTourEditor({project,api,onUpdate}){
 const items=project.items['360'];if(!items.length)return;
 const clone=value=>JSON.parse(JSON.stringify(value));
 let data=clone(project.panorama_tour||{start:null,points:{}}),revision=project.panorama_tour_revision||'',current=items.find(i=>i.id===data.start)||items[0],view=null,epoch=0,closed=false,version=0,savedVersion=0,sending=false,failure=false,conflict=false,pending=null,draftAvailable=true,drag=null,dragFrame=0,arrival=null,arrivalToken=0,editing=null;
 const key='room26-panorama-tour:'+project.id;
 function el(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;}
 function button(text,handler,className='secondary'){const node=el('button',className,text);node.type='button';node.onclick=handler;return node;}
 const dialog=el('dialog','pano-tour-editor'),header=el('header','pano-tour-header'),heading=el('h2','', 'Панорамный тур'),close=button('Закрыть',tryClose),body=el('div','pano-tour-body'),stage=el('div','pano-tour-stage'),surface=el('div','pano-tour-surface'),name=el('div','pano-tour-name'),loading=el('div','pano-tour-loading'),panel=el('div','pano-tour-panel'),tiles=el('div','pano-tour-tiles'),footer=el('footer','pano-tour-footer'),health=button('',showHealth,'pano-tour-health'),error=el('div','pano-tour-error'),errorText=el('span'),retry=button('Повторить',()=>{if(!conflict){failure=false;error.hidden=true;save();}});
 const angle=el('dialog','pano-arrival-dialog'),angleHeader=el('header','pano-tour-header'),angleStage=el('div','pano-arrival-stage'),angleSurface=el('div','pano-tour-surface'),angleLoading=el('div','pano-tour-loading','Загрузка…'),angleActions=el('footer','actions pano-arrival-actions'),done=button('Готово',commit),remove=button('Удалить',deletePoint,'danger'),cancel=button('Отмена',()=>angle.close());
 angleHeader.append(el('h2','','Выбери ракурс'));angleStage.append(angleSurface,angleLoading);angleActions.append(done,remove,cancel);angle.append(angleHeader,angleStage,angleActions);angle.setAttribute('aria-label','Ракурс перехода');
 const discard=button('Отбросить черновик и обновить',()=>{if(!confirm('Отбросить несохранённые изменения и загрузить тур с сервера?'))return;try{localStorage.removeItem(key);}catch{}savedVersion=version;dialog.close();location.reload();});discard.hidden=true;error.append(errorText,retry,discard);error.hidden=true;header.append(heading,close);stage.append(surface,name,loading);footer.append(health);panel.append(tiles,footer);body.append(stage,panel);dialog.append(header,body,error);dialog.setAttribute('aria-label','Редактор панорамного тура');document.body.append(dialog,angle);dialog.showModal();
 const tileMap=new Map();
 function source(item){return '/media.php?'+new URLSearchParams({p:project.id,type:'360',item:item.id,kind:'source',...(item.source_version?{v:item.source_version}:{})});}
 function setError(message,isConflict=false){failure=true;conflict=isConflict;errorText.textContent=message;retry.hidden=isConflict;discard.hidden=!isConflict;error.hidden=false;}
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
   const star=tile.querySelector('.pano-tour-star');star.textContent=data.start===state.id?'★':'☆';star.setAttribute('aria-pressed',String(data.start===state.id));star.title=data.start===state.id?'Снять стартовую панораму':'Сделать стартовой';tile.classList.toggle('is-current',current.id===state.id);
  }
  const complete=states.every(i=>i.complete);health.textContent=complete?'✓ Тур связан':'⚠ Есть разрывы';health.classList.toggle('is-connected',complete);
 }
 function showHealth(){const states=tourConnectivity(items,data),lines=states.filter(s=>!s.complete).map(s=>items.find(i=>i.id===s.id).name+': '+[!s.reachable?'недоступна со старта':'',!s.returnable?'нет пути к старту':''].filter(Boolean).join('; '));const info=el('dialog','dialog pano-health-dialog');info.append(el('h2','','Проверка маршрутов'),el('p','',lines.length?lines.join('\n'):'Все панорамы доступны, из каждой можно вернуться к стартовой.'),button('Закрыть',()=>info.close()));info.onclose=()=>info.remove();document.body.append(info);info.showModal();}
 for(const item of items){const tile=el('div','pano-tour-tile');tile.dataset.panorama=item.id;const image=el('img');image.src='/media.php?'+new URLSearchParams({p:project.id,type:'360',item:item.id,kind:'thumb',...(item.preview_version?{v:item.preview_version}:{})});image.alt=item.name;image.draggable=false;const caption=el('span','pano-tour-caption',item.name),badges=el('div','pano-tour-badges'),star=button('☆',event=>{event.stopPropagation();if(conflict)return;data.start=data.start===item.id?null:item.id;changed();},'pano-tour-star');star.setAttribute('aria-label','Стартовая панорама: '+item.name);tile.append(image,caption,badges,star);tileMap.set(item.id,tile);tiles.append(tile);tile.tabIndex=0;tile.setAttribute('role','button');tile.setAttribute('aria-label','Открыть панораму '+item.name);tile.onkeydown=event=>{if(event.target===tile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();select(item);}};bindDrag(tile,{target:item.id},()=>select(item));}
 async function select(item){
  if(drag?.active||closed)return;const token=++epoch;view?.dispose();view=null;surface.replaceChildren();current=item;name.textContent=item.name;loading.hidden=false;loading.textContent='Загрузка…';refresh();
  try{const next=await panoramaView(surface,source(item),{editor:true,views:item.views});if(closed||token!==epoch){next.dispose();return;}view=next;loading.hidden=true;paintPoints();}catch(e){if(token===epoch){loading.textContent=e.message;const retryLoad=button('Повторить',()=>select(item));loading.append(retryLoad);}}
 }
 function paintPoints(){if(!view)return;for(const point of data.points[current.id]||[])view.raw.addHotSpot({id:point.id,yaw:point.yaw,pitch:point.pitch,cssClass:'pano-tour-hotspot pano-edit-hotspot',createTooltipFunc:node=>{node.setAttribute('role','button');node.tabIndex=0;node.setAttribute('aria-label','Редактировать переход');bindDrag(node,{point,source:current.id},()=>openAngle(point,current.id,false));node.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();openAngle(point,current.id,false);}};}});}
 async function openAngle(point,sourceId,isNew){
  if(conflict||closed)return;const target=items.find(i=>i.id===point.target);if(!target)return;editing={point:clone(point),source:sourceId,isNew};done.disabled=true;remove.hidden=isNew;angleLoading.hidden=false;angleLoading.textContent='Загрузка…';angleSurface.replaceChildren();angle.showModal();const token=++arrivalToken;
  try{const next=await panoramaView(angleSurface,source(target),{editor:true,view:point.view||target.views?.desktop||target.views?.mobile});if(token!==arrivalToken||!angle.open){next.dispose();return;}arrival=next;done.disabled=false;angleLoading.hidden=true;}catch(e){angleLoading.textContent=e.message;}
 }
 function commit(){if(!arrival||!editing||conflict)return;const {point,source:from,isNew}=editing;point.view=arrival.getView();if(isNew)(data.points[from]??=[]).push(point);else{const list=data.points[from]||[],index=list.findIndex(p=>p.id===point.id);if(index>=0)list[index]=point;view?.raw.removeHotSpot(point.id);}angle.close();changed();if(current.id===from)selectPreservingView();}
 function selectPreservingView(){const state=view?.getView();select(current).then(()=>{if(state)view?.setView(state);});}
 function deletePoint(){if(!editing||conflict)return;const {point,source:from}=editing;data.points[from]=(data.points[from]||[]).filter(p=>p.id!==point.id);if(from===current.id)view?.raw.removeHotSpot(point.id);angle.close();changed();}
 angle.addEventListener('close',()=>{arrivalToken++;arrival?.dispose();arrival=null;editing=null;angleSurface.replaceChildren();});
 function coords(x,y){return view?.raw.mouseEventToCoords({clientX:x,clientY:y});}
 function inside(x,y){const r=surface.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
 function startDrag(candidate){if(conflict||!view||candidate.meta.target===current.id)return;candidate.active=true;view.raw.stopMovement();candidate.ghost=el('div','pano-tour-drag-ghost','●');dialog.append(candidate.ghost);candidate.ghost.style.left=candidate.x+'px';candidate.ghost.style.top=candidate.y+'px';dragFrame=requestAnimationFrame(autoPan);}
 function autoPan(time){if(!drag?.active)return;const r=surface.getBoundingClientRect(),dt=Math.min((time-(drag.time||time))/1000,.04);drag.time=time;
  if(inside(drag.x,drag.y)&&view){const zone=Math.min(55,r.width*.16,r.height*.18);let yaw=0,pitch=0;if(drag.x<r.left+zone)yaw=-(r.left+zone-drag.x)/zone;else if(drag.x>r.right-zone)yaw=(drag.x-r.right+zone)/zone;if(drag.y<r.top+zone)pitch=(r.top+zone-drag.y)/zone;else if(drag.y>r.bottom-zone)pitch=-(drag.y-r.bottom+zone)/zone;view.raw.lookAt(Math.max(-85,Math.min(85,view.raw.getPitch()+pitch*35*dt)),view.raw.getYaw()+yaw*45*dt,view.raw.getHfov(),false);if(drag.meta.point){const c=coords(drag.x,drag.y);view.raw.removeHotSpot(drag.meta.point.id);view.raw.addHotSpot({id:drag.meta.point.id,pitch:c[0],yaw:c[1],cssClass:'pano-tour-hotspot pano-dragging-hotspot'});}}
  dragFrame=requestAnimationFrame(autoPan);
 }
 function move(x,y,event){if(!drag)return;drag.x=x;drag.y=y;if(!drag.active&&Math.hypot(x-drag.startX,y-drag.startY)>7){clearTimeout(drag.timer);if(!drag.touch)startDrag(drag);else{drag=null;return;}}if(drag?.active){event.preventDefault();event.stopPropagation();drag.ghost.style.left=x+'px';drag.ghost.style.top=y+'px';}}
 function finish(cancelled=false){if(!drag)return;const d=drag;drag=null;clearTimeout(d.timer);cancelAnimationFrame(dragFrame);d.ghost?.remove();if(!d.active){if(!cancelled&&Math.hypot(d.x-d.startX,d.y-d.startY)<7)d.tap();return;}if(cancelled||!inside(d.x,d.y)){if(d.meta.point)selectPreservingView();return;}const c=coords(d.x,d.y);if(!c)return;const pitch=Math.max(-90,Math.min(90,c[0])),yaw=((c[1]+180)%360+360)%360-180;
  if(d.meta.point){Object.assign(d.meta.point,{pitch,yaw});changed();selectPreservingView();}
  else{let id;do{id=randomRequest().slice(0,6);}while(Object.values(data.points).some(points=>points.some(point=>point.id===id)));openAngle({id,target:d.meta.target,pitch,yaw},current.id,true);}
 }
 function bindDrag(node,meta,tap){
  function begin(x,y,touch,event){if(drag||conflict)return;if(event.target.closest('button.pano-tour-star'))return;drag={meta,tap,x,y,startX:x,startY:y,touch,active:false};if(touch)drag.timer=setTimeout(()=>{if(drag)startDrag(drag);},350);if(meta.point){event.stopPropagation();if(!touch)event.preventDefault();}}
  node.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0)begin(e.clientX,e.clientY,false,e);},true);
  node.addEventListener('touchstart',e=>{if(e.touches.length===1)begin(e.touches[0].clientX,e.touches[0].clientY,true,e);},{passive:false,capture:true});
  node.addEventListener('click',e=>{if(!e.target.closest('.pano-tour-star')){e.preventDefault();e.stopPropagation();}},true);
 }
 const pointerMove=e=>{if(e.pointerType!=='touch')move(e.clientX,e.clientY,e);},pointerUp=e=>{if(e.pointerType!=='touch')finish();},touchMove=e=>{if(e.touches.length===1)move(e.touches[0].clientX,e.touches[0].clientY,e);else finish(true);},touchEnd=e=>{if(drag?.active){e.preventDefault();e.stopPropagation();}finish();},cancelDrag=()=>finish(true);
 window.addEventListener('pointermove',pointerMove,{capture:true,passive:false});window.addEventListener('pointerup',pointerUp,true);window.addEventListener('touchmove',touchMove,{capture:true,passive:false});window.addEventListener('touchend',touchEnd,{capture:true,passive:false});window.addEventListener('touchcancel',cancelDrag,true);window.addEventListener('pointercancel',cancelDrag,true);
 function beforeUnload(event){if(version!==savedVersion){event.preventDefault();event.returnValue='';}}
 window.addEventListener('beforeunload',beforeUnload);
 function tryClose(){if(version!==savedVersion){if(failure){setError(conflict?errorText.textContent:'Не удалось сохранить изменения. Повторите запрос перед выходом.',conflict);return;}setError('Изменения ещё отправляются. Дождитесь завершения перед выходом.');if(sending)failure=false;return;}dialog.close();}
 dialog.addEventListener('cancel',e=>{e.preventDefault();tryClose();});
 dialog.addEventListener('close',()=>{closed=true;epoch++;finish(true);view?.dispose();angle.close();angle.remove();dialog.remove();window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('pointerup',pointerUp,true);window.removeEventListener('touchmove',touchMove,true);window.removeEventListener('touchend',touchEnd,true);window.removeEventListener('touchcancel',cancelDrag,true);window.removeEventListener('pointercancel',cancelDrag,true);});
 refresh();await select(current);if(version&&!failure)save();
}
