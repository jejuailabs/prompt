// Three.js stage: one chubby loaf cat on a cushion. The DOM card behind the transparent canvas carries the signal colour.
import {THREE,lights,studioEnvironment,finalDispose,disposeObject} from './scene.mjs';
import {createCat,setCatMood,animateCat,celebrateCat,disposeCats} from './cats.mjs';

const POSES=new Set(['idle','sleep','ready','go','early','hit','miss','decoy','party']);

export function createStage(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));renderer.setClearColor(0,0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.className='stage-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);
 const scene=new THREE.Scene(),env=studioEnvironment(renderer);scene.environment=env.texture;
 const camera=new THREE.PerspectiveCamera(30,1,.1,80);
 lights(scene,{intensity:2.6});
 // Soft shadow catcher and a round cushion.
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.ShadowMaterial({opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-.02;floor.receiveShadow=true;scene.add(floor);
 const cushion=new THREE.Group();
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(3.55,3.75,.55,48),new THREE.MeshPhysicalMaterial({color:0xffd9e2,roughness:.82,sheen:1,sheenColor:new THREE.Color(0xffffff),sheenRoughness:.6}));pad.position.y=.27;pad.castShadow=pad.receiveShadow=true;
 const rim=new THREE.Mesh(new THREE.TorusGeometry(3.62,.24,16,64),new THREE.MeshPhysicalMaterial({color:0xffc2d1,roughness:.75,sheen:1,sheenColor:new THREE.Color(0xffffff)}));rim.rotation.x=Math.PI/2;rim.position.y=.5;rim.castShadow=true;
 const button=new THREE.Mesh(new THREE.SphereGeometry(.16,16,10),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.5}));button.position.set(0,.56,0);
 cushion.add(pad,rim,button);scene.add(cushion);
 const holder=new THREE.Group();holder.position.y=.62;scene.add(holder);
 let cat=null,pose='idle',poseAge=0,time=0,shake=0,breedKey='',baseFit=1;
 // Framing keeps the cat centred in the free band between the signal text and any sheet over the card.
 const framing={top:.2,bottom:1,c:.6,zoom:1,ready:false};

 function setBreed(breedIndex=0,coatIndex=0){
  const key=breedIndex+':'+coatIndex;if(key===breedKey&&cat)return;breedKey=key;
  if(cat)disposeObject(cat);
  cat=createCat({x:0,z:0,width:4.2,depth:4.2},breedIndex*5,0,{breedIndex,coatIndex});cat.position.y=1.02/2;holder.add(cat);setPose(pose,true);
 }
 function setPose(next,force=false){
  if(!POSES.has(next))throw new Error('Unknown pose '+next);
  if(next===pose&&!force)return;pose=next;poseAge=0;
  if(!cat)return;const c=cat.userData.cat;c.celebrating=false;c.resting=false;c.pop=0;
  const mood={idle:'normal',sleep:'sleepy',ready:'ready',go:'wow',early:'dizzy',hit:'cheer',miss:'normal',decoy:'wink',party:'laugh'}[next];
  if(next==='party')celebrateCat(cat,0);else setCatMood(cat,mood);
  if(next==='early')shake=1;
 }
 function setResultMood(mood){if(cat&&pose==='hit')setCatMood(cat,mood);}
 function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;
  // Keep the cushion in frame on tall phones and wide desktops alike.
  baseFit=Math.max(1,1.15/camera.aspect);applyCamera();}
 function setFraming(top,bottom){framing.top=Math.max(0,Math.min(.8,top));framing.bottom=Math.max(framing.top+.15,Math.min(1,bottom));if(!framing.ready){framing.ready=true;framing.c=targetCentre();framing.zoom=targetZoom();applyCamera();}}
 const targetZoom=()=>Math.max(.5,Math.min(1,(framing.bottom-framing.top)/.72));
 const targetCentre=()=>(framing.top+framing.bottom)/2+.03;
 function applyCamera(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),fit=baseFit/framing.zoom;camera.position.set(0,6.4*fit,12.5*fit);camera.lookAt(0,1.05,0);
  // The cushion naturally sits a little below the middle of the view; shift the view window so it lands on the target band.
  camera.setViewOffset(w,h,0,(.5+.06*framing.zoom-framing.c)*h,w,h);camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();

 function frame(dt){
  time+=dt;poseAge+=dt;
  const k=Math.min(1,dt*7),tc=targetCentre(),tz=targetZoom();if(Math.abs(tc-framing.c)>.0005||Math.abs(tz-framing.zoom)>.0005){framing.c+=(tc-framing.c)*k;framing.zoom+=(tz-framing.zoom)*k;applyCamera();}
  if(!cat)return;const c=cat.userData.cat,g=cat;
  let y=1.02/2,sy=1,sx=1,rz=0,ry=Math.sin(time*.6)*.05,ears=1;
  if(pose==='sleep'){const breath=Math.sin(time*2.2);sy=1+breath*.035;sx=1-breath*.015;ears=.55;ry=0;}
  else if(pose==='ready'){sy=.93+Math.sin(time*9)*.01;sx=1.03;ears=1.05;ry=0;}
  else if(pose==='go'){const t=Math.min(1,poseAge/.32),hop=Math.sin(t*Math.PI);y+=hop*.8;sy=1+hop*.12;sx=1-hop*.06;ears=1.15;ry=0;c.paws.forEach((p,i)=>{p.position.y=.12+hop*.18;p.rotation.z=(i?1:-1)*hop*.5;});}
  else if(pose==='early'){shake=Math.max(0,shake-dt*1.4);rz=Math.sin(time*38)*.12*shake;ry=Math.sin(time*7)*.35*shake;sy=.96;ears=.7;}
  else if(pose==='decoy'){ears=1+Math.abs(Math.sin(time*26))*.18;ry=Math.sin(time*14)*.06;}
  else if(pose==='hit'){const t=Math.min(1,poseAge/.45);sy=1+Math.sin(t*Math.PI)*.1;ears=1.05;}
  else if(pose==='miss'){sy=.97;ears=.75;ry=Math.sin(time*1.6)*.12;}
  else if(pose==='party'){const hop=Math.abs(Math.sin(time*5.2));y+=hop*.55;sy=1+hop*.06;ry=Math.sin(time*2.4)*.3;}
  if(pose!=='go'&&pose!=='party')c.paws.forEach((p,i)=>{p.position.y+=(-.31-p.position.y)*Math.min(1,dt*10);p.rotation.z*=Math.max(0,1-dt*10);});
  g.position.y+=(y-g.position.y)*Math.min(1,dt*(pose==='go'?30:14));
  g.scale.x+=(sx-g.scale.x)*Math.min(1,dt*16);g.scale.z=g.scale.x;g.scale.y+=(sy-g.scale.y)*Math.min(1,dt*16);
  g.rotation.z+=(rz-g.rotation.z)*Math.min(1,dt*24);g.rotation.y+=(ry-g.rotation.y)*Math.min(1,dt*8);
  c.ears.scale.y+=(c.earScale*ears-c.ears.scale.y)*Math.min(1,dt*14);
  if(pose==='party'||pose==='idle'||pose==='hit')animateCat(g,dt,time);
  if(pose==='sleep'&&Math.sin(time*2.2)>.98)c.eyes.scale.y=1;
 }
 function render(){renderer.render(scene,camera);}
 function dispose(){observer.disconnect();if(cat)disposeObject(cat);disposeCats();env.dispose();finalDispose(scene,renderer);}
 return {setFraming,setBreed,setPose,setResultMood,frame,render,resize,dispose,get pose(){return pose;},summary:()=>cat?{pose,mood:cat.userData.cat.mood,breed:cat.userData.cat.breed}:null};
}
