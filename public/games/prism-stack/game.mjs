import {GameRuntime,random,lerp} from './runtime.mjs';
import {THREE,rendererFor,lights,studioEnvironment,resize,disposeObject,finalDispose} from './scene.mjs';
import {cutStack} from './rules.mjs';
import {CAT_THICKNESS,createCat,settleCat,animateCat,catSummary,disposeCats} from './cats.mjs';
const rt=new GameRuntime({id:'prism-stack',title:'Prism Stack',category:'THE ART OF TIMING',theme:'',scoreLabel:'FLOORS',metricLabel:'PERFECT STREAK',eyebrow:'ONE MORE LOAF. ONE MORE PURR.',subtitle:'납작 냥이, 포개서 골골골.',description:'귀가 쫑긋한 식빵 고양이를 차곡차곡 포개요.\n정중앙이면 기분 좋은 골골골! 어긋나면 조각이 떨어지고,\n남은 발판 위로 다음 고양이가 미끄러져 옵니다.',hint:'탭 · 클릭 · 스페이스로 고양이 놓기<br>가로와 깊이, 두 방향의 타이밍',version:'1.1.0'});
try{
 const renderer=rendererFor(rt,{exposure:.86}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-6,6,8,-8,.1,150);
 const env=studioEnvironment(renderer);scene.environment=env.texture;const sun=lights(scene,{intensity:1.7});
 const world=new THREE.Group();scene.add(world);const stage=new THREE.Group();scene.add(stage);
 const baseMat=new THREE.MeshStandardMaterial({color:0xf3f1ef,metalness:.13,roughness:.42});
 for(const [r,h,y]of[[3.2,.26,-.4],[2.8,.22,-.16],[2.52,.16,.03]]){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.07,h,72),baseMat);m.position.y=y;m.receiveShadow=true;m.castShadow=true;stage.add(m);}
 const line=new THREE.Mesh(new THREE.TorusGeometry(2.85,.016,8,100),new THREE.MeshBasicMaterial({color:0xc5b6d3}));line.rotation.x=Math.PI/2;line.position.y=-.02;stage.add(line);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.ShadowMaterial({opacity:.12}));shadow.rotation.x=-Math.PI/2;shadow.position.y=-.58;scene.add(shadow);
 const rng=random(rt.seed),glints=[];for(let i=0;i<25;i++){const s=new THREE.Mesh(new THREE.OctahedronGeometry(.018+rng()*.025),new THREE.MeshBasicMaterial({color:i%2?0xffffff:0xbdb0d2,transparent:true,opacity:.5}));s.position.set((rng()-.5)*16,rng()*14-1,(rng()-.5)*12);scene.add(s);glints.push(s);}
 let blocks=[],moving=null,axis='x',height=0,streak=0,maxStreak=0,score=0,falling=[],time=0,targetY=1.1,viewY=1.1,death=0;
 const thickness=CAT_THICKNESS,baseY=thickness/2+.12;
 function block(data,n,y,fragment=false){const group=createCat(data,n,y,{fragment});world.add(group);return group;}
 function clear(){for(const child of[...world.children])disposeObject(child);blocks=[];moving=null;falling=[];}
 function spawn(){axis=height%2?'z':'x';const top=blocks.at(-1),data={x:top.x,z:top.z,width:top.width,depth:top.depth};const start=(height%4<2?-1:1)*5.6;data[axis]+=start;moving={...data,mesh:block(data,height+1,baseY+thickness*(height+1)),origin:top[axis],direction:start<0?1:-1};rt.status.textContent=axis==='x'?'가로로 미끄러지는 냥이':'깊이로 미끄러지는 냥이';}
 function reset(){clear();height=0;streak=0;maxStreak=0;score=0;death=0;time=0;targetY=viewY=1.1;blocks=[{x:0,z:0,width:4.2,depth:4.2,mesh:block({x:0,z:0,width:4.2,depth:4.2},0,baseY)}];settleCat(blocks[0].mesh,true);rt.metric.textContent='0';spawn();rt.setScore(0,0);frame(0,false);}
 function drop(){if(rt.state!=='running'||death||!moving)return;const result=cutStack(blocks.at(-1),moving,axis);
  if(!result.hit){falling.push({mesh:moving.mesh,vy:0,vx:axis==='x'?moving.direction*.7:0,vz:axis==='z'?moving.direction*.7:0,spin:.4,axis,life:2});moving=null;death=.7;rt.tone(140,.25,'triangle');rt.status.textContent='다음 한 판은 더 높이';return;}
  const y=moving.mesh.position.y,placed=moving.mesh;height++;streak=result.perfect?streak+1:0;maxStreak=Math.max(maxStreak,streak);score+=100+(result.perfect?80+Math.min(streak,10)*15:0);
  // Keep the cat's identity and cached geometry on a perfect placement.
  let mesh;if(result.perfect){mesh=placed;mesh.position.set(result.next.x,y,result.next.z);}else{disposeObject(placed);mesh=block(result.next,height,y);}settleCat(mesh,result.perfect);blocks.push({...result.next,mesh});
  if(result.cut){const piece=block(result.cut,height,y,true);falling.push({mesh:piece,vy:0,vx:axis==='x'?Math.sign(result.delta)*.65:0,vz:axis==='z'?Math.sign(result.delta)*.65:0,spin:Math.sign(result.delta)*.65,axis,life:2});}
  if(result.perfect){rt.toast(streak>=3?`골골골 · PERFECT × ${streak}`:'골골골 · PERFECT!');rt.tone(420+Math.min(streak,12)*55,.13,'sine');}else rt.tone(310,.08,'triangle');
  rt.setScore(score,height);rt.metric.textContent=String(streak);targetY=Math.max(1.1,baseY+height*thickness-1);spawn();
 }
 rt.controls.innerHTML='<button class="wide" data-drop aria-label="고양이 놓기">고양이 놓기 ↓</button>';
 const dropButton=document.querySelector('[data-drop]');
 // Decide on press, using the visible slab position. Release must never place the next slab.
 const press=e=>{if(!e.isPrimary||e.button!==0)return;e.preventDefault();drop();};
 rt.on(dropButton,'pointerdown',press);rt.on(renderer.domElement,'pointerdown',press);
 // Preserve assistive/programmatic activation without repeating a physical pointer press.
 rt.on(dropButton,'click',e=>{if(e.detail===0)drop();});
 rt.on(document,'keydown',e=>{if(e.defaultPrevented)return;const button=e.target.closest?.('button');if(rt.state!=='running'||button&&button!==dropButton)return;if(['Space','ArrowDown'].includes(e.code)||e.code==='Enter'&&button===dropButton){e.preventDefault();if(!e.repeat)drop();}});
 rt.on(dropButton,'keyup',e=>{if(['Space','Enter'].includes(e.code))e.preventDefault();});
 const resizeGame=()=>resize(renderer,camera,rt,Math.max(12.4,8.2/(rt.root.clientWidth/rt.root.clientHeight)));const observer=new ResizeObserver(resizeGame);observer.observe(rt.root);resizeGame();const sizing={update:resizeGame,disconnect:()=>observer.disconnect()};
 function frame(dt,active){time+=dt;if(active){if(death){death-=dt;if(death<=0){death=0;rt.finish('포근한 냥이 탑, 여기까지.',`${height}층 · 최고 연속 정중앙 ${maxStreak}회`);}}else if(moving){const speed=2.0+Math.min(2.5,height*.07);moving[axis]+=moving.direction*speed*dt;if(Math.abs(moving[axis]-moving.origin)>5.7){moving[axis]=moving.origin+Math.sign(moving[axis]-moving.origin)*5.7;moving.direction*=-1;}moving.mesh.position[axis]=moving[axis];}}
  for(const p of falling){p.vy-=9*dt;p.mesh.position.y+=p.vy*dt;p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;p.mesh.rotation[p.axis==='x'?'z':'x']+=p.spin*dt;p.life-=dt;}falling=falling.filter(p=>{if(p.life>0)return true;disposeObject(p.mesh);return false;});
  animateCat(moving?.mesh,dt,time);for(const b of blocks.slice(-5))animateCat(b.mesh,dt,time);
  viewY=lerp(viewY,targetY,1-Math.exp(-4*dt));camera.position.set(9,viewY+7.7,10);camera.lookAt(0,viewY,0);sun.position.y=viewY+18;sun.target.position.set(0,viewY,0);scene.add(sun.target);for(let i=0;i<glints.length;i++){glints[i].rotation.y=time*.15;glints[i].position.y+=Math.sin(time+i)*dt*.035;}while(blocks.length>85){const stale=blocks.shift();disposeObject(stale.mesh);}
 }
 reset();disposeObject(moving.mesh);moving=null;for(let i=1;i<=7;i++){const data={x:0,z:0,width:4.2-i*.18,depth:4.2-i*.16};const mesh=block(data,i,baseY+i*thickness);settleCat(mesh,true);blocks.push({...data,mesh});}targetY=viewY=2.1;rt.status.textContent='납작 고양이로 쌓는, 포근한 냥이 탑';
 rt.ready({reset,frame,render:()=>renderer.render(scene,camera),resize:sizing.update,snapshot:()=>({height,axis,streak,maxStreak,cooldown:0,character:'loaf-cat',topCat:catSummary(blocks.at(-1)?.mesh),movingCat:catSummary(moving?.mesh),fragments:falling.map(p=>({hasFace:!!p.mesh.userData.cat,cut:p.mesh.userData.fragment})),top:blocks.at(-1)?{x:blocks.at(-1).x,z:blocks.at(-1).z,width:blocks.at(-1).width,depth:blocks.at(-1).depth}:null,moving:moving?{x:moving.x,z:moving.z,width:moving.width,depth:moving.depth}:null}),dispose:()=>{sizing.disconnect();env.dispose();baseMat.dispose();finalDispose(scene,renderer);disposeCats();}});
}catch(error){rt.fail(error);}