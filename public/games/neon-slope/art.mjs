import {THREE,box} from './scene.mjs';
import {trackHeight,bankAt} from './rules.mjs';
const palette=new Map();
function mat(color,roughness=.48){const key=color+':'+roughness;if(!palette.has(key)){const m=new THREE.MeshStandardMaterial({color,roughness,metalness:.03});m.userData.shared=true;palette.set(key,m);}return palette.get(key);}
function orb(group,color,x,y,z,sx,sy=sx,sz=sx){const m=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),mat(color));m.position.set(x,y,z);m.scale.set(sx,sy,sz);group.add(m);return m;}
function face(group,y,z,spread=.17,scale=1){for(const side of[-1,1]){orb(group,0x352b47,side*spread,y,z,.045*scale,.065*scale,.03*scale);orb(group,0xffffff,side*spread-.012*scale,y+.021*scale,z-.027*scale,.012*scale);orb(group,0xf69cab,side*(spread+.08*scale),y-.06*scale,z+.006*scale,.055*scale,.029*scale,.02*scale);}}
export function createHamster(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 orb(body,0xffca8f,0,0,0,.62);
 orb(body,0xfff2dc,0,-.08,-.43,.46,.46,.20);
 for(const side of[-1,1]){orb(body,0xffca8f,side*.39,.46,.015,.18,.18,.12);orb(body,0xf8a7a5,side*.39,.465,-.088,.107,.10,.038);orb(body,0xffe7c7,side*.29,-.37,-.27,.105,.14,.11);orb(body,0xf9b5af,side*.43,-.02,-.31,.083,.071,.05);}
 face(body,.085,-.597,.18,1.3);orb(body,0xe88696,0,-.06,-.641,.055,.041,.024);
 const smile=new THREE.Mesh(new THREE.TorusGeometry(.063,.012,6,16,Math.PI),mat(0x7a4f64));smile.rotation.z=Math.PI;smile.position.set(0,-.11,-.639);body.add(smile);
 orb(body,0xfff2dc,0,-.16,.56,.10,.10,.08);return{root,body};
}
export function createCat(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);orb(body,0xb4a5e7,0,0,0,.62);orb(body,0xfff1e7,0,-.12,-.46,.43,.37,.17);
 for(const side of[-1,1]){const ear=new THREE.Mesh(new THREE.ConeGeometry(.18,.43,3),mat(0xb4a5e7));ear.position.set(side*.36,.55,0);ear.rotation.y=Math.PI/3;ear.rotation.z=-side*.19;body.add(ear);const inner=new THREE.Mesh(new THREE.ConeGeometry(.095,.21,3),mat(0xf5b4cb));inner.position.set(side*.36,.57,-.09);inner.rotation.y=Math.PI/3;inner.rotation.z=-side*.19;body.add(inner);orb(body,0xfff1e7,side*.27,-.4,-.26,.11,.12,.12);box(body,.10,.035,.21,mat(0x8b7ac2),side*.22,.56,-.19);}
 face(body,.10,-.595,.18,1.15);orb(body,0xeb92b3,0,-.055,-.641,.057,.038,.03);const smile=new THREE.Mesh(new THREE.TorusGeometry(.052,.011,6,14,Math.PI),mat(0x786285));smile.rotation.z=Math.PI;smile.position.set(0,-.115,-.639);body.add(smile);for(const side of[-1,1])for(const y of[-.035,.025])box(body,.105,.013,.02,mat(0x786285),side*.34,y,-.537);const curl=new THREE.Mesh(new THREE.TorusGeometry(.19,.067,8,24,Math.PI*1.65),mat(0xb4a5e7));curl.position.set(.31,-.12,.53);curl.rotation.y=.7;body.add(curl);return{root,body};}
