export function createSectionControl(container,bounds,requestRender){
 const root=document.createElement('div');root.className='model-section-control';
 const track=document.createElement('div');track.className='model-section-track';track.setAttribute('aria-hidden','true');
 const input=document.createElement('input');input.type='range';input.min='0';input.max='1000';input.step='1';input.value='1000';input.className='model-section-range';input.setAttribute('aria-label','Высота сечения модели');input.setAttribute('orient','vertical');input.title='Сечение модели';
 root.append(track,input);container.append(root);let value=1000,suspended=false;
 const min=bounds.min[1],max=bounds.max[1],epsilon=Math.max((max-min)*.00001,.00001);
 function height(){return suspended||value===1000?Infinity:min-epsilon+(max-min+epsilon)*value/1000;}
 function refresh(){const active=value<1000;root.classList.toggle('is-active',active);root.style.setProperty('--section-level',value/10+'%');input.setAttribute('aria-valuetext',active?height().toFixed(2)+' м':'Сечение выключено');}
 function change(){value=Math.max(0,Math.min(1000,Number(input.value)));refresh();requestRender();}
 input.addEventListener('input',change);input.addEventListener('keydown',event=>event.stopPropagation());root.addEventListener('pointerdown',event=>event.stopPropagation());root.addEventListener('wheel',event=>event.stopPropagation());refresh();
 return {sync(walking){suspended=Boolean(walking);root.hidden=suspended;return height();},getState:()=>({value,active:value<1000,suspended,height:height()}),dispose(){input.removeEventListener('input',change);root.remove();}};
}
