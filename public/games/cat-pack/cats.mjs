import {THREE} from './scene.mjs';
import {breedAtIndex,breedForFloor,catAppearance} from './breeds.mjs';
export const CAT_THICKNESS=1.02;
export const CAT_MOODS=['cheer','laugh','wink','wow'];
const cream=new THREE.Color(0xfff5df),ink=new THREE.Color(0x59455d),pink=new THREE.Color(0xe598a6);
const decorTemplates=new Map(),bodyMaterials=new Map();let master=null;
const detailsMaterial=new THREE.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:.47,clearcoat:.32,metalness:0});detailsMaterial.userData.shared=true;
export function catColor(n){return new THREE.Color(breedForFloor(n).color);}
function bodyMaterial(n,coat=0){const appearance=catAppearance(n,coat),key=appearance.key;if(!bodyMaterials.has(key)){const m=new THREE.MeshPhysicalMaterial({color:new THREE.Color(appearance.color),roughness:.39,clearcoat:.58,clearcoatRoughness:.32,metalness:0,envMapIntensity:.42});m.userData.shared=true;bodyMaterials.set(key,m);}return bodyMaterials.get(key);}
function mergeParts(parts){const positions=[],normals=[],colors=[];for(const {geometry,matrix,color} of parts){const g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(matrix);const p=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<p.length;i+=3){positions.push(p[i],p[i+1],p[i+2]);normals.push(n[i],n[i+1],n[i+2]);colors.push(color.r,color.g,color.b);}g.dispose();if(g!==geometry)geometry.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;}
function add(parts,g,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));parts.push({geometry:g,matrix,color:color.isColor?color:new THREE.Color(color)});}
const oval=(parts,color,x,y,z,sx,sy,sz)=>add(parts,new THREE.SphereGeometry(1,12,8),color,x,y,z,sx,sy,sz);
function curve(parts,color,points,radius){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(parts,new THREE.TubeGeometry(path,12,radius,5,false),color);}
function loafGeometry(w,d){const bevel=Math.min(.21,w*.14,d*.14),a=w/2-bevel,b=d/2-bevel,r=Math.min(.56,a*.46,b*.46),shape=new THREE.Shape();shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);const g=new THREE.ExtrudeGeometry(shape,{depth:CAT_THICKNESS-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:5,curveSegments:7,steps:1});g.translate(0,0,-(CAT_THICKNESS-2*bevel)/2);g.rotateX(-Math.PI/2);g.computeBoundingSphere();return g;}
function faceGeometry(mood='normal',breedIndex=0){
 const breed=breedAtIndex(breedIndex),iris=new THREE.Color(breed.eye);
 const eyes=[],mouth=[],spread=.57;
 for(const side of[-1,1]){
  const x=side*spread,closed=mood==='cheer'||mood==='laugh'||mood==='wink'&&side===1;
  if(closed)curve(eyes,ink,[[x-.17,-.025,0],[x,.10,0],[x+.17,-.025,0]],.031);
  else{oval(eyes,ink,x,0,0,mood==='wow'?.185:.18,mood==='wow'?.22:.195,.05);oval(eyes,iris,x,0,.037,.14,.15,.023);oval(eyes,ink,x,0,.059,.075,.115,.011);oval(eyes,cream,x-.045,.065,.072,.036,.046,.01);}
 }
 if(mood==='normal'||mood==='wink'){
  for(const side of[-1,1])curve(mouth,ink,[[0,-.17,0],[side*.10,-.235,0],[side*.18,-.165,0]],.02);
 }else{
  oval(mouth,ink,0,-.225,0,mood==='wow'?.10:.19,mood==='wow'?.13:.145,.034);
  if(mood!=='wow')oval(mouth,pink,0,-.28,.035,.11,.052,.012);
 }
 return {eyes:mergeParts(eyes),mouth:mergeParts(mouth)};
}
function buildTemplate(w,d,n,coat=0){const breed=catAppearance(n,coat),half=CAT_THICKNESS/2,c=new THREE.Color(breed.color),stripe=c.clone().multiplyScalar(.55),details=[],ears=[],paws=[];
 const front=d/2+.012;
 const pointed=breed.pattern==='point'||breed.pattern==='bicolor';
 if(pointed){
  oval(details,breed.point,0,.08,front+.018,w*.285,.35,.046);
  for(const side of[-1,1])oval(details,breed.point,side*w*.24,half+.01,d*.25,w*.13,.02,d*.18);
 }
 if(breed.pattern==='tuxedo'){
  oval(details,cream,0,-.08,front+.04,w*.32,.38,.07);
  oval(details,cream,0,half+.008,d*.20,w*.12,.018,d*.23);
 }
 if(breed.pattern==='bicolor'){
  const v=new THREE.Shape();v.moveTo(-.47,-.32);v.lineTo(0,.40);v.lineTo(.47,-.32);v.closePath();add(details,new THREE.ShapeGeometry(v),cream,0,0,front+.07);
 }
 oval(details,cream,0,-.085,front,w*(n===4?.30:.26),n===4?.29:.27,n===4?.10:.075);
 if(n===2)for(const side of[-1,1])oval(details,c,side*.91,.04,front+.025,.37,.25,.08);
 if(breed.fluff>=.2){
  for(let i=0;i<15;i++){const angle=i/15*Math.PI*2;oval(details,c,Math.cos(angle)*w*.48,Math.sin(angle)*.10-.07,Math.sin(angle)*d*.48,w*(.035+breed.fluff*.16),.24,d*(.035+breed.fluff*.16));}
  for(const side of[-1,1])for(let i=0;i<3;i++)oval(details,c,side*(w*.37+i*.07),-.05-i*.075,front+.075,.22,.17,.10);
 }
 for(const side of[-1,1]){
  oval(details,pink,side*.96,-.08,front+.02,.23,.085,.035);
  const paw=[];oval(paw,pointed?breed.point:cream,0,0,0,.29,.16,.11);
  for(const x of[-.08,0,.08])oval(paw,pink,x,-.015,.102,.024,.03,.012);
  paws.push(mergeParts(paw));
  for(const yy of[-.015,.105])curve(details,ink,[[side*w*.25,yy,front+.015],[side*w*.32,yy+.022,front+.015],[side*w*.37,yy+.04,front+.015]],.011);
 }
 oval(details,pink,0,-.07,front+.10,.09,.052,.031);
 if(breed.pattern.includes('tabby')){
  const marks=breed.index===0?[-.2,0,.2]:[-.30,-.18,-.06,.06,.18,.30];
  for(const x of marks)oval(details,stripe,x*w,half+.006,-d*.28,w*.028,.016,d*.13);
  for(const side of[-1,1])for(let i=0;i<3;i++)oval(details,stripe,side*(w*.40+i*.025),.23-i*.13,front,.055,.045,.014);
 }
 const tailX=w/2+.01,tailZ=-d*.19,tailR=.16;
 curve(details,breed.point||cream,[[tailX,-.17,tailZ-tailR*1.7],[tailX,.11,tailZ-tailR],[tailX,.14,tailZ+tailR],[tailX,-.06,tailZ+tailR*.7],[tailX,0,tailZ]],breed.fluff>=.2?.085:.041);
 if(breed.fluff>=.2)for(let i=0;i<5;i++)oval(details,breed.point||c,tailX+.025,-.10+i*.045,tailZ-.20+i*.045,.10,.085,.085);
 if(n===4)for(let i=0;i<9;i++)oval(details,c,(i-4)*.31,-.25,front+.12,.22,.17,.10);
 const earW=breed.earW,earD=.40,earH=breed.earH;
 for(const side of[-1,1]){
  const x=side*w*.31,z=d*.30,shape=new THREE.Shape();shape.moveTo(-earW/2,0);shape.quadraticCurveTo(-earW*.12,earH*.85,0,earH);shape.quadraticCurveTo(earW*.12,earH*.85,earW/2,0);shape.closePath();
  add(ears,new THREE.ExtrudeGeometry(shape,{depth:earD,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.03,bevelThickness:.018}),pointed?breed.point:c,x,0,z-earD/2);
  const inner=new THREE.Shape();inner.moveTo(-earW*.27,earH*.12);inner.lineTo(0,earH*.77);inner.lineTo(earW*.27,earH*.12);inner.closePath();add(ears,new THREE.ShapeGeometry(inner),pink,x,0,z+earD/2+.03);
  if(n===6)for(const sign of[-1,0,1]){const tuft=new THREE.Shape();tuft.moveTo(sign*.06-.035,earH-.03);tuft.lineTo(sign*.08,earH+.17-Math.abs(sign)*.03);tuft.lineTo(sign*.06+.035,earH-.03);tuft.closePath();add(ears,new THREE.ShapeGeometry(tuft),stripe,x,0,z+earD/2+.036);}
 }
 return {body:loafGeometry(w,d),details:mergeParts(details),ears:mergeParts(ears),paws,faces:Object.fromEntries(['normal',...CAT_MOODS].map(mood=>[mood,faceGeometry(mood,n)])),faceZ:front+.085};
}
function ensureMaster(){return master??=buildTemplate(4.2,4.2,0);}
function template(n,coat=0){const appearance=catAppearance(n,coat),key=appearance.key;if(!decorTemplates.has(key))decorTemplates.set(key,appearance.breedIndex===0&&appearance.coatIndex===0?ensureMaster():buildTemplate(4.2,4.2,appearance.breedIndex,appearance.coatIndex));return decorTemplates.get(key);}
export function createCat(data,n,y,{fragment=false,breedIndex=breedForFloor(n).index,coatIndex=n%4}={}){const group=new THREE.Group(),w=data.width,d=data.depth,m=ensureMaster(),sx=w/4.2,sz=d/4.2;
 const body=new THREE.Mesh(m.body.clone(),bodyMaterial(breedIndex,coatIndex));body.scale.set(sx,1,sz);body.castShadow=body.receiveShadow=true;group.add(body);
 if(!fragment){
  const t=template(breedIndex,coatIndex),details=new THREE.Mesh(t.details.clone(),detailsMaterial),eyes=new THREE.Mesh(t.faces.normal.eyes.clone(),detailsMaterial),mouth=new THREE.Mesh(t.faces.normal.mouth.clone(),detailsMaterial),ears=new THREE.Mesh(t.ears.clone(),detailsMaterial);
  for(const mesh of[details,eyes,mouth])mesh.scale.set(sx,1,sz);
  const earScale=Math.min(.38,Math.max(.04,Math.min(w,d)*.11))/.38;ears.scale.set(sx,earScale,sz);
  details.castShadow=ears.castShadow=true;details.receiveShadow=ears.receiveShadow=true;eyes.position.set(0,.09,m.faceZ*sz);mouth.position.copy(eyes.position);ears.position.y=CAT_THICKNESS/2;
  const paws=t.paws.map((geometry,i)=>{const paw=new THREE.Mesh(geometry.clone(),detailsMaterial);paw.scale.set(sx,1,sz);paw.position.set((i?1:-1)*w*.34,-.31,m.faceZ*sz);paw.castShadow=true;return paw;});
  group.add(details,eyes,mouth,ears,...paws);group.userData.cat={eyes,mouth,ears,paws,earScale,resting:false,pop:0,phase:n*.43,breed:breedIndex,coat:catAppearance(breedIndex,coatIndex).coatIndex,mood:'normal',celebrating:false,cheerAge:0,faceIndex:0};
 }
 group.position.set(data.x,y,data.z);group.userData.fragment=fragment;group.userData.appearance=catAppearance(breedIndex,coatIndex);return group;
}
export function settleCat(group,perfect){const cat=group.userData.cat;if(!cat)return;cat.resting=true;cat.ears.scale.y=cat.earScale*.13;setCatMood(group,perfect?['cheer','wink','laugh'][cat.breed%3]:'normal');cat.eyes.scale.y=perfect?1:.8;cat.pop=.16;}
export function setCatMood(group,mood){const cat=group?.userData.cat;if(!cat||cat.mood===mood)return;if(!['normal',...CAT_MOODS].includes(mood))throw new Error('Unknown cat mood');const face=template(cat.breed,cat.coat).faces[mood];cat.eyes.geometry.dispose();cat.mouth.geometry.dispose();cat.eyes.geometry=face.eyes.clone();cat.mouth.geometry=face.mouth.clone();cat.eyes.scale.y=1;cat.mood=mood;}
export function celebrateCat(group,index=0){const cat=group?.userData.cat;if(!cat)return;cat.resting=false;cat.celebrating=true;cat.cheerAge=0;cat.faceIndex=index%CAT_MOODS.length;cat.pop=0;group.scale.y=1;cat.ears.scale.y=cat.earScale;setCatMood(group,CAT_MOODS[cat.faceIndex]);}
export function animateCat(group,dt,time){const cat=group?.userData.cat;if(!cat)return;
 if(cat.celebrating){
  cat.cheerAge+=dt;setCatMood(group,CAT_MOODS[(cat.faceIndex+Math.floor(cat.cheerAge/.85))%CAT_MOODS.length]);
  cat.ears.rotation.z=Math.sin(time*5+cat.phase)*.065;
  cat.paws.forEach((paw,i)=>{paw.position.y=.14+Math.sin(time*9+cat.phase+i*.9)*.09;paw.rotation.z=(i?1:-1)*(.36+Math.sin(time*7+cat.phase)*.15);});
 }else if(!cat.resting){const blink=(time+cat.phase)%3.6;cat.eyes.scale.y=blink>3.4?.15:1;cat.ears.rotation.z=Math.sin(time*2.1+cat.phase)*.025;}
 if(cat.pop>0){cat.pop=Math.max(0,cat.pop-dt);const bounce=Math.sin(cat.pop/.16*Math.PI);group.scale.y=1-bounce*.08;}
}
export function catSummary(group){const c=group?.userData.cat;return c?{coatId:group.userData.appearance.coatId,coatName:group.userData.appearance.coatName,color:group.userData.appearance.color,breed:c.breed,breedId:breedAtIndex(c.breed).id,breedName:breedAtIndex(c.breed).name,resting:c.resting,earHeightScale:c.resting?.13:1,eyeScale:c.eyes.scale.y,mood:c.mood,celebrating:c.celebrating}:null;}
export function disposeCats(){const models=new Set(decorTemplates.values());if(master)models.add(master);for(const model of models){for(const field of['body','details','ears'])model[field].dispose();for(const g of model.paws)g.dispose();for(const face of Object.values(model.faces)){face.eyes.dispose();face.mouth.dispose();}}decorTemplates.clear();master=null;for(const m of bodyMaterials.values())m.dispose();bodyMaterials.clear();detailsMaterial.dispose();}