export function createDog(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);orb(body,0xe9b77e,0,0,0,.62);orb(body,0xffedd4,0,-.13,-.48,.34,.29,.19);
 for(const side of[-1,1]){orb(body,0x99705f,side*.55,.20,-.12,.14,.32,.13);orb(body,0xffedd4,side*.28,-.4,-.25,.11,.12,.12);}
 face(body,.14,-.575,.18,1.15);orb(body,0x483746,0,-.04,-.668,.08,.06,.04);orb(body,0xf0a5ac,0,-.23,-.645,.06,.065,.025);orb(body,0xffedd4,0,-.12,.59,.1,.14,.1);return{root,body};}
export function createPickup(item){const g=new THREE.Group(),color=item.kind==='letter'?0xffe7a4:item.kind==='up'?0xffa99e:0xa3eddf;const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.05,8,28),mat(color));g.add(ring);
 const stroke=(w,h,x,y)=>box(g,w,h,.1,mat(color),x,y,-.04);if(item.kind==='letter'){const l=item.letter;if(l==='I'){stroke(.095,.53,0,0);stroke(.3,.08,0,.245);stroke(.3,.08,0,-.245);}else{stroke(.09,.53,-.13,0);if(l!=='L')stroke(.28,.09,-.01,.245);if(l!=='L')stroke(.23,.09,-.035,0);if(l!=='F')stroke(.28,.09,-.01,-.245);}}else{const sign=item.kind==='up'?1:-1;stroke(.085,.36,0,0);for(const side of[-1,1]){const arm=box(g,.08,.27,.1,mat(color),side*.09,sign*.15,-.04);arm.rotation.z=side*sign*Math.PI/4;}stroke(.23,.07,0,-sign*.20);}
 g.position.set(item.x,item.y,item.z);return g;}
export function createObstacle(b){const g=new THREE.Group();g.position.set(b.x,b.y,b.z);
 if(b.kind==='mallow'){orb(g,0xffe3e7,0,.32,0,.80,.30,.50);orb(g,0xfff1f0,0,.52,.02,.55,.10,.37);face(g,.34,-.475,.23,.95);orb(g,0xc67b9e,0,.22,-.504,.057,.025,.018);}
 else{orb(g,0xfff1d9,0,.35,0,.26,.35,.26);orb(g,0xfa96b3,0,.79,0,.72,.34,.67);for(const [x,y,z,r]of[[-.32,.94,-.24,.13],[.27,1.025,-.15,.12],[.06,1.095,.18,.105]])orb(g,0xfff4ec,x,y,z,r,.025,r);face(g,.32,-.263,.10,.65);}
 return g;
}
export function createCandyTree(x,y,z,variant=0){const g=new THREE.Group();g.position.set(x,y,z);box(g,.24,2.3,.24,mat(0xd5b6ec),0,1.1,0);orb(g,variant?0xa5ead9:0xfbc1dc,0,2.45,0,1.05,1.3,1.05);orb(g,0xffffff,-.4,2.82,-.62,.21,.32,.12);return g;}
export function createJumpMarker(t){const g=new THREE.Group();for(let i=0;i<3;i++){const z=t.end-8.5+i*2.3,geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-1.05,0,-.25,0,0,.45,1.05,0,-.25],3));const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xffe6a6}));line.position.set(t.x,trackHeight(t,z)+.025,z);line.rotation.z=Math.atan(bankAt(t,z));g.add(line);}return g;}
export function createStageGate(t){const g=new THREE.Group();g.position.set(t.x,t.y,t.start+.8);for(const side of[-1,1]){box(g,.3,3.5,.3,mat(0xb1a1ee),side*(t.width/2+.5),1.6,0);orb(g,0xffd19c,side*(t.width/2+.5),3.55,0,.32);}
 const arc=new THREE.Mesh(new THREE.TorusGeometry(t.width/2+.5,.12,8,48,Math.PI),mat(0xffd6e7));arc.position.y=3.5;g.add(arc);return g;}
export function disposeArt(){for(const m of palette.values())m.dispose();palette.clear();}
