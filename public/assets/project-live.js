// One request at a time. Failed/incomplete responses never mean deletion.
export function watchProject(onUpdate){
 const id=location.pathname.match(/^\/pro\/([a-f0-9]{6})(?:\/|$)/)?.[1];if(!id)return()=>{};
 let timer=null,controller=null,etag=null,stopped=false;
 async function check(){
  clearTimeout(timer);if(stopped||document.hidden||controller)return;
  controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),15000);
  try{
   const response=await fetch('/project-state.php?p='+id,{cache:'no-cache',headers:etag?{'If-None-Match':etag}:{},signal:controller.signal});
   if(response.status===304)return;
   if(!response.ok&&response.status!==410)return;
   const state=await response.json();if(state.deleted!==true&&(!state.items||state.project!==id||!['photo','doc','360','3d'].every(type=>Array.isArray(state.items[type]))))return;
   if(stopped)return;if(await onUpdate(state)!==false)etag=response.headers.get('ETag');
  }catch{/* Keep the current content; retry after reconnection. */}
  finally{clearTimeout(timeout);controller=null;if(!stopped&&!document.hidden)timer=setTimeout(check,30000);}
 }
 function visible(){if(!document.hidden)check();else clearTimeout(timer);}
 document.addEventListener('visibilitychange',visible);window.addEventListener('online',visible);window.addEventListener('pageshow',visible);timer=setTimeout(check,30000);
 const stop=()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visible);window.removeEventListener('online',visible);window.removeEventListener('pageshow',visible);};window.addEventListener('pagehide',event=>{if(!event.persisted)stop();});return stop;
}
