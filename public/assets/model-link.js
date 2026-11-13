// Metres to centimetres, angles to tenths; the orbit pivot is kept as a distance.
const rounded=(n,precision)=>String(Math.round(n*precision)/precision);
const degrees=n=>n*180/Math.PI,radians=n=>n*Math.PI/180;
export function modelStateFromURL(value,item){
 try{
  const url=new URL(value),raw=url.searchParams.get('mv');
  if(url.searchParams.get('item')!==item||!raw||raw.length>300)return null;
  const parts=raw.split(',');if(parts.length!==11||parts.some(n=>! /^-?\d+(?:\.\d+)?$/.test(n)))return null;
  const [version,x,y,z,yaw,pitch,distance,diagonal,zoom,section,flags]=parts.map(Number);
  if(version!==1||![x,y,z].every(n=>Number.isFinite(n)&&Math.abs(n)<=1e6)||Math.abs(yaw)>180||Math.abs(pitch)>90||distance<.01||distance>1e7||diagonal<1||diagonal>170||zoom<.01||zoom>100||!Number.isInteger(section)||section<0||section>1000||!Number.isInteger(flags)||flags<0||flags>7)return null;
  if(flags&4&&(!(flags&2)||diagonal<40||diagonal>130||zoom!==1))return null;
  const a=radians(yaw),p=radians(Math.max(-89.999,Math.min(89.999,pitch))),c=Math.cos(p);
  return {view:{position:[x,y,z],target:[x-Math.sin(a)*c*distance,y+Math.sin(p)*distance,z-Math.cos(a)*c*distance],diagonalFov:diagonal,zoom},grid:Boolean(flags&1),section,tour:{enabled:Boolean(flags&2),walking:Boolean(flags&4),diagonal}};
 }catch{return null;}
}
export function modelURL(value,item,state){
 try{
  const v=state.view,[x,y,z]=v.position,[tx,ty,tz]=v.target,dx=tx-x,dy=ty-y,dz=tz-z,distance=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(distance)||distance<.005||!Number.isFinite(state.aspect)||state.aspect<=0)return null;
  const direction=state.direction||[dx/distance,dy/distance,dz/distance];
  const yaw=degrees(Math.atan2(-direction[0],-direction[2])),pitch=degrees(Math.asin(Math.max(-1,Math.min(1,direction[1])))),diagonal=degrees(2*Math.atan(Math.tan(radians(v.fov)/2)*Math.sqrt(1+state.aspect**2)));
  const flags=Number(state.grid)+2*Number(Boolean(state.tour?.enabled))+4*Number(Boolean(state.tour?.walking));
  const parts=[1,...[x,y,z].map(n=>rounded(n,100)),rounded(yaw,10),rounded(pitch,10),rounded(distance,100),rounded(diagonal,10),rounded(v.zoom||1,1000),Math.round(state.section??1000),flags];
  const url=new URL(value);url.searchParams.set('item',item);url.searchParams.set('mv',parts.join(','));
  return modelStateFromURL(url.href,item)?url:null;
 }catch{return null;}
}
