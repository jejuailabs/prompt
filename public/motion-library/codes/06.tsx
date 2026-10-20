// frames=180 size=1280x720
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {CameraMotionBlur, Trail} from '@remotion/motion-blur';
import type {ReactNode} from 'react';
import {FONT} from './font';

const GOLD = '#FFC93C';
const W = 380;
const H = 440;

// 빠르게 휙 들어와서 한 바퀴 돌고 휙 나가는 카드 (3초마다 반복)
const FastCard = () => {
  const f = useCurrentFrame();
  const p = (f % 90) / 90; // 0 → 1 반복
  const ease = {easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const x = interpolate(p, [0, 0.25, 0.65, 0.9], [-200, W / 2, W / 2, W + 200], ease);
  const spin = interpolate(p, [0.28, 0.6], [0, 360], ease);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute', left: x - 120, top: H / 2 - 80, width: 240, height: 160, borderRadius: 24,
          background: GOLD, color: '#050914', transform: `rotate(${spin}deg)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52, fontWeight: 900,
        }}
      >
        에이전트
      </div>
    </AbsoluteFill>
  );
};

const Panel = ({title, sub, children}: {title: string; sub: string; children: ReactNode}) => (
  <div style={{width: W}}>
    <div style={{position: 'relative', width: W, height: H, borderRadius: 18, overflow: 'hidden', background: '#13224d'}}>{children}</div>
    <div style={{fontSize: 28, fontWeight: 900, color: GOLD, marginTop: 12}}>{title}</div>
    <div style={{fontSize: 20, opacity: 0.85}}>{sub}</div>
  </div>
);

const SceneBody = () => (
  <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
    <div style={{position: 'absolute', top: 30, width: '100%', textAlign: 'center', fontSize: 42, fontWeight: 900}}>
      같은 움직임 · 모션 블러 비교
    </div>
    <div style={{position: 'absolute', top: 110, left: 40, right: 40, display: 'flex', justifyContent: 'space-between'}}>
      <Panel title="효과 없음" sub="뚝뚝 끊겨 보임">
        <FastCard />
      </Panel>

      {/* Trail: 바로 전 프레임들을 겹쳐 "잔상 꼬리"를 만듦 */}
      <Panel title="<Trail>" sub="layers={8} lagInFrames={1}">
        <Trail layers={8} lagInFrames={1} trailOpacity={0.8}>
          <FastCard />
        </Trail>
      </Panel>

      {/* CameraMotionBlur: 카메라 셔터처럼 프레임 사이를 평균 → 자연스러운 번짐
          ⚠️ shutterAngle={0} 은 오류가 남 → 끄고 싶으면 0.01 이상 */}
      <Panel title="<CameraMotionBlur>" sub="shutterAngle={300} samples={10}">
        <CameraMotionBlur shutterAngle={300} samples={10}>
          <FastCard />
        </CameraMotionBlur>
      </Panel>
    </div>
  </AbsoluteFill>
);

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
