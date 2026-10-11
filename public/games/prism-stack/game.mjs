import {GameRuntime,random,lerp} from './runtime.mjs';
import {THREE,rendererFor,lights,studioEnvironment,resize,disposeObject,finalDispose} from './scene.mjs';
import {cutStack} from './rules.mjs';
import {CAT_THICKNESS,createCat,settleCat,animateCat,celebrateCat,catSummary,disposeCats} from './cats.mjs';
import {createFinale,stepFinale,finaleSummary} from './finale.mjs';
import {BREEDS,breedForFloor,nextBreed} from './breeds.mjs';
import {mountSpeedControl,towerBaseSpeed} from './speed.mjs';
const rt=new GameRuntime({id:'prism-stack',title:'Prism Stack',category:'THE ART OF TIMING',theme:'',scoreLabel:'FLOORS',metricLabel:'PERFECT STREAK',eyebrow:'ONE MORE LOAF. ONE MORE PURR.',subtitle:'통통 냥이, 포개서 골골골.',description:'두툼하고 포근한 식빵 고양이를 차곡차곡 포개요.\n정중앙이면 기분 좋은 골골골! 한 판이 끝나면\n다 같이 야호! 높이 쌓을수록 더 긴 다이빙이 기다려요.',hint:'탭 · 클릭 · 스페이스로 고양이 놓기<br>가로와 깊이, 두 방향의 타이밍',version:'1.3.0'});
try{
 const renderer=rendererFor(rt,{exposure:.83}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,200);
 const env=studioEnvironment(renderer);scene.environment=env.texture;const sun=lights(scene,{intensity:1.55});
 const world=new THREE.Group();scene.add(world);const stage=new THREE.Group();scene.add(stage);
 const baseMat=new THREE.MeshStandardMaterial({color:0xf3f1ef,metalness:.13,roughness:.42});
 for(const [r,h,y]of[[3.2,.26,-.4],[2.8,.22,-.16],[2.52,.16,.03]]){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.07,h,72),baseMat);m.position.y=y;m.receiveShadow=true;m.castShadow=true;stage.add(m);}
 const line=new THREE.Mesh(new THREE.TorusGeometry(2.85,.016,8,100),new THREE.MeshBasicMaterial({color:0xc5b6d3}));line.rotation.x=Math.PI/2;line.position.y=-.02;stage.add(line);
 const ground=new THREE.Mesh(new THREE.CircleGeometry(9.5,72),new THREE.MeshStandardMaterial({color:0xf1ebf4,roughness:1,transparent:true,opacity:.76}));ground.rotation.x=-Math.PI/2;ground.position.y=-.59;ground.receiveShadow=true;ground.visible=false;scene.add(ground);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.16}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.58;scene.add(shadow);
 const rng=random(rt.seed),glints=[];for(let i=0;i<25;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.018+rng()*.025),new THREE.MeshBasicMaterial({color:i%2?0xffffff:0xbdb0d2,transparent:true,opacity:.5}));s.position.set((rng()-.5)*16,rng()*14-1,(rng()-.5)*12);scene.add(s);glints.push(s);}
 let blocks=[],moving=null,axis='x',height=0,streak=0,maxStreak=0,score=0,falling=[],time=0,targetY=1.1,viewY=1.1,finale=null,divers=[],baseSpan=12.4,viewSpan=12.4;
 const thickness=CAT_THICKNESS,baseY=thickness/2+.12;
 function block(data,n,y,fragment=false){const group=createCat(data,n,y,{fragment});world.add(group);return group;}
 rt.controls.innerHTML='<button class="wide" data-drop aria-label="고양이 놓기">고양이 놓기 ↓</button>';
 const dropButton=document.querySelector('[data-drop]');
 const speedControl=mountSpeedControl(rt);
 const breedLabel=document.createElement('div');breedLabel.className='breed-label';rt.root.append(breedLabel);
 const cheers=document.createElement('div');cheers.className='cat-cheers';cheers.setAttribute('aria-hidden','true');rt.root.append(cheers);
 const bubbles=['야호!','꺄아 ♡','한 번 더!','우와~'].map((text,index)=>{const el=document.createElement('span');el.className='cat-cheer cheer-'+index;el.textContent=text;el.hidden=true;cheers.append(el);return el;});
 const projection=new THREE.Vector3();
 function clear(){for(const child of[...world.children])disposeObject(child);blocks=[];moving=null;falling=[];finale=null;divers=[];ground.visible=false;stage.visible=true;rt.root.classList.remove('cat-diving');for(const bubble of bubbles)bubble.hidden=true;dropButton.disabled=false;dropButton.textContent='고양이 놓기 ↓';}
 function spawn(){const breed=breedForFloor(height+1),upcoming=nextBreed(height+1);breedLabel.textContent=breed.name+(upcoming?' · '+upcoming.from+'층에 '+upcoming.name:' · 모든 친구 등장!');if(BREEDS.some(b=>b.from===height+1)&&height>0)rt.toast('새 친구! '+breed.name);axis=height%2?'z':'x';const top=blocks.at(-1),data={x:top.x,z:top.z,width:top.width,depth:top.depth};const start=(height%4<2?-1:1)*5.6;data[axis]+=start;moving={...data,mesh:block(data,height+1,baseY+thickness*(height+1)),origin:top[axis],direction:start<0?1:-1};rt.status.textContent=axis==='x'?'가로로 미끄러지는 냥이':'깊이로 미끄러지는 냥이';}
 function reset(){clear();height=0;streak=0;maxStreak=0;score=0;time=0;targetY=viewY=1.1;viewSpan=baseSpan;blocks=[{x:0,z:0,width:4.2,depth:4.2,mesh:block({x:0,z:0,width:4.2,depth:4.2},0,baseY)}];settleCat(blocks[0].mesh,true);rt.metric.textContent='0';spawn();rt.setScore(0,0);frame(0,false);}
 function startFinale(){
  divers=[...blocks.map(b=>b.mesh),moving.mesh];moving=null;
  for(let i=0;i<divers.length;i++)celebrateCat(divers[i],i);
  finale=createFinale(divers.map(mesh=>({x:mesh.position.x,y:mesh.position.y,z:mesh.position.z})),{ground:-.58+thickness/2,reducedMotion:rt.reducedMotion});
  ground.visible=true;rt.root.classList.add('cat-diving');dropButton.disabled=true;dropButton.textContent='다 같이 야호!';rt.status.textContent=height>0?height+'층에서 다 같이 야호!':'낮게 쌓아도 신나는 다이빙!';
  rt.tone(620,.12,'sine',.027);
 }
 function finishFinale(){rt.root.classList.remove('cat-diving');for(const bubble of bubbles)bubble.hidden=true;rt.finish('야호! 다 같이 착지!',height+'층 · 최고 연속 정중앙 '+maxStreak+'회');}
 function drop(){if(rt.state!=='running'||finale||!moving)return;const result=cutStack(blocks.at(-1),moving,axis);
  if(!result.hit){startFinale();return;}
  const y=moving.mesh.position.y,placed=moving.mesh;height++;streak=result.perfect?streak+1:0;maxStreak=Math.max(maxStreak,streak);score+=100+(result.perfect?80+Math.min(streak,10)*15:0);
  let mesh;if(result.perfect){mesh=placed;mesh.position.set(result.next.x,y,result.next.z);}else{disposeObject(placed);mesh=block(result.next,height,y);}settleCat(mesh,result.perfect);blocks.push({...result.next,mesh});
  if(result.cut){const piece=block(result.cut,height,y,true);falling.push({mesh:piece,vy:0,vx:axis==='x'?Math.sign(result.delta)*.65:0,vz:axis==='z'?Math.sign(result.delta)*.65:0,spin:Math.sign(result.delta)*.65,axis,life:2});}
  if(result.perfect){rt.toast(streak>=3?'골골골 · PERFECT × '+streak:'골골골 · PERFECT!');rt.tone(420+Math.min(streak,12)*55,.13,'sine');}else rt.tone(310,.08,'triangle');
  rt.setScore(score,height);rt.metric.textContent=String(streak);targetY=Math.max(1.1,baseY+height*thickness-1);spawn();
 }
 // Stacking stays immediate on press; the finale cannot create a second placement.
 const press=e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();drop();};
 rt.on(dropButton,'pointerdown',press);rt.on(renderer.domElement,'pointerdown',press);
 rt.on(dropButton,'click',e=>{if(e.detail===0)drop();});
 rt.on(document,'keydown',e=>{if(e.defaultPrevented||e.target.closest?.('input,select,[data-cat-speed]'))return;const button=e.target.closest?.('button');if(rt.state!=='running'||button&&button!==dropButton)return;if(['Space','ArrowDown'].includes(e.code)||e.code==='Enter'&&button===dropButton){e.preventDefault();if(!e.repeat)drop();}});
 rt.on(dropButton,'keyup',e=>{if(['Space','Enter'].includes(e.code))e.preventDefault();});
 function applySize(){resize(renderer,camera,rt,viewSpan);}
 const resizeGame=()=>{baseSpan=Math.max(12.4,8.2/(rt.root.clientWidth/rt.root.clientHeight));if(!finale)viewSpan=baseSpan;applySize();};
 const observer=new ResizeObserver(resizeGame);observer.observe(rt.root);resizeGame();const sizing={update:resizeGame,disconnect:()=>observer.disconnect()};
 function frame(dt,active){time+=dt;
  if(active){
   if(finale&&!finale.done){
    const landedBefore=finale.actors.filter(a=>a.landed).length;stepFinale(finale,dt);if(finale.age>.6)stage.visible=false;
    for(let i=0;i<divers.length;i++){const actor=finale.actors[i],mesh=divers[i];mesh.position.set(actor.position.x,actor.position.y,actor.position.z);mesh.rotation.set(actor.rotation.x,actor.rotation.y,actor.rotation.z);mesh.scale.y=1-actor.squash*.32;animateCat(mesh,dt,time);}
    const highest=Math.max(...finale.actors.map(a=>a.position.y));targetY=Math.max(1.1,highest-1.8);
    if(finale.actors.filter(a=>a.landed).length>landedBefore)rt.tone(380+landedBefore%4*80,.075,'sine',.018);
    if(finale.done)finishFinale();
   }else if(!finale&&moving){const speed=speedControl.effective(towerBaseSpeed(height));moving[axis]+=moving.direction*speed*dt;if(Math.abs(moving[axis]-moving.origin)>5.7){moving[axis]=moving.origin+Math.sign(moving[axis]-moving.origin)*5.7;moving.direction*=-1;}moving.mesh.position[axis]=moving[axis];}
  }
  for(const p of falling){p.vy-=9*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.rotation[p.axis==='x'?'z':'x']+=p.spin*dt;p.life-=dt;}falling=falling.filter(p=>{if(p.life>0)return true;disposeObject(p.mesh);return false;});
  if(!finale){animateCat(moving?.mesh,dt,time);for(const b of blocks.slice(-5))animateCat(b.mesh,dt,time);}
  viewY=lerp(viewY,targetY,1-Math.exp(-(finale?5:4)*dt));
  const desiredSpan=finale?Math.max(baseSpan,Math.min(25,baseSpan+height*.23+2.5)):baseSpan;
  const span=lerp(viewSpan,desiredSpan,1-Math.exp(-2.8*dt));if(Math.abs(span-viewSpan)>.001){viewSpan=span;const aspect=rt.root.clientWidth/rt.root.clientHeight;camera.left=-viewSpan*aspect/2;camera.right=viewSpan*aspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();}
  camera.position.set(9,viewY+7.7,10);camera.lookAt(0,viewY,0);camera.updateMatrixWorld();sun.position.y=viewY+18;sun.target.position.set(0,viewY,0);if(!sun.target.parent)scene.add(sun.target);
  for(let i=0;i<glints.length;i++){glints[i].rotation.y=time*.15;glints[i].position.y+=Math.sin(time+i)*dt*.035;}
  if(finale&&!finale.done){for(let i=0;i<bubbles.length;i++){
   const index=Math.max(0,divers.length-1-i*Math.max(1,Math.floor(divers.length/4))),mesh=divers[index],bubble=bubbles[i];
   projection.copy(mesh.position);projection.y+=.95;projection.project(camera);bubble.hidden=projection.x<-.87||projection.x>.87||projection.y<-.55||projection.y>.3||time%2.6<i*.16;
   bubble.style.left=(projection.x*.5+.5)*100+'%';bubble.style.top=(-projection.y*.5+.5)*100+'%';
  }}
  if(!finale)while(blocks.length>85){const stale=blocks.shift();disposeObject(stale.mesh);}
 }
 reset();disposeObject(moving.mesh);moving=null;for(let i=1;i<=4;i++){const data={x:0,z:0,width:4.2-i*.18,depth:4.2-i*.16};const mesh=block(data,i,baseY+i*thickness);settleCat(mesh,true);blocks.push({...data,mesh});}targetY=viewY=2;rt.status.textContent='두툼한 식빵 냥이, 한 마리 더!';
 rt.ready({reset,frame,render:()=>renderer.render(scene,camera),resize:sizing.update,snapshot:()=>({height,axis,streak,maxStreak,cooldown:0,character:'loaf-cat',thickness,viewY,speedMultiplier:speedControl.multiplier,baseSpeed:towerBaseSpeed(height),effectiveSpeed:speedControl.effective(towerBaseSpeed(height)),nextBreed:breedForFloor(height+1).id,topCat:catSummary(blocks.at(-1)?.mesh),movingCat:catSummary(moving?.mesh),finale:finaleSummary(finale),divers:divers.map(mesh=>catSummary(mesh)),fragments:falling.map(p=>({hasFace:!!p.mesh.userData.cat,cut:p.mesh.userData.fragment})),top:blocks.at(-1)?{x:blocks.at(-1).x,z:blocks.at(-1).z,width:blocks.at(-1).width,depth:blocks.at(-1).depth}:null,moving:moving?{x:moving.x,z:moving.z,width:moving.width,depth:moving.depth}:null}),dispose:()=>{speedControl.dispose();breedLabel.remove();sizing.disconnect();cheers.remove();env.dispose();baseMat.dispose();finalDispose(scene,renderer);disposeCats();}});
}catch(error){rt.fail(error);}
