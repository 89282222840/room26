import {sortPreview} from './reorder.js?v=1';
import {tourStatus} from './panorama-tour-data.js?v=2';
const config=JSON.parse(document.querySelector('#admin-config').textContent);
let clearFeedback=()=>{};
function show(message,error=false,anchor=document.activeElement){
 clearFeedback();
 if(!(anchor instanceof Element)||anchor===document.body)anchor=document.querySelector('.topbar .button, #new-project, button');
 if(!anchor)return;
 const tip=document.createElement('div');tip.className='feedback-tip'+(error?' feedback-error':'');tip.textContent=message;tip.setAttribute('role',error?'alert':'status');
 const modal=anchor.closest('dialog[open]'),parent=modal||document.body;parent.append(tip);
 function position(){
  const box=anchor.getBoundingClientRect();if(box.bottom<=0||box.top>=innerHeight||box.right<=0||box.left>=innerWidth){tip.hidden=true;return;}tip.hidden=false;const size=tip.getBoundingClientRect();
  const left=Math.max(12,Math.min(innerWidth-size.width-12,box.left+(box.width-size.width)/2));
  let top=box.top-size.height-8;if(top<12)top=box.bottom+8;top=Math.max(12,Math.min(innerHeight-size.height-12,top));
  const origin=modal?modal.getBoundingClientRect():{left:-scrollX,top:-scrollY};
  tip.style.left=(left-origin.left+(modal?modal.scrollLeft-modal.clientLeft:0))+'px';
  tip.style.top=(top-origin.top+(modal?modal.scrollTop-modal.clientTop:0))+'px';
 }
 position();window.addEventListener('resize',position);document.addEventListener('scroll',position,true);
 const timer=setTimeout(()=>clearFeedback(),1000);
 clearFeedback=()=>{clearTimeout(timer);tip.remove();window.removeEventListener('resize',position);document.removeEventListener('scroll',position,true);clearFeedback=()=>{};};
}
async function api(action,data={}){
 const body=data instanceof FormData?data:new FormData();
 if(!(data instanceof FormData))for(const [k,v]of Object.entries(data))body.append(k,v);
 body.set('csrf',config.csrf);body.set('action',action);if(config.project)body.set('project',config.project.id);
 const response=await fetch('/admin/api.php',{method:'POST',body});let result;
 try{result=await response.json();}catch{throw Error('Сервер отклонил запрос. Проверьте лимиты загрузки хостинга.');}
 if(!response.ok){const error=Error(result.error||'Не удалось выполнить запрос.');error.status=response.status;throw error;}return result;
}
const dialog=document.querySelector('#new-dialog'),newProjectButton=document.querySelector('#new-project');if(newProjectButton)newProjectButton.onclick=()=>dialog.showModal();document.querySelector('[data-close]').onclick=()=>dialog.close();
document.querySelector('#create-form').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const r=await api('create',new FormData(event.target));location.href='/admin/?p='+r.project.id;}catch(e){dialog.close();show(e.message,true,newProjectButton);button.disabled=false;}};
document.querySelector('#project-settings')?.addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{await api('save',new FormData(event.target));show('Настройки сохранены.',false,event.submitter);document.querySelector('h1').textContent=document.querySelector('#project-name').value;}catch(e){show(e.message,true,event.submitter);}finally{event.submitter.disabled=false;}});
async function jpeg(canvas,w,h){const out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.fillStyle='#dce2e8';ctx.fillRect(0,0,w,h);const scale=Math.max(w/canvas.width,h/canvas.height);const width=canvas.width*scale,height=canvas.height*scale;ctx.drawImage(canvas,(w-width)/2,(h-height)/2,width,height);return new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать JPG-превью.')),'image/jpeg',.9));}
async function previews(file,type){
 const url=URL.createObjectURL(file);let view,stage,image;
 try{
  if(type==='3d'){stage=document.createElement('div');stage.className='preview-stage';document.body.append(stage);view=await (await import('./model.js?v='+config.versions.model)).modelView(stage,url,{preview:true});image=view.canvas;}
  else{image=new Image();image.src=url;await image.decode();if(type==='360'&&Math.abs(image.width/image.height-2)>.1)throw Error('Панорама должна иметь соотношение сторон 2:1.');}
  const edges=await view?.getEdgeCache();return {thumb:await jpeg(image,400,200),og:await jpeg(image,1200,630),edges:edges?.size<=64*1024*1024?edges:null};
 }finally{view?.dispose();stage?.remove();URL.revokeObjectURL(url);}
}
let busy=false;
function uploadBusy(value){document.querySelectorAll('form.upload button,form.upload input[type=file]').forEach(control=>control.disabled=value);}
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
document.querySelectorAll('form.upload').forEach(form=>form.onsubmit=async event=>{
 event.preventDefault();if(busy)return;busy=true;uploadBusy(true);
 const files=[...form.querySelector('input[type=file]').files],type=form.dataset.type,status=form.querySelector('.upload-status'),bar=form.querySelector('progress');bar.classList.remove('hidden');bar.value=0;
 let done=0;
 try{for(const file of files){status.textContent=`${done+1} / ${files.length}: ${file.name}\n${type==='doc'?'Загрузка…':'Создание превью…'}`;
  const body=new FormData();body.set('type',type);body.set('file',file);
  if(type!=='doc'){const p=await previews(file,type);body.set('thumb',p.thumb,'thumb.jpg');body.set('og',p.og,'og.jpg');if(p.edges)body.set('edge_cache',p.edges,'edges.bin');}
  status.textContent=`${done+1} / ${files.length}: ${file.name}\nЗагрузка на сервер…`;await api('upload',body);done++;bar.value=done/files.length*100;
 }busy=false;location.reload();}catch(e){busy=false;const message=`Загружено: ${done} из ${files.length}. ${e.message}`+(done?' Обновите страницу для просмотра загруженных файлов.':'');status.textContent='';bar.classList.add('hidden');uploadBusy(false);show(message,true,form.querySelector('button'));}
});
async function copy(value,button){
 try{
  try{await navigator.clipboard.writeText(value);}catch{
   const input=document.createElement('textarea');input.value=value;input.className='clipboard-fallback';input.setAttribute('aria-hidden','true');document.body.append(input);
   let copied=false;try{input.focus({preventScroll:true});input.select();copied=document.execCommand('copy');}finally{input.remove();button.focus({preventScroll:true});}
   if(!copied)throw Error('Не удалось скопировать ссылку.');
  }
  show('Ссылка скопирована.',false,button);
 }catch(e){show(e.message,true,button);}
}
document.querySelectorAll('[data-copy]').forEach(button=>button.onclick=()=>copy(button.dataset.copy,button));
document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{if(!confirm('Удалить объект и его файл? Ссылка перестанет работать.'))return;button.disabled=true;try{await api('delete_item',{type:button.closest('[data-type]').dataset.type,item:button.dataset.delete});location.reload();}catch(e){show(e.message,true,button);button.disabled=false;}});
const renameDialog=document.querySelector('#rename-dialog');let renameTarget=null;
if(renameDialog){
 const field=document.querySelector('#rename-name'),form=document.querySelector('#rename-form'),cancel=document.querySelector('#rename-cancel');
 document.querySelectorAll('[data-rename]').forEach(button=>button.onclick=()=>{
  const filename=button.dataset.filename,index=filename.lastIndexOf('.'),extension=index>0?filename.slice(index):'';
  renameTarget={button,type:button.closest('[data-type]').dataset.type,id:button.dataset.rename};
  field.value=extension?filename.slice(0,-extension.length):filename;
  document.querySelector('#rename-extension').textContent=extension?'Расширение '+extension+' сохранится.':'';
  renameDialog.showModal();field.select();
 });
 cancel.onclick=()=>renameDialog.close();
 renameDialog.addEventListener('cancel',event=>{if(form.querySelector('button[type=submit]').disabled)event.preventDefault();});
 form.onsubmit=async event=>{
  event.preventDefault();if(!renameTarget)return;const target=renameTarget,submit=event.submitter;submit.disabled=true;cancel.disabled=true;
  try{
   const result=await api('rename',{type:target.type,item:target.id,name:field.value});config.project=result.project;
   const item=result.project.items[target.type].find(item=>item.id===target.id),row=target.button.closest('.object-row');
   row.querySelector('h3 a').textContent=item.filename;target.button.dataset.filename=item.filename;row.querySelector('.drag-handle').setAttribute('aria-label','Переместить '+item.name);row.querySelector('.object-preview')?.setAttribute('aria-label','Просмотр '+item.filename);
   if(target.type==='doc'){
    const path='/pro/'+config.project.id+'/doc/'+encodeURIComponent(item.public_filename),copy=row.querySelector('[data-copy]');
    row.querySelectorAll('[data-item-link]').forEach(link=>link.setAttribute('href',path));copy.dataset.copy=new URL(copy.dataset.copy).origin+path;
   }
   renameDialog.close();target.button.focus({preventScroll:true});show('Файл переименован.',false,target.button);
  }catch(e){show(e.message,true,submit);}finally{submit.disabled=false;cancel.disabled=false;}
 };
}
async function persist(list,anchor=list){try{await api('reorder',{type:list.dataset.type,order:JSON.stringify([...list.children].map(row=>row.dataset.id))});}catch(e){show(e.message+' Обновите страницу перед продолжением.',true,anchor);}}
document.querySelectorAll('.object-list').forEach(list=>{
 list.style.overflowAnchor='none';
 let dragged=null,preview=null;
 function stop(commit){if(!dragged)return;const row=dragged,changed=preview?.changed();preview?.finish(commit);preview=null;row.classList.remove('dragging');dragged=null;if(commit&&changed)persist(list,row.querySelector('.drag-handle'));}
 list.addEventListener('dragstart',event=>{const handle=event.target.closest('.drag-handle'),tile=event.target.closest('.photo-tile');if(!handle&&!tile){event.preventDefault();return;}if(!handle&&event.target.closest('button')){event.preventDefault();return;}dragged=(handle||tile).closest('.object-row,.photo-tile');preview=sortPreview(list,dragged);dragged.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.clearData();event.dataTransfer.setData('application/x-room26-reorder',dragged.dataset.id);event.dataTransfer.setData('text/plain',dragged.dataset.id);});
 list.addEventListener('dragover',event=>{if(!dragged)return;event.preventDefault();preview?.at(event.clientX,event.clientY);});
 list.addEventListener('drop',event=>{if(!dragged)return;event.preventDefault();preview?.at(event.clientX,event.clientY);stop(true);});
 list.addEventListener('dragend',()=>stop(false));
 list.querySelectorAll('.drag-handle').forEach(handle=>{
  handle.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse'||dragged)return;event.preventDefault();dragged=handle.closest('.object-row,.photo-tile');preview=sortPreview(list,dragged);handle.setPointerCapture(event.pointerId);dragged.classList.add('dragging');});
  handle.addEventListener('pointermove',event=>{if(!dragged||event.pointerType==='mouse')return;event.preventDefault();preview?.at(event.clientX,event.clientY);});
  handle.addEventListener('pointerup',event=>{if(event.pointerType==='mouse')return;const r=list.getBoundingClientRect(),inside=event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom;if(inside)preview?.at(event.clientX,event.clientY);stop(inside);});
  handle.addEventListener('pointercancel',event=>{if(event.pointerType!=='mouse')stop(false);});handle.addEventListener('lostpointercapture',event=>{if(event.pointerType!=='mouse')stop(false);});
 });
 list.querySelectorAll('[data-move]').forEach(button=>button.onclick=async()=>{const row=button.closest('.object-row');if(button.dataset.move==='up'&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);else if(button.dataset.move==='down'&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);else return;await persist(list,button);});
});

