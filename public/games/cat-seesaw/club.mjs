
import {GameRuntime,lerp} from './runtime.mjs';
import {THREE,rendererFor,lights,studioEnvironment,disposeObject,finalDispose} from './scene.mjs';
import {createCat,animateCat,setCatMood,celebrateCat,catSummary,disposeCats} from './cats.mjs';
import {BREEDS,createAppearancePicker,catAppearance} from './breeds.mjs';
import {mountSpeedControl,levelTempo} from './speed.mjs';
import {MergeWorld,BalanceWorld,SlingWorld,clamp,random} from './rules.mjs';
export function launch(config){
 const mode=config.mode,rt=new GameRuntime({...config,category:'THE LITTLE CAT CLUB',scoreLabel:'SCORE',metricLabel:mode==='merge'?'CHAIN':mode==='balance'?'LOAVES':'HEARTS',eyebrow:'SOFT PAWS. BIG LITTLE ADVENTURES.',subtitle:config.title,version:'1.0.0'});
 rt.root.classList.add('cat-launch','cat-'+mode);
 try{
  const renderer=rendererFor(rt,{exposure:.94}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,6,-6,.1,100),env=studioEnvironment(renderer);
  scene.environment=env.texture;lights(scene,{intensity:1.8});camera.position.set(0,7.2,20);camera.lookAt(0,-.4,0);
  const world=new THREE.Group();scene.add(world);
  const model=mode==='merge'?new MergeWorld(rt.seed):mode==='balance'?new BalanceWorld(rt.seed):new SlingWorld(rt.seed),speed=mountSpeedControl(rt),appearancePicker=createAppearancePicker(random(rt.seed^323));
  const actors=new Map(),appearances=new Map(),props=[],particles=[],material=new THREE.MeshPhysicalMaterial({color:config.accent,roughness:.44,clearcoat:.45}),wood=new THREE.MeshStandardMaterial({color:0xd7aa78,roughness:.66}),cream=new THREE.MeshStandardMaterial({color:0xffefd6,roughness:.65});
  for(const mat of[material,wood,cream])mat.userData.shared=true;
  const back=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.035}));back.position.z=-1.65;back.receiveShadow=true;scene.add(back);
  function mesh(geometry,mat,x,y,z=0){const m=new THREE.Mesh(geometry,mat);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;world.add(m);props.push(m);return m;}
  function rounded(w,h,d,mat,x,y,z=0){const bevel=Math.min(w,h,d)*.16,a=w/2-bevel,b=h/2-bevel,r=Math.min(a,b,.18),s=new THREE.Shape();s.moveTo(-a+r,-b);s.lineTo(a-r,-b);s.quadraticCurveTo(a,-b,a,-b+r);s.lineTo(a,b-r);s.quadraticCurveTo(a,b,a-r,b);s.lineTo(-a+r,b);s.quadraticCurveTo(-a,b,-a,b-r);s.lineTo(-a,-b+r);s.quadraticCurveTo(-a,-b,-a+r,-b);const geometry=new THREE.ExtrudeGeometry(s,{depth:d-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:5,steps:1});geometry.translate(0,0,-(d-2*bevel)/2);return mesh(geometry,mat,x,y,z);}
  let bar=null,landingGround=null,nestGroups=[];
  if(mode==='merge'){
   const glass=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.20,roughness:.10,metalness:0,depthWrite:false});
   rounded(8.15,.22,1.9,wood,0,-4.08,0);for(const side of[-1,1]){mesh(new THREE.BoxGeometry(.10,6.6,1.7),glass,side*3.95,-.7);rounded(.16,6.5,.13,cream,side*3.95,-.7,.85);}
   const points=[new THREE.Vector3(-3.8,2.1,.85),new THREE.Vector3(3.8,2.1,.85)],g=new THREE.BufferGeometry().setFromPoints(points),line=new THREE.LineDashedMaterial({color:0xdb937c,dashSize:.18,gapSize:.14,transparent:true,opacity:.55}),limit=new THREE.Line(g,line);limit.computeLineDistances();world.add(limit);
  }else if(mode==='balance'){
   mesh(new THREE.ConeGeometry(.65,1.8,5),wood,0,-2.55);bar=rounded(8.4,.25,2,material,0,-1.6);mesh(new THREE.SphereGeometry(.20,20,12),cream,0,-1.75,.95);landingGround=rounded(9,.22,2.4,cream,0,-4.4);
  }else{
   for(const x of[-3.55,-2.68])rounded(.15,1.25,.20,wood,x,-3.0);rounded(1.6,.22,1.5,cream,-3.1,-3.85);
  }
  const badge=document.createElement('div');badge.className='club-badge';rt.root.append(badge);
  const help=document.createElement('div');help.className='club-help';help.textContent=config.tip;rt.root.append(help);
  const feedback=document.createElement('div');feedback.className='club-feedback';feedback.setAttribute('aria-live','polite');rt.root.append(feedback);
  rt.controls.innerHTML='<button class="wide club-action" data-cat-action>'+config.action+'</button><button class="club-cashout" data-cat-finish>이번 기록으로 마무리</button>';
  const action=rt.controls.querySelector('[data-cat-action]'),cashout=rt.controls.querySelector('[data-cat-finish]');
  let time=0,pointer=null,keyboardHeld=false,aiming=false,pullStart=null,finishDelay=0,lastFeedback=-10,createdCount=0,baseSpan=10.1,viewSpan=10.1,viewFocus=-.4,viewAspect=1;
  const marks=[];if(mode==='sling')for(let i=0;i<30;i++){const dot=mesh(new THREE.SphereGeometry(i%5===0?.052:.035,8,6),new THREE.MeshBasicMaterial({color:0xb08c65,transparent:true,opacity:.62}),0,0,.45);marks.push(dot);}
  function sculptFace(group){const cat=group.userData.cat;if(!cat)return;const seen=group.userData.sculptedFaces??=new WeakSet();if(!seen.has(cat.eyes.geometry)){cat.eyes.geometry.scale(1.3,.43,1);seen.add(cat.eyes.geometry);}if(!seen.has(cat.mouth.geometry)){cat.mouth.geometry.translate(0,.21,0);cat.mouth.geometry.scale(1,.60,1);cat.mouth.geometry.translate(0,-.21,0);seen.add(cat.mouth.geometry);}}
  function makeActor(id,appearance,r=.58){
   const group=createCat({x:0,z:0,width:1.8,depth:1.55},id,0,appearance);const bodyMaterial=group.children[0].material;
   const haunch=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),bodyMaterial);haunch.scale.set(.79,.26,.66);haunch.position.set(0,.42,-.07);haunch.castShadow=true;group.add(haunch);if(mode==='merge'){const tier=appearance.index,colors=[0xf1c48d,0xa8c6b3,0xc6b2d9,0x98c9df,0xe1b8ab,0xd8bfdf,0xc2a37c],medal=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.055,24),new THREE.MeshStandardMaterial({color:colors[tier],metalness:.18,roughness:.4}));medal.rotation.x=Math.PI/2;medal.position.set(.58,-.22,.90);group.add(medal);const image=document.createElement('canvas');image.width=image.height=128;const context=image.getContext('2d');context.font='700 90px sans-serif';context.fillStyle='#49384e';context.textAlign='center';context.textBaseline='middle';context.fillText(String(tier+1),64,67);const label=new THREE.Mesh(new THREE.PlaneGeometry(.29,.29),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(image),transparent:true,depthWrite:false}));label.position.set(.58,-.22,.933);group.add(label);}
   group.scale.setScalar(r/.75);group.scale.y*=1.25;world.add(group);actors.set(id,group);createdCount++;return group;
  }
  function appearance(id,tier,coat){
   if(mode==='merge')return catAppearance(tier,coat);
   if(!appearances.has(id))appearances.set(id,appearancePicker.pick(id>0?id:model.id+1));return appearances.get(id);
  }
  function actor(id,a,r){return actors.get(id)||makeActor(id,a,r);}
  function burst(x,y,color=0xf4d08b){for(let i=0;i<10;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.07,8,6),new THREE.MeshBasicMaterial({color}));p.position.set(x,y,.85);world.add(p);particles.push({mesh:p,vx:Math.cos(i*.628)*(.8+i%3*.3),vy:Math.sin(i*.628)*1.1+1.0,life:.9});}}
  function announce(text,x=0,y=0){feedback.textContent=text;feedback.classList.remove('pop');void feedback.offsetWidth;feedback.classList.add('pop');lastFeedback=time;burst(x,y);rt.tone(520+model.level*30,.14,'sine',.026);}
  function rebuildNests(){
   for(const g of nestGroups){disposeObject(g);const index=props.indexOf(g);if(index>=0)props.splice(index,1);}nestGroups=[];
   if(mode!=='sling')return;
   for(const t of model.targets){const g=new THREE.Group();const bowl=new THREE.Mesh(new THREE.TorusGeometry(t.width*.50,.13,10,36,Math.PI),material);bowl.rotation.z=Math.PI;g.add(bowl);const base=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),cream);base.scale.set(t.width*.54,.12,.60);base.position.y=-.13;g.add(base);g.position.set(t.x,t.y,0);world.add(g);nestGroups.push(g);props.push(g);}
  }
  const bumperGroups=[];function syncBumpers(){while(bumperGroups.length<model.bumpers?.length){const b=model.bumpers[bumperGroups.length],g=mesh(new THREE.SphereGeometry(b.r,24,16),material,b.x,b.y,.15);bumperGroups.push(g);}for(const g of bumperGroups)g.visible=!!model.bumpers?.length;}
  function clearInput(){pointer=null;aiming=false;keyboardHeld=false;pullStart=null;}
  function launchAction(){if(rt.state!=='running')return;const success=mode==='merge'?model.drop():mode==='balance'?model.drop():model.launch();if(success){if(mode!=='merge'){appearances.set(model.id,appearance(-1));appearances.delete(-1);}rt.tone(340,.07,'triangle',.022);frame(0,false);}}
  const pickRay=new THREE.Raycaster(),playPlane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
  function screenToWorld(x,y){const box=renderer.domElement.getBoundingClientRect();pickRay.setFromCamera(new THREE.Vector2((x-box.left)/box.width*2-1,-(y-box.top)/box.height*2+1),camera);return pickRay.ray.intersectPlane(playPlane,new THREE.Vector3());}
  function aimAt(e){const p=screenToWorld(e.clientX,e.clientY);if(mode==='merge')model.aim=clamp(p.x,-3.2,3.2);else if(mode==='sling'&&pullStart){model.setAim(.85+(pullStart.x-p.x),1.15+(pullStart.y-p.y));}frame(0,false);renderer.render(scene,camera);}
  rt.on(renderer.domElement,'pointerdown',e=>{if(!e.isPrimary||e.button!==0||rt.state!=='running'||pointer!==null)return;if(mode==='sling'&&model.phase!=='aim')return;e.preventDefault();pointer=e.pointerId;renderer.domElement.setPointerCapture(e.pointerId);aiming=true;if(mode==='sling')pullStart=screenToWorld(e.clientX,e.clientY);aimAt(e);if(mode==='balance')launchAction();});
  rt.on(renderer.domElement,'pointermove',e=>{if(e.pointerId===pointer)aimAt(e);else if(mode==='merge'&&e.pointerType==='mouse'&&rt.state==='running')aimAt(e);});
  rt.on(renderer.domElement,'pointerup',e=>{if(e.pointerId!==pointer)return;e.preventDefault();aimAt(e);if(mode!=='balance')launchAction();clearInput();});
  rt.on(renderer.domElement,'pointercancel',clearInput);rt.on(renderer.domElement,'lostpointercapture',clearInput);
  rt.on(action,'pointerdown',e=>{if(mode==='balance'&&e.isPrimary&&e.button===0){e.preventDefault();launchAction();}});rt.on(action,'click',e=>{if(mode!=='balance'||e.detail===0)launchAction();});rt.on(cashout,'click',()=>{if(rt.state==='running')rt.finish('오늘의 냥이 클럽!',model.level+'단계 · '+config.title);});
  rt.on(document,'keydown',e=>{if(e.defaultPrevented||e.target.closest('input,select,button'))return;if(rt.state!=='running')return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','Enter'].includes(e.code))e.preventDefault();
   if(e.code==='ArrowLeft')mode==='merge'?model.aim=clamp(model.aim-.22,-3.2,3.2):mode==='sling'&&model.setAim(model.aim.x-.07,model.aim.y);
   if(e.code==='ArrowRight')mode==='merge'?model.aim=clamp(model.aim+.22,-3.2,3.2):mode==='sling'&&model.setAim(model.aim.x+.07,model.aim.y);
   if(mode==='sling'&&e.code==='ArrowUp')model.setAim(model.aim.x,model.aim.y+.07);if(mode==='sling'&&e.code==='ArrowDown')model.setAim(model.aim.x,model.aim.y-.07);
   if((e.code==='Space'||e.code==='Enter')&&!e.repeat&&!keyboardHeld){keyboardHeld=true;launchAction();}
  });rt.on(document,'keyup',e=>{if(e.code==='Space'||e.code==='Enter')keyboardHeld=false;});
  function sync(){
   const alive=new Set();let cats=model.cats||[];
   if(mode==='sling'&&model.projectile)cats=[...cats,model.projectile];
   for(const c of cats){alive.add(c.id);const a=appearance(c.id,c.tier,c.coat),g=actor(c.id,a,c.r||.59);const diving=mode==='balance'&&['dive','done'].includes(model.phase),dx=mode==='balance'&&c.landed?.28*Math.sin(model.angle):0,dy=mode==='merge'?-(c.r*.15+.07):mode==='balance'?(diving?.20:c.landed?-.28*Math.cos(model.angle):-.28):0;g.position.set(c.x+dx,c.y+dy,.1);g.rotation.z=mode==='balance'&&c.landed?model.angle:mode==='balance'&&model.phase==='dive'&&c.y>-3.99?Math.sin(time*3+c.id)*.35:clamp(c.angle||0,-.35,.35);g.rotation.y=Math.sin(time*.7+c.id)*.045;
    const cheerful=mode==='balance'&&['dive','done'].includes(model.phase)||mode==='sling'&&!model.projectile&&model.phase==='celebrate';
    if(cheerful){if(!g.userData.cat.celebrating)celebrateCat(g,c.id);animateCat(g,0,time);}else{setCatMood(g,c.age<.5?'wow':mode==='balance'&&Math.abs(model.angle)>.25?'wow':mode==='merge'&&c.tier>0&&c.age<1?'laugh':c.landed||mode==='sling'&&c.target!==undefined?'wink':'normal');}
    const squish=mode==='merge'&&c.age<.45?Math.sin(c.age/.45*Math.PI)*.10:0;g.scale.y=(c.r||.59)/.75*1.25*(1-squish);g.userData.cat.eyes.position.x=Math.sin(time*1.5+c.id)*.015;animateCat(g,1/60,time);if(mode==='balance'&&c.landed){g.userData.cat.paws.forEach((p,i)=>{p.position.y=-.24+Math.abs(model.angle)*.45+Math.sin(time*9+i)*Math.abs(model.angle)*.07;p.rotation.z=(i?1:-1)*Math.abs(model.angle)*.8;});}else if(mode==='sling'&&model.projectile?.id===c.id){g.userData.cat.paws.forEach((p,i)=>{p.position.y=.10+Math.sin(time*11+i)*.06;p.rotation.z=(i?1:-1)*.3;});}sculptFace(g);
   }
   const previewVisible=mode==='merge'||mode==='balance'&&model.phase==='play'||mode==='sling'&&model.phase==='aim';
   if(previewVisible){alive.add(-1);const a=mode==='merge'?appearance(-1,model.next.tier,model.next.coat):appearance(-1),g=actor(-1,a,mode==='merge'?RADIIProxy(model.next.tier):.59);
    const desired=mode==='merge'?a.key:'waiting:'+a.key;if(g.userData.previewKey!==desired){disposeObject(g);actors.delete(-1);const next=makeActor(-1,a,mode==='merge'?RADIIProxy(model.next.tier):.59);next.userData.previewKey=desired;}
    const waiting=actors.get(-1);waiting.position.set(mode==='merge'?model.aim:mode==='balance'?model.nextX:-3.1,mode==='sling'?-3.15:mode==='balance'?Math.max(2.9,...model.cats.filter(c=>c.landed).map(c=>c.y+1.4))-.28:2.9-(RADIIProxy(model.next.tier)*.15+.07),.15);waiting.rotation.y=Math.sin(time*1.5)*.12;
    waiting.scale.y=(mode==='merge'?RADIIProxy(model.next.tier):.59)/.75*1.25*(aiming&&mode==='sling'?.86:1);animateCat(waiting,1/60,time);sculptFace(waiting);
   }
   for(const [id,g]of actors)if(!alive.has(id)){disposeObject(g);actors.delete(id);}
   if(bar)bar.rotation.z=model.angle;
   if(mode==='sling'){if(nestGroups.length!==model.targets.length)rebuildNests();for(let i=0;i<nestGroups.length;i++){nestGroups[i].position.x=model.targets[i].x;nestGroups[i].scale.setScalar(model.targets[i].filled?1.03:1);}syncBumpers();const path=model.trajectory();for(let i=0;i<marks.length;i++){marks[i].visible=model.phase==='aim'&&i<path.length&&path[i].y>-3.9;if(path[i])marks[i].position.set(path[i].x,path[i].y,.4);}}
  }
  function RADIIProxy(t){return [.49,.59,.71,.84,.98,1.13,1.30][t];}
  let lastLevel=-1;
  function frame(dt,active){time+=dt;if(active){model.step(dt*speed.effective(levelTempo(model.level)));for(const e of model.events.splice(0)){if(e.type==='merge')announce((e.combo>1?'골골 연쇄 × '+e.combo:'새 친구! '+BREEDS[e.tier].name)+' +'+e.points,e.x,e.y);if(e.type==='land')announce(e.perfect?'정중앙! 골골골 ♡':'푹신하게 착지! +'+e.points,e.x,e.y);if(e.type==='complete')announce('모두 포근하게! +200');if(e.type==='miss')announce('괜찮아, 한 번 더!');if(e.type==='dive')announce('다 같이 야호!');}}
   if(mode==='sling'&&model.level!==lastLevel){lastLevel=model.level;rebuildNests();}
   if(active&&model.phase==='done'){finishDelay+=dt;if(finishDelay>.85)rt.finish(mode==='merge'?'오늘은 여기까지, 골골!':mode==='balance'?'다 같이 착지, 야호!':'푹신한 모험 완료!',mode==='merge'?'최대 '+BREEDS[model.level].name+' · 연쇄 '+model.combo:mode==='balance'?model.level+'마리와 균형 잡기':model.level+'개의 쿠션 정원 완성');}
   if(mode==='merge'){const limit=Math.min(3.2,3.8-RADIIProxy(model.next.tier));model.aim=clamp(model.aim,-limit,limit);}
   if(mode==='balance'){const diving=['dive','done'].includes(model.phase),waiting=model.phase==='play'?Math.max(2.9,...model.cats.filter(c=>c.landed).map(c=>c.y+1.4)):2.9,highest=Math.max(waiting,...model.cats.map(c=>c.y))+.9,targetFocus=Math.max(-.4,(highest-4.7)/2),wide=diving?Math.max(0,...model.cats.map(c=>Math.abs(c.x))):3.8,targetSpan=Math.max(baseSpan,(highest+4.7)*1.04,diving?(wide+1.0)*2/viewAspect:0),alpha=dt>0?1-Math.exp(-6*dt):1;viewFocus=lerp(viewFocus,targetFocus,alpha);viewSpan=lerp(viewSpan,targetSpan,alpha);camera.position.set(0,viewFocus+7.6,20);camera.lookAt(0,viewFocus,0);camera.left=-viewSpan*viewAspect/2;camera.right=viewSpan*viewAspect/2;camera.top=viewSpan/2;camera.bottom=-viewSpan/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();landingGround.scale.x=diving?3:1;}
   sync();for(const p of particles){p.life-=dt;p.vy-=3*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.y+=p.vy*dt;p.mesh.scale.setScalar(Math.max(.01,p.life));}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<=0){disposeObject(particles[i].mesh);particles.splice(i,1);}
   rt.setScore(model.score);rt.metric.textContent=mode==='merge'?String(model.combo):mode==='balance'?String(model.level):'♥'.repeat(model.lives)+'♡'.repeat(3-model.lives);
   badge.textContent=mode==='merge'?BREEDS[model.next.tier].name+' · 같은 품종끼리 합체':mode==='balance'?'흔들림 '+Math.round(Math.abs(model.angle)/.72*100)+'% · '+model.level+'마리':(model.level+1)+'번째 쿠션 정원 · '+model.targets.filter(t=>t.filled).length+'/3';
   rt.status.textContent=mode==='merge'&&model.danger>0?'조금만 낮춰줘요… '+Math.max(0,2.5-model.danger).toFixed(1)+'s':config.controls;
   action.disabled=rt.state!=='running'||mode==='sling'&&model.phase!=='aim'||mode!=='sling'&&(model.phase!=='play'||model.cooldown>0);
   if(time-lastFeedback>1.3)feedback.classList.remove('pop');
  }
  function resizeGame(){const r=renderer.domElement.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height),aspect=w/h,span=Math.max(10.1,9.25/aspect);baseSpan=span;viewAspect=aspect;viewSpan=Math.max(viewSpan,span);renderer.setSize(w,h,false);camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();camera.updateMatrixWorld();}
  const observer=new ResizeObserver(resizeGame);observer.observe(rt.root);resizeGame();
  function reset(){clearInput();model.reset();appearancePicker.reset();appearances.clear();for(const g of actors.values())disposeObject(g);actors.clear();for(const p of particles)disposeObject(p.mesh);particles.length=0;lastLevel=-1;finishDelay=0;time=0;viewFocus=-.4;viewSpan=baseSpan;frame(0,false);}
  if(rt.qa)window.catClubQA={model,project:(x,y,z=0)=>{const v=new THREE.Vector3(x,y,z).project(camera),r=renderer.domElement.getBoundingClientRect();return{x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};}};
  reset();rt.ready({reset,frame,clearInput,resize:resizeGame,render:()=>renderer.render(scene,camera),snapshot:()=>({...model.snapshot(),speedMultiplier:speed.multiplier,effectiveTempo:speed.effective(levelTempo(model.level)),actorCount:actors.size,createdCount,characters:[...actors].map(([id,g])=>({id,...catSummary(g)})),aiming}),dispose:()=>{observer.disconnect();speed.dispose();badge.remove();help.remove();feedback.remove();delete window.catClubQA;env.dispose();finalDispose(scene,renderer);disposeCats();}});
 }catch(error){rt.fail(error);}
}
