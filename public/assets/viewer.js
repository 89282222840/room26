const config=JSON.parse(document.querySelector('#viewer-config').textContent);
const container=document.querySelector('#viewer'),status=document.querySelector('#viewer-status'),title=document.querySelector('#object-title'),dialog=document.querySelector('#object-list');
const gridButton=document.querySelector('#floor-grid');
let active=config.items.findIndex(i=>i.id===config.current),view=null,busy=false;
const arrows=[document.querySelector('#previous'),document.querySelector('#next')].filter(Boolean);
async function select(index,historyMode='push'){
 if(busy)return;busy=true;if(gridButton){gridButton.hidden=true;gridButton.setAttribute('aria-pressed','false');}arrows.forEach(b=>b.disabled=true);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=true);
 active=(index+config.items.length)%config.items.length;const item=config.items[active];status.hidden=false;status.textContent='Загрузка…';title.textContent=item.name;
 view?.dispose?.();view?.destroy?.();view=null;container.replaceChildren();
 if(historyMode==='push')history.pushState({item:item.id},'',item.url);
 document.title=item.name+' — ROOM26';
 const canonical=document.querySelector('link[rel=canonical]');if(canonical)canonical.href=new URL(item.url,location.origin).href;
 for(const [name,value]of Object.entries({'og:title':item.name,'og:image':new URL(item.og,location.origin).href,'og:url':new URL(item.url,location.origin).href}))document.querySelector(`meta[property="${name}"]`)?.setAttribute('content',value);
 dialog.querySelectorAll('[data-item]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.item===item.id)));
 try{
  const module=config.type==='3d'?await import('./model.js?v='+config.versions.model):await import('./panorama.js?v='+config.versions.panorama);
  view=await (config.type==='3d'?module.modelView:module.panoramaView)(container,item.source,{views:item.views,floorGrid:config.type==='3d'});status.hidden=true;if(gridButton)gridButton.hidden=!view.hasFloorGrid;
 }catch(e){status.textContent='Не удалось открыть объект. '+e.message;const retry=document.createElement('button');retry.textContent='Повторить';retry.onclick=()=>select(active,'none');status.append(document.createElement('br'),retry);}
 finally{busy=false;arrows.forEach(b=>b.disabled=false);dialog.querySelectorAll('[data-item]').forEach(b=>b.disabled=false);}
}
document.querySelector('#previous')?.addEventListener('click',()=>select(active-1));document.querySelector('#next')?.addEventListener('click',()=>select(active+1));
document.querySelector('#show-list')?.addEventListener('click',()=>dialog.showModal());document.querySelector('#close-list').onclick=()=>dialog.close();dialog.querySelectorAll('[data-item]').forEach(button=>button.onclick=()=>{dialog.close();select(config.items.findIndex(i=>i.id===button.dataset.item));});
window.addEventListener('popstate',()=>{const id=new URL(location.href).searchParams.get('item')||config.current;const index=config.items.findIndex(i=>i.id===id);if(index>=0){if(busy)location.reload();else select(index,'none');}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>select(active,'none'),{once:true});else select(active,'none');

gridButton?.addEventListener('click',()=>{if(busy||!view)return;const enabled=view.setFloorGrid(gridButton.getAttribute('aria-pressed')!=='true');gridButton.setAttribute('aria-pressed',String(enabled));});
