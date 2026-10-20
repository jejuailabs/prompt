// frames=150 size=1280x720
// No Remotion: same scene code, imports switched from `remotion` to the Motion Lite runtime.
import {AbsoluteFill, Easing, FONT, interpolate, spring, useCurrentFrame, useVideoConfig} from '../runtime';

const GOLD = '#FFC93C';

// 1) 같은 0 → 1 움직임에 서로 다른 Easing(속도 곡선)을 붙여 비교합니다.
const EASINGS = [
  {name: 'Easing.linear', fn: Easing.linear},
  {name: 'Easing.inOut(Easing.cubic)', fn: Easing.inOut(Easing.cubic)},
  {name: 'Easing.out(Easing.back(1.7))', fn: Easing.out(Easing.back(1.7))},
  {name: 'Easing.bounce', fn: Easing.bounce},
  {name: 'Easing.elastic(1)', fn: Easing.elastic(1)},
];

const SceneBody = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 2) spring(): 물리 법칙(용수철)으로 0 → 1. config만 바꾸면 느낌이 달라집니다.
  const soft = spring({frame: frame - 20, fps, config: {damping: 200}}); // 튕김 없이 부드럽게
  const bouncy = spring({frame: frame - 20, fps, config: {damping: 8}}); // 통통 튀게

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff', padding: '36px 50px'}}>
      <div style={{fontSize: 44, fontWeight: 900}}>
        <span style={{color: GOLD}}>interpolate()</span> + Easing · <span style={{color: GOLD}}>spring()</span>
      </div>

      {/* 왼쪽: Easing 5종 — 프레임 15~65 동안 0 → 640px, 85~135 동안 다시 돌아오기 */}
      <div style={{position: 'absolute', left: 50, top: 130, width: 760}}>
        {EASINGS.map((e) => {
          const x = interpolate(frame, [15, 65, 85, 135], [0, 640, 640, 0], {
            easing: e.fn,
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div key={e.name} style={{height: 108}}>
              <div style={{fontSize: 24, fontWeight: 700, color: '#cfd8f5'}}>{e.name}</div>
              <div style={{position: 'relative', height: 56, marginTop: 6, borderBottom: '2px solid rgba(255,255,255,0.15)'}}>
                <div style={{position: 'absolute', left: x, top: 6, width: 44, height: 44, borderRadius: 22, background: GOLD}} />
              </div>
            </div>
          );
        })}
      </div>

      {/* 오른쪽: spring 2가지 설정을 크기(scale)로 비교 */}
      {[
        {label: 'damping: 200', sub: '부드럽게 멈춤', v: soft},
        {label: 'damping: 8', sub: '통통 튐', v: bouncy},
      ].map((s, i) => (
        <div key={s.label} style={{position: 'absolute', left: 880, top: 140 + i * 280, width: 340, textAlign: 'center'}}>
          <div style={{height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 150, height: 150, borderRadius: 30, background: GOLD, transform: `scale(${s.v})`}} />
          </div>
          <div style={{fontSize: 28, fontWeight: 900, color: GOLD}}>config: {'{'}{s.label}{'}'}</div>
          <div style={{fontSize: 24, opacity: 0.8}}>{s.sub}</div>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ── 채널 표시: CONNECT AI LAB (모든 예제 공통 · 오른쪽 아래) ──
const BrandMark = () => {
  const {width} = useVideoConfig();
  return (
    <div style={{position: 'absolute', right: Math.round(width * 0.02), bottom: Math.round(width * 0.015), fontFamily: FONT, fontWeight: 800,
      fontSize: Math.round(width / 60), letterSpacing: '0.16em', color: 'rgba(255,255,255,0.88)', textShadow: '0 1px 6px rgba(0,0,0,0.6)'}}>
      CONNECT AI LAB
    </div>
  );
};

export const Scene = () => (
  <AbsoluteFill>
    <SceneBody />
    <BrandMark />
  </AbsoluteFill>
);
