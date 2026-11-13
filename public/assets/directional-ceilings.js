import * as THREE from './vendor/three/three.module.js';
const ceilingName=name=>/(?:потолок|потолки)/iu.test(name||'');
function named(node,gltf){const a=gltf.parser?.associations?.get(node),j=gltf.parser?.json;return[node.name,a?.nodes!==undefined?j?.nodes?.[a.nodes]?.name:'',a?.meshes!==undefined?j?.meshes?.[a.meshes]?.name:''].some(ceilingName);}
export function installDirectionalCeilings(gltf){
 const groups=new Map();
 gltf.scene.traverse(object=>{if(!object.isMesh)return;let root=null;for(let node=object;node&&node!==gltf.scene.parent;node=node.parent)if(named(node,gltf)){const parent=node.parent;root=parent&&named(parent,gltf)&&gltf.parser?.associations?.get(parent)?.nodes!==undefined?parent:node;break;}if(!root)return;
  let group=groups.get(root);if(!group){const bounds=new THREE.Box3().setFromObject(root);group={plane:(bounds.min.y+bounds.max.y)/2,hidden:null,objects:[]};groups.set(root,group);}group.objects.push(object);object.userData.room26DirectionalCeiling=true;object.userData.room26CeilingOriginalVisible=object.visible;
 });
 function update(camera){for(const group of groups.values()){const y=camera.position.y;if(group.hidden===null)group.hidden=y>=group.plane;else if(group.hidden&&y<group.plane-.01)group.hidden=false;else if(!group.hidden&&y>group.plane+.01)group.hidden=true;for(const object of group.objects){object.userData.room26CeilingHidden=Boolean(group.hidden&&object.userData.room26CeilingOriginalVisible);object.visible=object.userData.room26CeilingOriginalVisible&&!group.hidden;}}}
 function dispose(){for(const group of groups.values())for(const object of group.objects){object.visible=object.userData.room26CeilingOriginalVisible;delete object.userData.room26DirectionalCeiling;delete object.userData.room26CeilingHidden;delete object.userData.room26CeilingOriginalVisible;}}
 return{update,dispose,count:[...groups.values()].reduce((n,g)=>n+g.objects.length,0)};
}
