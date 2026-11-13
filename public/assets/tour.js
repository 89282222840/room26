import * as THREE from './vendor/three/three.module.js';
import {createWalkController} from './walk-controller.js?v=6';
const MARKER_HEIGHT=0,EYE_HEIGHT=1.6,DEFAULT_DIAGONAL=120,MAX_DIAGONAL=120;
const copy=value=>JSON.parse(JSON.stringify(value));
export function createTour({container,scene,model,camera,controls,renderer,data,editor=false,getView,requestRender,radius,navigation=null,getCutHeight=()=>Infinity,onChange=()=>{},onState=()=>{}}){
 const verticalFov=diagonal=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(diagonal/2))/Math.sqrt(1+camera.aspect*camera.aspect)));
 const diagonalFov=vertical=>THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(vertical/2))*Math.sqrt(1+camera.aspect*camera.aspect)));
 let hovered=null,pendingHover=null;
 let walkDiagonal=DEFAULT_DIAGONAL;
 let points=copy(data?.points||[]),links=copy(data?.links||[]),mode='overview',editMode='select',selected=null,selectedLink=null,anchor=null,current=null,transition=null,overview=null,yaw=0,pitch=0,exitPressure=0,disposed=false;
 const group=new THREE.Group();group.name='ROOM26 tour';scene.add(group);
 const markers=new Map();let walker=null;
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),normal=new THREE.Vector3(),direction=new THREE.Vector3(),pointers=new Map();
 const surfaces=[];model.traverse(o=>{if(o.isMesh)surfaces.push(o);});
 const overlay=document.createElement('div');overlay.className='tour-overlay';
 const shade=document.createElement('div');shade.className='tour-shade';shade.hidden=true;overlay.append(shade);
 const returnButton=document.createElement('button');returnButton.type='button';returnButton.className='secondary tour-return';returnButton.textContent='Обзор модели';returnButton.hidden=true;overlay.append(returnButton);
 const keyboardPoints=document.createElement('div');keyboardPoints.className='tour-keyboard-points';overlay.append(keyboardPoints);
 container.append(overlay);
 const circle=new THREE.PlaneGeometry(.3,.3);
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,uniforms:{pixelRatio:{value:renderer.getPixelRatio()},selected:{value:0},hovered:{value:0}},vertexShader:'varying vec2 markerUV;void main(){markerUV=uv*2.0-1.0;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:`varying vec2 markerUV;uniform float pixelRatio;uniform float selected;uniform float hovered;
 void main(){float d=length(markerUV);float pixel=max(length(vec2(dFdx(d),dFdy(d))),0.0001);float coverage=1.0-smoothstep(1.0-pixel*.5,1.0+pixel*.5,d);if(coverage<.01)discard;float ring=smoothstep(1.0-pixel*(2.0*pixelRatio+1.0),1.0-pixel*2.0*pixelRatio,d);vec3 color=mix(vec3(0.0),mix(vec3(1.0,.85,0.0),vec3(1.0),selected),ring);float alpha=mix(mix(.3,1.0,hovered),1.0,ring)*coverage;gl_FragColor=vec4(color,alpha);}`});
 function point(id){return points.find(p=>p.id===id);}
 function base(p){return new THREE.Vector3().fromArray(p.position);}
 function eye(p){return base(p).add(new THREE.Vector3(0,MARKER_HEIGHT+EYE_HEIGHT,0));}
 function edgeKey(a,b){return [a,b].sort().join('/');}
 function neighbors(id){return links.flatMap(([a,b])=>a===id?[b]:b===id?[a]:[]);}
 function state(){return {mode,current,selected,selectedLink:null,points:points.length,links:links.length,editing:editMode,transitioning:Boolean(transition)};}
 function emit(changed=false){onState(state());if(changed)onChange(getData());requestRender();}
 function getData(){return copy({points,links});}
 function rebuild(){
  for(const object of markers.values()){object.material.dispose();group.remove(object);}markers.clear();
  keyboardPoints.replaceChildren();
  points.forEach((p,index)=>{const marker=new THREE.Mesh(circle,material.clone());marker.name='ROOM26 tour point';marker.userData.point=p.id;marker.rotation.x=-Math.PI/2;marker.position.copy(base(p)).y+=MARKER_HEIGHT;marker.renderOrder=4;group.add(marker);markers.set(p.id,marker);
   if(!editor){const button=document.createElement('button');button.type='button';button.className='tour-keyboard-point';button.textContent=`Войти в тур: точка ${index+1}`;button.onclick=()=>enter(p.id);keyboardPoints.append(button);}
  });
  emit();
 }
 function surface(clientX,clientY){setRay(clientX,clientY);for(const hit of ray.intersectObjects(surfaces,false)){if(hit.point.y>getCutHeight()+.0001||!hit.face)continue;normal.copy(hit.face.normal).applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld));if(normal.y>.7)return hit;}return null;}
 function setRay(x,y){const rect=renderer.domElement.getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,-(y-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);}
 function markerAt(x,y){
  setRay(x,y);const hits=[],position=new THREE.Vector3(),plane=new THREE.Plane(),hitRadius=editor ? .15 : .3;
  for(const [id,marker]of markers){if(!marker.visible)continue;plane.set(new THREE.Vector3(0,1,0),-marker.position.y);const hit=ray.ray.intersectPlane(plane,position);if(!hit)continue;const offset=(position.x-marker.position.x)**2+(position.z-marker.position.z)**2;if(offset<=hitRadius*hitRadius)hits.push({id,distance:ray.ray.origin.distanceTo(position),offset});}
  if(!hits.length)return null;hits.sort((a,b)=>a.distance-b.distance||a.offset-b.offset);
  const blockers=ray.intersectObjects(surfaces,false).filter(h=>{const m=Array.isArray(h.object.material)?h.object.material[h.face?.materialIndex||0]:h.object.material;return h.point.y<=getCutHeight()+.001&&m?.depthWrite!==false&&m?.opacity!==0;});
  return hits.find(hit=>!blockers.some(h=>h.distance<hit.distance-.002))?.id||null;
 }
 function clearHover(){pendingHover=null;if(hovered!==null){hovered=null;requestRender();}renderer.domElement.style.cursor='';}

 function focus(){ray.setFromCamera(new THREE.Vector2(0,0),camera);const hit=ray.intersectObjects(surfaces,false).find(h=>h.point.y<=getCutHeight()+.001&&h.distance>.15);return hit?.point.clone()||camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(Math.max(2,radius*.4)));}
 function readAngles(){camera.getWorldDirection(direction);yaw=Math.atan2(-direction.x,-direction.z);pitch=Math.asin(THREE.MathUtils.clamp(direction.y,-1,1));}
 function look(){pitch=THREE.MathUtils.clamp(pitch,-Math.PI*.472,Math.PI*.472);camera.rotation.set(pitch,yaw,0,'YXZ');camera.updateMatrixWorld(true);controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()));}
 function begin({position,target=null,orientation=null,fov=camera.getEffectiveFOV(),zoom=1,done}){
  clearHover();pointers.clear();pinchDistance=0;press=null;controls.enabled=false;transition={start:performance.now(),duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:850,from:camera.position.clone(),to:position.clone(),fromQuaternion:camera.quaternion.clone(),levelEntry:mode==='enter'&&!target,entryPitch:Math.asin(THREE.MathUtils.clamp(camera.getWorldDirection(new THREE.Vector3()).y,-1,1)),entryYaw:new THREE.Euler().setFromQuaternion(orientation||camera.quaternion,'YXZ').y,target:target?.clone()||null,orientation:orientation?.clone()||null,fromFov:camera.getEffectiveFOV(),fromDiagonal:diagonalFov(camera.getEffectiveFOV()),toDiagonal:mode==='enter'?DEFAULT_DIAGONAL:mode==='move'?walkDiagonal:null,dim:mode!=='move',fov,finalFov:fov,zoom,done};
  if(target){const dummy=new THREE.PerspectiveCamera();dummy.position.copy(position);dummy.lookAt(target);transition.orientation=dummy.quaternion.clone();}
  shade.hidden=!transition.dim;emit();
 }
 function enter(id){if(editor||transition||!point(id))return false;if(!navigation){walker?.notify('Не удалось подготовить прогулку. Перезагрузите страницу.');return false;}
  if(mode==='walk')return move(id);
  const spawn=navigation.stand(base(point(id)));if(!spawn){walker?.notify('В этой точке недостаточно места для прогулки.');return false;}
  controls.enableDamping=false;controls.update();overview={...getView(),effectiveFov:camera.getEffectiveFOV(),damping:true};
  const right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion),heading=Math.atan2(-right.z,right.x),orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,heading,0,'YXZ')),destination=spawn.clone().add(new THREE.Vector3(0,EYE_HEIGHT,0));
  walkDiagonal=DEFAULT_DIAGONAL;mode='enter';current=id;returnButton.hidden=false;keyboardPoints.hidden=true;
  begin({position:destination,orientation,done(){mode='walk';readAngles();look();walker?.start(spawn);renderer.domElement.focus({preventScroll:true});emit();}});return true;
 }
 function move(id){return mode==='walk'&&!transition&&point(id)?walker?.goTo(base(point(id)))||false:false;}
 function exit(){if(editor||transition||mode!=='walk')return false;
  const target=focus(),saved=overview||getView(),oldOffset=new THREE.Vector3().fromArray(saved.position).sub(new THREE.Vector3().fromArray(saved.target)),viewDirection=camera.getWorldDirection(new THREE.Vector3()),back=new THREE.Vector3(-viewDirection.x,0,-viewDirection.z);
  if(back.lengthSq()<1e-6)back.set(oldOffset.x,0,oldOffset.z);if(back.lengthSq()<1e-6)back.set(1,0,1);back.normalize();
  const distance=Math.max(oldOffset.length(),radius*1.8,camera.position.distanceTo(target)*1.5),elevation=THREE.MathUtils.clamp(Math.asin(oldOffset.y/Math.max(oldOffset.length(),.001)),THREE.MathUtils.degToRad(25),THREE.MathUtils.degToRad(75)),destination=target.clone().addScaledVector(back,distance*Math.cos(elevation));destination.y+=distance*Math.sin(elevation);
  walker?.stop();mode='exit';begin({position:destination,target,fov:saved.effectiveFov||saved.fov,done(){camera.fov=saved.fov;camera.zoom=saved.zoom||1;camera.updateProjectionMatrix();controls.target.copy(target);controls.enableDamping=true;controls.enabled=true;controls.update();mode='overview';current=null;overview=null;exitPressure=0;returnButton.hidden=true;keyboardPoints.hidden=false;renderer.domElement.focus({preventScroll:true});emit();}});return true;
 }
 function update(now){if(!transition)return mode==='walk'?walker?.update(now)||false:false;const t=transition.duration?Math.min(1,(now-transition.start)/transition.duration):1,k=t*t*(3-2*t),job=transition;camera.position.lerpVectors(job.from,job.to,k);camera.zoom=1;camera.fov=job.toDiagonal===null?THREE.MathUtils.lerp(job.fromFov,job.fov,k):verticalFov(THREE.MathUtils.lerp(job.fromDiagonal,job.toDiagonal,k));camera.updateProjectionMatrix();
  if(job.target){if(camera.position.distanceToSquared(job.target)>.0001)camera.lookAt(job.target);}else if(job.levelEntry)camera.rotation.set(THREE.MathUtils.lerp(job.entryPitch,0,k),job.entryYaw,0,'YXZ');else camera.quaternion.copy(job.orientation||job.fromQuaternion);
  shade.style.opacity=job.dim?String(Math.sin(Math.PI*t)*.38):'0';camera.updateMatrixWorld(true);
  if(t>=1){transition=null;shade.hidden=true;job.done();return false;}return true;
 }
 function beforeRender(){
  if(pendingHover){const position=pendingHover;pendingHover=null;hovered=markerAt(position.x,position.y);renderer.domElement.style.cursor=hovered?'pointer':'';}
  for(const [id,marker]of markers){marker.visible=(editor||mode==='overview')&&(editor?point(id).position[1]:marker.position.y)<=getCutHeight()+.001;marker.material.uniforms.pixelRatio.value=renderer.getPixelRatio();marker.material.uniforms.selected.value=Number(id===selected);marker.material.uniforms.hovered.value=Number(id===hovered);}
  returnButton.disabled=Boolean(transition);
  container.classList.toggle('tour-walking',mode!=='overview');
  if(mode==='walk'){
   const fov=verticalFov(walkDiagonal);if(Math.abs(camera.fov-fov)>1e-8||camera.zoom!==1){camera.fov=fov;camera.zoom=1;camera.updateProjectionMatrix();}

  }
 }
 function addPoint(position){if(!editor||points.length>=500)return false;const id=Array.from(crypto.getRandomValues(new Uint8Array(3)),n=>n.toString(16).padStart(2,'0')).join('');if(point(id))return addPoint(position);points.push({id,position:position.slice()});selected=id;selectedLink=null;rebuild();renderer.domElement.focus({preventScroll:true});emit(true);return id;}
 function select(id){selected=point(id)?id:null;selectedLink=null;emit();}
 function deleteSelected(){if(!editor)return;if(selected){points=points.filter(p=>p.id!==selected);links=links.filter(([a,b])=>a!==selected&&b!==selected);selected=null;anchor=null;}else if(selectedLink){const key=edgeKey(...selectedLink);links=links.filter(edge=>edgeKey(...edge)!==key);selectedLink=null;}else return;rebuild();emit(true);}
 function setMode(value){if(!editor)return;editMode=['add','select'].includes(value)?value:'select';anchor=null;selectedLink=null;emit();}
 let press=null,pinchDistance=0;
 function stop(event){event.preventDefault();event.stopImmediatePropagation();}
 function down(event){if(mode==='walk')return;if(transition){stop(event);return;}const id=markerAt(event.clientX,event.clientY);
  if(editor&&id){renderer.domElement.focus({preventScroll:true});selected=id;selectedLink=null;emit();}
  if(editor||id){press={x:event.clientX,y:event.clientY,id,drag:false,pointer:event.pointerId};if(id||editor&&editMode==='add'){stop(event);renderer.domElement.setPointerCapture(event.pointerId);}}
 }
 function zoom(delta){if(mode!=='walk'||transition)return;const old=walkDiagonal;walkDiagonal=THREE.MathUtils.clamp(old+delta*.04,40,MAX_DIAGONAL);camera.fov=verticalFov(walkDiagonal);camera.zoom=1;camera.updateProjectionMatrix();if(delta>0&&old>=MAX_DIAGONAL-.01){exitPressure+=delta;if(exitPressure>=100)exit();}else exitPressure=0;emit();}
 function motion(event){if(mode==='walk')return;
  if(!editor&&mode==='overview'&&!transition&&event.pointerType!=='touch'){if(event.buttons){clearHover();}else{pendingHover={x:event.clientX,y:event.clientY};requestRender();}}
  if(editor&&press?.id&&event.pointerId===press.pointer){if(Math.hypot(event.clientX-press.x,event.clientY-press.y)>6)press.drag=true;if(press.drag){stop(event);const hit=surface(event.clientX,event.clientY);if(hit){point(press.id).position=hit.point.toArray();rebuild();emit(true);}}}
 }
 function up(event){if(mode==='walk')return;if(!press||press.pointer!==event.pointerId)return;const stored=press;press=null;if(stored.drag||Math.hypot(event.clientX-stored.x,event.clientY-stored.y)>8)return;
  if(editor){const id=stored.id||markerAt(event.clientX,event.clientY);if(id){stop(event);selected=id;selectedLink=null;emit();}
   else if(editMode==='add'){stop(event);const hit=surface(event.clientX,event.clientY);if(hit)addPoint(hit.point.toArray());else onState({...state(),message:'Нажмите на горизонтальную поверхность пола.'});}
   else{selected=null;emit();}
  }else if(stored.id){stop(event);enter(stored.id);}
 }
 function cancel(event){pointers.delete(event.pointerId);pinchDistance=0;press=null;}
 function wheel(event){if(mode==='walk')return;if(transition){stop(event);if(!transition)zoom(event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?container.clientHeight:1));}}
 function key(event){if(editor&&(event.key==='Delete'||event.key==='Backspace')&&!/INPUT|TEXTAREA/.test(event.target.tagName)){event.preventDefault();deleteSelected();}}
 const canvas=renderer.domElement;canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',motion,true);canvas.addEventListener('pointerup',up,true);canvas.addEventListener('pointercancel',cancel,true);canvas.addEventListener('pointerleave',clearHover,true);canvas.addEventListener('wheel',wheel,{capture:true,passive:false});container.addEventListener('keydown',key,true);returnButton.onclick=exit;
 let returnPress=null;
 returnButton.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')returnPress={id:event.pointerId,x:event.clientX,y:event.clientY};});
 returnButton.addEventListener('pointerup',event=>{const press=returnPress;returnPress=null;if(event.pointerType==='touch'&&press?.id===event.pointerId&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<8&&!returnButton.disabled){event.preventDefault();event.stopPropagation();exit();}});
 returnButton.addEventListener('pointercancel',()=>{returnPress=null;});
 if(!editor)walker=createWalkController({container,overlay,scene,camera,controls,canvas,navigation,requestRender,onZoom:zoom,onExit:exit});
 rebuild();
 function dispose(){if(disposed)return;disposed=true;walker?.dispose();pointers.clear();transition=null;canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',motion,true);canvas.removeEventListener('pointerup',up,true);canvas.removeEventListener('pointercancel',cancel,true);canvas.removeEventListener('pointerleave',clearHover,true);canvas.removeEventListener('wheel',wheel,true);container.removeEventListener('keydown',key,true);overlay.remove();container.classList.remove('tour-walking');scene.remove(group);for(const marker of markers.values())marker.material.dispose();circle.dispose();material.dispose();}
 return {enter,exit,move,update,beforeRender,dispose,getData,getState:state,getFocusPoint:()=>focus().toArray(),pickFloor:(x,y)=>surface(x,y)?.point.toArray()||null,walk:walker,setPaused:value=>walker?.setPaused(value),addPoint,select,deleteSelected,setMode,get locked(){return mode!=='overview';},get hasPoints(){return points.length>0;}};
}
