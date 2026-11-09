import * as THREE from './vendor/three/three.module.js';
// Conservative clip planes: never choose a near plane past visible model bounds.
export function adaptiveDepth(modelBox,objectBoxes,radius,{animated=false,floorGrid=false}={}){
 const center=modelBox.getCenter(new THREE.Vector3()),epsilon=Math.max(radius*1e-6,1e-7),margin=Math.max(radius*.02,epsilon*100,floorGrid ? .2 : 0);
 return camera=>{
  let near,far;
  const distance=camera.position.distanceTo(center);
  if(animated){near=Math.max(radius/10000,.000001);far=Math.max(distance+radius*100,radius*1000);}
  else{
   let gap=modelBox.distanceToPoint(camera.position);
   if(gap===0){
    gap=Infinity;
    for(const box of objectBoxes){gap=Math.min(gap,box.distanceToPoint(camera.position));if(gap===0)break;}
    if(!Number.isFinite(gap))gap=0;
   }
   const tangent=Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/camera.zoom;
   const diagonalCosine=1/Math.sqrt(1+tangent*tangent*(1+camera.aspect*camera.aspect));
   far=Math.max(distance+radius+margin,epsilon*100);
   near=Math.max(epsilon,Math.min(gap*diagonalCosine*.25,far*.1));
  }
  // Expand visibility immediately; ignore tiny precision-only fluctuations.
  if(near<camera.near||near>camera.near*1.05||far>camera.far||far<camera.far*.95){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}
 };
}
