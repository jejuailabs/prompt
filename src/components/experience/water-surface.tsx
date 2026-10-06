'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/** The stage stays still; only the water below the horizon gently refracts its reflection. */
export default function WaterSurface({ paused = false }: { paused?: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const pause = useRef(paused);
  useEffect(() => { pause.current = paused; }, [paused]);
  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
    catch { return; }
    let disposed = false, frame = 0, last = 0, elapsed = 0, visible = true, ready = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    container.appendChild(renderer.domElement);
    const uniforms = { stage: { value: new THREE.Texture() }, time: { value: 0 }, crop: { value: new THREE.Vector2(1, 1) } };
    const material = new THREE.ShaderMaterial({
      uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `
        uniform sampler2D stage;
        uniform float time;
        uniform vec2 crop;
        varying vec2 vUv;
        void main() {
          vec2 p = vec2((vUv.x - .5) * crop.x + .5, vUv.y * crop.y);
          float water = 1. - smoothstep(.07, .375, p.y);
          float wave = sin(p.y * 95. + sin(p.x * 8. + time * .21) * 1.6 + time * .38);
          float crossWave = sin(p.x * 21. - time * .32 + p.y * 18.);
          vec2 drift = vec2(wave * .0021, crossWave * .0013 + wave * .0007) * water;
          vec3 color = texture2D(stage, clamp(p + drift, .001, .999)).rgb;
          color *= 1. + water * wave * .032;
          gl_FragColor = vec4(color, 1.);
          #include <colorspace_fragment>
        }
      `,
    });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const scene = new THREE.Scene(); scene.add(new THREE.Mesh(geometry, material));
    const camera = new THREE.Camera();
    const resize = () => {
      const width = container.clientWidth, height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height);
      const ratio = width / height / (1672 / 941);
      uniforms.crop.value.set(Math.min(ratio, 1), Math.min(1 / ratio, 1));
    };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }); intersection.observe(container);
    new THREE.TextureLoader().load('/uploads/seed/hero-stage-v2.png', texture => {
      if (disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      uniforms.stage.value.dispose(); uniforms.stage.value = texture; ready = true;
    });
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 1000 / 30) return;
      const dt = Math.min((now - last) / 1000, .05); last = now;
      if (!visible || document.hidden || !ready) return;
      if (!pause.current && !reduced.matches) elapsed += dt;
      uniforms.time.value = elapsed;
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect();
      uniforms.stage.value.dispose(); material.dispose(); geometry.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);
  return <div ref={host} className="hero-water" aria-hidden="true" />;
}
