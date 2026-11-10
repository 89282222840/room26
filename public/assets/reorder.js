let selectionLocks=0;
export function preventDragSelection(){
 selectionLocks++;document.documentElement.classList.add('is-sorting');window.getSelection()?.removeAllRanges();let released=false;
 return()=>{if(released)return;released=true;if(--selectionLocks===0)document.documentElement.classList.remove('is-sorting');};
}
document.addEventListener('selectstart',event=>{if(selectionLocks)event.preventDefault();});
document.addEventListener('contextmenu',event=>{if(selectionLocks)event.preventDefault();});
// CSS order previews keep the touched DOM node connected until release.
export function sortPreview(list,source){
 const original=[...list.children],styles=new Map(original.map(node=>[node,node.style.order])),animations=new Map(),unlock=preventDragSelection();let order=[...original],rects=new Map(),finished=false;
 list.classList.add('sort-preview-active');source.classList.add('sort-preview-source');
 function measure(){const box=list.getBoundingClientRect();rects=new Map(order.map(node=>{const r=node.getBoundingClientRect();return[node,{x:r.left-box.left+list.scrollLeft,y:r.top-box.top+list.scrollTop,w:r.width,h:r.height}]}));}
 function arrange(next){
  if(finished||next.every((node,index)=>node===order[index]))return;
  const before=new Map(original.map(node=>[node,node.getBoundingClientRect()]));for(const animation of animations.values())animation.cancel();animations.clear();order=next;order.forEach((node,index)=>node.style.order=String(index));measure();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduced)for(const node of original){const from=before.get(node),to=node.getBoundingClientRect(),dx=from.left-to.left,dy=from.top-to.top;if(Math.abs(dx)+Math.abs(dy)<.5)continue;
   const animation=node.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:180,easing:'cubic-bezier(.2,.7,.2,1)'});animations.set(node,animation);animation.onfinish=()=>{if(animations.get(node)===animation)animations.delete(node);animation.cancel();};
  }
 }
 measure();
 function at(x,y){
  if(finished)return false;const box=list.getBoundingClientRect();if(x<box.left||x>box.right||y<box.top||y>box.bottom)return false;
  const localX=x-box.left+list.scrollLeft,localY=y-box.top+list.scrollTop;let nearest=source,distance=Infinity;
  for(const node of order){const r=rects.get(node),dx=localX-r.x-r.w/2,dy=localY-r.y-r.h/2,d=dx*dx+dy*dy;if(d<distance){distance=d;nearest=node;}}
  if(nearest!==source){const next=order.filter(node=>node!==source);next.splice(order.indexOf(nearest),0,source);arrange(next);}return true;
 }
 function reset(){arrange([...original]);}
 function finish(commit){if(finished)return order.map(node=>node.dataset.id||node.dataset.panorama);if(!commit)reset();finished=true;if(commit)for(const node of order)list.append(node);for(const node of original)node.style.order=styles.get(node);source.classList.remove('sort-preview-source');list.classList.remove('sort-preview-active');unlock();return order.map(node=>node.dataset.id||node.dataset.panorama);}
 return{at,reset,finish,changed:()=>order.some((node,index)=>node!==original[index]),order:()=>order.map(node=>node.dataset.id||node.dataset.panorama)};
}
