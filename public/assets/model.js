import * as THREE from './vendor/three/three.module.js';
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
      for(const point of [a,b,c])vertices.push(point.x,point.y+.15,point.z);
    }
  }
  if(!vertices.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 gridPosition;
      void main(){gridPosition=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`varying vec2 gridPosition;
      void main(){
        vec2 distanceToLine=abs(fract(gridPosition+0.5)-0.5);
        vec2 pixelWidth=max(fwidth(gridPosition),vec2(0.0001));
        vec2 coverage=1.0-smoothstep(vec2(0.005),vec2(0.005)+pixelWidth,distanceToLine);
        float alpha=max(coverage.x,coverage.y);
        if(alpha<0.02)discard;
        gl_FragColor=vec4(0.0,0.0,0.0,alpha*0.7);
      }`
  });
  const overlay=new THREE.Mesh(geometry,material);overlay.name='ROOM26 metric floor grid';overlay.visible=false;
  return overlay;
}
export async function modelView(container, url, options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio((options.preview || options.editor) ? 1 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const width = options.preview ? 1200 : Math.max(container.clientWidth, 1);
  const height = options.preview ? 630 : Math.max(container.clientHeight, 1);
  renderer.setSize(width, height); container.append(renderer.domElement);
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
  let observer, mixer, disposed = false;
  function dispose() {
    if(disposed)return;disposed=true;renderer.setAnimationLoop(null);observer?.disconnect();controls.dispose();draco.dispose();ktx.dispose();
    scene.traverse(o => {o.geometry?.dispose();for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});
    renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
  }
  try {
    const gltf = await loader.loadAsync(url);
    scene.add(gltf.scene);gltf.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(gltf.scene);
    if(box.isEmpty())throw new Error('В модели нет видимой геометрии.');
    const center=box.getCenter(new THREE.Vector3()), size=box.getSize(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, .001);
    const floors=options.floorGrid?floorMeshes(gltf):[];
    let floorGrid=null;
    function setFloorGrid(visible){
      if(disposed)return false;
      if(visible && !floorGrid){floorGrid=makeFloorGrid(floors);if(floorGrid)scene.add(floorGrid);}
      if(floorGrid)floorGrid.visible=Boolean(visible);
      renderer.render(scene,camera);return Boolean(floorGrid?.visible);
    }
    function autoView(w=container.clientWidth,h=container.clientHeight){
      const distance=radius / Math.sin(THREE.MathUtils.degToRad(20)) * Math.max(1,h/Math.max(w,1)) * 1.15;
      return {position:center.clone().add(new THREE.Vector3(1,.65,1.4).normalize().multiplyScalar(distance)).toArray(),target:center.toArray(),fov:40,zoom:1};
    }
    function setView(state){
      state=state||autoView();
      camera.position.fromArray(state.position);controls.target.fromArray(state.target);camera.fov=state.fov||40;camera.zoom=state.zoom||1;
      camera.near=Math.max(radius/10000,.000001);camera.far=Math.max(camera.position.distanceTo(center)+radius*100,radius*1000);camera.updateProjectionMatrix();
      controls.update();renderer.render(scene,camera);
    }
    function getView(){controls.update();return {position:camera.position.toArray(),target:controls.target.toArray(),fov:camera.fov,zoom:camera.zoom};}
    let profile=container.clientWidth<=767?'mobile':'desktop';
    setView(options.view||options.views?.[profile]||autoView(width,height));
    function resize(w=container.clientWidth,h=container.clientHeight){
      if(!w||!h||disposed)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
      const next=w<=767?'mobile':'desktop';
      if(options.views && next!==profile){profile=next;setView(options.views[next]||autoView(w,h));}
      renderer.render(scene,camera);
    }
    if(gltf.animations.length && !options.preview && !options.editor){mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations[0]).play();}
    renderer.render(scene,camera);
    const clock = new THREE.Clock();
    function tick(){mixer?.update(Math.min(clock.getDelta(),.1));controls.update();renderer.render(scene,camera);}
    if(!options.preview){
      observer=new ResizeObserver(()=>resize());observer.observe(container);
      renderer.setAnimationLoop(tick);
    }
    async function capture(w,h){
      const oldSize=renderer.getSize(new THREE.Vector2()),ratio=renderer.getPixelRatio(),aspect=camera.aspect;
      renderer.setAnimationLoop(null);
      try{
        renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);
        return await new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('Не удалось создать превью.')),'image/jpeg',.9));
      }finally{
        renderer.setPixelRatio(ratio);renderer.setSize(oldSize.x,oldSize.y);camera.aspect=aspect;camera.updateProjectionMatrix();renderer.render(scene,camera);if(!options.preview&&!disposed)renderer.setAnimationLoop(tick);
      }
    }
    function zoomBy(factor){camera.position.copy(controls.target.clone().add(camera.position.clone().sub(controls.target).divideScalar(factor)));controls.update();renderer.render(scene,camera);}
    return {canvas:renderer.domElement,dispose,getView,setView,resize,getAutoView:autoView,capture,zoomBy,hasFloorGrid:floors.length>0,setFloorGrid};
  } catch(error) {dispose();throw error;}
}
