export function installPanoramaPicker(dialog,trigger){
 const sheet=dialog.querySelector('.panorama-sheet'),shade=dialog.querySelector('.panorama-picker-shade'),handle=dialog.querySelector('.panorama-sheet-handle'),scroll=dialog.querySelector('.panorama-sheet-scroll');
 let closing=null,gesture=null,previousFocus=null,blockedUntil=0,epoch=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function clearGesture(){gesture=null;dialog.classList.remove('is-dragging');sheet.style.removeProperty('--sheet-offset');shade.style.removeProperty('opacity');}
 function open(){
  if(dialog.open)return;previousFocus=document.activeElement;const token=++epoch;clearGesture();dialog.classList.remove('is-closing');dialog.classList.add('is-opening');dialog.showModal();trigger?.setAttribute('aria-expanded','true');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{if(token===epoch&&dialog.open)dialog.classList.remove('is-opening');}));
 }
 function close(){
  if(!dialog.open)return Promise.resolve();if(closing)return closing;++epoch;dialog.classList.remove('is-opening','is-dragging');dialog.classList.add('is-closing');shade.style.removeProperty('opacity');
  closing=new Promise(resolve=>{setTimeout(()=>{clearGesture();dialog.close();dialog.classList.remove('is-closing');trigger?.setAttribute('aria-expanded','false');closing=null;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});resolve();},reduced()?0:240);});return closing;
 }
 function begin(x,y,fromHandle){if(closing||!dialog.open)return;gesture={x,y,fromHandle,started:performance.now(),dy:0,active:false,top:scroll.scrollTop<=0};}
 function move(x,y,event){
  if(!gesture)return;const dx=x-gesture.x,dy=y-gesture.y;
  if(!gesture.active){if(Math.hypot(dx,dy)<8)return;if(dy<=0||Math.abs(dx)>dy||!gesture.fromHandle&&!gesture.top){gesture=null;return;}gesture.active=true;dialog.classList.add('is-dragging');}
  event.preventDefault();event.stopPropagation();gesture.dy=Math.max(0,dy);sheet.style.setProperty('--sheet-offset',gesture.dy+'px');shade.style.opacity=String(Math.max(0,1-gesture.dy/Math.max(sheet.clientHeight*.8,1)));
 }
 function end(cancel=false){if(!gesture)return;const current=gesture;gesture=null;if(!current.active)return;blockedUntil=performance.now()+350;const velocity=current.dy/Math.max(performance.now()-current.started,1);if(!cancel&&(current.dy>=80||current.dy>=35&&velocity>.5))close();else clearGesture();}
 handle.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'||event.button!==0)return;event.preventDefault();handle.setPointerCapture(event.pointerId);begin(event.clientX,event.clientY,true);});
 handle.addEventListener('pointermove',event=>{if(event.pointerType!=='touch')move(event.clientX,event.clientY,event);});
 handle.addEventListener('pointerup',event=>{if(event.pointerType!=='touch')end();});handle.addEventListener('pointercancel',event=>{if(event.pointerType!=='touch')end(true);});
 sheet.addEventListener('touchstart',event=>{if(event.touches.length!==1){end(true);return;}const touch=event.touches[0];begin(touch.clientX,touch.clientY,handle.contains(event.target));},{passive:true});
 sheet.addEventListener('touchmove',event=>{if(event.touches.length===1)move(event.touches[0].clientX,event.touches[0].clientY,event);else end(true);},{passive:false});
 sheet.addEventListener('touchend',event=>{if(gesture?.active){event.preventDefault();event.stopPropagation();}end();},{passive:false});sheet.addEventListener('touchcancel',()=>end(true));
 dialog.addEventListener('click',event=>{if(performance.now()<blockedUntil&&sheet.contains(event.target)){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 shade.addEventListener('click',()=>close());dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 handle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();close();}});
 return{open,close};
}
