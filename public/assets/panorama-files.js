export async function panoramaPreviews(file){
 const url=URL.createObjectURL(file),image=new Image();
 try{image.src=url;await image.decode();if(Math.abs(image.naturalWidth/image.naturalHeight-2)>.1)throw Error('Панорама должна иметь соотношение сторон 2:1.');
  async function jpeg(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#dce2e8';ctx.fillRect(0,0,w,h);const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight),width=image.naturalWidth*scale,height=image.naturalHeight*scale;ctx.drawImage(image,(w-width)/2,(h-height)/2,width,height);return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать превью.')),'image/jpeg',.9));}
  return{thumb:await jpeg(400,200),og:await jpeg(1200,630)};
 }finally{URL.revokeObjectURL(url);}
}
export function panoramaInfo(item){
 const parts=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date(item.uploaded));const get=type=>parts.find(p=>p.type===type)?.value||'';
 return `${(Number(item.size||0)/1048576).toFixed(1)} мб, ${get('day')}.${get('month')}.${get('year')}, ${get('hour')}:${get('minute')}`;
}
