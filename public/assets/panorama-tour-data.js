export function tourConnectivity(items,tour){
 const ids=new Set(items.map(i=>i.id)),out=new Map([...ids].map(id=>[id,[]])),incoming=new Map([...ids].map(id=>[id,[]]));
 for(const [source,points]of Object.entries(tour.points||{}))for(const p of points)if(ids.has(source)&&ids.has(p.target)){out.get(source).push(p.target);incoming.get(p.target).push(source);}
 const start=ids.has(tour.start)?tour.start:items[0]?.id;
 function walk(edges){const seen=new Set(),todo=start?[start]:[];while(todo.length){const id=todo.pop();if(seen.has(id))continue;seen.add(id);todo.push(...edges.get(id));}return seen;}
 const reachable=walk(out),returnable=walk(incoming);
 return items.map(i=>({id:i.id,incoming:incoming.get(i.id).length,outgoing:out.get(i.id).length,reachable:reachable.has(i.id),returnable:returnable.has(i.id),complete:reachable.has(i.id)&&returnable.has(i.id)}));
}
export const randomRequest=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
export function tourStatus(items,tour={}){
 const count=items.length,n=count%100,word=n>=11&&n<=14?'панорам':count%10===1?'панорама':count%10>=2&&count%10<=4?'панорамы':'панорам';
 const links=Object.values(tour.points||{}).reduce((total,list)=>total+list.length,0),connected=links>0&&tourConnectivity(items,tour).every(s=>s.complete);
 return {count:count+' '+word,label:!links?'без переходов':connected?'тур связан':'есть разрывы',connected,links};
}
