import * as THREE from './vendor/three/three.module.js';
import { buildContourChains } from './contour-chains.js?v=5';
export const EDGE_VERSION=5;
const encoder=new TextEncoder(),decoder=new TextDecoder();
function signature(g){return `${g.getAttribute('position').count}/${g.index?.count||0}`;}
function decode(buffer){
 const bytes=new Uint8Array(buffer),view=new DataView(buffer);
 if(bytes.length<12||decoder.decode(bytes.subarray(0,8))!=='R26E0005')throw Error('Edge cache header');
 const size=view.getUint32(8,true);if(size>1048576||12+size>bytes.length)throw Error('Edge cache size');
 const header=JSON.parse(decoder.decode(bytes.subarray(12,12+size)));if(header.version!==EDGE_VERSION||!Array.isArray(header.entries)||header.entries.length>50000)throw Error('Edge cache version');
 let offset=(12+size+3)&~3;const result=new Map();
 for(const row of header.entries){
  if(!/^g\d+$/.test(row.key)||typeof row.signature!=='string'||!Number.isInteger(row.original)||row.original<0||!Number.isInteger(row.near)||!Number.isInteger(row.far)||row.near<0||row.far<0||row.far>row.near||offset+row.near*24+row.far*4>bytes.length)throw Error('Edge cache entry');
  const near=new Float32Array(buffer,offset,row.near*6);offset+=near.byteLength;
  const far=new Uint32Array(buffer,offset,row.far);offset+=far.byteLength;
  for(const value of near)if(!Number.isFinite(value))throw Error('Edge coordinates');
  for(const index of far)if(index>=row.near)throw Error('Edge index');
  result.set(row.key,{signature:row.signature,original:row.original,near,far,dense:row.far>0&&row.far<row.near});
 }
 if(offset!==bytes.length)throw Error('Edge cache trailing data');return result;
}
function encode(entries){
 const rows=entries.map(e=>({key:e.key,signature:e.signature,original:e.original,near:e.near.length/6,far:e.far.length}));
 const header=encoder.encode(JSON.stringify({version:EDGE_VERSION,entries:rows})),start=(12+header.length+3)&~3;
 const out=new Uint8Array(start+entries.reduce((sum,e)=>sum+e.near.byteLength+e.far.byteLength,0));out.set(encoder.encode('R26E0005'));new DataView(out.buffer).setUint32(8,header.length,true);out.set(header,12);
 let offset=start;for(const entry of entries){out.set(new Uint8Array(entry.near.buffer,entry.near.byteOffset,entry.near.byteLength),offset);offset+=entry.near.byteLength;out.set(new Uint8Array(entry.far.buffer,entry.far.byteOffset,entry.far.byteLength),offset);offset+=entry.far.byteLength;}
 return new Blob([out],{type:'application/octet-stream'});
}
function geometry(positions){return new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3));}
export function installEdges(gltf,scene,buffer){
 const started=performance.now();let stored=new Map();if(buffer)try{stored=decode(buffer);}catch(error){/* Invalid or outdated sidecar: rebuild from the original model. */}
 const objects=[];gltf.scene.traverse(object=>{if(object.isMesh)objects.push(object);});
 const entries=[],byGeometry=new Map(),ordinary=[],adaptive=[],staticLevels=[],material=new THREE.LineBasicMaterial({color:0x666666,linewidth:1,depthTest:true,depthWrite:false,toneMapped:false});
 const point=new THREE.Vector3(),instance=new THREE.Matrix4(),transform=new THREE.Matrix4();let reused=0;
 for(const object of objects){
  let entry=byGeometry.get(object.geometry);
  if(!entry){
   const key='g'+entries.length,sig=signature(object.geometry),cached=stored.get(key);
   if(cached?.signature===sig){entry={...cached,key};reused++;}
   else entry={key,signature:sig,...buildContourChains(object.geometry,object.matrixWorld,{angle:90,complete:false})};
   entries.push(entry);byGeometry.set(object.geometry,entry);
  }
  if(!entry.near.length)continue;
  const canMerge=!gltf.animations.length&&!object.isSkinnedMesh&&!object.morphTargetInfluences;
  const count=object.isInstancedMesh?object.count:1;
  for(let i=0;i<count;i++){
   transform.copy(object.matrixWorld);if(object.isInstancedMesh){object.getMatrixAt(i,instance);transform.multiply(instance);}
   if(canMerge){
    const start=ordinary.length/3;
    for(let j=0;j<entry.near.length;j+=3){point.fromArray(entry.near,j).applyMatrix4(transform);ordinary.push(point.x,point.y,point.z);}
    const level={entry,start,far:false};staticLevels.push(level);
    if(entry.dense){const sphere=new THREE.Box3().setFromBufferAttribute(object.geometry.getAttribute('position')).getBoundingSphere(new THREE.Sphere()).applyMatrix4(transform);adaptive.push({entry,sphere,far:false,level});}
    continue;
   }
   if(!entry.nearGeometry){entry.nearGeometry=geometry(entry.near);if(entry.dense){const far=new Float32Array(entry.far.length*6);entry.far.forEach((index,j)=>far.set(entry.near.subarray(index*6,index*6+6),j*6));entry.farGeometry=geometry(far);}}
   const lines=new THREE.LineSegments(entry.nearGeometry,material);lines.name='ROOM26 characteristic edges';lines.renderOrder=1;
   if(object.isInstancedMesh){object.getMatrixAt(i,lines.matrix);lines.matrixAutoUpdate=false;}
   object.add(lines);
   if(entry.dense){const sphere=new THREE.Box3().setFromBufferAttribute(object.geometry.getAttribute('position')).getBoundingSphere(new THREE.Sphere());adaptive.push({object,lines,entry,sphere,far:false});}
  }
 }
 let batch=null,indexBuffer=null;
 if(ordinary.length){
  batch=geometry(ordinary);indexBuffer=new Uint32Array(ordinary.length/3);batch.setIndex(new THREE.BufferAttribute(indexBuffer,1).setUsage(THREE.DynamicDrawUsage));
  const lines=new THREE.LineSegments(batch,material);lines.name='ROOM26 batched edges';lines.renderOrder=1;scene.add(lines);
 }
 function reindex(){
  if(!batch)return;let offset=0;
  for(const level of staticLevels){
   if(level.far){for(const segment of level.entry.far){indexBuffer[offset++]=level.start+segment*2;indexBuffer[offset++]=level.start+segment*2+1;}}
   else for(let i=0;i<level.entry.near.length/3;i++)indexBuffer[offset++]=level.start+i;
  }
  batch.index.needsUpdate=true;batch.setDrawRange(0,offset);
 }
 reindex();
 if(!ordinary.length&&!objects.length)material.dispose();
 const stats={objects:objects.length,geometries:entries.length,denseGeometries:entries.filter(e=>e.dense).length,adaptiveObjects:adaptive.length,reusedGeometries:reused,originalSegments:entries.reduce((n,e)=>n+(e.original||e.near.length/6),0),nearSegments:entries.reduce((n,e)=>n+e.near.length/6,0),farSegments:entries.reduce((n,e)=>n+(e.dense?e.far.length:e.near.length/6),0),analysisMs:performance.now()-started,farObjects:0};
 const world=new THREE.Vector3();
 function update(camera,height){
  let farObjects=0,dirty=false;
  for(const item of adaptive){
   world.copy(item.sphere.center);if(item.lines)world.applyMatrix4(item.lines.matrixWorld);
   const distance=Math.max(.01,world.distanceTo(camera.position)),pixels=.1*height*camera.zoom/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*distance);
   const far=item.far?pixels<7:pixels<5;
   if(far!==item.far){item.far=far;if(item.level){item.level.far=far;dirty=true;}else item.lines.geometry=far?item.entry.farGeometry:item.entry.nearGeometry;}
   if(far)farObjects++;
  }
  if(dirty)reindex();stats.farObjects=farObjects;
 }
 // Some levels are not attached when the viewer closes; release both explicitly.
 function dispose(){const unique=new Set();for(const entry of entries)for(const g of [entry.nearGeometry,entry.farGeometry])if(g)unique.add(g);for(const g of unique)g.dispose();material.dispose();}
 return {update,stats,dispose,exportCache:()=>encode(entries)};
}