const deleteDialog=document.querySelector('#delete-project-dialog');
if(deleteDialog){
 const opener=document.querySelector('#delete-project'),confirmDelete=document.querySelector('#confirm-delete-project'),cancelDelete=document.querySelector('#cancel-delete-project');let deleting=false;
 opener.onclick=()=>deleteDialog.showModal();cancelDelete.onclick=()=>deleteDialog.close();
 deleteDialog.addEventListener('cancel',event=>{if(deleting)event.preventDefault();});
 confirmDelete.onclick=async()=>{
  if(deleting)return;deleting=true;confirmDelete.disabled=true;cancelDelete.disabled=true;
  try{await api('delete_project');location.href='/admin/';}
  catch(e){deleting=false;confirmDelete.disabled=false;cancelDelete.disabled=false;show(e.message,true,confirmDelete);}
 };
}

if(newProjectButton)newProjectButton.disabled=false;

function isFileDrag(event){const types=Array.from(event.dataTransfer?.types||[]);return types.includes('Files')&&!types.includes('application/x-room26-reorder');}
function clearDropHighlights(){document.querySelectorAll('.upload.is-dragover').forEach(form=>form.classList.remove('is-dragover'));}
document.addEventListener('dragover',event=>{if(isFileDrag(event)){event.preventDefault();if(!(event.target instanceof Element)||!event.target.closest('form.upload'))event.dataTransfer.dropEffect='none';}});
document.addEventListener('drop',event=>{if(isFileDrag(event)){event.preventDefault();clearDropHighlights();}});
window.addEventListener('dragend',clearDropHighlights);
document.querySelectorAll('form.upload').forEach(form=>{
 const button=form.querySelector('button'),input=form.querySelector('input[type=file]');
 button.onclick=()=>{if(!busy){input.value='';input.click();}};
 input.addEventListener('change',()=>{if(!input.files.length)return;if(busy){show('Дождитесь завершения загрузки.',false,button);return;}form.requestSubmit();});
 const enter=event=>{if(!isFileDrag(event))return;event.preventDefault();event.dataTransfer.dropEffect=busy?'none':'copy';if(!busy)form.classList.add('is-dragover');};
 form.addEventListener('dragenter',enter);form.addEventListener('dragover',enter);
 form.addEventListener('dragleave',event=>{if(!(event.relatedTarget instanceof Node)||!form.contains(event.relatedTarget))form.classList.remove('is-dragover');});
 form.addEventListener('drop',event=>{
  if(!isFileDrag(event))return;event.preventDefault();event.stopPropagation();clearDropHighlights();
  if(busy){show('Дождитесь завершения загрузки.',false,button);return;}
  const files=Array.from(event.dataTransfer.files);if(!files.length)return;
  const selection=new DataTransfer();for(const file of files)selection.items.add(file);input.files=selection.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
 });
});

