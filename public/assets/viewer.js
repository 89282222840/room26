import {modelStateFromURL,modelURL} from './model-link.js?v=1';
import {watchProject} from './project-live.js?v=1';
import {installPanoramaPicker} from './panorama-picker.js?v=1';
import {panoramaViewFromURL,panoramaURL} from './panorama-link.js?v=1';
const config=JSON.parse(document.querySelector('#viewer-config').textContent);
const container=document.querySelector('#viewer'),status=document.querySelector('#viewer-status'),title=document.querySelector('#object-title'),dialog=document.querySelector('#object-list');
const tourButton=document.querySelector('#model-tour');
const gridButton=document.querySelector('#floor-grid'),modelControls=config.type==='3d'?document.querySelector('.model-controls'):null;
const picker=dialog.querySelector('.panorama-sheet')?installPanoramaPicker(dialog,document.querySelector('#show-list')):null;
let active=config.items.findIndex(i=>i.id===config.current),view=null,busy=false;
const arrows=[document.querySelector('#previous'),document.querySelector('#next')].filter(Boolean);
function saveCameraURL(item,state){const url=panoramaURL(location.href,item.id,state);if(url&&url.href!==location.href)history.replaceState({...history.state,item:item.id},'',url.href);}
let modelURLTimer=null;
function saveModelCameraURL(){
 clearTimeout(modelURLTimer);modelURLTimer=null;
 if(config.type!=='3d'||busy||!view||!config.items[active])return;
 const item=config.items[active],url=modelURL(location.href,item.id,view.getLiveState());
 if(url&&url.href!==location.href)history.replaceState({...history.state,item:item.id},'',url.href);
}
function queueModelCameraURL(){if(config.type==='3d'&&!busy&&!modelURLTimer)modelURLTimer=setTimeout(saveModelCameraURL,250);}
function selectFromURL(index){const saved=config.type==='3d'?modelStateFromURL(location.href,config.items[index]?.id):null;return select(index,'none',saved?.view||(config.type==='360'?panoramaViewFromURL(location.href):null),saved);}
async function select(index,historyMode='push',arrival=null,restored=null){
 if(!config.items.length)return;
 if(busy)return;if(historyMode==='push')saveModelCameraURL();clearTimeout(modelURLTimer);modelURLTimer=null;busy=true;if(tourButton){tourButton.hidden=true;tourButton.setAttribute('aria-pressed','false');}if(modelControls)modelControls.hidden=true;container.setAttribute('aria-busy','true');if(historyMode==='push'&&config.type==='360'&&view?.raw){saveCameraURL(config.items[active],{yaw:view.raw.getYaw(),pitch:view.raw.getPitch(),hfov:view.raw.getHfov()});}if(gridButton){gridButton.hidden=true;gridButton.setAttribute('aria-pressed','false');}arrows.forEach(b=>b.disabled=true);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=true);
 active=(index+config.items.length)%config.items.length;const item=config.items[active];status.hidden=false;status.classList.toggle('is-loading',config.type==='3d');if(config.type==='3d')status.innerHTML='Загрузка<span class="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';else status.textContent='Загрузка…';title.textContent=item.name;
 view?.dispose?.();view?.destroy?.();view=null;container.replaceChildren();
 if(historyMode==='push')history.pushState({item:item.id},'',item.url);
 document.title=item.name+' — ROOM26';
 const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href=new URL(item.url,location.origin).href;
 for(const [name,value]of Object.entries({'og:title':item.name,'og:image':new URL(item.og,location.origin).href,'og:url':new URL(item.url,location.origin).href}))document.querySelector(`meta[property="${name}"]`)?.setAttribute('content',value);
 dialog.querySelectorAll('[data-item]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.item===item.id)));
 try{
  const module=config.type==='3d'?await import('./model.js?v='+config.versions.model):await import('./panorama.js?v='+config.versions.panorama);
  view=await (config.type==='3d'?module.modelView:module.panoramaView)(container,item.source,{view:arrival,views:arrival?null:item.views,controls:config.type==='360'?false:undefined,floorGrid:config.type==='3d',reveal:config.type==='3d'&&!restored,edgeCacheURL:item.edgeCache,tour:item.tour,onFirstFrame:config.type==='3d'?()=>{status.hidden=true;status.classList.remove('is-loading');}:null,onStateChange:config.type==='3d'?queueModelCameraURL:null,onTourState:state=>tourButton?.setAttribute('aria-pressed',String(state.enabled)),onViewChange:config.type==='360'?state=>{if(config.items[active]?.id!==item.id)return;saveCameraURL(item,state);}:null});if(config.type==='3d'){await view.ready;if(restored){view.restoreLiveState(restored);gridButton?.setAttribute('aria-pressed',String(restored.grid));}}if(config.type==='360')syncHotspots();status.hidden=true;status.classList.remove('is-loading');if(tourButton)tourButton.hidden=!view.tour?.available;if(gridButton)gridButton.hidden=!view.hasFloorGrid;if(modelControls)modelControls.hidden=![...modelControls.children].some(button=>!button.hidden);
 }catch(e){status.hidden=false;status.classList.remove('is-loading');status.textContent='Ошибка загрузки';const retry=document.createElement('button');retry.textContent='Обновить';retry.onclick=()=>select(active,'none',arrival||panoramaViewFromURL(location.href),restored);status.append(document.createElement('br'),retry);}
 finally{busy=false;if(status.hidden)saveModelCameraURL();container.setAttribute('aria-busy','false');arrows.forEach(b=>b.disabled=false);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=false);}
}
document.querySelector('#previous')?.addEventListener('click',()=>select(active-1));document.querySelector('#next')?.addEventListener('click',()=>select(active+1));
document.querySelector('#show-list')?.addEventListener('click',()=>{if(picker){if(config.type==='360'&&view)saveCameraURL(config.items[active],view.getView());else saveModelCameraURL();view?.setInteractionPaused?.(true);picker.open();}else dialog.showModal();});document.querySelector('#close-list').onclick=()=>picker?picker.close():dialog.close();dialog.addEventListener('click',async event=>{const button=event.target.closest('[data-item]');if(!button||busy)return;const index=config.items.findIndex(i=>i.id===button.dataset.item);if(index<0)return;if(picker)await picker.close();else dialog.close();if(!view||!picker||index!==active)select(index);});
function showInitialChoice(){
 view?.dispose?.();view=null;container.replaceChildren();container.setAttribute('aria-busy','false');if(modelControls)modelControls.hidden=true;if(gridButton)gridButton.hidden=true;if(tourButton)tourButton.hidden=true;title.textContent=config.projectName||(config.type==='3d'?'3D-модели':'Панорамы');status.hidden=false;status.classList.remove('is-loading');
 const choose=document.createElement('button');choose.type='button';choose.textContent=config.type==='3d'?'Выбрать модель':'Выбрать панораму';choose.onclick=()=>picker?picker.open():dialog.showModal();status.replaceChildren(document.createTextNode(config.type==='3d'?'Выберите модель для просмотра':'Выберите панораму для просмотра'),document.createElement('br'),choose);dialog.querySelectorAll('[data-item]').forEach(b=>b.setAttribute('aria-current','false'));if(picker)picker.open();else dialog.showModal();
}
window.addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('item');if(busy){location.reload();return;}if(config.type==='3d'&&config.items.length>1&&!id){showInitialChoice();return;}const index=config.items.findIndex(i=>i.id===(id||config.current));if(index>=0)selectFromURL(index);});
function start(){if(config.chooseModelOnStart)showInitialChoice();else selectFromURL(active);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);

