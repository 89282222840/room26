import * as THREE from './vendor/three/three.module.js';
import { RGBELoader } from './vendor/three/addons/loaders/RGBELoader.js';
const matches=name=>/зеркало/iu.test(name||'');
function namedObject(object,gltf){
 for(let node=object;node&&node!==gltf.scene.parent;node=node.parent){const link=gltf.parser?.associations.get(node);if(matches(node.name)||matches(link?.nodes!==undefined?gltf.parser.json.nodes[link.nodes]?.name:'')||matches(link?.meshes!==undefined?gltf.parser.json.meshes[link.meshes]?.name:''))return true;}
 return false;
}
export async function applyMirrorEnvironment(gltf,renderer,manager){
 const selected=[];
 gltf.scene.traverse(object=>{
  if(!object.isMesh)return;const link=gltf.parser?.associations.get(object),mesh=link?.meshes!==undefined?gltf.parser.json.meshes[link.meshes]:null;
  const hasNamedMaterial=mesh?.primitives.some(p=>matches(gltf.parser.json.materials?.[p.material]?.name))||false;
  const byObject=namedObject(object,gltf)&&!hasNamedMaterial;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  materials.forEach((material,index)=>{if(material&&(matches(material.name)||byObject))selected.push({object,material,index,array:Array.isArray(object.material)});});
 });
 if(!selected.length)return {count:0,ready:false,dispose(){}};
 let hdr=null,target=null,generator=null;
 try{
  hdr=await new RGBELoader(manager).loadAsync('/assets/environment.hdr?v=1');hdr.mapping=THREE.EquirectangularReflectionMapping;
  generator=new THREE.PMREMGenerator(renderer);target=generator.fromEquirectangular(hdr);
 }finally{hdr?.dispose();generator?.dispose();}
 const copies=new Map();
 for(const {object,material,index,array}of selected){
  let mirror=copies.get(material);
  if(!mirror){
   mirror=material.isMeshStandardMaterial?material.clone():new THREE.MeshStandardMaterial({name:material.name,side:material.side,transparent:material.transparent,opacity:material.opacity,alphaTest:material.alphaTest,alphaMap:material.alphaMap,depthWrite:material.depthWrite});
   mirror.color.set(0xffffff);mirror.metalness=.7;mirror.roughness=.02;mirror.envMap=target.texture;mirror.envMapIntensity=1;mirror.needsUpdate=true;copies.set(material,mirror);
  }
  if(array){object.material=object.material.slice();object.material[index]=mirror;}else object.material=mirror;
 }
 return {count:copies.size,ready:true,texture:target.texture,dispose(){target?.dispose();target=null;}};
}