document.querySelectorAll('[data-camera]').forEach(button=>button.onclick=async()=>{
 button.disabled=true;
 try{
  const {openCameraEditor}=await import('./camera-editor.js?v='+config.versions.editor),type=button.closest('[data-type]').dataset.type;
  await openCameraEditor({button,type,projectId:config.project.id,item:config.project.items[type].find(item=>item.id===button.dataset.camera),versions:config.versions,api,show,onUpdate(project){
   config.project=project;const item=project.items[type].find(item=>item.id===button.dataset.camera),image=button.closest('.object-row').querySelector('img');
   if(image&&item.preview_version){const url=new URL(image.src);url.searchParams.set('v',item.preview_version);image.src=url.href;}
  }});
 }catch(error){show(error.message,true,button);}finally{button.disabled=false;}
});

const captionDialog=document.querySelector('#caption-dialog');
if(captionDialog){
 const form=document.querySelector('#caption-form'),field=document.querySelector('#photo-caption'),cancel=document.querySelector('#caption-cancel');let target;
 document.querySelectorAll('[data-caption]').forEach(button=>button.onclick=()=>{target=button;field.value=button.dataset.name;captionDialog.showModal();field.select();});
 cancel.onclick=()=>captionDialog.close();captionDialog.addEventListener('cancel',event=>{if(form.querySelector('button[type=submit]').disabled)event.preventDefault();});
 form.onsubmit=async event=>{event.preventDefault();const submit=event.submitter;submit.disabled=true;cancel.disabled=true;
  try{const result=await api('caption',{item:target.dataset.caption,name:field.value});config.project=result.project;const item=result.project.items.photo.find(item=>item.id===target.dataset.caption),tile=target.closest('.photo-tile');tile.querySelector('.photo-tile-caption').textContent=item.name;target.dataset.name=item.name;tile.querySelector('img').alt=item.name;tile.querySelector('a').setAttribute('aria-label',item.name);tile.querySelector('.drag-handle').setAttribute('aria-label','Переместить '+item.name);captionDialog.close();target.focus({preventScroll:true});show('Подпись сохранена.',false,target);}catch(error){show(error.message,true,submit);}finally{submit.disabled=false;cancel.disabled=false;}
 };
}

