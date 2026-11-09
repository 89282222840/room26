let loading;
export async function loadPannellum(){
 if(window.pannellum)return;
 if(!loading)loading=(async()=>{
  const style=document.createElement('link');style.rel='stylesheet';style.href='/assets/vendor/pannellum/pannellum.css';const stylesReady=new Promise((resolve,reject)=>{style.onload=resolve;style.onerror=()=>reject(Error('Не удалось загрузить стили панорам.'));});document.head.append(style);
  await Promise.all([stylesReady,new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/vendor/pannellum/pannellum.js';script.onload=resolve;script.onerror=()=>reject(Error('Не удалось загрузить просмотрщик панорам.'));document.head.append(script);})]);
 })().catch(error=>{loading=null;throw error;});
 await loading;
}
export async function panoramaView(container,url,options={}){
 await loadPannellum();const profile=()=>container.clientWidth<=767?'mobile':'desktop';let mode=profile();
 const defaultView=()=>({yaw:0,pitch:0,hfov:100}),initial=options.view||options.views?.[mode]||defaultView();
 const raw=window.pannellum.viewer(container,{type:'equirectangular',panorama:url,autoLoad:true,showControls:!options.editor,showFullscreenCtrl:!options.editor,minHfov:10,maxHfov:120,yaw:initial.yaw,pitch:initial.pitch,hfov:initial.hfov,strings:{loadingLabel:'Загрузка…',bylineLabel:'',noPanoramaError:'Не удалось загрузить панораму.'}});
 let observer,disposed=false;
 function dispose(){if(disposed)return;disposed=true;observer?.disconnect();raw.destroy();}
 function getView(){raw.stopMovement();return {yaw:raw.getYaw(),pitch:raw.getPitch(),hfov:raw.getHfov()};}
 function setView(state=defaultView()){raw.stopMovement();raw.lookAt(state.pitch,state.yaw,state.hfov,false);}
 function resize(){if(disposed)return;raw.resize();const next=profile();if(options.views&&next!==mode){mode=next;setView(options.views[next]||defaultView());}}
 return new Promise((resolve,reject)=>{
  raw.on('load',()=>{observer=new ResizeObserver(resize);observer.observe(container);resolve({raw,dispose,getView,setView,resize,getAutoView:defaultView,zoomBy:factor=>raw.setHfov(Math.max(10,Math.min(120,raw.getHfov()/factor)),false)});});
  raw.on('error',message=>{dispose();reject(Error(message));});
 });
}
