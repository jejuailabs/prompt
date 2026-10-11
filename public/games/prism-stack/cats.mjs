import {THREE} from './scene.mjs';
export const CAT_THICKNESS=1.02;
export const CAT_MOODS=['cheer','laugh','wink','wow'];
const colors=[0xf0c995,0xc1b4df,0xe8bbbf,0xb9d6c8,0xe7dcbd,0xbdcfe4];
const cream=new THREE.Color(0xfff5df),ink=new THREE.Color(0x59455d),pink=new THREE.Color(0xe598a6);
const decorTemplates=new Map(),bodyMaterials=new Map();let master=null;
const detailsMaterial=new THREE.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:.47,clearcoat:.32,metalness:0});detailsMaterial.userData.shared=true;
export function catColor(n){return new THREE.Color(colors[n%colors.length]);}
function bodyMaterial(n){const key=n%colors.length;if(!bodyMaterials.has(key)){const m=new THREE.MeshPhysicalMaterial({color:catColor(n),roughness:.39,clearcoat:.58,clearcoatRoughness:.32,metalness:0,envMapIntensity:.42});m.userData.shared=true;bodyMaterials.set(key,m);}return bodyMaterials.get(key);}
function mergeParts(parts){const positions=[],normals=[],colors=[];for(const {geometry,matrix,color} of parts){const g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(matrix);const p=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<p.length;i+=3){positions.push(p[i],p[i+1],p[i+2]);normals.push(n[i],n[i+1],n[i+2]);colors.push(color.r,color.g,color.b);}g.dispose();if(g!==geometry)geometry.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;}
function add(parts,g,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));parts.push({geometry:g,matrix,color:color.isColor?color:new THREE.Color(color)});}
const oval=(parts,color,x,y,z,sx,sy,sz)=>add(parts,new THREE.SphereGeometry(1,12,8),color,x,y,z,sx,sy,sz);
function curve(parts,color,points,radius){const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(parts,new THREE.TubeGeometry(path,12,radius,5,false),color);}
function loafGeometry(w,d){const bevel=Math.min(.21,w*.14,d*.14),a=w/2-bevel,b=d/2-bevel,r=Math.min(.56,a*.46,b*.46),shape=new THREE.Shape();shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);const g=new THREE.ExtrudeGeometry(shape,{depth:CAT_THICKNESS-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:5,curveSegments:7,steps:1});g.translate(0,0,-(CAT_THICKNESS-2*bevel)/2);g.rotateX(-Math.PI/2);g.computeBoundingSphere();return g;}
function tint(g,n){if(n%colors.length===0)return g;const old=catColor(0),next=catColor(n),oldStripe=old.clone().multiplyScalar(.77),nextStripe=next.clone().multiplyScalar(.77),a=g.attributes.color;for(let i=0;i<a.count;i++){const r=a.getX(i),green=a.getY(i),b=a.getZ(i);if(Math.abs(r-old.r)<1e-6&&Math.abs(green-old.g)<1e-6&&Math.abs(b-old.b)<1e-6)a.setXYZ(i,next.r,next.g,next.b);else if(Math.abs(r-oldStripe.r)<1e-6&&Math.abs(green-oldStripe.g)<1e-6&&Math.abs(b-oldStripe.b)<1e-6)a.setXYZ(i,nextStripe.r,nextStripe.g,nextStripe.b);}return g;}
function faceGeometry(mood='normal'){
 const eyes=[],mouth=[],spread=.57;
 for(const side of[-1,1]){
  const x=side*spread,closed=mood==='cheer'||mood==='laugh'||mood==='wink'&&side===1;
  if(closed)curve(eyes,ink,[[x-.17,-.025,0],[x,.10,0],[x+.17,-.025,0]],.031);
  else{oval(eyes,ink,x,0,0,mood==='wow'?.17:.16,mood==='wow'?.205:.175,.05);oval(eyes,cream,x-.045,.06,.045,.04,.05,.012);}
 }
 if(mood==='normal'||mood==='wink'){
  for(const side of[-1,1])curve(mouth,ink,[[0,-.17,0],[side*.10,-.235,0],[side*.18,-.165,0]],.02);
 }else{
  oval(mouth,ink,0,-.225,0,mood==='wow'?.10:.19,mood==='wow'?.13:.145,.034);
  if(mood!=='wow')oval(mouth,pink,0,-.28,.035,.11,.052,.012);
 }
 return {eyes:mergeParts(eyes),mouth:mergeParts(mouth)};
}
function buildTemplate(w,d,n){const half=CAT_THICKNESS/2,c=catColor(n),stripe=c.clone().multiplyScalar(.77),details=[],ears=[],paws=[];
 const front=d/2+.012;
 oval(details,cream,0,-.085,front,w*.26,.27,.075);
 for(const side of[-1,1]){
  oval(details,pink,side*.96,-.08,front+.02,.23,.085,.035);
  const paw=[];oval(paw,cream,0,0,0,.29,.16,.11);
  for(const x of[-.08,0,.08])oval(paw,pink,x,-.015,.102,.024,.03,.012);
  paws.push(mergeParts(paw));
  for(const yy of[-.015,.105])curve(details,ink,[[side*w*.25,yy,front+.015],[side*w*.32,yy+.022,front+.015],[side*w*.37,yy+.04,front+.015]],.011);
 }
 oval(details,pink,0,-.07,front+.10,.09,.052,.031);
 for(const x of[-.2,0,.2])oval(details,stripe,x*w,half+.006,-d*.29,w*.033,.014,d*.10);
 const tailX=w/2+.01,tailZ=-d*.19,tailR=.16;
 curve(details,cream,[[tailX,-.17,tailZ-tailR*1.7],[tailX,.11,tailZ-tailR],[tailX,.14,tailZ+tailR],[tailX,-.06,tailZ+tailR*.7],[tailX,0,tailZ]],.041);
 const earW=.57,earD=.40,earH=.38;
 for(const side of[-1,1]){
  const x=side*w*.31,z=d*.30,shape=new THREE.Shape();shape.moveTo(-earW/2,0);shape.quadraticCurveTo(-earW*.12,earH*.85,0,earH);shape.quadraticCurveTo(earW*.12,earH*.85,earW/2,0);shape.closePath();
  add(ears,new THREE.ExtrudeGeometry(shape,{depth:earD,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.03,bevelThickness:.018}),c,x,0,z-earD/2);
  const inner=new THREE.Shape();inner.moveTo(-earW*.27,earH*.12);inner.lineTo(0,earH*.77);inner.lineTo(earW*.27,earH*.12);inner.closePath();add(ears,new THREE.ShapeGeometry(inner),pink,x,0,z+earD/2+.03);
 }
 return {body:loafGeometry(w,d),details:mergeParts(details),ears:mergeParts(ears),paws,faces:Object.fromEntries(['normal',...CAT_MOODS].map(mood=>[mood,faceGeometry(mood)])),faceZ:front+.085};
}
function ensureMaster(){return master??=buildTemplate(4.2,4.2,0);}
function template(n){const key=n%colors.length;if(!decorTemplates.has(key)){const m=ensureMaster();decorTemplates.set(key,{details:tint(m.details.clone(),n),ears:tint(m.ears.clone(),n)});}return decorTemplates.get(key);}
export function createCat(data,n,y,{fragment=false}={}){const group=new THREE.Group(),w=data.width,d=data.depth,m=ensureMaster(),sx=w/4.2,sz=d/4.2;
 const body=new THREE.Mesh(m.body.clone(),bodyMaterial(n));body.scale.set(sx,1,sz);body.castShadow=body.receiveShadow=true;group.add(body);
 if(!fragment){
  const t=template(n),details=new THREE.Mesh(t.details.clone(),detailsMaterial),eyes=new THREE.Mesh(m.faces.normal.eyes.clone(),detailsMaterial),mouth=new THREE.Mesh(m.faces.normal.mouth.clone(),detailsMaterial),ears=new THREE.Mesh(t.ears.clone(),detailsMaterial);
  for(const mesh of[details,eyes,mouth])mesh.scale.set(sx,1,sz);
  const earScale=Math.min(.38,Math.max(.04,Math.min(w,d)*.11))/.38;ears.scale.set(sx,earScale,sz);
  details.castShadow=ears.castShadow=true;details.receiveShadow=ears.receiveShadow=true;eyes.position.set(0,.09,m.faceZ*sz);mouth.position.copy(eyes.position);ears.position.y=CAT_THICKNESS/2;
  const paws=m.paws.map((geometry,i)=>{const paw=new THREE.Mesh(geometry.clone(),detailsMaterial);paw.scale.set(sx,1,sz);paw.position.set((i?1:-1)*w*.34,-.31,m.faceZ*sz);paw.castShadow=true;return paw;});
  group.add(details,eyes,mouth,ears,...paws);group.userData.cat={eyes,mouth,ears,paws,earScale,resting:false,pop:0,phase:n*.43,breed:n%colors.length,mood:'normal',celebrating:false,cheerAge:0,faceIndex:0};
 }
 group.position.set(data.x,y,data.z);group.userData.fragment=fragment;return group;
}
export function settleCat(group,perfect){const cat=group.userData.cat;if(!cat)return;cat.resting=true;cat.ears.scale.y=cat.earScale*.13;setCatMood(group,perfect?['cheer','wink','laugh'][cat.breed%3]:'normal');cat.eyes.scale.y=perfect?1:.8;cat.pop=.16;}
export function setCatMood(group,mood){const cat=group?.userData.cat;if(!cat||cat.mood===mood)return;if(!['normal',...CAT_MOODS].includes(mood))throw new Error('Unknown cat mood');const face=ensureMaster().faces[mood];cat.eyes.geometry.dispose();cat.mouth.geometry.dispose();cat.eyes.geometry=face.eyes.clone();cat.mouth.geometry=face.mouth.clone();cat.eyes.scale.y=1;cat.mood=mood;}
export function celebrateCat(group,index=0){const cat=group?.userData.cat;if(!cat)return;cat.resting=false;cat.celebrating=true;cat.cheerAge=0;cat.faceIndex=index%CAT_MOODS.length;cat.pop=0;group.scale.y=1;cat.ears.scale.y=cat.earScale;setCatMood(group,CAT_MOODS[cat.faceIndex]);}
export function animateCat(group,dt,time){const cat=group?.userData.cat;if(!cat)return;
 if(cat.celebrating){
  cat.cheerAge+=dt;setCatMood(group,CAT_MOODS[(cat.faceIndex+Math.floor(cat.cheerAge/.85))%CAT_MOODS.length]);
  cat.ears.rotation.z=Math.sin(time*5+cat.phase)*.065;
  cat.paws.forEach((paw,i)=>{paw.position.y=.14+Math.sin(time*9+cat.phase+i*.9)*.09;paw.rotation.z=(i?1:-1)*(.36+Math.sin(time*7+cat.phase)*.15);});
 }else if(!cat.resting){const blink=(time+cat.phase)%3.6;cat.eyes.scale.y=blink>3.4?.15:1;cat.ears.rotation.z=Math.sin(time*2.1+cat.phase)*.025;}
 if(cat.pop>0){cat.pop=Math.max(0,cat.pop-dt);const bounce=Math.sin(cat.pop/.16*Math.PI);group.scale.y=1-bounce*.08;}
}
export function catSummary(group){const c=group?.userData.cat;return c?{breed:c.breed,resting:c.resting,earHeightScale:c.resting?.13:1,eyeScale:c.eyes.scale.y,mood:c.mood,celebrating:c.celebrating}:null;}
export function disposeCats(){for(const t of decorTemplates.values()){t.details.dispose();t.ears.dispose();}decorTemplates.clear();if(master){for(const field of['body','details','ears'])master[field].dispose();for(const g of master.paws)g.dispose();for(const face of Object.values(master.faces)){face.eyes.dispose();face.mouth.dispose();}master=null;}for(const m of bodyMaterials.values())m.dispose();bodyMaterials.clear();detailsMaterial.dispose();}
