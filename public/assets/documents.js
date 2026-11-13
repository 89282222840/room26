import {installDocumentPreviews} from './document-previews.js?v=2';
import {watchProject} from './project-live.js?v=1';
const gallery=document.querySelector('.document-gallery');let last=null;
for(const card of gallery.children){const img=card.querySelector('img');card.dataset.liveSignature=JSON.stringify({id:card.dataset.documentId,name:card.querySelector('.document-card-name').textContent,url:card.querySelector('.document-card-name').getAttribute('href'),preview:img.getAttribute('src'),fallback:img.dataset.documentFallback,pdf:Boolean(img.dataset.documentSource),info:card.querySelector('.muted').textContent});}
installDocumentPreviews();
watchProject(state=>{
 const items=state.deleted?[]:state.items.doc,signature=JSON.stringify(items);if(signature===last)return;
 const existing=new Map([...gallery.children].map(card=>[card.dataset.documentId,card]));
 const cards=items.map(item=>{let card=existing.get(item.id);if(card?.dataset.liveSignature===JSON.stringify(item))return card;
  card=document.createElement('article');card.className='document-card';card.dataset.documentId=item.id;card.dataset.liveSignature=JSON.stringify(item);
  const preview=document.createElement('a');preview.className='document-card-image';preview.href=item.url;const img=document.createElement('img');img.src=item.preview;img.width=400;img.height=300;img.alt='';img.loading='lazy';img.dataset.documentFallback=item.fallback;if(item.pdf)img.dataset.documentSource=item.url;preview.append(img);
  const name=document.createElement('a');name.className='document-card-name';name.href=item.url;name.textContent=item.name;
  const download=document.createElement('a');download.className='document-card-download';download.href=item.url+'&download=1';download.download=item.name;download.textContent='Скачать';
  const info=document.createElement('div');info.className='muted small';info.textContent=item.info;card.append(preview,name,download,info);installDocumentPreviews(card);return card;});
 gallery.replaceChildren(...cards);last=signature;document.querySelector('.empty')?.remove();
});
