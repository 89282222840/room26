import {sortPreview,preventDragSelection} from './reorder.js?v=2';
import {panoramaInfo} from './panorama-files.js?v=1';
export function installPhotoAdmin({api,show,previews,getProject,setProject,isBusy,setBusy}){
 const list=document.querySelector('.photo-admin-grid');if(!list)return;
 const section=list.closest('section'),upload=section.querySelector('form.upload'),input=upload.querySelector('input[type=file]'),add=upload.querySelector('button'),renameDialog=document.querySelector('#caption-dialog'),renameForm=document.querySelector('#caption-form'),renameField=document.querySelector('#photo-caption'),renameCancel=document.querySelector('#caption-cancel');
 let menu=null,menuAnchor=null,renaming=null,drag=null,dragFrame=0,suppressClickUntil=0,layoutFrame=0,lastWidth=-1;
 list.style.overflowAnchor='none';
 const itemFor=tile=>getProject().items.photo.find(item=>item.id===tile.dataset.id);
 function layoutTiles(order=[...list.children]){
  const width=list.clientWidth;if(!width)return;lastWidth=width;list.classList.add('photo-masonry');const columns=matchMedia('(max-width:767px)').matches?2:3,gap=2,tileWidth=(width-gap*(columns-1))/columns,heights=Array(columns).fill(0);
  for(const tile of order){const item=itemFor(tile),img=tile.querySelector('img'),loaded=img.complete&&img.currentSrc===img.src&&img.naturalWidth,w=loaded?img.naturalWidth:Number(item?.width||img.getAttribute('width'))||1200,h=loaded?img.naturalHeight:Number(item?.height||img.getAttribute('height'))||800,column=heights.indexOf(Math.min(...heights)),height=tileWidth*h/w;
   tile.style.width=tileWidth+'px';tile.style.height=height+'px';tile.style.left=column*(tileWidth+gap)+'px';tile.style.top=heights[column]+'px';heights[column]+=height+gap;
  }
  list.style.height=Math.max(0,...heights.map(h=>h-gap))+'px';
 }
 function scheduleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(()=>{layoutFrame=0;if(!drag?.active)layoutTiles();});}
 for(const img of list.querySelectorAll('img')){img.addEventListener('load',scheduleLayout);img.addEventListener('error',scheduleLayout);}
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(list.clientWidth!==lastWidth){if(drag)finish(true);scheduleLayout();}}).observe(list);
 window.addEventListener('resize',()=>{if(drag)finish(true);scheduleLayout();});window.addEventListener('pageshow',scheduleLayout);layoutTiles();
 function closeMenu(focus=false){menu?.remove();menu=null;menuAnchor?.setAttribute('aria-expanded','false');if(focus)menuAnchor?.focus({preventScroll:true});menuAnchor=null;}
 function adopt(project){setProject(project);section.querySelector('.section-header .small').textContent=project.items.photo.length+' объектов';for(const tile of list.children){const item=itemFor(tile);if(!item)continue;const name=item.name||item.filename;tile.querySelector('.photo-tile-caption').textContent=name;tile.querySelector('img').alt=name;tile.querySelector('a').setAttribute('aria-label',name);tile.querySelector('.photo-more').setAttribute('aria-label','Действия: '+name);}scheduleLayout();}
 function positionMenu(){if(!menu||!menuAnchor)return;const box=menuAnchor.getBoundingClientRect(),size=menu.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight){closeMenu();return;}menu.style.left=Math.max(8,Math.min(innerWidth-size.width-8,box.right-size.width))+'px';menu.style.top=Math.max(8,Math.min(innerHeight-size.height-8,box.bottom+4))+'px';}
 function openMenu(tile,anchor){
  closeMenu();if(isBusy()||drag)return;const item=itemFor(tile);menuAnchor=anchor;anchor.setAttribute('aria-expanded','true');menu=document.createElement('div');menu.className='pano-item-menu photo-item-menu';menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Действия с фото '+item.name);
  const info=document.createElement('div');info.className='pano-item-info';info.textContent=panoramaInfo(item);menu.append(info,document.createElement('hr'));
  function action(label,handler,danger=false){const b=document.createElement('button');b.type='button';b.textContent=label;if(danger)b.className='danger';b.onclick=()=>{closeMenu();handler();};menu.append(b);return b;}
  const rename=action('Переименовать',()=>{renaming=tile;renameField.value=itemFor(tile).name;renameDialog.showModal();renameField.select();});
  const open=document.createElement('a');open.textContent='Открыть';open.href=tile.dataset.url;open.target='_blank';open.rel='noopener';open.onclick=()=>closeMenu();menu.append(open);
  action('Заменить',()=>replacePhoto(tile));
  action('Удалить',async()=>{if(!confirm('Удалить фото и его файл? Ссылка перестанет работать.'))return;setBusy(true);try{const result=await api('delete_item',{type:'photo',item:item.id});tile.remove();adopt(result.project);}catch(error){show(error.message,true,anchor);}finally{setBusy(false);}},true);
  document.body.append(menu);positionMenu();rename.focus({preventScroll:true});
 }
 list.querySelectorAll('.photo-more').forEach(button=>button.onclick=event=>{event.stopPropagation();if(menuAnchor===button)closeMenu();else openMenu(button.closest('.photo-tile'),button);});
 document.addEventListener('pointerdown',event=>{if(menu&&!menu.contains(event.target)&&!event.target.closest('.photo-more'))closeMenu();},true);
 document.addEventListener('keydown',event=>{if(drag&&event.key==='Escape'){event.preventDefault();finish(true);return;}if(menu&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMenu(true);}},true);
 window.addEventListener('resize',positionMenu);document.addEventListener('scroll',()=>{if(menu)requestAnimationFrame(positionMenu);},true);
 renameCancel.onclick=()=>renameDialog.close();renameDialog.addEventListener('cancel',event=>{if(isBusy())event.preventDefault();});
 renameForm.onsubmit=async event=>{event.preventDefault();if(!renaming||isBusy())return;const tile=renaming,button=tile.querySelector('.photo-more'),submit=event.submitter;setBusy(true);submit.disabled=true;renameCancel.disabled=true;try{const result=await api('caption',{item:tile.dataset.id,name:renameField.value});adopt(result.project);renameDialog.close();button.focus({preventScroll:true});}catch(error){show(error.message,true,submit);}finally{setBusy(false);submit.disabled=false;renameCancel.disabled=false;}};
 function replacePhoto(tile){
  if(isBusy())return;const picker=document.createElement('input');picker.type='file';picker.accept='image/jpeg,image/png,image/webp,image/gif,image/avif';picker.onchange=async()=>{const file=picker.files[0];if(!file||isBusy())return;const item=itemFor(tile),button=tile.querySelector('.photo-more');setBusy(true);tile.classList.add('is-working');button.disabled=true;
   try{const images=await previews(file,'photo'),body=new FormData();body.set('item',item.id);body.set('source_size',String(item.size));body.set('source_version',item.source_version||'');body.set('file',file);body.set('thumb',images.thumb,'thumb.jpg');body.set('og',images.og,'og.jpg');const result=await api('replace_photo',body);adopt(result.project);const updated=itemFor(tile),url=new URL(tile.dataset.url,location.origin);url.searchParams.set('v',updated.source_version);const img=tile.querySelector('img');img.setAttribute('width',updated.width);img.setAttribute('height',updated.height);img.src=url.href;scheduleLayout();
   }catch(error){show(error.message,true,button);}finally{setBusy(false);tile.classList.remove('is-working');button.disabled=false;}
  };picker.click();
 }
 function inside(x,y){const r=list.getBoundingClientRect();return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom;}
 function begin(tile,x,y,touch){if(drag||isBusy())return;closeMenu();drag={tile,x,y,startX:x,startY:y,touch,active:false,unlock:preventDragSelection()};if(touch)drag.timer=setTimeout(()=>{if(drag)activate();},350);}
 function activate(){if(!drag||drag.active)return;drag.active=true;drag.original=[...list.children];drag.sort=sortPreview(list,drag.tile,layoutTiles);drag.tile.classList.add('dragging');drag.ghost=document.createElement('div');drag.ghost.className='photo-sort-ghost';const rect=drag.tile.getBoundingClientRect();drag.ghost.style.width=rect.width+'px';drag.ghost.style.height=rect.height+'px';drag.ghost.append(drag.tile.querySelector('img').cloneNode());document.body.append(drag.ghost);dragFrame=requestAnimationFrame(frame);}
 function frame(time){if(!drag?.active)return;const d=drag,dt=Math.min((time-(d.time||time))/1000,.04);d.time=time;const zone=64;let speed=0;if(d.y<zone)speed=-Math.min(1,(zone-d.y)/zone);else if(d.y>innerHeight-zone)speed=Math.min(1,(d.y-innerHeight+zone)/zone);if(speed){window.scrollBy(0,speed*650*dt);d.sort.at(d.x,d.y);}d.ghost.style.left=d.x+'px';d.ghost.style.top=d.y+'px';dragFrame=requestAnimationFrame(frame);}
 function move(x,y,event){if(!drag)return;drag.x=x;drag.y=y;if(!drag.active&&Math.hypot(x-drag.startX,y-drag.startY)>7){clearTimeout(drag.timer);if(drag.touch){drag.unlock();drag=null;return;}activate();}if(drag?.active){event.preventDefault();event.stopPropagation();drag.sort.at(x,y);}}
 async function persist(order,original,tile){setBusy(true);try{const result=await api('reorder',{type:'photo',order:JSON.stringify(order)});adopt(result.project);}catch(error){for(const node of original)list.append(node);scheduleLayout();show(error.message,true,tile.querySelector('.photo-more'));}finally{setBusy(false);}}
 function finish(cancelled=false){if(!drag)return;const d=drag;drag=null;clearTimeout(d.timer);cancelAnimationFrame(dragFrame);d.ghost?.remove();d.tile.classList.remove('dragging');if(d.active){suppressClickUntil=performance.now()+700;const commit=!cancelled&&inside(d.x,d.y),changed=d.sort.changed(),order=d.sort.finish(commit);if(commit&&changed)persist(order,d.original,d.tile);}d.unlock();scheduleLayout();}
 list.querySelectorAll('.photo-tile-image').forEach(image=>{
  image.addEventListener('pointerdown',event=>{if(event.pointerType!=='touch'&&event.button===0){event.preventDefault();begin(image.closest('.photo-tile'),event.clientX,event.clientY,false);}});
  image.addEventListener('touchstart',event=>{if(event.touches.length===1)begin(image.closest('.photo-tile'),event.touches[0].clientX,event.touches[0].clientY,true);else finish(true);},{capture:true,passive:true});
  image.addEventListener('dragstart',event=>event.preventDefault());image.addEventListener('click',event=>{if(performance.now()<suppressClickUntil||drag?.active){event.preventDefault();event.stopImmediatePropagation();}},true);
  image.addEventListener('contextmenu',event=>event.preventDefault());
 });
 window.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')move(event.clientX,event.clientY,event);},{capture:true,passive:false});
 window.addEventListener('pointerup',event=>{if(event.pointerType!=='touch')finish();},true);
 window.addEventListener('touchmove',event=>{if(event.touches.length===1)move(event.touches[0].clientX,event.touches[0].clientY,event);else finish(true);},{capture:true,passive:false});
 window.addEventListener('touchend',event=>{if(drag?.active){event.preventDefault();event.stopPropagation();}finish();},{capture:true,passive:false});window.addEventListener('touchcancel',()=>finish(true),true);window.addEventListener('blur',()=>finish(true));
 function hasFiles(event){const types=[...(event.dataTransfer?.types||[])];return types.includes('Files')&&!types.includes('application/x-room26-reorder');}
 section.addEventListener('dragover',event=>{if(!hasFiles(event))return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect=isBusy()?'none':'copy';section.classList.toggle('is-photo-drop',!isBusy());});
 section.addEventListener('dragleave',event=>{if(!section.contains(event.relatedTarget))section.classList.remove('is-photo-drop');});
 section.addEventListener('drop',event=>{if(!hasFiles(event)||event.target.closest('form.upload'))return;event.preventDefault();event.stopPropagation();section.classList.remove('is-photo-drop');if(isBusy()){show('Дождитесь завершения загрузки.',false,add);return;}const files=[...event.dataTransfer.files];if(!files.length)return;const selection=new DataTransfer();for(const file of files)selection.items.add(file);input.files=selection.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
 section.addEventListener('drop',()=>section.classList.remove('is-photo-drop'),true);
 window.addEventListener('dragend',()=>section.classList.remove('is-photo-drop'));
}
