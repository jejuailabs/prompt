'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ModelPreview } from './model-preview';

type Phase = 'waiting' | 'structure' | 'shape' | 'surface';
const phaseRank: Record<Phase, number> = { waiting: 0, structure: 1, shape: 2, surface: 3 };
const phaseLabel: Record<Phase, string> = {
  waiting: '워커 대기 중 · 점 연출',
  structure: '실제 공간 구조 계산 완료',
  shape: '실제 형상 좌표 계산 완료',
  surface: '실제 메시 표면 계산 완료',
};

interface PreviewData { version: number; phase: Phase; points: number[] }

function isPreviewData(value: unknown): value is PreviewData {
  if (!value || typeof value !== 'object') return false;
  const data = value as Partial<PreviewData>;
  return data.version === 1 && (data.phase === 'structure' || data.phase === 'shape' || data.phase === 'surface')
    && Array.isArray(data.points) && data.points.length >= 3 && data.points.length <= 18_000
    && data.points.length % 3 === 0 && data.points.every(point => typeof point === 'number' && Number.isFinite(point) && Math.abs(point) <= 2);
}

export function GenerationPreview({ previewUrl, finalGlbUrl }: { previewUrl: string; finalGlbUrl?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const updatePoints = useRef<(data: PreviewData) => void>(() => undefined);
  const [phase, setPhase] = useState<Phase>('waiting');
  const [modelReady, setModelReady] = useState(false);
  const handleModelReady = useCallback(() => setModelReady(true), []);

  useEffect(() => {
    if (finalGlbUrl) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let currentRank = 0;
    const poll = async () => {
      try {
        const response = await fetch(previewUrl, { cache: 'no-store' });
        if (response.ok) {
          const data: unknown = await response.json();
          if (!cancelled && isPreviewData(data) && phaseRank[data.phase] > currentRank) {
            currentRank = phaseRank[data.phase];
            setPhase(data.phase);
            updatePoints.current(data);
          }
        }
      } catch { /* The worker may still be preparing its first preview. */ }
      if (!cancelled) timer = setTimeout(poll, 3000);
    };
    void poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [previewUrl, finalGlbUrl]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor('#f4f1fb');
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
    camera.position.set(0.9, 0.45, 1.9);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enableZoom = false;
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const starts = new Float32Array(count * 3);
    const targets = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = i * 2.399963229728653;
      const radius = Math.sqrt((i + 0.5) / count) * 0.45;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.sin(i * 0.31) * 0.2) + (i / count - 0.5) * 0.6;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: '#7441eb', size: 0.012, sizeAttenuation: true, transparent: true, opacity: 0.86 });
    const cloud = new THREE.Points(geometry, material);
    scene.add(cloud);
    let transitionAt = 0;
    let hasRealPoints = false;
    updatePoints.current = data => {
      hasRealPoints = true;
      const sourceCount = data.points.length / 3;
      starts.set(positions);
      for (let i = 0; i < count; i++) {
        const source = (i * 977) % sourceCount;
        targets[i * 3] = data.points[source * 3];
        targets[i * 3 + 1] = data.points[source * 3 + 1];
        targets[i * 3 + 2] = data.points[source * 3 + 2];
      }
      transitionAt = performance.now();
    };
    const resize = new ResizeObserver(() => {
      const width = container.clientWidth, height = container.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(container);
    renderer.setAnimationLoop(() => {
      if (transitionAt) {
        const progress = Math.min(1, (performance.now() - transitionAt) / 1800);
        const eased = 1 - Math.pow(1 - progress, 3);
        for (let i = 0; i < positions.length; i++) positions[i] = starts[i] + (targets[i] - starts[i]) * eased;
        geometry.attributes.position.needsUpdate = true;
        if (progress === 1) transitionAt = 0;
      } else if (!hasRealPoints) {
        cloud.rotation.y += 0.002;
      }
      controls.update();
      renderer.render(scene, camera);
    });
    return () => {
      updatePoints.current = () => undefined;
      resize.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div className="mx-auto w-full max-w-[560px]">
    <div className="relative aspect-square overflow-hidden rounded-xl bg-[#f4f1fb]">
      <div ref={host} className={`absolute inset-0 transition-opacity duration-1000 ${modelReady ? 'opacity-0 pointer-events-none' : 'opacity-100'}`} aria-label="3D 생성 중간 형상" />
      {finalGlbUrl && <div className={`absolute inset-0 transition-opacity duration-1000 ${modelReady ? 'opacity-100' : 'opacity-0'}`}><ModelPreview src={finalGlbUrl} onReady={handleModelReady} /></div>}
      {!modelReady && <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-violet-700 shadow-sm">{phaseLabel[phase]}</div>}
    </div>
    {!finalGlbUrl && <p className="mt-2 text-center text-xs text-muted-foreground">점의 위치는 워커가 전송한 중간 계산 결과에 맞춰 갱신됩니다.</p>}
  </div>;
}
