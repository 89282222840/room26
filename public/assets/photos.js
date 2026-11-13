// Keep DOM/lightbox order while packing original image proportions into columns.
const gallery=document.querySelector('.photo-gallery');
if(gallery){
 const tiles=[...gallery.querySelectorAll('.photo-gallery-link')];let layoutFrame=0,lastWidth=-1;
 function layoutGallery(){
  layoutFrame=0;const width=gallery.clientWidth;if(!width)return;lastWidth=width;
  const columns=matchMedia('(max-width:767px)').matches?1:3,gap=4,tileWidth=(width-gap*(columns-1))/columns,heights=Array(columns).fill(0);
  gallery.classList.add('is-masonry');
  for(const tile of tiles){const img=tile.querySelector('img'),w=img.naturalWidth||Number(img.getAttribute('width'))||1200,h=img.naturalHeight||Number(img.getAttribute('height'))||800,column=heights.indexOf(Math.min(...heights)),height=tileWidth*h/w;
   tile.style.width=tileWidth+'px';tile.style.height=height+'px';tile.style.transform=`translate(${column*(tileWidth+gap)}px,${heights[column]}px)`;heights[column]+=height+gap;
  }
  gallery.style.height=Math.max(0,...heights.map(h=>h-gap))+'px';
 }
 function scheduleLayout(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layoutGallery);}
 for(const tile of tiles){const img=tile.querySelector('img');img.addEventListener('load',scheduleLayout);img.addEventListener('error',scheduleLayout);}
 if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(gallery.clientWidth!==lastWidth)scheduleLayout();}).observe(gallery);
 window.addEventListener('resize',scheduleLayout);window.addEventListener('pageshow',scheduleLayout);layoutGallery();
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
document.querySelectorAll('[data-photo-index]').forEach(link=>link.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();openedBy=link;document.documentElement.classList.add('photo-view-open');dialog.showModal();show(Number(link.dataset.photoIndex));}));
document.querySelector('#photo-lightbox-close').onclick=()=>dialog.close();document.querySelector('#photo-prev')?.addEventListener('click',()=>show(current-1));document.querySelector('#photo-next')?.addEventListener('click',()=>show(current+1));
dialog.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'){event.preventDefault();show(current-1);}if(event.key==='ArrowRight'){event.preventDefault();show(current+1);}});
dialog.addEventListener('close',()=>{document.documentElement.classList.remove('photo-view-open');sequence++;image.removeAttribute('src');figure.hidden=true;openedBy?.focus({preventScroll:true});});
window.addEventListener('resize',fit);
let touch=null;dialog.addEventListener('touchstart',event=>{touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;},{passive:true});dialog.addEventListener('touchend',event=>{if(!touch||!event.changedTouches.length)return;const dx=event.changedTouches[0].clientX-touch.x,dy=event.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx<0?1:-1));},{passive:true});
