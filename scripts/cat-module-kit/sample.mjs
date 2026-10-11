import {GameRuntime,lerp} from './runtime.mjs';
import {THREE,rendererFor,lights,studioEnvironment,resize,disposeObject,finalDispose} from './scene.mjs';
import {createCat,animateCat,setCatMood,catSummary,disposeCats} from './cats.mjs';
import {BREEDS,breedAtIndex,breedForFloor,nextBreed} from './breeds.mjs';
import {mountSpeedControl} from './speed.mjs';
import {JumpWorld,PackWorld} from './sample-rules.mjs';

export function startCatSample(config){
 const pack=config.mode==='pack';
 const rt=new GameRuntime({id:config.id,title:config.englishTitle,category:'LITTLE CAT PLAYGROUND',scoreLabel:'SCORE',metricLabel:pack?'TIME LEFT':'PERFECT STREAK',eyebrow:'SEVEN FRIENDS. ONE MORE TRY.',subtitle:config.title,description:config.description,hint:config.hint,version:'1.0.0'});
 rt.root.classList.add('cat-sample','mode-'+config.mode);
 try{
  const renderer=rendererFor(rt,{exposure:.86}),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,8,-8,.1,160);
  const env=studioEnvironment(renderer);scene.environment=env.texture;lights(scene,{intensity:1.55});
  const world=new THREE.Group();scene.add(world);
  const model=pack?new PackWorld(rt.seed):new JumpWorld(config.mode,rt.seed),speed=mountSpeedControl(rt);
  let time=0,visualX=0,actor=null,actorKey='',selectedBreed=Number(rt.read('breed',-1)),pointer=null,heldKey=false,finishedDelay=0,lastPhase='',lastLevel=-1,drag=false,dragOffset={x:0,z:0},packVersion=-1,pieceGroups=[];
  if(!Number.isInteger(selectedBreed)||selectedBreed<0||selectedBreed>6)selectedBreed=-1;
  const baseMat=new THREE.MeshStandardMaterial({color:0xf9ead9,roughness:.75}),accentMat=new THREE.MeshStandardMaterial({color:config.mode==='flip'?0xe4b5bf:0xc6d9c1,roughness:.7});
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(300,40),new THREE.ShadowMaterial({opacity:.14}));floor.rotation.x=-Math.PI/2;floor.position.y=-.45;scene.add(floor);
  const platforms=[];
  if(!pack)for(let i=0;i<2;i++){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(1,1,.27,48),i?accentMat:baseMat);mesh.castShadow=mesh.receiveShadow=true;mesh.position.y=-.16;world.add(mesh);platforms.push(mesh);}
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(300,40),new THREE.MeshStandardMaterial({color:0xf3e8ed,roughness:1,transparent:true,opacity:.58}));ground.rotation.x=-Math.PI/2;ground.position.y=-.46;scene.add(ground);
  const breedLabel=document.createElement('div');breedLabel.className='breed-label';rt.root.append(breedLabel);
  const progress=document.createElement('div');progress.className='cat-progress';progress.innerHTML='<span></span>';rt.root.append(progress);
  const meter=progress.firstChild;
  const pickerLabel=document.createElement('div');pickerLabel.className='cat-picker-label';pickerLabel.textContent='친구 선택 · 능력은 모두 같아요';
  const picker=document.createElement('div');picker.className='cat-picker';
  for(const breed of BREEDS){const button=document.createElement('button');button.type='button';button.title=breed.name;button.setAttribute('aria-label',breed.name+' 선택');button.dataset.breed=String(breed.index);button.innerHTML='<img src="./assets/breeds/'+breed.id+'.png" alt=""><small>'+breed.name.replace(' 쇼트헤어','').replace('기본 단모 고양이','단모')+'</small>';picker.append(button);rt.on(button,'click',()=>{selectedBreed=breed.index;rt.write('breed',selectedBreed);refreshPicker();actorKey='';if(pack)packVersion=-1;frame(0,false);renderer.render(scene,camera);});}
  rt.primary.before(pickerLabel,picker);
  const refreshPicker=()=>{for(const button of picker.children)button.setAttribute('aria-pressed',String(Number(button.dataset.breed)===selectedBreed));};refreshPicker();
  rt.controls.innerHTML=pack?'<div class="pack-controls"><button data-rotate aria-label="고양이 회전">회전 ↻</button><button data-place aria-label="고양이 배치">놓기 ✓</button></div>':'<button class="wide" data-action>꾹 눌렀다가 놓기 ↑</button>';
  const stop=document.createElement('button');stop.className='round-stop';stop.textContent='이번 기록으로 마무리';rt.controls.append(stop);rt.on(stop,'click',()=>{if(rt.state==='running')rt.finish('포근한 한 판, 여기까지.',model.level+'단계 완성');});
  const action=document.querySelector('[data-action]');
  const ray=new THREE.Raycaster(),point=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),coords=new THREE.Vector2();
  const cell=.78,boardW=6*cell,boardH=4*cell;
  let board=null,ghost=null,tray=null;
  if(pack){
   board=new THREE.Mesh(new THREE.BoxGeometry(boardW+.18,.15,boardH+.18),baseMat);board.position.y=-.14;board.receiveShadow=true;world.add(board);
   const gridMat=new THREE.MeshBasicMaterial({color:0xcbb7d0});for(let col=0;col<=6;col++){const line=new THREE.Mesh(new THREE.BoxGeometry(.009,.008,boardH),gridMat);line.position.set(-boardW/2+col*cell,-.055,0);world.add(line);}for(let row=0;row<=4;row++){const line=new THREE.Mesh(new THREE.BoxGeometry(boardW,.008,.009),gridMat);line.position.set(0,-.055,-boardH/2+row*cell);world.add(line);}
   ghost=new THREE.Mesh(new THREE.BoxGeometry(1,.04,1),new THREE.MeshBasicMaterial({color:0xb8d0b0,transparent:true,opacity:.4}));ghost.visible=false;world.add(ghost);
   tray=document.createElement('div');tray.className='pack-select';tray.setAttribute('aria-label','포장할 고양이 선택');rt.root.append(tray);
   rt.on(document.querySelector('[data-rotate]'),'click',()=>{if(rt.state!=='running')return;model.rotate();syncPieces();});
   rt.on(document.querySelector('[data-place]'),'click',()=>{if(rt.state==='running')placePreview();});
  }
  function currentBreed(){return selectedBreed>=0?breedAtIndex(selectedBreed):breedForFloor(model.level+1);}
  function clearPointer(){const contact=pointer;pointer=null;if(contact!==null){const el=pack?renderer.domElement:action;if(el?.hasPointerCapture(contact))el.releasePointerCapture(contact);if(renderer.domElement.hasPointerCapture(contact))renderer.domElement.releasePointerCapture(contact);}heldKey=false;drag=false;if(!pack)model.cancel();if(pack){model.rotationPreview=null;syncPieces();}}
  function press(event){if(rt.state!=='running'||!event.isPrimary||event.button!==0||pointer!==null)return;event.preventDefault();if(model.phase==='flight'){model.tap();return;}if(!model.begin())return;pointer=event.pointerId;event.currentTarget.setPointerCapture(pointer);}
  function release(event){if(event.pointerId!==pointer)return;event.preventDefault();pointer=null;model.release();}
  if(!pack){for(const target of[action,renderer.domElement]){rt.on(target,'pointerdown',press);rt.on(target,'pointerup',release);rt.on(target,'pointercancel',clearPointer);rt.on(target,'lostpointercapture',()=>{if(pointer!==null)clearPointer();});}}
  function pointerWorld(event){scene.updateMatrixWorld(true);const rect=renderer.domElement.getBoundingClientRect();coords.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(coords,camera);return ray.ray.intersectPlane(plane,point);}
  function previewAt(x,z){const p=model.pieces.find(p=>p.id===model.selected);if(!p)return;const d=model.dimensions(p,model.rotationPreview??p.rotation);model.preview={col:Math.round((x+boardW/2)/cell-d.w/2),row:Math.round((z+boardH/2)/cell-d.h/2)};}
  function placePreview(){const p=model.pieces.find(p=>p.id===model.selected);if(!p)return;const accepted=model.place(p.id,model.preview.col,model.preview.row,model.rotationPreview??p.rotation);if(!accepted)rt.toast('빈칸에 딱 맞게 놓아주세요.');syncPieces();}
  if(pack){
   rt.on(renderer.domElement,'pointerdown',event=>{if(rt.state!=='running'||model.phase!=='placing'||!event.isPrimary||event.button!==0||pointer!==null)return;event.preventDefault();const pos=pointerWorld(event);if(!pos)return;const hit=ray.intersectObjects(pieceGroups,true)[0];let group=hit?.object;while(group&&group.userData.piece===undefined)group=group.parent;
    if(group){model.select(group.userData.piece);model.rotationPreview=null;dragOffset={x:pos.x-group.position.x,z:pos.z-group.position.z};}else if(model.selected!==null)dragOffset={x:0,z:0};else return;
    pointer=event.pointerId;drag=true;renderer.domElement.setPointerCapture(pointer);previewAt(pos.x-dragOffset.x,pos.z-dragOffset.z);syncPieces();
   });
   rt.on(renderer.domElement,'pointermove',event=>{if(!drag||event.pointerId!==pointer)return;const pos=pointerWorld(event);if(pos){previewAt(pos.x-dragOffset.x,pos.z-dragOffset.z);syncPieces();}});
   rt.on(renderer.domElement,'pointerup',event=>{if(event.pointerId!==pointer)return;pointer=null;drag=false;placePreview();});
   rt.on(renderer.domElement,'pointercancel',clearPointer);rt.on(renderer.domElement,'lostpointercapture',()=>{if(pointer!==null)clearPointer();});
  }
  rt.on(document,'keydown',event=>{if(event.defaultPrevented||rt.state!=='running'||event.target.closest?.('input,select')||event.target.closest?.('button')&&!event.target.closest?.('[data-action]'))return;
   if(pack){if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR','Enter','Space'].includes(event.code)){event.preventDefault();if(event.code==='KeyR')model.rotate();else if(['Enter','Space'].includes(event.code)){if(!event.repeat)placePreview();}else{model.preview.col+=event.code==='ArrowLeft'?-1:event.code==='ArrowRight'?1:0;model.preview.row+=event.code==='ArrowUp'?-1:event.code==='ArrowDown'?1:0;}syncPieces();}}
   else if(event.code==='Space'){event.preventDefault();if(event.repeat||heldKey)return;if(model.phase==='flight')model.tap();else if(model.begin())heldKey=true;}
  });
  rt.on(document,'keyup',event=>{if(event.code==='Space'&&heldKey){event.preventDefault();heldKey=false;if(rt.state==='running')model.release();}});
  function createPieces(){for(const group of pieceGroups)disposeObject(group);pieceGroups=[];tray.replaceChildren();for(const piece of model.pieces){const breed=selectedBreed>=0?selectedBreed:(model.level+piece.id)%7;const group=createCat({x:0,z:0,width:piece.w*cell-.045,depth:piece.h*cell-.045},model.level,.15,{breedIndex:breed});group.scale.y=.45;group.userData.piece=piece.id;world.add(group);pieceGroups.push(group);const button=document.createElement('button');button.textContent=String(piece.id+1);button.setAttribute('aria-label','고양이 '+(piece.id+1)+' 선택');rt.on(button,'click',()=>{if(rt.state==='running'){model.select(piece.id);model.rotationPreview=null;model.preview={col:0,row:0};syncPieces();rt.root.focus({preventScroll:true});}});tray.append(button);}packVersion=model.boardId;}
  function syncPieces(){if(!pack)return;if(packVersion!==model.boardId)createPieces();for(const group of pieceGroups){const p=model.pieces.find(p=>p.id===group.userData.piece),selected=p.id===model.selected,rotation=selected?(model.rotationPreview??p.rotation):p.rotation,size=model.dimensions(p,rotation);group.rotation.y=rotation*Math.PI/2;
    if(p.placed&&!drag||p.id!==model.selected&&p.placed)group.position.set(-boardW/2+(p.col+size.w/2)*cell,.14,-boardH/2+(p.row+size.h/2)*cell);
    else if(selected&&drag)group.position.set(-boardW/2+(model.preview.col+size.w/2)*cell,.54,-boardH/2+(model.preview.row+size.h/2)*cell);
    else group.position.set((p.id%4-1.5)*.94,.25,2.7+Math.floor(p.id/4)*1.1);
    const thumb=!p.placed&&!(selected&&drag)?Math.min(.6,.83/(Math.max(p.w,p.h)*cell)):1;group.scale.set(thumb,.45,thumb);
    const button=tray.children[p.id];if(button){button.disabled=p.placed;button.setAttribute('aria-pressed',String(selected));}
   }
   const p=model.pieces.find(p=>p.id===model.selected);ghost.visible=!!p;if(p){const rotation=model.rotationPreview??p.rotation,d=model.dimensions(p,rotation);ghost.scale.set(d.w*cell,1,d.h*cell);ghost.position.set(-boardW/2+(model.preview.col+d.w/2)*cell,-.02,-boardH/2+(model.preview.row+d.h/2)*cell);ghost.material.color.set(model.canPlace(p.id,model.preview.col,model.preview.row,rotation)?0xafd2a5:0xe4aaaa);}
  }
  function updateActor(){const breed=currentBreed(),key=breed.id;if(key!==actorKey){if(actor)disposeObject(actor);actor=createCat({x:model.x,z:0,width:1.75,depth:1.45},model.level,.43,{breedIndex:breed.index});actor.scale.y=.80;world.add(actor);actorKey=key;}
   actor.position.set(model.x,model.y+.43,0);actor.rotation.z=model.angle;actor.scale.y=.80*(model.charging?1-model.charge*.26:1);
   setCatMood(actor,model.phase==='celebrate'?'cheer':model.phase==='lost'?'wow':'normal');animateCat(actor,0,time);
  }
  const resizeGame=()=>{const aspect=rt.root.clientWidth/rt.root.clientHeight;resize(renderer,camera,rt,Math.max(pack?10.3:11.2,(pack?6.5:7.2)/aspect));};
  const observer=new ResizeObserver(resizeGame);observer.observe(rt.root);resizeGame();
  function reset(){clearPointer();model.reset();time=0;finishedDelay=0;lastPhase='';lastLevel=-1;visualX=0;actorKey='';packVersion=-1;rt.setScore(0);frame(0,false);}
  function frame(dt,active){time+=dt;
   if(active&&model.phase!=='lost'){model.step(dt,speed.multiplier);if(model.phase!==lastPhase&&model.phase==='celebrate'){rt.tone(480+model.level%7*45,.13);rt.toast(pack?'포장 완료! 다음 상자도 부탁해요.':model.event==='perfect'?'골골골 · PERFECT!':'통통! 멋진 착지');}}
   if(active&&model.phase==='lost'){finishedDelay+=dt;if(finishedDelay>=.8)rt.finish(pack?'오늘의 포장은 여기까지.':'푹신한 쿠션으로 착지!',model.level+'단계 · '+model.score.toLocaleString()+'점');}
   lastPhase=model.phase;if(lastLevel!==model.level){lastLevel=model.level;if(!pack&&BREEDS.some(b=>b.from===model.level+1)&&model.level>0&&selectedBreed<0)rt.toast('새 친구! '+currentBreed().name);}
   rt.setScore(model.score);rt.metric.textContent=pack?Math.ceil(model.remaining)+'s':String(model.streak);breedLabel.textContent=currentBreed().name+' · '+(model.level+1)+'단계';
   rt.status.textContent=pack?'고양이를 돌려 빈칸에 딱 맞게 포장해요':model.phase==='flight'?(config.mode==='flip'?'공중에서 탭하면 회전이 줄어들어요':'쿠션 중앙에 착지하면 PERFECT!'):model.charging?'꾹… '+Math.round(model.charge*100)+'%':model.phase==='celebrate'?'골골골! 다음 쿠션으로':'누르고 있다가 손을 떼면 출발!';
   meter.style.width=pack?model.remaining/Math.max(35,75-(model.level-(model.phase==='celebrate'?1:0))*2)*100+'%':model.charge*100+'%';
   if(pack){syncPieces();for(const group of pieceGroups)animateCat(group,dt,time);camera.position.set(0,10,7.5);camera.lookAt(0,0,.15);}
   else{updateActor();animateCat(actor,dt,time);platforms[0].position.x=model.currentX;platforms[0].scale.set(1.25,1,1.1);platforms[1].position.x=model.target.x;platforms[1].scale.set(model.target.width/2,1,1);if(config.mode==='flip')platforms[0].visible=false;visualX=lerp(visualX,config.mode==='flip'?model.currentX:model.currentX+1.9,1-Math.exp(-5*dt));camera.position.set(visualX,6.5,11);camera.lookAt(visualX,1.25,0);}
   camera.updateMatrixWorld();
  }
  if(rt.qa)window.catSampleQA={solution:()=>pack?model.solution.map(p=>({...p})):null,project:(x,y,z)=>{const v=new THREE.Vector3(x,y,z).project(camera),r=renderer.domElement.getBoundingClientRect();return{x:r.x+(v.x*.5+.5)*r.width,y:r.y+(-v.y*.5+.5)*r.height};},select:id=>{if(pack){model.select(id);syncPieces();}},model:()=>model};
  reset();rt.ready({reset,frame,clearInput:clearPointer,resize:resizeGame,render:()=>renderer.render(scene,camera),snapshot:()=>({sampleType:config.mode,...model.snapshot(),speedMultiplier:speed.multiplier,effectiveTempo:speed.effective(model.snapshot().baseTempo),breed:currentBreed().id,actor:catSummary(actor)}),dispose:()=>{observer.disconnect();speed.dispose();breedLabel.remove();progress.remove();picker.remove();pickerLabel.remove();tray?.remove();delete window.catSampleQA;env.dispose();finalDispose(scene,renderer);disposeCats();}});
 }catch(error){rt.fail(error);}
}
