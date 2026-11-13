import {sortPreview,preventDragSelection} from './reorder.js?v=2';
export function installModelAdmin({api,show,setProject,isBusy,setBusy}){
 const list=document.querySelector('.model-admin-grid');if(!list)return;
 const section=list.closest('section'),upload=section.querySelector('form.upload'),input=upload.querySelector('input[type=file]'),add=upload.querySelector('button');let menu=null,anchor=null,drag=null,dragFrame=0,suppressClickUntil=0;
 list.style.overflowAnchor='none';
 function layoutTiles(order=[...list.children]){order.forEach((tile,index)=>{tile.style.order=String(index);tile.querySelector('.model-tile-number').textContent=String(index+1);});}
 function scheduleLayout(){layoutTiles();}
 function closeMenu(focus=false){if(menu)menu.hidden=true;anchor?.setAttribute('aria-expanded','false');if(focus)anchor?.focus({preventScroll:true});menu=null;anchor=null;}
 function positionMenu(){if(!menu||!anchor)return;const r=anchor.getBoundingClientRect(),size=menu.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight){closeMenu();return;}menu.style.left=Math.max(8,Math.min(innerWidth-size.width-8,r.right-size.width))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-size.height-8,r.bottom+4))+'px';}
 list.querySelectorAll('.model-more').forEach(button=>button.onclick=event=>{event.stopPropagation();if(anchor===button){closeMenu();return;}closeMenu();if(isBusy()||drag)return;anchor=button;menu=button.closest('.model-tile').querySelector('.model-item-menu');menu.hidden=false;button.setAttribute('aria-expanded','true');positionMenu();menu.querySelector('a').focus({preventScroll:true});});
 list.querySelectorAll('.model-item-menu').forEach(node=>node.addEventListener('click',event=>{if(event.target.closest('a,button'))closeMenu();},true));
 document.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target)&&!event.target.closest('.model-more'))closeMenu();},true);
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(drag){event.preventDefault();finish(true);}else if(menu){event.preventDefault();event.stopImmediatePropagation();closeMenu(true);}},true);
 window.addEventListener('resize',()=>{if(drag)finish(true);positionMenu();});document.addEventListener('scroll',()=>{if(menu)requestAnimationFrame(positionMenu);},true);layoutTiles();
 function inside(x,y){const r=list.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
 function begin(tile,x,y,touch){if(drag||isBusy())return;closeMenu();drag={tile,x,y,startX:x,startY:y,touch,active:false,unlock:preventDragSelection()};if(touch)drag.timer=setTimeout(()=>{if(drag)activate();},350);}
 function activate(){if(!drag||drag.active)return;drag.active=true;drag.original=[...list.children];drag.sort=sortPreview(list,drag.tile,layoutTiles);drag.tile.classList.add('dragging');drag.ghost=document.createElement('div');drag.ghost.className='model-sort-ghost';const rect=drag.tile.getBoundingClientRect();drag.ghost.style.width=rect.width+'px';drag.ghost.style.height=rect.height+'px';drag.ghost.append(drag.tile.querySelector('img').cloneNode());document.body.append(drag.ghost);dragFrame=requestAnimationFrame(frame);}
 function frame(time){if(!drag?.active)return;const d=drag,dt=Math.min((time-(d.time||time))/1000,.04);d.time=time;const zone=64;let speed=0;if(d.y<zone)speed=-Math.min(1,(zone-d.y)/zone);else if(d.y>innerHeight-zone)speed=Math.min(1,(d.y-innerHeight+zone)/zone);if(speed){window.scrollBy(0,speed*650*dt);d.sort.at(d.x,d.y);}d.ghost.style.left=d.x+'px';d.ghost.style.top=d.y+'px';dragFrame=requestAnimationFrame(frame);}
 function move(x,y,event){if(!drag)return;drag.x=x;drag.y=y;if(!drag.active&&Math.hypot(x-drag.startX,y-drag.startY)>7){clearTimeout(drag.timer);if(drag.touch){drag.unlock();drag=null;return;}activate();}if(drag?.active){event.preventDefault();event.stopPropagation();drag.sort.at(x,y);}}
 async function persist(order,original,tile){setBusy(true);try{const result=await api('reorder',{type:'3d',order:JSON.stringify(order)});setProject(result.project);layoutTiles();}catch(error){for(const node of original)list.append(node);scheduleLayout();show(error.message,true,tile.querySelector('.model-more'));}finally{setBusy(false);}}
 function finish(cancelled=false){if(!drag)return;const d=drag;drag=null;clearTimeout(d.timer);cancelAnimationFrame(dragFrame);d.ghost?.remove();d.tile.classList.remove('dragging');if(d.active){suppressClickUntil=performance.now()+700;const commit=!cancelled&&inside(d.x,d.y),changed=d.sort.changed(),order=d.sort.finish(commit);if(commit&&changed)persist(order,d.original,d.tile);}d.unlock();scheduleLayout();}
 list.querySelectorAll('.model-tile-image').forEach(image=>{
  image.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0){event.preventDefault();begin(image.closest('.model-tile'),event.clientX,event.clientY,false);}});
  image.addEventListener('touchstart',event=>{if(event.touches.length===1)begin(image.closest('.model-tile'),event.touches[0].clientX,event.touches[0].clientY,true);else finish(true);},{capture:true,passive:true});
  image.addEventListener('dragstart',event=>event.preventDefault());image.addEventListener('click',event=>{if(performance.now()<suppressClickUntil||drag?.active){event.preventDefault();event.stopImmediatePropagation();}},true);
  image.addEventListener('contextmenu',event=>event.preventDefault());
 });
 window.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')move(event.clientX,event.clientY,event);},{capture:true,passive:false});
 window.addEventListener('pointerup',event=>{if(event.pointerType!=='touch')finish();},true);
 window.addEventListener('touchmove',event=>{if(event.touches.length===1)move(event.touches[0].clientX,event.touches[0].clientY,event);else finish(true);},{capture:true,passive:false});
 window.addEventListener('touchend',event=>{if(drag?.active){event.preventDefault();event.stopPropagation();}finish();},{capture:true,passive:false});window.addEventListener('touchcancel',()=>finish(true),true);window.addEventListener('blur',()=>finish(true));
 function hasFiles(event){const types=[...(event.dataTransfer?.types||[])];return types.includes('Files')&&!types.includes('application/x-room26-reorder');}
 section.addEventListener('dragover',event=>{if(!hasFiles(event))return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=isBusy()?'none':'copy';section.classList.toggle('is-model-drop',!isBusy());});
 section.addEventListener('dragleave',event=>{if(!section.contains(event.relatedTarget))section.classList.remove('is-model-drop');});
 section.addEventListener('drop',event=>{if(!hasFiles(event)||event.target.closest('form.upload'))return;event.preventDefault();event.stopPropagation();section.classList.remove('is-model-drop');if(isBusy()){show('Дождитесь завершения загрузки.',false,add);return;}const files=[...event.dataTransfer.files];if(!files.length)return;const selection=new DataTransfer();for(const file of files)selection.items.add(file);input.files=selection.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 section.addEventListener('drop',()=>section.classList.remove('is-model-drop'),true);
 window.addEventListener('dragend',()=>section.classList.remove('is-model-drop'));
}