// Tour editing saves metadata without reloading or changing the page scroll.
document.querySelectorAll('[data-tour]').forEach(button=>button.onclick=async()=>{
 button.disabled=true;
 try{const {openTourEditor}=await import('./tour-editor.js?v='+config.versions.tourEditor);await openTourEditor({projectId:config.project.id,item:config.project.items['3d'].find(item=>item.id===button.dataset.tour),versions:config.versions,api,show,onUpdate(project){config.project=project;}});}
 catch(error){show(error.message,true,button);}finally{button.disabled=false;}
});

function updatePanoramaTour(project){
 config.project=project;const items=project.items['360'],summary=tourStatus(items,project.panorama_tour||{}),edit=document.querySelector('#panorama-tour-edit');
 if(edit)edit.textContent=items.length?'Редактировать тур':'Создать тур';const count=document.querySelector('#panorama-tour-count');if(count){const state=document.createElement('span');state.className=summary.connected?'tour-status-ok':'tour-status-warning';state.textContent=summary.label;count.replaceChildren(document.createTextNode(summary.count+', '),state);}
 const preview=document.querySelector('#panorama-tour-preview');if(preview)preview.hidden=!items.length;
}
document.querySelector('#panorama-tour-edit')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{const module=await import('./panorama-tour-editor.js?v='+config.versions.panoramaTour);const fresh=await api('get_project');config.project=fresh.project;await module.openPanoramaTourEditor({project:config.project,api,onUpdate:updatePanoramaTour});}catch(e){show(e.message,true,button);}finally{button.disabled=false;}});
document.querySelectorAll('[data-replace-panorama]').forEach(button=>button.addEventListener('click',()=>{const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.onchange=async()=>{const file=input.files[0];if(!file||busy)return;busy=true;button.disabled=true;try{const image=await previews(file,'360'),item=config.project.items['360'].find(i=>i.id===button.dataset.replacePanorama),body=new FormData();body.set('item',item.id);body.set('source_version',item.source_version||'');body.set('file',file);body.set('thumb',image.thumb,'thumb.jpg');body.set('og',image.og,'og.jpg');await api('replace_panorama',body);busy=false;location.reload();}catch(e){show(e.message,true,button);}finally{busy=false;button.disabled=false;}};input.click();}));
