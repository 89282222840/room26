const config=JSON.parse(document.querySelector('#admin-config').textContent);
const notice=document.querySelector('#notice');
function show(message,error=false){notice.textContent=message;notice.className=error?'error':'notice';notice.scrollIntoView({behavior:'smooth',block:'nearest'});}
async function api(action,data={}){
 const body=data instanceof FormData?data:new FormData();
 if(!(data instanceof FormData))for(const [k,v]of Object.entries(data))body.append(k,v);
 body.set('csrf',config.csrf);body.set('action',action);if(config.project)body.set('project',config.project.id);
 const response=await fetch('/admin/api.php',{method:'POST',body});let result;
 try{result=await response.json();}catch{throw Error('Сервер отклонил запрос. Проверьте лимиты загрузки хостинга.');}
 if(!response.ok)throw Error(result.error||'Не удалось выполнить запрос.');return result;
}
const dialog=document.querySelector('#new-dialog');document.querySelector('#new-project').onclick=()=>dialog.showModal();document.querySelector('[data-close]').onclick=()=>dialog.close();
document.querySelector('#create-form').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const r=await api('create',new FormData(event.target));location.href='/admin/?p='+r.project.id;}catch(e){dialog.close();show(e.message,true);button.disabled=false;}};
document.querySelector('#project-settings')?.addEventListener('submit',async event=>{event.preventDefault();event.submitter.disabled=true;try{await api('save',new FormData(event.target));show('Настройки сохранены.');document.querySelector('h1').textContent=document.querySelector('#project-name').value;}catch(e){show(e.message,true);}finally{event.submitter.disabled=false;}});
async function jpeg(canvas,w,h){const out=document.createElement('canvas');out.width=w;out.height=h;const ctx=out.getContext('2d');ctx.fillStyle='#dce2e8';ctx.fillRect(0,0,w,h);const scale=Math.max(w/canvas.width,h/canvas.height);const width=canvas.width*scale,height=canvas.height*scale;ctx.drawImage(canvas,(w-width)/2,(h-height)/2,width,height);return new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать JPG-превью.')),'image/jpeg',.9));}
async function previews(file,type){
 const url=URL.createObjectURL(file);let view,stage,image;
 try{
  if(type==='3d'){stage=document.createElement('div');stage.className='preview-stage';document.body.append(stage);view=await (await import('./model.js')).modelView(stage,url,{preview:true});image=view.canvas;}
  else{image=new Image();image.src=url;await image.decode();if(Math.abs(image.width/image.height-2)>.1)throw Error('Панорама должна иметь соотношение сторон 2:1.');}
  return {thumb:await jpeg(image,400,200),og:await jpeg(image,1200,630)};
 }finally{view?.dispose();stage?.remove();URL.revokeObjectURL(url);}
}
let busy=false;
window.addEventListener('beforeunload',event=>{if(busy){event.preventDefault();event.returnValue='';}});
document.querySelectorAll('form.upload').forEach(form=>form.onsubmit=async event=>{
 event.preventDefault();if(busy)return;busy=true;document.querySelectorAll('form.upload button').forEach(b=>b.disabled=true);
 const files=[...form.querySelector('input[type=file]').files],type=form.dataset.type,status=form.querySelector('.upload-status'),bar=form.querySelector('progress');bar.classList.remove('hidden');bar.value=0;
 let done=0;
 try{for(const file of files){status.textContent=`${done+1} / ${files.length}: ${file.name}\n${type==='doc'?'Загрузка…':'Создание превью…'}`;
  const body=new FormData();body.set('type',type);body.set('file',file);
  if(type!=='doc'){const p=await previews(file,type);body.set('thumb',p.thumb,'thumb.jpg');body.set('og',p.og,'og.jpg');}
  status.textContent=`${done+1} / ${files.length}: ${file.name}\nЗагрузка на сервер…`;await api('upload',body);done++;bar.value=done/files.length*100;
 }busy=false;location.reload();}catch(e){busy=false;status.textContent=`Загружено: ${done} из ${files.length}. ${e.message}`;show(status.textContent,true);document.querySelectorAll('form.upload button').forEach(b=>b.disabled=false);if(done){const reload=document.createElement('button');reload.type='button';reload.textContent='Обновить список';reload.onclick=()=>location.reload();status.append(document.createElement('br'),reload);}}
});
async function copy(value){try{await navigator.clipboard.writeText(value);show('Ссылка скопирована.');}catch{prompt('Скопируйте ссылку:',value);}}
document.querySelectorAll('[data-copy]').forEach(button=>button.onclick=()=>copy(button.dataset.copy));
document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=async()=>{if(!confirm('Удалить объект и его файл? Ссылка перестанет работать.'))return;button.disabled=true;try{await api('delete_item',{type:button.closest('[data-type]').dataset.type,item:button.dataset.delete});location.reload();}catch(e){show(e.message,true);button.disabled=false;}});
document.querySelectorAll('[data-rename]').forEach(button=>button.onclick=async()=>{const name=prompt('Название:',button.dataset.name);if(name===null)return;try{await api('rename',{type:button.closest('[data-type]').dataset.type,item:button.dataset.rename,name});location.reload();}catch(e){show(e.message,true);}});
async function persist(list){try{await api('reorder',{type:list.dataset.type,order:JSON.stringify([...list.children].map(row=>row.dataset.id))});show('Порядок сохранён.');}catch(e){show(e.message+' Обновите страницу перед продолжением.',true);}}
document.querySelectorAll('.object-list').forEach(list=>{
 let dragged=null;
 list.addEventListener('dragstart',event=>{const handle=event.target.closest('.drag-handle');if(!handle){event.preventDefault();return;}dragged=handle.closest('.object-row');dragged.classList.add('dragging');event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragged.dataset.id);});
 list.addEventListener('dragover',event=>{if(!dragged)return;event.preventDefault();const target=event.target.closest('.object-row');if(target&&target!==dragged){const rect=target.getBoundingClientRect();list.insertBefore(dragged,event.clientY<rect.top+rect.height/2?target:target.nextSibling);}});
 list.addEventListener('drop',async event=>{if(!dragged)return;event.preventDefault();dragged.classList.remove('dragging');dragged=null;await persist(list);});
 list.addEventListener('dragend',()=>{dragged?.classList.remove('dragging');dragged=null;});
 // Touch drag uses the same handle; native HTML drag remains available on desktop.
 list.querySelectorAll('.drag-handle').forEach(handle=>{let touchRow=null,changed=false;handle.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')return;touchRow=handle.closest('.object-row');changed=false;handle.setPointerCapture(event.pointerId);touchRow.classList.add('dragging');});handle.addEventListener('pointermove',event=>{if(!touchRow)return;const target=document.elementsFromPoint(event.clientX,event.clientY).map(el=>el.closest('.object-row')).find(row=>row&&row!==touchRow&&row.parentElement===list);if(target){const rect=target.getBoundingClientRect();list.insertBefore(touchRow,event.clientY<rect.top+rect.height/2?target:target.nextSibling);changed=true;}});const end=()=>{if(touchRow){touchRow.classList.remove('dragging');touchRow=null;if(changed)persist(list);}};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);});
 list.querySelectorAll('[data-move]').forEach(button=>button.onclick=async()=>{const row=button.closest('.object-row');if(button.dataset.move==='up'&&row.previousElementSibling)list.insertBefore(row,row.previousElementSibling);else if(button.dataset.move==='down'&&row.nextElementSibling)list.insertBefore(row.nextElementSibling,row);else return;await persist(list);});
});

document.querySelector('#delete-project')?.addEventListener('click',async()=>{if(!confirm('Удалить проект целиком со всеми панорамами, моделями и документами? Восстановить их через сайт будет невозможно.'))return;try{await api('delete_project');location.href='/admin/';}catch(e){show(e.message,true);}});
