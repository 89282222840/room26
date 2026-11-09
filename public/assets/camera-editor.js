const dialog=document.querySelector('#camera-dialog'),workspace=document.querySelector('#camera-workspace'),frame=document.querySelector('#camera-frame'),stage=document.querySelector('#camera-stage'),status=document.querySelector('#camera-loading');
const modes=[...document.querySelectorAll('[data-camera-mode]')],save=document.querySelector('#camera-save'),reset=document.querySelector('#camera-reset'),close=document.querySelector('#camera-close'),zoomIn=document.querySelector('#camera-zoom-in'),zoomOut=document.querySelector('#camera-zoom-out');
const dimensions={mobile:[393,740],desktop:[1280,720]};
let context,view,mode='mobile',drafts={},epoch=0,working=false;
function enable(ready){for(const button of [...modes,save,reset,zoomIn,zoomOut])button.disabled=!ready;close.disabled=working;stage.inert=working;}
function fitFrame(){
 if(!dialog.open)return;const[w,h]=dimensions[mode],scale=Math.min(1,Math.max(1,workspace.clientWidth-16)/w,Math.max(1,workspace.clientHeight-16)/h);
 stage.style.width=w+'px';stage.style.height=h+'px';stage.style.transform=`scale(${scale})`;frame.style.width=w*scale+'px';frame.style.height=h*scale+'px';
 modes.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.cameraMode===mode)));
}
new ResizeObserver(fitFrame).observe(workspace);
function remember(){if(view)drafts[mode]=view.getView();}
function update(result){context.onUpdate(result.project);context.item=result.project.items[context.type].find(item=>item.id===context.item.id);}
modes.forEach(button=>button.onclick=()=>{
 if(!view||working)return;remember();mode=button.dataset.cameraMode;fitFrame();view.resize();view.setView(drafts[mode]||view.getAutoView(...dimensions[mode]));
});
reset.onclick=()=>{if(view&&!working){view.setView(view.getAutoView(...dimensions[mode]));remember();}};
zoomIn.onclick=()=>view?.zoomBy(1.2);zoomOut.onclick=()=>view?.zoomBy(1/1.2);
close.onclick=()=>{if(!working)dialog.close();};
dialog.addEventListener('cancel',event=>{if(working)event.preventDefault();});
dialog.addEventListener('close',()=>{epoch++;view?.dispose();view=null;stage.replaceChildren();context=null;});
save.onclick=async()=>{
 if(!view||working)return;remember();const states={};for(const profile of ['mobile','desktop'])states[profile]=drafts[profile]||view.getAutoView(...dimensions[profile]);
 working=true;enable(false);
 try{const body=new FormData();body.set('type',context.type);body.set('item',context.item.id);body.set('views',JSON.stringify(states));
   if(context.type==='3d'){body.set('thumb',await view.capture(400,200),'thumb.jpg');body.set('og',await view.capture(1200,630),'og.jpg');}
   update(await context.api('save_views',body));drafts=structuredClone(states);context.show('Ракурсы сохранены.',false,save);}
 catch(error){context.show(error.message,true,save);}finally{working=false;enable(true);}
};
export async function openCameraEditor(options){
 if(dialog.open)return;context=options;drafts=structuredClone(options.item.views||{});mode='mobile';const token=++epoch;working=false;view=null;stage.replaceChildren();
 document.querySelector('#camera-title').textContent=options.item.name;status.hidden=false;status.textContent='Загрузка…';dialog.showModal();enable(false);fitFrame();
 const surface=document.createElement('div');surface.className='camera-scene';stage.append(surface);
 try{
  const module=options.type==='3d'?await import('./model.js?v='+options.versions.model):await import('./panorama.js?v='+options.versions.panorama);
  if(token!==epoch||!dialog.open)return;
  const instance=await(options.type==='3d'?module.modelView:module.panoramaView)(surface,'/media.php?'+new URLSearchParams({p:options.projectId,type:options.type,item:options.item.id,kind:'source'}),{editor:true,view:drafts.mobile,edgeCacheURL:options.item.edge_version===5?'/media.php?'+new URLSearchParams({p:options.projectId,type:'3d',item:options.item.id,kind:'edges',v:options.item.edge_revision}):null});
  if(token!==epoch||!dialog.open){instance.dispose();return;}
  view=instance;status.hidden=true;enable(true);fitFrame();view.resize();
 }catch(error){if(token!==epoch)return;status.textContent='Не удалось открыть объект. '+error.message;throw error;}
}
