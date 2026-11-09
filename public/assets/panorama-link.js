// Panorama cameras have a fixed origin; the panorama ID selects that origin.
export function panoramaViewFromURL(value){
 const params=new URL(value).searchParams,result={};
 for(const [key,min,max]of [['yaw',-3600,3600],['pitch',-90,90],['hfov',10,120]]){const raw=params.get(key);if(raw===null||raw.trim()==='')return null;const n=Number(raw);if(!Number.isFinite(n)||n<min||n>max)return null;result[key]=n;}
 return result;
}
export function panoramaURL(value,item,view){
 const url=new URL(value);url.searchParams.set('item',item);
 const state={yaw:((view.yaw+180)%360+360)%360-180,pitch:Math.max(-90,Math.min(90,view.pitch)),hfov:Math.max(10,Math.min(120,view.hfov))};
 for(const [key,n]of Object.entries(state)){if(!Number.isFinite(n))return null;url.searchParams.set(key,String(Math.round(n*100)/100));}
 return url;
}
