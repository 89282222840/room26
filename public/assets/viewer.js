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
async function select(index,historyMode='push',arrival=null){
 if(busy)return;busy=true;if(tourButton){tourButton.hidden=true;tourButton.setAttribute('aria-pressed','false');}if(modelControls)modelControls.hidden=true;container.setAttribute('aria-busy','true');if(historyMode==='push'&&config.type==='360'&&view?.raw){saveCameraURL(config.items[active],{yaw:view.raw.getYaw(),pitch:view.raw.getPitch(),hfov:view.raw.getHfov()});}if(gridButton){gridButton.hidden=true;gridButton.setAttribute('aria-pressed','false');}arrows.forEach(b=>b.disabled=true);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=true);
 active=(index+config.items.length)%config.items.length;const item=config.items[active];status.hidden=false;status.classList.toggle('is-loading',config.type==='3d');if(config.type==='3d')status.innerHTML='Загрузка<span class="loading-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>';else status.textContent='Загрузка…';title.textContent=item.name;
 view?.dispose?.();view?.destroy?.();view=null;container.replaceChildren();
 if(historyMode==='push')history.pushState({item:item.id},'',item.url);
 document.title=item.name+' — ROOM26';
 const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href=new URL(item.url,location.origin).href;
 for(const [name,value]of Object.entries({'og:title':item.name,'og:image':new URL(item.og,location.origin).href,'og:url':new URL(item.url,location.origin).href}))document.querySelector(`meta[property="${name}"]`)?.setAttribute('content',value);
 dialog.querySelectorAll('[data-item]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.item===item.id)));
 try{
  const module=config.type==='3d'?await import('./model.js?v='+config.versions.model):await import('./panorama.js?v='+config.versions.panorama);
  view=await (config.type==='3d'?module.modelView:module.panoramaView)(container,item.source,{view:arrival,views:arrival?null:item.views,controls:config.type==='360'?false:undefined,floorGrid:config.type==='3d',reveal:config.type==='3d',edgeCacheURL:item.edgeCache,tour:item.tour,onTourState:state=>tourButton?.setAttribute('aria-pressed',String(state.enabled)),onViewChange:config.type==='360'?state=>{if(config.items[active]?.id!==item.id)return;saveCameraURL(item,state);}:null});status.hidden=true;status.classList.remove('is-loading');if(config.type==='360')for(const point of config.panoramaTour?.points?.[item.id]||[]){const target=config.items.findIndex(i=>i.id===point.target);if(target<0)continue;view.raw.addHotSpot({id:point.id,yaw:point.yaw,pitch:point.pitch,cssClass:'pano-tour-hotspot',createTooltipFunc:element=>{element.setAttribute('role','button');element.setAttribute('tabindex','0');element.setAttribute('aria-label','Перейти к панораме '+config.items[target].name);element.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select(target,'push',point.view);}};},clickHandlerFunc:()=>select(target,'push',point.view)});}if(config.type==='3d')await view.ready;if(tourButton)tourButton.hidden=!view.tour?.available;if(gridButton)gridButton.hidden=!view.hasFloorGrid;if(modelControls)modelControls.hidden=![...modelControls.children].some(button=>!button.hidden);
 }catch(e){status.classList.remove('is-loading');status.textContent='Не удалось открыть объект. '+e.message;const retry=document.createElement('button');retry.textContent='Повторить';retry.onclick=()=>select(active,'none',arrival||panoramaViewFromURL(location.href));status.append(document.createElement('br'),retry);}
 finally{busy=false;container.setAttribute('aria-busy','false');arrows.forEach(b=>b.disabled=false);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=false);}
}
document.querySelector('#previous')?.addEventListener('click',()=>select(active-1));document.querySelector('#next')?.addEventListener('click',()=>select(active+1));
document.querySelector('#show-list')?.addEventListener('click',()=>{if(picker){if(config.type==='360'&&view)saveCameraURL(config.items[active],view.getView());view?.setInteractionPaused?.(true);picker.open();}else dialog.showModal();});document.querySelector('#close-list').onclick=()=>picker?picker.close():dialog.close();dialog.querySelectorAll('[data-item]').forEach(button=>button.onclick=async()=>{const index=config.items.findIndex(i=>i.id===button.dataset.item);if(picker)await picker.close();else dialog.close();if(!picker||index!==active)select(index);});
window.addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('item')||config.current;const index=config.items.findIndex(i=>i.id===id);if(index>=0){if(busy)location.reload();else select(index,'none',config.type==='360'?panoramaViewFromURL(location.href):null);}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>select(active,'none',config.type==='360'?panoramaViewFromURL(location.href):null),{once:true});else select(active,'none',config.type==='360'?panoramaViewFromURL(location.href):null);

gridButton?.addEventListener('click',()=>{if(busy||!view)return;const enabled=view.setFloorGrid(gridButton.getAttribute('aria-pressed')!=='true');gridButton.setAttribute('aria-pressed',String(enabled));});

if(picker)dialog.addEventListener('close',()=>view?.setInteractionPaused?.(false));

tourButton?.addEventListener('click',()=>{if(busy||!view?.tour)return;const enabled=view.tour.setEnabled(tourButton.getAttribute('aria-pressed')!=='true');tourButton.setAttribute('aria-pressed',String(enabled));});
