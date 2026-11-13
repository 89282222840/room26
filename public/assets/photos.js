import {watchProject} from './project-live.js?v=1';
// Keep DOM/lightbox order while packing original image proportions into columns.
const gallery=document.querySelector('.photo-gallery');
if(gallery){
 let layoutFrame=0,lastWidth=-1;
 function layoutGallery(){
  layoutFrame=0;const width=gallery.clientWidth;if(!width)return;lastWidth=width;
  const columns=matchMedia('(max-width:767px)').matches?1:3,gap=4,tileWidth=(width-gap*(columns-1))/columns,heights=Array(columns).fill(0);
  gallery.classList.add('is-masonry');
  for(const tile of gallery.querySelectorAll('.photo-gallery-link')){const img=tile.querySelector('img'),w=img.naturalWidth||Number(img.getAttribute('width'))||1200,h=img.naturalHeight||Number(img.getAttribute('height'))||800,column=heights.indexOf(Math.min(...heights)),height=tileWidth*h/w;
   tile.style.width=tileWidth+'px';tile.style.height=height+'px';tile.style.transform=`translate(${column*(tileWidth+gap)}px,${heights[column]}px)`;heights[column]+=height+gap;
  }
  gallery.style.height=Math.max(0,...heights.map(h=>h-gap))+'px';
 }
 function scheduleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layoutGallery);}
 for(const tile of gallery.querySelectorAll('.photo-gallery-link')){const img=tile.querySelector('img');img.addEventListener('load',scheduleLayout);img.addEventListener('error',scheduleLayout);}
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(gallery.clientWidth!==lastWidth)scheduleLayout();}).observe(gallery);
 gallery.addEventListener('photo-layout',scheduleLayout);window.addEventListener('resize',scheduleLayout);window.addEventListener('pageshow',scheduleLayout);layoutGallery();
}

const photos=JSON.parse(document.querySelector('#photo-config').textContent),dialog=document.querySelector('#photo-lightbox'),image=document.querySelector('#photo-lightbox-image'),caption=document.querySelector('#photo-lightbox-caption'),figure=document.querySelector('#photo-lightbox-figure'),status=document.querySelector('#photo-lightbox-status');
let current=0,sequence=0,openedBy=null;
function fit(){if(!image.naturalWidth||!dialog.open)return;const gutter=innerWidth>767?112:16,w=dialog.clientWidth-gutter,h=dialog.clientHeight-32,scale=Math.min(w/image.naturalWidth,h/image.naturalHeight);figure.style.width=image.naturalWidth*scale+'px';figure.style.height=image.naturalHeight*scale+'px';}
async function show(index){
 if(!photos.length)return;current=(index+photos.length)%photos.length;const item=photos[current],token=++sequence;status.hidden=false;status.textContent='Загрузка…';figure.hidden=true;caption.textContent=item.caption;image.alt=item.caption;
 const loading=new Image();loading.src=item.source;
 try{await loading.decode();if(token!==sequence||!dialog.open)return;image.src=item.source;await image.decode();if(token!==sequence)return;figure.hidden=false;status.hidden=true;fit();}
 catch(error){if(token!==sequence)return;status.textContent='Не удалось загрузить фото.';}
}
gallery.addEventListener('click',event=>{const link=event.target.closest('[data-photo-index]');if(!link||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openedBy=link;document.documentElement.classList.add('photo-view-open');dialog.showModal();show(Number(link.dataset.photoIndex));});
document.querySelector('#photo-lightbox-close').onclick=()=>dialog.close();document.querySelector('#photo-prev')?.addEventListener('click',()=>show(current-1));document.querySelector('#photo-next')?.addEventListener('click',()=>show(current+1));
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(current-1);}if(event.key==='ArrowRight'){event.preventDefault();show(current+1);}});
dialog.addEventListener('close',()=>{document.documentElement.classList.remove('photo-view-open');sequence++;image.removeAttribute('src');figure.hidden=true;openedBy?.focus({preventScroll:true});});
window.addEventListener('resize',fit);
let touch=null;dialog.addEventListener('touchstart',event=>{touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});dialog.addEventListener('touchend',event=>{if(!touch||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));},{passive:true});

function photoArrows(){for(const id of ['photo-prev','photo-next']){const button=document.getElementById(id);if(button)button.hidden=photos.length<2;}}
photoArrows();
watchProject(async state=>{
 const incoming=state.deleted?[]:state.items.photo;
 if(JSON.stringify(incoming.map(p=>[p.id,p.source,p.caption]))===JSON.stringify(photos.map(p=>[p.id,p.source,p.caption])))return;
 const existing=new Map([...gallery.children].map(tile=>[tile.dataset.photoId,tile]));
 // Decode changed visible photos before swapping; leave the old image on errors.
 await Promise.all(incoming.filter(item=>existing.has(item.id)&&photos.find(p=>p.id===item.id)?.source!==item.source).map(async item=>{const img=new Image();img.src=item.source;await img.decode();}));
 // The lightbox may have switched to another photo while replacements loaded.
 const visible=dialog.open?photos[current]:null;
 const tiles=incoming.map((item,index)=>{let tile=existing.get(item.id);if(!tile){tile=document.createElement('a');tile.className='photo-gallery-link';tile.dataset.photoId=item.id;const img=document.createElement('img');img.loading='lazy';img.decoding='async';const text=document.createElement('span');text.className='photo-caption';tile.append(img,text);img.addEventListener('load',()=>gallery.dispatchEvent(new Event('photo-layout')));}
  tile.href=item.url;tile.dataset.photoIndex=index;tile.setAttribute('aria-label',item.caption);const img=tile.querySelector('img');img.alt=item.caption;img.width=item.width;img.height=item.height;if(img.getAttribute('src')!==item.source)img.src=item.source;tile.querySelector('.photo-caption').textContent=item.caption;return tile;});
 gallery.replaceChildren(...tiles);photos.splice(0,photos.length,...incoming);photoArrows();gallery.dispatchEvent(new Event('photo-layout'));
 if(visible){const index=photos.findIndex(p=>p.id===visible.id);if(index<0)dialog.close();else{current=index;const next=photos[index];caption.textContent=next.caption;image.alt=next.caption;if(next.source!==visible.source){++sequence;image.src=next.source;await image.decode();fit();}}}
});
