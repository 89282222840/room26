import { DoubleSide, Vector2 } from './vendor/three/three.module.js';
import { EffectComposer } from './vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from './vendor/three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from './vendor/three/addons/postprocessing/OutputPass.js';

// Contact shading is evaluated only when the viewer requests a frame.
export function ambientOcclusion(renderer,scene,camera){
 const composer=new EffectComposer(renderer),ao=new GTAOPass(scene,camera,1,1);
 const color=new RenderPass(scene,camera),output=new OutputPass();
 composer.renderTarget1.samples=2;composer.renderTarget2.samples=2;
 ao.blendIntensity=.45;
 ao.updateGtaoMaterial({radius:.35,distanceExponent:2,thickness:.08,distanceFallOff:1,scale:1,samples:8,screenSpaceRadius:false});
 ao.updatePdMaterial({samples:8,rings:2,radius:4});
 ao.normalMaterial.side=DoubleSide;
 // Revit GLBs often omit vertex normals; derive face normals in the prepass.
 ao.normalMaterial.flatShading=true;
 const override=ao.overrideVisibility.bind(ao);
 ao.overrideVisibility=()=>{override();for(const object of scene.children)if(object.name.startsWith('ROOM26'))object.visible=false;};
 composer.addPass(color);composer.addPass(ao);composer.addPass(output);
 const size=new Vector2();let lastWidth=0,lastHeight=0,lastRatio=0,failed=false;
 function resize(){
  renderer.getSize(size);const ratio=renderer.getPixelRatio();
  if(size.x===lastWidth&&size.y===lastHeight&&ratio===lastRatio)return;
  lastWidth=size.x;lastHeight=size.y;lastRatio=ratio;
  composer.setPixelRatio(ratio);composer.setSize(size.x,size.y);
  // Keep the image sharp; only AO and its normal/depth prepass use a smaller buffer.
  const longest=Math.max(size.x,size.y)*ratio,scale=Math.min(.6,960/Math.max(longest,1));
  ao.setSize(Math.max(1,Math.round(size.x*ratio*scale)),Math.max(1,Math.round(size.y*ratio*scale)));
 }
 return {
  render(planes){
   if(failed){renderer.render(scene,camera);return;}
   try{resize();const material=ao.normalMaterial;if(Boolean(material.clippingPlanes?.length)!==Boolean(planes?.length))material.needsUpdate=true;material.clippingPlanes=planes;const reset=renderer.info.autoReset;renderer.info.autoReset=false;renderer.info.reset();try{composer.render();}finally{renderer.info.autoReset=reset;}}
   catch(error){failed=true;scene.overrideMaterial=null;if(ao._visibilityCache.size)ao.restoreVisibility();renderer.setRenderTarget(null);console.warn('Мягкое затенение недоступно',error);renderer.render(scene,camera);}
  },
  getState:()=>({enabled:!failed,method:'GTAO',width:ao.width,height:ao.height,intensity:ao.blendIntensity,radius:.35}),
  dispose(){for(const pass of [color,ao,output])pass.dispose();ao.gtaoMaterial.dispose();ao.blendMaterial.dispose();composer.dispose();}
 };
}
