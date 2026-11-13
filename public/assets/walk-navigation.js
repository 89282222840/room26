import * as THREE from './vendor/three/three.module.js';
import {MeshBVH,CENTER} from './vendor/three/mesh-bvh.module.js';
export const STEP_HEIGHT=.3,EYE_HEIGHT=1.6,BODY_RADIUS=.15;
const DOOR=/(?:^|[^\p{L}\p{N}])(?:двер[ьи]|doors?)(?=$|[^\p{L}\p{N}])/iu;
export function isDoor(object,gltf){
 for(let node=object;node;node=node.parent){const a=gltf.parser?.associations?.get(node),json=gltf.parser?.json;
  if([node.name,a?.nodes!==undefined?json?.nodes?.[a.nodes]?.name:'',a?.meshes!==undefined?json?.meshes?.[a.meshes]?.name:''].some(name=>DOOR.test(name||'')))return true;
 }return false;
}
function visible(object){for(let n=object;n;n=n.parent)if(!n.visible)return false;return true;}
function solid(material){return material&&material.visible!==false&&material.opacity!==0;}
export async function createWalkNavigation(gltf,useWorker=true){
 const plans=[],point=new THREE.Vector3(),instance=new THREE.Matrix4();let vertices=0,indices=0,doors=0;
 gltf.scene.updateMatrixWorld(true);
 gltf.scene.traverse(object=>{if(!object.isMesh||!visible(object)||!object.geometry.attributes.position)return;if(isDoor(object,gltf)){doors++;return;}
  if(!(Array.isArray(object.material)?object.material:[object.material]).some(solid))return;
  for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){const matrix=object.matrixWorld.clone();if(object.isInstancedMesh){object.getMatrixAt(i,instance);matrix.multiply(instance);}const geometry=object.geometry;plans.push({object,geometry,matrix});vertices+=geometry.attributes.position.count;indices+=geometry.index?geometry.index.count:geometry.attributes.position.count;}
 });
 if(!plans.length)throw Error('В модели нет поверхностей для прогулки.');
 const positions=new Float32Array(vertices*3),index=new Uint32Array(indices);let vertexOffset=0,indexOffset=0,lastYield=performance.now();
 for(const {object,geometry,matrix}of plans){
  const source=geometry.attributes.position;
  for(let i=0;i<source.count;i++){point.fromBufferAttribute(source,i).applyMatrix4(matrix);point.toArray(positions,(vertexOffset+i)*3);}
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
 function support(x,z,reference){ray.origin.set(x,reference+STEP_HEIGHT+.012,z);ray.direction.copy(down);const hits=bvh.raycast(ray,THREE.DoubleSide,0,STEP_HEIGHT*2+.024);let highest=null;for(const hit of hits){if(hit.face.normal.y<.65||hit.point.y>reference+STEP_HEIGHT+.006||hit.point.y<reference-STEP_HEIGHT-.006)continue;if(highest===null||hit.point.y>highest)highest=hit.point.y;}return highest;}
 function bodyClear(foot){
  segment.start.set(foot.x,foot.y+STEP_HEIGHT+BODY_RADIUS+.015,foot.z);segment.end.set(foot.x,foot.y+1.75-BODY_RADIUS,foot.z);
  box.makeEmpty().expandByPoint(segment.start).expandByPoint(segment.end).expandByScalar(BODY_RADIUS);
  let blocked=false;bvh.shapecast({intersectsBounds:bounds=>bounds.intersectsBox(box),intersectsTriangle:triangle=>{if(triangle.closestPointToSegment(segment,onTriangle,onBody)<BODY_RADIUS-.001){blocked=true;return true;}return false;}});return!blocked;
 }
 function stand(point,reference=point.y){
  if(disposed)return null;const height=support(point.x,point.z,reference);if(height===null)return null;const foot=new THREE.Vector3(point.x,height,point.z);
  for(const [x,z]of [[.13,0],[-.13,0],[0,.13],[0,-.13]])if(support(foot.x+x,foot.z+z,height)===null)return null;
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
 function pick(ray){const hit=bvh.raycastFirst(ray,THREE.DoubleSide,.02,100);return hit&&hit.face.normal.y>=.65?hit.point:null;}
 return{stand,advance,trace,pick,stats:{doors,triangles:indexOffset/3,vertices},dispose(){disposed=true;geometry.dispose();bvh=null;}};
}
