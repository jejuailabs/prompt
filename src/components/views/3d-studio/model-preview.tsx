'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function ModelPreview({ src }: { src: string }) {
  const host = useRef<HTMLDivElement>(null);
  const playback = useRef({ clip: 0, speed: 1, playing: true, loop: true, skeleton: false });
  const [clips, setClips] = useState<string[]>([]);
  const [bones, setBones] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [clip, setClip] = useState(0);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let model: THREE.Object3D | undefined;
    let helper: THREE.SkeletonHelper | undefined;
    let mixer: THREE.AnimationMixer | undefined;
    let animations: THREE.AnimationClip[] = [];
    let action: THREE.AnimationAction | undefined;
    let currentClip = -1;
    let renderer: THREE.WebGLRenderer;
    setReady(false); setError(''); setClips([]); setBones(0); setClip(0);
    playback.current.clip = 0;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setError('WebGL을 시작하지 못했습니다. 하드웨어 가속을 확인해주세요.'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef0f5');
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7080, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4); scene.add(light);
    const release = (root: THREE.Object3D) => {
      const textures = new Set<THREE.Texture>();
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
          material.dispose();
        }
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      });
      textures.forEach(texture => texture.dispose());
    };
    new GLTFLoader().load(src, (gltf) => {
      if (disposed) { release(gltf.scene); return; }
      model = gltf.scene; scene.add(model);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3()).length() || 1;
      const center = box.getCenter(new THREE.Vector3());
      controls.target.copy(center);
      camera.position.copy(center).add(new THREE.Vector3(size * 0.8, size * 0.35, size * 1.5));
      camera.near = size / 1000; camera.far = size * 100; camera.updateProjectionMatrix();
      controls.minDistance = size * 0.1; controls.maxDistance = size * 10;
      helper = new THREE.SkeletonHelper(model);
      for (const material of Array.isArray(helper.material) ? helper.material : [helper.material]) material.depthTest = false;
      helper.renderOrder = 10; scene.add(helper);
      const joints = new Set<THREE.Bone>();
      model.traverse(object => { if (object instanceof THREE.SkinnedMesh) object.skeleton.bones.forEach(bone => joints.add(bone)); });
      setBones(joints.size);
      animations = gltf.animations;
      mixer = new THREE.AnimationMixer(model);
      setClips(animations.map((item, i) => item.name || `동작 ${i + 1}`)); setReady(true);
    }, undefined, () => { if (!disposed) setError('3D 파일을 불러오지 못했습니다. 파일 주소·권한을 확인해주세요.'); });
    const observer = new ResizeObserver(() => {
      const width = container.clientWidth, height = container.clientHeight;
      renderer.setSize(width, height); camera.aspect = width / Math.max(height, 1); camera.updateProjectionMatrix();
    });
    observer.observe(container);
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const state = playback.current;
      if (mixer && animations.length && currentClip !== state.clip) {
        mixer.stopAllAction();
        action = mixer.clipAction(animations[state.clip]); action.reset().play(); currentClip = state.clip;
      }
      if (action) {
        action.setLoop(state.loop ? THREE.LoopRepeat : THREE.LoopOnce, state.loop ? Infinity : 1);
        action.clampWhenFinished = true;
      }
      const delta = Math.min(clock.getDelta(), 0.1);
      if (mixer && state.playing) mixer.update(delta * state.speed);
      if (helper) helper.visible = state.skeleton;
      controls.update(); renderer.render(scene, camera);
    });
    return () => {
      disposed = true; observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose();
      mixer?.stopAllAction(); if (model) { mixer?.uncacheRoot(model); release(model); }
      helper?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [src]);

  return <div className="w-full space-y-2">
    <div ref={host} className="h-80 w-full overflow-hidden rounded-lg" aria-label="3D 모델: 드래그로 회전, 휠로 확대·축소" />
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : !ready ? <p role="status">3D 불러오는 중…</p> : <>
      <p className="text-xs text-muted-foreground">{bones ? `스킨에 연결된 뼈 ${bones}개` : '정적 메시 · 리깅 없음'} · 내장 동작 {clips.length}개</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label><input type="checkbox" disabled={!bones} onChange={e => { playback.current.skeleton = e.target.checked; }} /> 뼈대 표시</label>
        {!!clips.length && <>
          <select aria-label="애니메이션 선택" value={clip} onChange={e => { const n = Number(e.target.value); setClip(n); playback.current.clip = n; }}>
            {clips.map((name, i) => <option key={i} value={i}>{name}</option>)}
          </select>
          <button type="button" className="rounded border px-2 py-1" onClick={() => { playback.current.playing = !playing; setPlaying(!playing); }}>{playing ? '일시정지' : '재생'}</button>
          <label>속도 <select defaultValue="1" onChange={e => { playback.current.speed = Number(e.target.value); }}>
            {[0.25, 0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
          </select></label>
          <label><input type="checkbox" defaultChecked onChange={e => { playback.current.loop = e.target.checked; }} /> 반복</label>
        </>}
      </div>
      {!clips.length && <p className="text-xs text-muted-foreground">이 파일에는 애니메이션이 없습니다. 모션 적용 후 결과를 확인하세요.</p>}
    </>}
  </div>;
}
