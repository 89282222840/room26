import * as THREE from './vendor/three/three.module.js';
import {MeshBVH,CENTER} from './vendor/three/mesh-bvh.module.js';
export const STEP_HEIGHT=.3,EYE_HEIGHT=1.6,BODY_RADIUS=.05,LOW_OBSTACLE_HEIGHT=1.7;
const DOOR=/(?:^|[^\p{L}\p{N}])(?:двер[ьи]|doors?)(?=$|[^\p{L}\p{N}])/iu;
const WINDOW=/(?:^|[^\p{L}\p{N}])окно(?=$|[^\p{L}\p{N}])|^(?:FamilyInstance[\s_]+)?окна(?=$|[^\p{L}\p{N}])/iu;
const WALK_THROUGH=/(?:стекло|штора|шторы|curtain|тюль|занавес)/iu;
function namedOpening(object,gltf,pattern){
 for(let node=object;node;node=node.parent){const a=gltf.parser?.associations?.get(node),json=gltf.parser?.json;
  if([node.name,a?.nodes!==undefined?json?.nodes?.[a.nodes]?.name:'',a?.meshes!==undefined?json?.meshes?.[a.meshes]?.name:''].some(name=>pattern.test(name||'')))return true;
 }return false;
}
export function isDoor(object,gltf){return namedOpening(object,gltf,DOOR);}
export function isWindow(object,gltf){return namedOpening(object,gltf,WINDOW);}
export function isWalkThrough(object,gltf){return namedOpening(object,gltf,WALK_THROUGH);}
function names(node,gltf){const a=gltf.parser?.associations?.get(node),json=gltf.parser?.json;return[node.name,a?.nodes!==undefined?json?.nodes?.[a.nodes]?.name:'',a?.meshes!==undefined?json?.meshes?.[a.meshes]?.name:''].filter(Boolean);}
function originalUnit(object,gltf){for(let n=object.parent;n&&n!==gltf.scene;n=n.parent){if(gltf.parser?.associations?.get(n)?.meshes!==undefined)return n;if(n.isMesh)break;}return object;}
function surfaceKind(object,unit,gltf){if([...names(object,gltf),...names(unit,gltf)].some(n=>/^(?:пол|floor)(?:$|[\s_-])/iu.test(n)))return'floor';for(let n=object;n;n=n.parent)if(names(n,gltf).some(s=>/(?:^|[^\p{L}\p{N}])(?:ступен[\p{L}]*|лестни[\p{L}]*|stairs?|treads?)(?=$|[^\p{L}\p{N}])/iu.test(s)))return'stair';return'';}
function visible(object){for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;}
function solid(material){return material&&material.visible!==false&&material.opacity!==0;}
export async function createWalkNavigation(gltf,useWorker=true){
 const units=[null],unitMap=new Map(),plans=[],point=new THREE.Vector3(),instance=new THREE.Matrix4();let vertices=0,indices=0,doors=0,windows=0,walkThrough=0;
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(object=>{if(!object.isMesh||!visible(object)||!object.geometry.attributes.position)return;if(isDoor(object,gltf)){doors++;return;}if(isWindow(object,gltf)){windows++;return;}if(isWalkThrough(object,gltf)){walkThrough++;return;}
  if(!(Array.isArray(object.material)?object.material:[object.material]).some(solid))return;
  for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){const matrix=object.matrixWorld.clone();if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}const geometry=object.geometry,owner=originalUnit(object,gltf),key=owner.uuid+(object.isInstancedMesh?':'+i:'');let unit=unitMap.get(key);if(!unit){unit={id:units.length,box:new THREE.Box3(),kind:surfaceKind(object,owner,gltf),ignored:false};units.push(unit);unitMap.set(key,unit);}plans.push({object,geometry,matrix,unit});vertices+=geometry.attributes.position.count;indices+=geometry.index?geometry.index.count:geometry.attributes.position.count;}
 });
 if(!plans.length)throw Error('В модели нет поверхностей для прогулки.');
 const positions=new Float32Array(vertices*3),index=new Uint32Array(indices),vertexUnits=new Uint32Array(vertices);let vertexOffset=0,indexOffset=0,lastYield=performance.now();
 for(const {object,geometry,matrix,unit}of plans){
  const source=geometry.attributes.position;
  for(let i=0;i<source.count;i++){point.fromBufferAttribute(source,i).applyMatrix4(matrix);point.toArray(positions,(vertexOffset+i)*3);unit.box.expandByPoint(point);vertexUnits[vertexOffset+i]=unit.id;}
  const count=geometry.index?geometry.index.count:source.count,flip=matrix.determinant()<0,range=geometry.drawRange;
  for(let i=Math.max(0,range.start||0);i+2<Math.min(count,(range.start||0)+range.count);i+=3){
   if(Array.isArray(object.material)){const group=geometry.groups.find(g=>i>=g.start&&i<g.start+g.count);if(!solid(object.material[group?.materialIndex||0]))continue;}
   const a=geometry.index?geometry.index.getX(i):i,b=geometry.index?geometry.index.getX(i+1):i+1,c=geometry.index?geometry.index.getX(i+2):i+2;
   index[indexOffset++]=vertexOffset+a;index[indexOffset++]=vertexOffset+(flip?c:b);index[indexOffset++]=vertexOffset+(flip?b:c);
  }
  vertexOffset+=source.count;if(performance.now()-lastYield>12){await new Promise(r=>setTimeout(r,0));lastYield=performance.now();}
 }
 const geometry=new THREE.BufferGeometry();let bvh,worker;
 if(useWorker&&typeof Worker!=='undefined'){
  try{const result=await new Promise((resolve,reject)=>{worker=new Worker(new URL('./walk-navigation-worker.js?v=1',import.meta.url),{type:'module'});worker.onmessage=({data})=>data.error?reject(Error(data.error)):resolve(data);worker.onerror=event=>{event.preventDefault();reject(Error(event.message||'Не удалось подготовить прогулку.'));};worker.postMessage({positions,index:index.subarray(0,indexOffset)},[positions.buffer,index.buffer]);});geometry.setAttribute('position',new THREE.BufferAttribute(result.positions,3));bvh=MeshBVH.deserialize(result.serialized,geometry,{setIndex:true});}
  catch(error){geometry.dispose();return createWalkNavigation(gltf,false);}
  finally{worker?.terminate();}
 }else{geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(new THREE.BufferAttribute(index.subarray(0,indexOffset),1));bvh=new MeshBVH(geometry,{strategy:CENTER,maxLeafTris:12,maxDepth:40,verbose:false});}
 const ray=new THREE.Ray(),down=new THREE.Vector3(0,-1,0),box=new THREE.Box3(),segment=new THREE.Line3(),onTriangle=new THREE.Vector3(),onBody=new THREE.Vector3();let disposed=false;
 const taggedFloors=units.some(unit=>unit?.kind==='floor');let ignoredLow=0;
 // Resolve object height against the real supporting level, not global model Y.
 // Vertex ownership survives BVH index reordering and keeps material parts together.
 const ownerOf=hit=>units[vertexUnits[hit.face.a]];
 for(const unit of units.slice(1)){
  if(unit.kind)continue;const size=unit.box.getSize(new THREE.Vector3()),center=unit.box.getCenter(new THREE.Vector3());let floor=null;
  for(const [x,z]of [[center.x,center.z],[center.x-size.x*.35,center.z-size.z*.35],[center.x+size.x*.35,center.z+size.z*.35]]){
   ray.origin.set(x,unit.box.min.y+STEP_HEIGHT+.02,z);ray.direction.copy(down);
   for(const hit of bvh.raycast(ray,THREE.DoubleSide,0,Infinity)){
    const supporting=ownerOf(hit);if(!supporting||supporting===unit||hit.face.normal.y<.65||hit.point.y>unit.box.min.y+STEP_HEIGHT+.02)continue;
    if(taggedFloors&&!supporting.kind)continue;
    if(!taggedFloors&&!supporting.kind){const extent=supporting.box.getSize(new THREE.Vector3());if(extent.y>STEP_HEIGHT+.01||extent.x*extent.z<.25)continue;}
    if(floor===null||hit.point.y>floor)floor=hit.point.y;
   }
  }
  if(floor!==null){const height=unit.box.max.y-floor;if(height>STEP_HEIGHT+.006&&height<LOW_OBSTACLE_HEIGHT-.001){unit.ignored=true;ignoredLow++;}}
  if(performance.now()-lastYield>12){await new Promise(r=>setTimeout(r,0));lastYield=performance.now();}
 }
 const ignored=hit=>ownerOf(hit)?.ignored===true;
 function support(x,z,reference){ray.origin.set(x,reference+STEP_HEIGHT+.012,z);ray.direction.copy(down);const hits=bvh.raycast(ray,THREE.DoubleSide,0,STEP_HEIGHT*2+.024);let highest=null;for(const hit of hits){if(ignored(hit)||hit.face.normal.y<.65||hit.point.y>reference+STEP_HEIGHT+.006||hit.point.y<reference-STEP_HEIGHT-.006)continue;if(highest===null||hit.point.y>highest)highest=hit.point.y;}return highest;}
 function bodyClear(foot){
  segment.start.set(foot.x,foot.y+STEP_HEIGHT+BODY_RADIUS+.015,foot.z);segment.end.set(foot.x,foot.y+1.75-BODY_RADIUS,foot.z);
  box.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end).expandByScalar(BODY_RADIUS);
  let blocked=false;bvh.shapecast({intersectsBounds:bounds=>bounds.intersectsBox(box),intersectsTriangle:(triangle,triangleIndex)=>{if(units[vertexUnits[geometry.index.getX(triangleIndex*3)]]?.ignored)return false;if(triangle.closestPointToSegment(segment,onTriangle,onBody)<BODY_RADIUS-.001){blocked=true;return true;}return false;}});return!blocked;
 }
 function stand(point,reference=point.y){
  if(disposed)return null;const height=support(point.x,point.z,reference);if(height===null)return null;const foot=new THREE.Vector3(point.x,height,point.z);
  const supportRadius=BODY_RADIUS*.86;for(const [x,z]of [[supportRadius,0],[-supportRadius,0],[0,supportRadius],[0,-supportRadius]])if(support(foot.x+x,foot.z+z,height)===null)return null;
  return bodyClear(foot)?foot:null;
 }
 function advance(start,dx,dz,slide=true){
  let foot=start.clone();const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.055)),sx=dx/steps,sz=dz/steps;
  for(let i=0;i<steps;i++){let next=stand(new THREE.Vector3(foot.x+sx,foot.y,foot.z+sz),foot.y);
   if(!next&&slide&&Math.abs(sx)>1e-8&&Math.abs(sz)>1e-8){const x=stand(new THREE.Vector3(foot.x+sx,foot.y,foot.z),foot.y),z=stand(new THREE.Vector3(foot.x,foot.y,foot.z+sz),foot.y);next=x&&z?(Math.abs(sx)>Math.abs(sz)?x:z):x||z;}
   if(!next)break;foot=next;
  }return foot;
 }
 function trace(start,target){
  const distance=Math.hypot(target.x-start.x,target.z-start.z);if(distance>40)return null;
  const steps=Math.max(1,Math.ceil(distance/.055)),path=[];let foot=start.clone();
  for(let i=1;i<=steps;i++){const t=i/steps,next=stand(new THREE.Vector3(THREE.MathUtils.lerp(start.x,target.x,t),foot.y,THREE.MathUtils.lerp(start.z,target.z,t)),foot.y);if(!next)return null;path.push(next);foot=next;}
  if(Math.abs(foot.y-target.y)>.08)return null;return path;
 }
 function pick(ray){const hits=bvh.raycast(ray,THREE.DoubleSide,.02,100).filter(hit=>!ignored(hit)).sort((a,b)=>a.distance-b.distance),hit=hits[0];return hit&&hit.face.normal.y>=.65?hit.point:null;}
 return{stand,advance,trace,pick,stats:{doors,windows,walkThrough,ignoredLow,triangles:indexOffset/3,vertices},dispose(){disposed=true;geometry.dispose();bvh=null;}};
}
