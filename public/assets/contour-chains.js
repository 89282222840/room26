import * as THREE from './vendor/three/three.module.js';
const TURN=Math.cos(THREE.MathUtils.degToRad(3));
function rawEdges(geometry,angle){const edges=new THREE.EdgesGeometry(geometry,angle),data=edges.getAttribute('position').array.slice();edges.dispose();return data;}
function needsCompletion(raw,matrix){
 if(raw.length/6<48)return false;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),groups=new Map();let eligible=0,max=0;
 for(let i=0;i<raw.length;i+=6){a.fromArray(raw,i).applyMatrix4(matrix);b.fromArray(raw,i+3).applyMatrix4(matrix).sub(a);const len=b.length();if(len<.02)continue;b.divideScalar(len);if(b.x<-.001||(Math.abs(b.x)<=.001&&b.y<-.001)||(Math.abs(b.x)<=.001&&Math.abs(b.y)<=.001&&b.z<0))b.negate();const key=[b.x,b.y,b.z].map(v=>Math.round(v*10)).join('/'),count=(groups.get(key)||0)+1;groups.set(key,count);max=Math.max(max,count);eligible++;}
 return max>=12&&max>=eligible*.2;
}
function simplifyPath(path,vertices){
 if(path.length<=2)return path;
 const keep=new Uint8Array(path.length);keep[0]=keep[path.length-1]=1;const stack=[[0,path.length-1]],toleranceSq=1e-12;
 while(stack.length){const [first,last]=stack.pop();if(last-first<2)continue;const a=vertices[path[first]].world,b=vertices[path[last]].world,dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,length=dx*dx+dy*dy+dz*dz;let best=-1,distance=toleranceSq;
  for(let i=first+1;i<last;i++){const p=vertices[path[i]].world,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy+(p.z-a.z)*dz)/length)):0;const d=(p.x-a.x-t*dx)**2+(p.y-a.y-t*dy)**2+(p.z-a.z-t*dz)**2;if(d>distance){distance=d;best=i;}}
  if(best>=0){keep[best]=1;stack.push([first,best],[best,last]);}
 }
 return path.filter((_,i)=>keep[i]);
}
function traceChains(raw,seed,matrix){
 const vertices=[],vertexMap=new Map(),edges=[],adjacency=[],edgeMap=new Map(),point=new THREE.Vector3();
 function vertex(data,offset){point.fromArray(data,offset).applyMatrix4(matrix);const key=[point.x,point.y,point.z].map(v=>Math.round(v*100000)).join('/');let id=vertexMap.get(key);if(id===undefined){id=vertices.length;vertexMap.set(key,id);vertices.push({local:[data[offset],data[offset+1],data[offset+2]],world:point.clone()});adjacency.push([]);}return id;}
 for(let i=0;i<raw.length;i+=6){const a=vertex(raw,i),b=vertex(raw,i+3);if(a===b)continue;const key=a<b?`${a}/${b}`:`${b}/${a}`;if(edgeMap.has(key))continue;const length=vertices[a].world.distanceTo(vertices[b].world);if(length<1e-7)continue;const id=edges.length;edgeMap.set(key,id);edges.push({a,b,length,strong:false});adjacency[a].push(id);adjacency[b].push(id);}
 for(let i=0;i<seed.length;i+=6){const a=vertex(seed,i),b=vertex(seed,i+3),key=a<b?`${a}/${b}`:`${b}/${a}`,id=edgeMap.get(key);if(id!==undefined)edges[id].strong=true;}
 const used=new Uint8Array(edges.length),starts=edges.map((_,i)=>i).filter(i=>edges[i].strong).sort((a,b)=>edges[b].length-edges[a].length),chains=[];
 function walk(previous,current){const path=[previous,current];for(let steps=0;steps<edges.length;steps++){const p=vertices[previous].world,c=vertices[current].world,ix=c.x-p.x,iy=c.y-p.y,iz=c.z-p.z,il=Math.hypot(ix,iy,iz);let best=-1,next=-1,score=-Infinity;
   for(const id of adjacency[current]){if(used[id])continue;const e=edges[id],other=e.a===current?e.b:e.a,o=vertices[other].world,dot=((o.x-c.x)*ix+(o.y-c.y)*iy+(o.z-c.z)*iz)/(il*e.length);if(dot<TURN)continue;const value=dot+(e.strong ? .002 : 0);if(value>score){best=id;next=other;score=value;}}
   if(best<0)break;used[best]=1;path.push(next);previous=current;current=next;
  }return path;}
 for(const id of starts){if(used[id])continue;used[id]=1;const e=edges[id],forward=walk(e.a,e.b),backward=walk(e.b,e.a);const path=simplifyPath(backward.slice(2).reverse().concat(forward),vertices);if(path.length>=2)chains.push({points:path.map(i=>vertices[i].local),world:path.map(i=>vertices[i].world)});}
 return chains;
}
function descriptor(chain){
 const points=chain.world;if(points.length<2)return null;
 const first=points[0],last=points[points.length-1],axis=last.clone().sub(first),span=axis.length();if(span<.01)return null;axis.divideScalar(span);
 let length=0;for(let i=1;i<points.length;i++)length+=points[i].distanceTo(points[i-1]);if(span<length*.85)return null;
 const reverse=axis.x<-.001||(Math.abs(axis.x)<=.001&&axis.y<-.001)||(Math.abs(axis.x)<=.001&&Math.abs(axis.y)<=.001&&axis.z<0);if(reverse)axis.negate();
 const ordered=reverse?points.slice().reverse():points,distances=[0];let total=0;for(let i=1;i<ordered.length;i++){total+=ordered[i].distanceTo(ordered[i-1]);distances.push(total);}
 const samples=[];let j=1;for(let i=0;i<=4;i++){const target=total*i/4;while(j<ordered.length-1&&distances[j]<target)j++;const fraction=(target-distances[j-1])/(distances[j]-distances[j-1]||1);samples.push(ordered[j-1].clone().lerp(ordered[j],fraction));}
 return {chain,axis,length,span,samples,start:ordered[0],end:ordered[ordered.length-1]};
}
// On thin faceted sheets, isolated short crease fragments are visual noise.
// Keep the boundary and long folds; never bridge a hole or invent a surface.
function cleanFragments(chains,geometry,matrix,completion){
 if(!completion||chains.length<24)return chains;
 if(!geometry.boundingBox)geometry.computeBoundingBox();
 const size=geometry.boundingBox.clone().applyMatrix4(matrix).getSize(new THREE.Vector3()).toArray().sort((a,b)=>a-b);
 if(size[0]>size[1]*.05)return chains;
 const groups=new Map(),removed=new Set();
 chains.forEach((chain,i)=>{const d=descriptor(chain);if(!d)return;const key=d.axis.toArray().map(v=>Math.round(v*10)).join('/');d.i=i;const group=groups.get(key)||[];group.push(d);groups.set(key,group);});
 for(const lines of groups.values()){
  if(lines.length<16)continue;const longest=lines.reduce((max,d)=>Math.max(max,d.span),0);
  if(longest<size[1]*.6||lines.filter(d=>d.span>longest*.7).length<4)continue;
  const axis=lines[0].axis,u=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),v=new THREE.Vector3().crossVectors(axis,u),extremes=new Set();
  for(const direction of [u,v]){let min=Infinity,max=-Infinity,mi=-1,ma=-1;for(const d of lines){const value=d.samples[2].dot(direction);if(value<min){min=value;mi=d.i;}if(value>max){max=value;ma=d.i;}}extremes.add(mi);extremes.add(ma);}
  for(const d of lines)if(d.span<longest*.45&&!extremes.has(d.i))removed.add(d.i);
 }
 return chains.filter((_,i)=>!removed.has(i));
}
function prune(chains,spacing){
 if(chains.length<8)return chains.slice();
 const groups=new Map(),removed=new Set();
 chains.forEach((chain,i)=>{const line=descriptor(chain);if(!line)return;line.i=i;const key=line.axis.toArray().map(v=>Math.round(v*12)).join('/');let group=groups.get(key);if(!group){const axis=line.axis.clone(),u=new THREE.Vector3().crossVectors(axis,Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize();group={axis,u,v:new THREE.Vector3().crossVectors(axis,u),lines:[]};groups.set(key,group);}line.u=line.samples[2].dot(group.u);line.v=line.samples[2].dot(group.v);line.lo=line.start.dot(group.axis);line.hi=line.end.dot(group.axis);group.lines.push(line);});
 function covers(line,other,axis){
  const tolerance=Math.max(.003,line.span*.1);if(line.lo<other.lo-tolerance||line.hi>other.hi+tolerance||line.axis.dot(other.axis)<.99)return false;
  for(const p of line.samples){const t=Math.max(0,Math.min(1,(p.dot(axis)-other.lo)/(other.hi-other.lo||1)))*4,j=Math.min(3,Math.floor(t)),q=other.samples[j].clone().lerp(other.samples[j+1],t-j),delta=p.clone().sub(q);delta.addScaledVector(axis,-delta.dot(axis));if(delta.length()>spacing)return false;}return true;
 }
 for(const group of groups.values()){
  if(group.lines.length<3)continue;const extremes=new Set();for(const key of ['u','v']){let min=group.lines[0],max=min;for(const line of group.lines){if(line[key]<min[key])min=line;if(line[key]>max[key])max=line;}extremes.add(min.i);extremes.add(max.i);}
  const sorted=group.lines.slice().sort((a,b)=>Number(extremes.has(b.i))-Number(extremes.has(a.i))||b.span-a.span||a.i-b.i),cells=new Map();
  for(const line of sorted){const x=Math.floor(line.u/spacing),y=Math.floor(line.v/spacing);let close=false;
   if(!extremes.has(line.i))for(let dx=-1;dx<=1&&!close;dx++)for(let dy=-1;dy<=1&&!close;dy++)for(const other of cells.get(`${x+dx}/${y+dy}`)||[]){if(Math.hypot(line.u-other.u,line.v-other.v)<spacing&&covers(line,other,group.axis)){close=true;break;}}
   if(close)removed.add(line.i);else{const key=`${x}/${y}`,cell=cells.get(key)||[];if(cell.length<64)cell.push(line);cells.set(key,cell);}
  }
 }
 return chains.filter((_,i)=>!removed.has(i));
}
export function buildContourChains(geometry,matrix){
 const seed=rawEdges(geometry,30);let candidate=seed,completion=false;
 if(needsCompletion(seed,matrix)){const detailed=rawEdges(geometry,5);if(detailed.length/6<=220000){candidate=detailed;completion=true;}}
 const traced=traceChains(candidate,seed,matrix),chains=cleanFragments(traced,geometry,matrix,completion),nearChains=prune(chains,.03),farChains=prune(nearChains,.1),farSet=new Set(farChains),positions=[],indices=[];
 let segment=0;for(const chain of nearChains){for(let i=1;i<chain.points.length;i++){positions.push(...chain.points[i-1],...chain.points[i]);if(farSet.has(chain))indices.push(segment);segment++;}}
 const far=indices.length<segment?Uint32Array.from(indices):new Uint32Array();
 return {near:Float32Array.from(positions),far,original:seed.length/6,dense:far.length>0,chains:chains.length,discardedFragments:traced.length-chains.length,nearChains:nearChains.length,farChains:farChains.length,completion};
}

export { traceChains as traceContourChains, prune as pruneContourChains };
