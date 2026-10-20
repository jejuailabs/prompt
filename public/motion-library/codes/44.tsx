// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReactNode} from 'react';
import {FONT} from './font';

const GOLD = '#FFC93C';
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694, 배경 투명 PNG
const CW = 300;
const CH = Math.round((CW * 694) / 400);
const W = 1280; // 레이어 한 장의 폭 (두 장을 이어 붙여 끝없이 흐르게)

// 1280px마다 딱 반복되는 언덕선: sin 주기를 1280의 약수로 맞추면 이음새가 안 보여요
const ridge = (base: number, amps: number[]) => {
  let line = '';
  for (let x = 0; x <= W; x += 16) {
    const y = base + amps.reduce((s, a, i) => s + a * Math.sin(((i + 2) * Math.PI * 2 * x) / W + i * 1.7), 0);
    line += `${x === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)} `;
  }
  return {line, fill: `${line} L ${W} 720 L 0 720 Z`}; // line = 윗선만, fill = 아래까지 채운 모양
};
const FAR = ridge(400, [55, 30, 12]);
const NEAR = ridge(648, [9, 5]);

// 도시 건물: random(seed)로 폭·높이 정하기 (렌더할 때마다 같은 모양)
const BUILDINGS: {x: number; w: number; h: number}[] = [];
for (let x = 0, i = 0; x < W; i++) {
  const w = 50 + random(`w${i}`) * 70;
  BUILDINGS.push({x, w: w - 8, h: 50 + random(`h${i}`) * 140});
  x += w;
}
const STARS = Array.from({length: 50}, (_, i) => ({x: random(`sx${i}`) * W, y: random(`sy${i}`) * 380, r: 1 + random(`sr${i}`) * 1.8}));
const FLIES = Array.from({length: 22}, (_, i) => ({x: random(`fx${i}`) * W, y: i % 2 ? 110 + random(`fy${i}`) * 150 : 520 + random(`fy${i}`) * 180, r: 2 + random(`fr${i}`) * 7}));

// 레이어: speed(프레임당 px)만큼 왼쪽으로 흐르고, 같은 그림 2장을 붙여 빈틈 없이 반복
const Layer = ({speed, blur = 0, children}: {speed: number; blur?: number; children: ReactNode}) => {
  const f = useCurrentFrame();
  const x = -((f * speed) % W);
  return (
    <AbsoluteFill style={{transform: `translateX(${x}px)`, filter: blur ? `blur(${blur}px)` : undefined}}>
      {[0, W].map((dx) => <svg key={dx} width={W} height={720} style={{position: 'absolute', left: dx}}>{children}</svg>)}
    </AbsoluteFill>
  );
};

const LEGEND = [['하늘 · 달', '× 0'], ['먼 산', '× 0.3 · blur(4px)'], ['도시', '× 0.8 · blur(1.5px)'], ['앞 언덕', '× 2'], ['반딧불', '× 3']];

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cam = interpolate(f, [0, 180], [1, 1.07]); // 카메라가 천천히 다가가기 (scale)
  const bob = Math.sin((f / fps) * Math.PI * 1.6) * 4; // 캐릭터 살짝 걷는 듯한 흔들림

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden', background: '#050914'}}>
      <AbsoluteFill style={{transform: `scale(${cam})`, transformOrigin: '50% 55%'}}>
        {/* 0) 하늘: 움직이지 않는 그라데이션 + 달 */}
        <AbsoluteFill style={{background: 'linear-gradient(#070d26 0%, #1c1a55 45%, #5a2f6e 70%, #e07a5f 100%)'}} />
        <div style={{position: 'absolute', left: 930, top: 90, width: 90, height: 90, borderRadius: '50%', background: '#fff4d6',
          boxShadow: '0 0 60px 20px rgba(255,230,170,0.35)'}} />
        <Layer speed={0.05}>{STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={0.7} />)}</Layer>

        {/* 1) 먼 산: 아주 느리게 + 흐리게 → 멀리 있는 느낌 */}
        <Layer speed={0.3} blur={4}><path d={FAR.fill} fill="#4a3a80" /></Layer>

        {/* 2) 도시: 중간 속도, 창문 불빛은 금색 */}
        <Layer speed={0.8} blur={1.5}>
          {BUILDINGS.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={600 - b.h} width={b.w} height={b.h + 120} fill="#1a1d48" />
              {Array.from({length: Math.floor(b.h / 26)}, (_, r) => [0, 1, 2].map((c) => random(`win${i}-${r}-${c}`) > 0.55 && (
                <rect key={`${r}-${c}`} x={b.x + 8 + c * ((b.w - 16) / 3)} y={600 - b.h + 14 + r * 26} width={8} height={11} fill={GOLD} opacity={0.75} />
              )))}
            </g>
          ))}
        </Layer>

        {/* 3) 캐릭터: 앞 언덕 뒤에 서서 허리 아래가 자연스럽게 가려져요 */}
        <Img src={CHAR} style={{position: 'absolute', left: 640 - CW / 2, top: 735 - CH + bob, width: CW, height: CH}} />

        {/* 4) 앞 언덕: 가장 빠르게 */}
        <Layer speed={2}><path d={NEAR.fill} fill="#0a0f26" /><path d={NEAR.line} fill="none" stroke="#3a4f96" strokeWidth={3} /></Layer>

        {/* 5) 반딧불: 제일 앞, 제일 빠르게 (큰 건 더 흐리게 = 카메라 바로 앞) */}
        <Layer speed={3}>
          {FLIES.map((p, i) => <circle key={i} cx={p.x} cy={p.y + Math.sin(f / 20 + i) * 8} r={p.r} fill={GOLD} opacity={0.5} style={{filter: `blur(${p.r / 3}px)`}} />)}
        </Layer>
      </AbsoluteFill>

      {/* 설명 (카메라 밖, 고정) */}
      <div style={{position: 'absolute', top: 30, left: 50, fontSize: 40, fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>패럴랙스 장면</div>
      <div style={{position: 'absolute', top: 92, left: 50, padding: '14px 20px', borderRadius: 14, background: 'rgba(5,9,20,0.6)', fontSize: 22, lineHeight: 1.65}}>
        <div style={{fontWeight: 800, opacity: 0.8}}>레이어마다 다른 속도 · translateX</div>
        {LEGEND.map(([k, v]) => <div key={k}><b>{k}</b> <span style={{color: GOLD, fontWeight: 800}}>{v}</span></div>)}
      </div>
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
