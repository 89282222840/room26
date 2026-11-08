import * as THREE from './vendor/three/three.module.js';
import { OrbitControls } from './vendor/three/addons/controls/OrbitControls.js';
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from './vendor/three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from './vendor/three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from './vendor/three/addons/libs/meshopt_decoder.module.js';
export async function modelView(container, url, options = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(options.preview ? 1 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const width = options.preview ? 1200 : Math.max(container.clientWidth, 1);
  const height = options.preview ? 630 : Math.max(container.clientHeight, 1);
  renderer.setSize(width, height); container.append(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#dce2e8');
  const camera = new THREE.PerspectiveCamera(40, width / height, .01, 10000);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x788698, 3));
  for (const [x,y,z,power] of [[3,5,4,3],[-3,2,-2,2]]) { const light = new THREE.DirectionalLight(0xffffff,power);light.position.set(x,y,z);scene.add(light); }
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
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
    const distance=radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.max(1,1/camera.aspect) * 1.15;
    camera.near=Math.max(radius/10000,.000001);camera.far=distance+radius*100;camera.updateProjectionMatrix();
    camera.position.copy(center).add(new THREE.Vector3(1,.65,1.4).normalize().multiplyScalar(distance));controls.target.copy(center);controls.update();
    if(gltf.animations.length && !options.preview){mixer=new THREE.AnimationMixer(gltf.scene);mixer.clipAction(gltf.animations[0]).play();}
    renderer.render(scene,camera);
    const clock = new THREE.Clock();
    if(!options.preview){
      observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});observer.observe(container);
      renderer.setAnimationLoop(()=>{mixer?.update(Math.min(clock.getDelta(),.1));controls.update();renderer.render(scene,camera);});
    }
    return {canvas:renderer.domElement,dispose};
  } catch(error) {dispose();throw error;}
}
