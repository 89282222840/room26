import * as THREE from './vendor/three/three.module.js';
import { installEdges } from './edges.js?v=5';
import { applyMirrorEnvironment } from './mirrors.js?v=1';
import { createSectionControl } from './section.js?v=1';
import { adaptiveDepth } from './depth.js?v=1';
import { createTour } from './tour.js?v=12';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from './vendor/three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';
// Match original GLB names before GLTFLoader sanitizes or uniquifies them.
function floorName(name) { return /^пол(?:$|[\s_\-])/iu.test((name || '').trim()); }
function floorMeshes(gltf) {
  const meshes=[];
  gltf.scene.traverse(object=>{
    if(!object.isMesh || object.isSkinnedMesh || object.isInstancedMesh)return;
    let floor=false;
    for(let node=object;node && node!==gltf.scene.parent;node=node.parent){
      const link=gltf.parser.associations.get(node);
      const meshName=link?.meshes!==undefined?gltf.parser.json.meshes[link.meshes]?.name:'';
      const nodeName=link?.nodes!==undefined?gltf.parser.json.nodes[link.nodes]?.name:'';
      if(floorName(meshName)||floorName(nodeName)||floorName(node.name)){floor=true;break;}
    }
    if(floor)meshes.push(object);
  });
  return meshes;
}
function makeFloorGrid(meshes) {
  const vertices=[],a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
  for(const object of meshes){
    const geometry=object.geometry,position=geometry.getAttribute('position'),index=geometry.index;
    if(!position)continue;
    const count=index?index.count:position.count;
    for(let i=0;i+2<count;i+=3){
      a.fromBufferAttribute(position,index?index.getX(i):i).applyMatrix4(object.matrixWorld);
      b.fromBufferAttribute(position,index?index.getX(i+1):i+1).applyMatrix4(object.matrixWorld);
      c.fromBufferAttribute(position,index?index.getX(i+2):i+2).applyMatrix4(object.matrixWorld);
      ab.subVectors(b,a);ac.subVectors(c,a);ab.cross(ac);
      if(ab.lengthSq()<1e-16 || ab.normalize().y<.98)continue;
      for(const point of [a,b,c])vertices.push(point.x,point.y,point.z);
    }
  }
  if(!vertices.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,clipping:true,
    polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,
    uniforms:{pixelRatio:{value:1}},
    vertexShader:`varying vec2 gridPosition;
      #include <clipping_planes_pars_vertex>
      void main(){gridPosition=position.xz;vec4 mvPosition=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mvPosition;
      #include <clipping_planes_vertex>
      }`,
    fragmentShader:`varying vec2 gridPosition;
      uniform float pixelRatio;
      #include <clipping_planes_pars_fragment>
      void main(){
        #include <clipping_planes_fragment>
        vec2 signedDistance=fract(gridPosition+0.5)-0.5;
        vec2 pixelWidth=max(vec2(length(vec2(dFdx(gridPosition.x),dFdy(gridPosition.x))),length(vec2(dFdx(gridPosition.y),dFdy(gridPosition.y)))),vec2(0.000001));
        vec2 pixelDistance=signedDistance/pixelWidth;
        float distanceToLine=abs(pixelDistance.x)<abs(pixelDistance.y)?pixelDistance.x:pixelDistance.y;
        float alpha=clamp(pixelRatio+0.5-abs(distanceToLine),0.0,1.0);
        if(alpha<0.02)discard;
        float white=1.0-smoothstep(-0.5,0.5,distanceToLine);
        gl_FragColor=vec4(vec3(white),alpha*0.7);
      }`
  });
  const overlay=new THREE.Mesh(geometry,material);overlay.name='ROOM26 metric floor grid';overlay.renderOrder=2;overlay.visible=false;
  return overlay;
}
export async function modelView(container, url, options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio((options.preview || options.editor) ? 1 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const width = options.preview ? 1200 : Math.max(container.clientWidth, 1);
  const height = options.preview ? 630 : Math.max(container.clientHeight, 1);
  renderer.setSize(width, height); container.append(renderer.domElement);renderer.domElement.tabIndex=0;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce2e8');
  const camera = new THREE.PerspectiveCamera(40, width / height, .01, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x788698, 3));
  for (const [x,y,z,power] of [[3,5,4,3],[-3,2,-2,2]]) { const light = new THREE.DirectionalLight(0xffffff,power);light.position.set(x,y,z);scene.add(light); }
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = !options.editor;
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((value) => {
    if (value.startsWith('blob:') || value.startsWith('data:')) return value;
    const parsed = new URL(value, location.href);
    if (parsed.origin !== location.origin) throw new Error('Модель должна содержать текстуры и геометрию внутри GLB.');
    return parsed.href;
  });
  const draco = new DRACOLoader(manager).setDecoderPath('/assets/vendor/three/addons/libs/draco/gltf/').setDecoderConfig({type:'js'});
  const ktx = new KTX2Loader(manager).setTranscoderPath('/assets/vendor/three/addons/libs/basis/').detectSupport(renderer);
  const loader = new GLTFLoader(manager).setDRACOLoader(draco).setKTX2Loader(ktx).setMeshoptDecoder(MeshoptDecoder);
  let observer, mixer, edges, navigation=null, mirrors=null, section=null, mirrorError=false, tour=null, cutHeight=Infinity, frame=0, capturing=false, interactionPaused=false, renderedFrames=0, disposed = false;
  function dispose() {
    if(disposed)return;disposed=true;cancelAnimationFrame(frame);frame=0;observer?.disconnect();section?.dispose();tour?.dispose();navigation?.dispose();controls.dispose();draco.dispose();ktx.dispose();edges?.dispose();
    scene.traverse(o => {o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){for(const v of Object.values(m))if(v?.isTexture&&v!==mirrors?.texture)v.dispose();m.dispose();}});
    mirrors?.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  try {
    const gltf = await loader.loadAsync(url);
    scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);
    try{mirrors=await applyMirrorEnvironment(gltf,renderer,manager);}catch(error){mirrorError=true;console.warn("Не удалось загрузить HDR для зеркал",error);}
    // Separate coplanar surface depth from its outline without moving geometry.
    gltf.scene.traverse(object=>{if(object.isMesh)for(const material of(Array.isArray(object.material)?object.material:[object.material])){
      if(material&&!material.polygonOffset){material.polygonOffset=true;material.polygonOffsetFactor=1;material.polygonOffsetUnits=1;}
    }});
    const box = new THREE.Box3().setFromObject(gltf.scene);
    if(box.isEmpty())throw new Error('В модели нет видимой геометрии.');
    const center=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, .001);
    const floors=options.floorGrid?floorMeshes(gltf):[];
    const depthBoxes=[];
    gltf.scene.traverse(object=>{
      if(!object.isMesh)return;
      if(object.isInstancedMesh){object.computeBoundingBox();depthBoxes.push(object.boundingBox.clone().applyMatrix4(object.matrixWorld));}
      else{if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();depthBoxes.push(object.geometry.boundingBox.clone().applyMatrix4(object.matrixWorld));}
    });
    const updateDepth=adaptiveDepth(box,depthBoxes,radius,{animated:gltf.animations.length>0,floorGrid:floors.length>0});
    let floorGrid=null;
    let cachedEdges=null;
    if(options.edgeCacheURL){try{const response=await fetch(options.edgeCacheURL);if(response.ok){cachedEdges=await response.arrayBuffer();const bytes=new Uint8Array(cachedEdges);if(bytes[0]===31&&bytes[1]===139){cachedEdges=await new Response(new Blob([cachedEdges]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}}}catch(error){/* Original GLB remains usable without a sidecar. */}}
    if(disposed)throw Error('Просмотрщик закрыт.');
    edges=installEdges(gltf,scene,cachedEdges);scene.updateMatrixWorld(true);
    function render(){
      if(disposed)return;
      if(section){const height=section.sync(Boolean(tour?.locked));if(height!==cutHeight)applyCutHeight(height);}
      if(defaultOverviewFov&&!tour?.locked){const fov=defaultFov(camera.aspect,1);if(Math.abs(camera.fov-fov)>1e-8){camera.fov=fov;camera.updateProjectionMatrix();}}
      if(options.adaptiveDepth!==false)updateDepth(camera);
      if(tour?.locked&&camera.near<.01){camera.near=.01;camera.updateProjectionMatrix();}
      if(mixer)scene.updateMatrixWorld(true);
      edges.update(camera,renderer.getSize(new THREE.Vector2()).y);
      if(floorGrid)floorGrid.material.uniforms.pixelRatio.value=renderer.getPixelRatio();
      tour?.beforeRender();renderer.render(scene,camera);renderedFrames++;
    }
    function setFloorGrid(visible){
      if(disposed)return false;
      if(visible && !floorGrid){floorGrid=makeFloorGrid(floors);if(floorGrid)scene.add(floorGrid);}
      if(floorGrid){floorGrid.visible=Boolean(visible);applyCutHeight(cutHeight);}
      render();return Boolean(floorGrid?.visible);
    }
    const defaultFov=(w,h)=>THREE.MathUtils.radToDeg(2*Math.atan(1/Math.sqrt(1+(w/Math.max(h,1))**2)));
    let defaultOverviewFov=false;
    function autoView(w=container.clientWidth,h=container.clientHeight){
      const fov=defaultFov(w,h),aspect=w/Math.max(h,1),halfVertical=THREE.MathUtils.degToRad(fov/2);
      const halfAngle=Math.min(halfVertical,Math.atan(Math.tan(halfVertical)*aspect));
      const distance=radius/Math.sin(halfAngle)*1.15;
      return {position:center.clone().add(new THREE.Vector3(1,.65,1.4).normalize().multiplyScalar(distance)).toArray(),target:center.toArray(),fov,diagonalFov:90,zoom:1};
    }
    function setView(state){
      state=state||autoView();defaultOverviewFov=state.diagonalFov===90||!state.fov;
      camera.position.fromArray(state.position);controls.target.fromArray(state.target);camera.fov=defaultOverviewFov?defaultFov(container.clientWidth,container.clientHeight):state.fov;camera.zoom=state.zoom||1;
      camera.near=Math.max(radius/10000,.000001);camera.far=Math.max(camera.position.distanceTo(center)+radius*100,radius*1000);camera.updateProjectionMatrix();
      controls.update();render();
    }
    function getView(){if(!tour?.locked)controls.update();return {position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,zoom:camera.zoom};}
    let profile=container.clientWidth<=767?'mobile':'desktop';
    setView(options.view||options.views?.[profile]||autoView(width,height));
    function resize(w=container.clientWidth,h=container.clientHeight){
      if(!w||!h||disposed)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
      const next=w<=767?'mobile':'desktop';
      if(options.views && next!==profile){profile=next;if(!tour?.locked)setView(options.views[next]||autoView(w,h));}
      render();
    }
    if(gltf.animations.length && !options.preview && !options.editor){mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations[0]).play();}
    const clock = new THREE.Clock();
    function requestRender(){if(disposed||capturing||interactionPaused||options.preview||frame)return;frame=requestAnimationFrame(tick);}
    function tick(){
      frame=0;if(disposed||capturing||interactionPaused)return;
      mixer?.update(Math.min(clock.getDelta(),.1));
      const moving=tour?.update(performance.now())||false;
      const changed=tour?.locked?false:controls.update();render();
      if(mixer||changed||moving)requestRender();
    }
    controls.addEventListener('change',requestRender);
    function applyCutHeight(height){
      cutHeight=Number.isFinite(height)?height:Infinity;renderer.localClippingEnabled=Number.isFinite(cutHeight);
      const planes=Number.isFinite(cutHeight)?[new THREE.Plane(new THREE.Vector3(0,-1,0),cutHeight)]:null;
      scene.traverse(object=>{if(object.name.startsWith('ROOM26 tour')||object.isLine&&Array.isArray(object.userData.link))return;for(const material of(Array.isArray(object.material)?object.material:[object.material]))if(material){const changed=(material.clippingPlanes?.length||0)!==(planes?.length||0);material.clippingPlanes=planes;if(changed)material.needsUpdate=true;}});
    }
    function setCutHeight(height){applyCutHeight(height);render();}
    if(!options.preview&&(options.tourEditor||options.tour?.points?.length)){
      if(!options.tourEditor){const {createWalkNavigation}=await import('./walk-navigation.js?v=3');try{navigation=await createWalkNavigation(gltf);}catch(error){console.warn('Не удалось подготовить прогулку',error);}if(disposed){navigation?.dispose();throw Error('Просмотрщик закрыт.');}}
      tour=createTour({container,scene,model:gltf.scene,navigation,camera,controls,renderer,data:options.tour,editor:Boolean(options.tourEditor),getView,requestRender,radius,getCutHeight:()=>cutHeight,onChange:options.onTourChange,onState:options.onTourState});
    }
    if(!options.preview&&!options.editor)section=createSectionControl(container,{min:box.min.toArray(),max:box.max.toArray()},requestRender);
    if(!options.preview){
      observer=new ResizeObserver(()=>resize());observer.observe(container);
      requestRender();
    }
    async function capture(w,h){
      const oldSize=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio(),aspect=camera.aspect;
      capturing=true;cancelAnimationFrame(frame);frame=0;
      try{
        renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();
        return await new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать превью.')),'image/jpeg',.9));
      }finally{
        renderer.setPixelRatio(ratio);renderer.setSize(oldSize.x,oldSize.y);camera.aspect=aspect;camera.updateProjectionMatrix();render();capturing=false;requestRender();
      }
    }
    let savedInteraction=null;
    function setInteractionPaused(paused){
      if(disposed||interactionPaused===Boolean(paused))return;
      interactionPaused=Boolean(paused);tour?.setPaused(interactionPaused);
      if(interactionPaused){savedInteraction={enabled:controls.enabled,damping:controls.enableDamping};controls.enabled=false;controls.enableDamping=false;controls.update();cancelAnimationFrame(frame);frame=0;render();}
      else{controls.enabled=savedInteraction?.enabled??true;controls.enableDamping=savedInteraction?.damping??true;savedInteraction=null;requestRender();}
    }
    function zoomBy(factor){camera.position.copy(controls.target.clone().add(camera.position.clone().sub(controls.target).divideScalar(factor)));controls.update();render();}
    return {canvas:renderer.domElement,dispose,setInteractionPaused,getView,setView,resize,getAutoView:autoView,capture,zoomBy,hasFloorGrid:floors.length>0,setFloorGrid,tour,setCutHeight,getSectionState:()=>section?.getState()||null,getBounds:()=>({min:box.min.toArray(),max:box.max.toArray()}),getEdgeCache:async()=>{const blob=edges.exportCache();return typeof CompressionStream==='function'?new Response(blob.stream().pipeThrough(new CompressionStream('gzip'))).blob():blob;},getDiagnostics:()=>({...edges.stats,mirrors:mirrors?.count||0,mirrorReady:mirrors?.ready||false,mirrorError,walkNavigation:navigation?.stats||null,cutHeight,renderedFrames,drawCalls:renderer.info.render.calls,renderedLines:renderer.info.render.lines,near:camera.near,far:camera.far,reverseDepth:Boolean(renderer.capabilities.reverseDepthBuffer)})};
  } catch(error) {dispose();throw error;}
}