gridButton?.addEventListener('click',()=>{if(busy||!view)return;const enabled=view.setFloorGrid(gridButton.getAttribute('aria-pressed')!=='true');gridButton.setAttribute('aria-pressed',String(enabled));});

if(picker)dialog.addEventListener('close',()=>view?.setInteractionPaused?.(false));

tourButton?.addEventListener('click',()=>{if(busy||!view?.tour)return;const enabled=view.tour.setEnabled(tourButton.getAttribute('aria-pressed')!=='true');tourButton.setAttribute('aria-pressed',String(enabled));});

let hotspotIds=[];
function syncHotspots(){
 if(!view?.raw)return;for(const id of hotspotIds)view.raw.removeHotSpot(id);hotspotIds=[];
 const item=config.items[active];if(!item)return;
 for(const point of config.panoramaTour?.points?.[item.id]||[]){
  if(!config.items.some(i=>i.id===point.target))continue;hotspotIds.push(point.id);
  const go=()=>{const index=config.items.findIndex(i=>i.id===point.target);if(index>=0)select(index,'push',point.view);};
  view.raw.addHotSpot({id:point.id,yaw:point.yaw,pitch:point.pitch,cssClass:'pano-tour-hotspot',createTooltipFunc:element=>{element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label','Перейти к панораме');element.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();go();}};},clickHandlerFunc:go});
 }
}
function refreshPicker(){
 const grid=dialog.querySelector('.panorama-picker-grid');grid.replaceChildren(...config.items.map(item=>{const button=document.createElement('button');button.type='button';button.className='select-item';button.dataset.item=item.id;button.setAttribute('aria-current',String(item.id===config.items[active]?.id));const img=document.createElement('img');img.width=400;img.height=200;img.src=item.thumb;img.alt='';img.loading='lazy';img.draggable=false;const text=document.createElement('span');text.textContent=item.name;button.append(img,text);return button;}));
 const trigger=document.querySelector('#show-list');if(trigger)trigger.hidden=config.items.length<2;
 if(config.type==='360')document.querySelector('.panorama-controls').hidden=config.items.length<2;
 if(modelControls&&view)modelControls.hidden=![...modelControls.children].some(button=>!button.hidden);
}
function showDeleted(){
 view?.dispose?.();view?.destroy?.();view=null;hotspotIds=[];container.replaceChildren();if(modelControls)modelControls.hidden=true;if(gridButton)gridButton.hidden=true;if(tourButton)tourButton.hidden=true;title.textContent='';status.hidden=false;status.classList.remove('is-loading');status.textContent=config.type==='3d'?'Модель удалена':'Панорама удалена';
 if(dialog.open)dialog.close();
}
watchProject(async state=>{
 if(busy)return false;
 const items=state.deleted?[]:state.items[config.type],old=config.items[active],next=items.find(item=>item.id===old?.id),tour=state.panoramaTour||null;
 if(JSON.stringify(items)===JSON.stringify(config.items)&&JSON.stringify(tour)===JSON.stringify(config.panoramaTour||null))return;
 const replacing=old&&next&&(old.source!==next.source||config.type==='3d'&&(old.edgeCache!==next.edgeCache||JSON.stringify(old.tour)!==JSON.stringify(next.tour)));
 // A failed panorama download keeps the existing view and is retried later.
 if(replacing&&config.type==='360'){const img=new Image();img.src=next.source;await img.decode();if(busy||config.items[active]?.id!==old?.id)return false;}
 const saved=replacing&&view?(config.type==='3d'?view.getLiveState():view.getView()):null;
 config.items=items;config.panoramaTour=tour;active=next?items.indexOf(next):-1;refreshPicker();
 if(!next&&old){showDeleted();if(items.length){active=0;status.textContent=config.type==='3d'?'Выберите модель для просмотра':'Выберите панораму для просмотра';const choose=document.createElement('button');choose.textContent=config.type==='3d'?'Выбрать модель':'Выбрать панораму';choose.onclick=()=>picker?picker.open():dialog.showModal();status.append(document.createElement('br'),choose);history.replaceState({},'',location.pathname);if(picker)picker.open();else dialog.showModal();}return;}
 if(!old){if(items.length){active=0;showInitialChoice();}return;}
 if(replacing){hotspotIds=[];await select(active,'none',config.type==='360'?saved:saved?.view,config.type==='3d'?saved:null);}
 else{title.textContent=next.name;document.title=next.name+' — ROOM26';if(config.type==='360')syncHotspots();}
});

// Finish a gesture promptly; continued damping/walking also schedules a final save.
for(const name of ['pointerup','pointercancel','keyup'])window.addEventListener(name,()=>{if(config.type==='3d')requestAnimationFrame(saveModelCameraURL);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)saveModelCameraURL();});
window.addEventListener('pagehide',saveModelCameraURL);
