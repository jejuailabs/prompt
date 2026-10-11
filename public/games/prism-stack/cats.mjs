import {THREE} from './scene.mjs';
export const CAT_THICKNESS=.58;
const colors=[0xf0c995,0xc1b4df,0xe8bbbf,0xb9d6c8,0xe7dcbd,0xbdcfe4];
const cream=new THREE.Color(0xfff5df),ink=new THREE.Color(0x59455d),pink=new THREE.Color(0xe598a6);
const decorTemplates=new Map(),bodyMaterials=new Map();let master=null;
const detailsMaterial=new THREE.MeshPhysicalMaterial({vertexColors:true,color:0xffffff,roughness:.43,clearcoat:.45,metalness:0});detailsMaterial.userData.shared=true;
export function catColor(n){return new THREE.Color(colors[n%colors.length]);}
function bodyMaterial(n){const key=n%colors.length;if(!bodyMaterials.has(key)){const m=new THREE.MeshPhysicalMaterial({color:catColor(n),roughness:.29,clearcoat:.85,clearcoatRoughness:.22,metalness:.02,envMapIntensity:.42});m.userData.shared=true;bodyMaterials.set(key,m);}return bodyMaterials.get(key);}
function mergeParts(parts){const positions=[],normals=[],colors=[];for(const {geometry,matrix,color} of parts){const g=geometry.index?geometry.toNonIndexed():geometry;g.applyMatrix4(matrix);const p=g.attributes.position.array,n=g.attributes.normal.array;for(let i=0;i<p.length;i+=3){positions.push(p[i],p[i+1],p[i+2]);normals.push(n[i],n[i+1],n[i+2]);colors.push(color.r,color.g,color.b);}g.dispose();if(g!==geometry)geometry.dispose();}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;}
function loafGeometry(w,d){const bevel=Math.min(.085,w*.14,d*.14),a=w/2-bevel,b=d/2-bevel,r=Math.min(.38,a*.46,b*.46),shape=new THREE.Shape();shape.moveTo(-a+r,-b);shape.lineTo(a-r,-b);shape.quadraticCurveTo(a,-b,a,-b+r);shape.lineTo(a,b-r);shape.quadraticCurveTo(a,b,a-r,b);shape.lineTo(-a+r,b);shape.quadraticCurveTo(-a,b,-a,b-r);shape.lineTo(-a,-b+r);shape.quadraticCurveTo(-a,-b,-a+r,-b);const g=new THREE.ExtrudeGeometry(shape,{depth:CAT_THICKNESS-2*bevel,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,curveSegments:5,steps:1});g.translate(0,0,-(CAT_THICKNESS-2*bevel)/2);g.rotateX(-Math.PI/2);g.computeBoundingSphere();return g;}
function tint(g,n){if(n%colors.length===0)return g;const old=catColor(0),next=catColor(n),oldStripe=old.clone().multiplyScalar(.77),nextStripe=next.clone().multiplyScalar(.77),a=g.attributes.color;for(let i=0;i<a.count;i++){const r=a.getX(i),green=a.getY(i),b=a.getZ(i);if(Math.abs(r-old.r)<1e-6&&Math.abs(green-old.g)<1e-6&&Math.abs(b-old.b)<1e-6)a.setXYZ(i,next.r,next.g,next.b);else if(Math.abs(r-oldStripe.r)<1e-6&&Math.abs(green-oldStripe.g)<1e-6&&Math.abs(b-oldStripe.b)<1e-6)a.setXYZ(i,nextStripe.r,nextStripe.g,nextStripe.b);}return g;}
function buildTemplate(w,d,n){const half=CAT_THICKNESS/2,c=catColor(n),stripe=c.clone().multiplyScalar(.77),details=[],eyes=[],ears=[];
 const add=(parts,g,color,x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0)=>{const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));parts.push({geometry:g,matrix,color:color.isColor?color:new THREE.Color(color)});};
 const oval=(parts,color,x,y,z,sx,sy,sz)=>add(parts,new THREE.SphereGeometry(1,12,8),color,x,y,z,sx,sy,sz);
 const curve=(parts,color,points,radius)=>{const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(parts,new THREE.TubeGeometry(path,12,radius,5,false),color);};
 // One front face, so every loaf remains recognizable as the tower grows.
 const front=d/2+Math.min(.012,d*.015),spread=Math.min(w*.14,.64),ex=Math.min(.13,w*.042),ey=.095;
 oval(details,cream,0,-.025,front,w*.28,.175,.023);
 for(const side of[-1,1]){oval(eyes,ink,side*spread,0,0,ex,ey,.032);oval(eyes,cream,side*spread-ex*.25,ey*.30,.028,ex*.24,ey*.22,.01);oval(details,pink,side*Math.min(w*.24,1.02),-.03,front+.02,Math.min(.16,w*.052),.048,.012);oval(details,cream,side*w*.36,-.19,front,Math.min(.24,w*.09),.064,.033);}
 oval(details,pink,0,-.075,front+.027,Math.min(.075,w*.035),.035,.024);
 const mouth=Math.min(.10,w*.042);
 for(const side of[-1,1]){curve(details,ink,[[0,-.105,front+.03],[side*mouth*.55,-.15,front+.03],[side*mouth*1.1,-.108,front+.03]],Math.min(.012,w*.006));
  for(const yy of[-.03,.055])curve(details,ink,[[side*w*.23,yy,front+.008],[side*w*.30,yy+.018,front+.008],[side*w*.36,yy+.025,front+.008]],Math.min(.008,w*.004));}
 // Tabby stripes and a curled tail wrap the side, rather than changing collision bounds.
 for(const x of[-.2,0,.2])oval(details,stripe,x*w,half+.006,-d*.29,w*.032,.012,d*.09);
 const tailX=w/2+Math.min(.009,w*.01),tailZ=-d*.19,tailR=Math.min(.11,d*.085);
 curve(details,cream,[[tailX,-.09,tailZ-tailR*1.7],[tailX,.065,tailZ-tailR],[tailX,.08,tailZ+tailR],[tailX,-.035,tailZ+tailR*.7],[tailX,0,tailZ]],Math.min(.027,d*.014,w*.025));
 // Ear bases sit at the top. Placed cats fold them down to leave room for the next cat.
 const earW=Math.min(w*.13,.44),earD=Math.min(d*.12,.40),earH=Math.min(.30,Math.max(.035,Math.min(w,d)*.09));
 for(const side of[-1,1]){const x=side*w*.31,z=d*.30;const shape=new THREE.Shape();shape.moveTo(-earW/2,0);shape.lineTo(0,earH);shape.lineTo(earW/2,0);shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:earD,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:Math.min(.025,earW*.08),bevelThickness:Math.min(.015,earD*.08)});add(ears,g,c,x,0,z-earD/2);
  const inner=new THREE.Shape();inner.moveTo(-earW*.27,earH*.12);inner.lineTo(0,earH*.77);inner.lineTo(earW*.27,earH*.12);inner.closePath();add(ears,new THREE.ShapeGeometry(inner),pink,x,0,z+earD/2+.03);}
 return{body:loafGeometry(w,d),details:mergeParts(details),eyes:mergeParts(eyes),ears:mergeParts(ears),faceZ:front+.025};
}
function ensureMaster(){return master??=buildTemplate(4.2,4.2,0);}
function template(n){const key=n%colors.length;if(!decorTemplates.has(key)){const m=ensureMaster();decorTemplates.set(key,{details:tint(m.details.clone(),n),ears:tint(m.ears.clone(),n)});}return decorTemplates.get(key);}
export function createCat(data,n,y,{fragment=false}={}){const group=new THREE.Group(),w=data.width,d=data.depth,m=ensureMaster(),sx=w/4.2,sz=d/4.2;
 const body=new THREE.Mesh(m.body.clone(),bodyMaterial(n));body.scale.set(sx,1,sz);body.castShadow=body.receiveShadow=true;group.add(body);
 if(!fragment){const t=template(n),details=new THREE.Mesh(t.details.clone(),detailsMaterial),eyes=new THREE.Mesh(m.eyes.clone(),detailsMaterial),ears=new THREE.Mesh(t.ears.clone(),detailsMaterial);details.scale.set(sx,1,sz);eyes.scale.set(sx,1,sz);const earScale=Math.min(.30,Math.max(.035,Math.min(w,d)*.09))/.30;ears.scale.set(sx,earScale,sz);details.castShadow=ears.castShadow=true;details.receiveShadow=ears.receiveShadow=true;eyes.position.set(0,.055,m.faceZ*sz);ears.position.y=CAT_THICKNESS/2;group.add(details,eyes,ears);group.userData.cat={eyes,ears,earScale,resting:false,pop:0,phase:n*.43,breed:n%colors.length};}
 group.position.set(data.x,y,data.z);group.userData.fragment=fragment;return group;
}
export function settleCat(group,perfect){const cat=group.userData.cat;if(!cat)return;cat.resting=true;cat.ears.scale.y=cat.earScale*.13;cat.eyes.scale.y=perfect?.18:.65;cat.pop=.16;}
export function animateCat(group,dt,time){const cat=group?.userData.cat;if(!cat)return;if(!cat.resting){const blink=(time+cat.phase)%3.6;cat.eyes.scale.y=blink>3.4?.15:1;cat.ears.rotation.z=Math.sin(time*2.1+cat.phase)*.025;}if(cat.pop>0){cat.pop=Math.max(0,cat.pop-dt);const bounce=Math.sin(cat.pop/.16*Math.PI);group.scale.y=1-bounce*.08;}}
export function catSummary(group){const c=group?.userData.cat;return c?{breed:c.breed,resting:c.resting,earHeightScale:c.resting?.13:1,eyeScale:c.eyes.scale.y}:null;}
export function disposeCats(){for(const t of decorTemplates.values()){t.details.dispose();t.ears.dispose();}decorTemplates.clear();if(master){for(const field of['body','details','eyes','ears'])master[field].dispose();master=null;}for(const m of bodyMaterials.values())m.dispose();bodyMaterials.clear();detailsMaterial.dispose();}
