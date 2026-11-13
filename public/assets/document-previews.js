let pdfLibrary=null;
function pdfjs(){return pdfLibrary??=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/assets/vendor/pdfjs/pdf.min.js';script.onload=()=>{const library=globalThis.pdfjsLib;library.GlobalWorkerOptions.workerSrc='/pdf-worker.php?v=3.11.174';resolve(library)};script.onerror=()=>{pdfLibrary=null;reject(Error('Не удалось открыть PDF.'))};document.head.append(script)});}
export async function documentThumbnail(source,extension){
 const canvas=document.createElement('canvas');canvas.width=400;canvas.height=300;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.fillStyle='#fff';ctx.fillRect(0,0,400,300);let url=null,pdf=null,task=null,timer=null;
 try{
  if(extension==='PDF'){
   if(source instanceof File&&source.size>40*1024*1024)return null;const lib=await pdfjs();task=lib.getDocument({...(source instanceof File?{data:await source.arrayBuffer()}:{url:source}),isEvalSupported:false,disableAutoFetch:true,disableStream:true,useSystemFonts:true,maxImageSize:16000000});timer=setTimeout(()=>task.destroy().catch(()=>{}),15000);task.onPassword=()=>task.destroy();pdf=await task.promise;const page=await pdf.getPage(1),base=page.getViewport({scale:1}),scale=Math.min(400/base.width,300/base.height),viewport=page.getViewport({scale});await page.render({canvasContext:ctx,viewport,transform:[1,0,0,1,(400-viewport.width)/2,(300-viewport.height)/2],background:'#fff'}).promise;
  }else if(['JPG','JPEG','PNG','GIF','WEBP','AVIF'].includes(extension)){
   const image=new Image();url=source instanceof File?URL.createObjectURL(source):null;image.src=url||source;await image.decode();const scale=Math.min(400/image.naturalWidth,300/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;ctx.drawImage(image,(400-w)/2,(300-h)/2,w,h);
  }else return null;
  return await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.86));
 }catch{return null;}finally{clearTimeout(timer);if(url)URL.revokeObjectURL(url);try{if(pdf)await pdf.destroy();else if(task)await task.destroy();}catch{}}
}
export function installDocumentPreviews(root=document){
 const queue=[];let running=0;if(typeof IntersectionObserver==='undefined'){for(const img of root.querySelectorAll('img[data-document-source]'))queue.push(img);pump();return;}const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);queue.push(entry.target);}pump();},{rootMargin:'300px'});
 async function pump(){while(running<2&&queue.length){const img=queue.shift();running++;documentThumbnail(img.dataset.documentSource,'PDF').then(blob=>{if(blob&&img.isConnected){const url=URL.createObjectURL(blob);img.src=url;img.onload=()=>URL.revokeObjectURL(url);}}).finally(()=>{running--;pump()});}}
 for(const img of root.querySelectorAll('img[data-document-source]'))observer.observe(img);
}
