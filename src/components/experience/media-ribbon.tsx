'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

type Props = { images: string[]; titles?: string[]; categories?: string[]; paused?: boolean; selected?: number; onSelect?: (index: number) => void; onOpen?: (index: number) => void; onInteract?: () => void };
const PLATE = '/uploads/seed/hero-background-v5.png';
const REFERENCE = '/uploads/seed/hero-reference-original-v5.png';
const WIDTH = 904, HEIGHT = 356, CROP_TOP = 33, SOURCE_WIDTH = 912, SOURCE_HEIGHT = 566, ASPECT = WIDTH / HEIGHT;
// Coordinates are measured on the original concept. Never stretch this composition.
const TOP = [[67,65],[93,46],[121,39],[220,39],[352,71],[517,133],[668,172],[775,173],[824,161]];
const BOTTOM = [[36,176],[61,163],[106,162],[209,183],[335,224],[501,254],[657,281],[796,282],[864,261]];

export default function MediaRibbon({ images, titles = [], categories = [], paused = false, selected = 0, onSelect, onOpen, onInteract }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const live = useRef({ paused, selected, onSelect, onOpen, onInteract });
  useEffect(() => { live.current = { paused, selected, onSelect, onOpen, onInteract }; }, [paused, selected, onSelect, onOpen, onInteract]);
  const imageKey = JSON.stringify(images.slice(0,5).map((url,i) => [url, titles[i] ?? '', categories[i] ?? '']));
  useEffect(() => {
    const container = host.current; if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha:true, antialias:true, powerPreference:'low-power' }); } catch { return; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0,0); container.appendChild(renderer.domElement);
    let disposed = false, frame = 0, last = 0, time = 0, visible = true, dirty = true, plateReady = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-.5,.5,.5/ASPECT,-.5/ASPECT,.01,10);
    camera.position.z = 2;
    const loader = new THREE.TextureLoader();
    const plate = loader.load(PLATE, texture => { if(disposed){texture.dispose();return;} texture.colorSpace = THREE.SRGBColorSpace; plateReady=true; dirty=true; });
    plate.colorSpace = THREE.SRGBColorSpace;
    const source = loader.load(REFERENCE, texture => { if(disposed){texture.dispose();return;} texture.colorSpace=THREE.SRGBColorSpace; dirty=true; });
    source.colorSpace=THREE.SRGBColorSpace;
    const stageUniforms = { plate:{value:plate}, time:{value:0} };
    const stageMaterial = new THREE.ShaderMaterial({
      uniforms:stageUniforms, depthTest:false, depthWrite:false,
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform sampler2D plate; uniform float time; varying vec2 vUv; void main(){vec2 p=vec2(vUv.x*904./912.,1.-(33.+(1.-vUv.y)*356.)/566.);float water=1.-smoothstep(.31,.60,p.y);float wave=sin(p.y*220.+sin(p.x*9.+time*.16)+time*.4);p.x+=wave*.0008*water;p.y+=sin(p.x*25.-time*.23+p.y*46.)*.0005*water;vec3 c=texture2D(plate,clamp(p,.001,.999)).rgb;c*=1.+wave*.017*water;gl_FragColor=vec4(c,1.);#include <colorspace_fragment>\n}',
    });
    // GLSL includes must begin on their own line.
    stageMaterial.fragmentShader = stageMaterial.fragmentShader.replace(';#include',';\n#include');
    const stageGeometry = new THREE.PlaneGeometry(1,1/ASPECT), stage = new THREE.Mesh(stageGeometry,stageMaterial);
    stage.renderOrder=0; scene.add(stage);
    // Keep the original metal pixels, highlights, silhouette and twist. Only the display area below is live artwork.
    const silhouette=new THREE.Shape();
    silhouette.moveTo(34,178);
    silhouette.bezierCurveTo(31,160,46,104,52,87);
    silhouette.bezierCurveTo(57,57,66,46,111,37);
    silhouette.bezierCurveTo(185,21,261,36,357,69);
    silhouette.lineTo(478,110);
    silhouette.bezierCurveTo(565,80,674,73,743,99);
    silhouette.bezierCurveTo(803,117,819,142,831,179);
    silhouette.lineTo(865,253);
    silhouette.bezierCurveTo(879,280,831,305,787,311);
    silhouette.bezierCurveTo(706,330,637,286,549,266);
    silhouette.lineTo(477,248);
    silhouette.bezierCurveTo(408,283,373,304,319,300);
    silhouette.bezierCurveTo(250,302,202,265,161,245);
    silhouette.bezierCurveTo(111,220,57,204,34,178);
    const metalGeometry=new THREE.ShapeGeometry(silhouette,64), metalPositions=metalGeometry.attributes.position, metalUVs:number[]=[];
    for(let i=0;i<metalPositions.count;i++){
      const x=metalPositions.getX(i),y=metalPositions.getY(i);
      metalUVs.push(x/SOURCE_WIDTH,1-y/SOURCE_HEIGHT);
      metalPositions.setXYZ(i,x/WIDTH-.5,(.5-(y-CROP_TOP)/HEIGHT)/ASPECT,.005);
    }
    metalGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(metalUVs,2));
    const metalMaterial=new THREE.MeshBasicMaterial({map:source,side:THREE.DoubleSide,depthTest:false,depthWrite:false,toneMapped:false});
    const originalMetal=new THREE.Mesh(metalGeometry,metalMaterial);originalMetal.renderOrder=1;scene.add(originalMetal);
    const entries=JSON.parse(imageKey) as [string,string,string][], count=Math.max(entries.length,1), tileWidth=Math.min(1024,Math.floor(renderer.capabilities.maxTextureSize/count)), tileHeight=580;
    const atlasCanvas=document.createElement('canvas'); atlasCanvas.width=tileWidth*count; atlasCanvas.height=tileHeight;
    const context=atlasCanvas.getContext('2d')!; context.fillStyle='#181b18';context.fillRect(0,0,atlasCanvas.width,tileHeight);
    const atlas=new THREE.CanvasTexture(atlasCanvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.wrapS=THREE.RepeatWrapping;atlas.anisotropy=renderer.capabilities.getMaxAnisotropy();
    entries.forEach(([url,title,category],index)=>loader.load(url,source=>{
      if(disposed){source.dispose();return;}
      const img=source.image as HTMLImageElement,x=index*tileWidth,scale=Math.max(tileWidth/img.width,tileHeight/img.height);
      context.save();context.beginPath();context.rect(x,0,tileWidth,tileHeight);context.clip();
      context.drawImage(img,x+(tileWidth-img.width*scale)/2,(tileHeight-img.height*scale)/2,img.width*scale,img.height*scale);
      const gradient=context.createLinearGradient(0,430,0,tileHeight);gradient.addColorStop(0,'#080b0900');gradient.addColorStop(1,'#080b0933');
      context.fillStyle=gradient;context.fillRect(x,410,tileWidth,170);
      context.fillStyle='#fff8eb';context.font='400 12px Arial,sans-serif';context.fillText(category.toUpperCase(),x+30,519);
      context.font='400 19px "Malgun Gothic",sans-serif';context.fillText(title,x+30,548,tileWidth-60);
      context.fillStyle='#d3c4a7';context.fillRect(x,0,3,tileHeight);
      context.restore();atlas.needsUpdate=true;source.dispose();dirty=true;
    }));
    const topCurve=new THREE.CatmullRomCurve3(TOP.map(([x,y])=>new THREE.Vector3(x/WIDTH,(y-CROP_TOP)/HEIGHT,0)),false,'centripetal');
    const bottomCurve=new THREE.CatmullRomCurve3(BOTTOM.map(([x,y])=>new THREE.Vector3(x/WIDTH,(y-CROP_TOP)/HEIGHT,0)),false,'centripetal');
    const points=240,across=10, positions:number[]=[], uvs:number[]=[], plateUvs:number[]=[], indices:number[]=[];
    // Match the original panel seams, including the narrow wrapped panel at the left end.
    const seams=[[0,-.36],[.25,0],[.5,1],[.625,2],[.75,3],[1,4]];
    const surfaceU=(t:number)=>{const i=Math.min(seams.findIndex((entry,index)=>index>0&&t<=entry[0]),seams.length-1);const a=seams[i-1],b=seams[i];return THREE.MathUtils.lerp(a[1],b[1],(t-a[0])/(b[0]-a[0]));};
    for(let i=0;i<=points;i++) {
      const a=topCurve.getPoint(i/points),b=bottomCurve.getPoint(i/points);
      for(let j=0;j<=across;j++){
        const v=j/across, p=a.clone().lerp(b,v);
        positions.push(p.x-.5,(.5-p.y)/ASPECT,.01);uvs.push((surfaceU(i/points)+.36)/4.36,1-v);plateUvs.push(p.x,1-p.y);
        if(i<points&&j<across){const q=i*(across+1)+j,r=q+across+1;indices.push(q,r,q+1,q+1,r,r+1);}
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('plateUv',new THREE.Float32BufferAttribute(plateUvs,2));geometry.setIndex(indices);
    const visibleTiles=4.36, photoUniforms={art:{value:atlas},offset:{value:-.36/count},repeat:{value:visibleTiles/count},fade:{value:1},time:{value:0}};
    const material=new THREE.ShaderMaterial({
      uniforms:photoUniforms,side:THREE.DoubleSide,transparent:true,depthTest:false,depthWrite:false,
      vertexShader:'attribute vec2 plateUv; varying vec2 vUv; varying vec2 vPlate;void main(){vUv=uv;vPlate=plateUv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform sampler2D art;uniform float offset;uniform float repeat;uniform float fade;uniform float time;varying vec2 vUv;varying vec2 vPlate;void main(){vec2 p=vec2(vUv.x*repeat+offset,vUv.y);if(fade<.5)p.x+=sin(vPlate.y*160.+time*.4)*.004;vec3 c=texture2D(art,p).rgb;float curveShade=.77+.23*sin(vUv.x*3.14159);float edge=smoothstep(0.,.009,vUv.y)*smoothstep(0.,.009,1.-vUv.y);c*=curveShade;gl_FragColor=vec4(c,edge*fade);#include <colorspace_fragment>\n}',
    });
    material.fragmentShader=material.fragmentShader.replace(';#include',';\n#include');
    const photos=new THREE.Mesh(geometry,material);photos.renderOrder=2;scene.add(photos);
    const mirrorGeometry=geometry.clone();const mp=mirrorGeometry.attributes.position;
    for(let i=0;i<mp.count;i++)mp.setY(i,-.66/ASPECT-mp.getY(i));
    const mirrorMaterial=material.clone();mirrorMaterial.uniforms={...photoUniforms,fade:{value:.08}};
    const reflection=new THREE.Mesh(mirrorGeometry,mirrorMaterial);reflection.renderOrder=.5;scene.add(reflection);
    let current=live.current.selected,target=current,applied=current,dragging=false,moved=false,startX=0,startValue=0;
    const wrap=(n:number)=>((n%count)+count)%count, raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
    const hit=(event:PointerEvent)=>{
      const r=container.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);raycaster.setFromCamera(pointer,camera);
      const hit=raycaster.intersectObject(photos)[0];return hit?.uv?Math.floor(wrap((hit.uv.x*photoUniforms.repeat.value+photoUniforms.offset.value)*count)):-1;
    };
    const down=(event:PointerEvent)=>{if(event.button!==0)return;dragging=true;moved=false;startX=event.clientX;startValue=current;target=current;container.setPointerCapture(event.pointerId);};
    const move=(event:PointerEvent)=>{if(!dragging)return;const dx=event.clientX-startX;moved||=Math.abs(dx)>6;target=startValue-dx/container.clientWidth*visibleTiles;dirty=true;};
    const up=(event:PointerEvent)=>{
      if(!dragging)return;dragging=false;if(container.hasPointerCapture(event.pointerId))container.releasePointerCapture(event.pointerId);
      if(moved){target=Math.round(target);applied=wrap(target);live.current.onSelect?.(applied);live.current.onInteract?.();}
      else{const index=hit(event);if(index>=0){live.current.onSelect?.(index);live.current.onOpen?.(index);}}
      dirty=true;
    };
    const cancel=()=>{dragging=false;target=Math.round(current);dirty=true;};
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();live.current.onSelect?.(wrap(Math.round(current)+(event.key==='ArrowRight'?1:-1)));live.current.onInteract?.();}
      if(event.key==='Enter')live.current.onOpen?.(wrap(Math.round(current)));
    };
    container.addEventListener('pointerdown',down);container.addEventListener('pointermove',move);container.addEventListener('pointerup',up);container.addEventListener('pointercancel',cancel);container.addEventListener('keydown',keydown);
    const resize=()=>{const w=container.clientWidth,h=Math.max(container.clientHeight,1);renderer.setSize(w,h);camera.left=-.5;camera.right=.5;camera.top=.5/ASPECT;camera.bottom=-.5/ASPECT;camera.updateProjectionMatrix();dirty=true;};
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;dirty=true;});intersection.observe(container);
    const draw=(now:number)=>{
      frame=requestAnimationFrame(draw);if(now-last<1000/30)return;const dt=Math.min((now-last)/1000,.05);last=now;
      if(!visible||document.hidden||!plateReady)return;
      if(live.current.selected!==applied&&!dragging){let delta=live.current.selected-wrap(Math.round(target));if(delta>count/2)delta-=count;if(delta< -count/2)delta+=count;target=Math.round(target)+delta;applied=live.current.selected;dirty=true;}
      const moving=Math.abs(current-target)>.0001;
      if(!dirty&&!moving&&(live.current.paused||reduced.matches))return;
      current=reduced.matches?target:THREE.MathUtils.lerp(current,target,dragging?.62:.085);
      photoUniforms.offset.value=(current-.36)/count;
      if(!live.current.paused&&!reduced.matches)time+=dt;
      stageUniforms.time.value=time;photoUniforms.time.value=time;renderer.render(scene,camera);dirty=false;container.dataset.ready='true';
    };
    frame=requestAnimationFrame(draw);
    return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();intersection.disconnect();container.removeEventListener('pointerdown',down);container.removeEventListener('pointermove',move);container.removeEventListener('pointerup',up);container.removeEventListener('pointercancel',cancel);container.removeEventListener('keydown',keydown);[stageGeometry,geometry,mirrorGeometry,metalGeometry].forEach(g=>g.dispose());[stageMaterial,material,mirrorMaterial,metalMaterial].forEach(m=>m.dispose());plate.dispose();source.dispose();atlas.dispose();renderer.dispose();renderer.domElement.remove();delete container.dataset.ready;};
  },[imageKey]);
  return <div ref={host} className="media-ribbon" tabIndex={0} role="group" aria-label="작품 띠. 좌우로 끌거나 방향키로 작품을 넘기고, 이미지를 클릭하거나 Enter로 열 수 있습니다" style={{backgroundImage:'url('+PLATE+')',backgroundSize:'100% 100%',backgroundRepeat:'no-repeat'}} />;
}
