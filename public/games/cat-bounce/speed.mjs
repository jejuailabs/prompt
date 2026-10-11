export const MIN_SPEED=1,MAX_SPEED=2;
export function normalizeSpeed(value){const n=Number(value);return Number.isFinite(n)?Math.max(MIN_SPEED,Math.min(MAX_SPEED,n)):MIN_SPEED;}
export function levelTempo(level){return 1+Math.min(.8,Math.max(0,Number(level)||0)*.025);}
export function towerBaseSpeed(floors){return 2+Math.min(2.5,Math.max(0,Number(floors)||0)*.07);}
export function mountSpeedControl(rt){
 let multiplier=normalizeSpeed(rt.read('speed',1));rt.write('speed',multiplier);
 const root=document.createElement('label');root.className='cat-speed';root.dataset.catSpeed='';root.innerHTML='<span>진행 속도 <output></output></span><input type="range" min="1" max="2" step="0.05" aria-label="진행 속도 배율"><small>기본 이상만 가능</small>';rt.root.append(root);
 const input=root.querySelector('input'),output=root.querySelector('output');const update=()=>{input.value=String(multiplier);output.textContent=multiplier.toFixed(2)+'×';};update();
 rt.on(input,'input',()=>{multiplier=normalizeSpeed(input.value);rt.write('speed',multiplier);update();});
 rt.on(root,'pointerdown',e=>e.stopPropagation());rt.on(root,'keydown',e=>e.stopPropagation());
 return {get multiplier(){return normalizeSpeed(multiplier);},effective:base=>Math.max(0,base)*normalizeSpeed(multiplier),dispose:()=>root.remove()};
}
