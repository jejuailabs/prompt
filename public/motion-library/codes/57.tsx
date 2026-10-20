// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './font';

// ── 여기만 바꾸면 내 제품 라인업 쇼케이스가 돼요 ──
const BASE = 'https://www.aicitybuilders.com/video/remotion/assets/';
// 가운데 받침대 위 주인공. 아래가 잘린 사진도 받침대가 가려 줘요
// base = 사진 아래쪽에서 제품이 닿는 부분의 가운데(가로 비율 0~1) → 받침대 가운데에 맞춰져요
const HERO = {src: BASE + 'product_pringles.png', w: 520, ratio: 715 / 1000, base: 0.685};
const SIDES = [
  {src: BASE + 'product_can.png', h: 330, ratio: 409 / 900, x: 215, delay: 22},
  {src: BASE + 'product_juice.png', h: 350, ratio: 400 / 900, x: 1075, delay: 32},
];
const EYEBROW = 'NEW LINEUP';
const HEADLINE = '오늘의 간식';
const NOTE = '교육용 예시 · 해당 브랜드와 관계없음';
const BG = ['#1E2560', '#070A1F']; // 스튜디오 배경 (위 → 아래)
const FLOOR = 545; // 바닥선 y
const PED_X = 700; // 받침대 가운데 x (주인공 사진 모양에 맞춰 살짝 오른쪽)
const RX = 200; // 받침대 반지름(가로)
const RY = 24; // 받침대 윗면 타원 반지름(세로)
const PED_H = 90; // 받침대 높이

// 조명 속 먼지 입자
const DUST = new Array(22).fill(0).map((_, i) => ({x: PED_X - 170 + random(`x${i}`) * 340, y: random(`y${i}`) * 520, s: 2 + random(`s${i}`) * 3}));

// 무대 한 벌 (받침대 + 제품). 반사도 이걸 뒤집어서 한 번 더 그려요
const Stage = ({f, fps}: {f: number; fps: number}) => {
  const top = FLOOR - PED_H; // 받침대 윗면 중심 y
  const hero = spring({frame: f - 8, fps, config: {damping: 14}});
  const heroH = HERO.w * HERO.ratio;
  // 회전대 느낌: rotateY 각도를 sin으로 천천히 왕복 (perspective가 있어야 입체로 보여요)
  const sway = (phase: number) => `perspective(900px) rotateY(${Math.sin((f + phase) / 28) * 14}deg)`;
  const cyl = `M ${-RX} 0 L ${-RX} ${PED_H} A ${RX} ${RY} 0 0 0 ${RX} ${PED_H} L ${RX} 0 Z`; // 받침대 옆면
  const lip = `M ${-RX} 0 A ${RX} ${RY} 0 0 0 ${RX} 0 Z`; // 윗면 앞쪽 반원 (제품 아래 잘린 부분을 가림)
  return (
    <AbsoluteFill>
      {/* 1) 받침대 윗면(뒤) → 2) 주인공 제품 → 3) 받침대 옆면+윗면 앞쪽 순서로 겹치기 */}
      <div style={{position: 'absolute', left: PED_X - RX, top: top - RY, width: RX * 2, height: RY * 2, borderRadius: '50%', background: '#39418C'}} />
      <Img src={HERO.src} style={{position: 'absolute', left: PED_X - HERO.w * HERO.base, top: top + 6 - heroH, width: HERO.w, height: heroH,
        transformOrigin: `${HERO.base * 100}% 100%`, transform: `${sway(0)} translateY(${(1 - hero) * 120}px) scale(${0.85 + hero * 0.15})`, opacity: hero}} />
      <svg width={RX * 2} height={PED_H + RY} viewBox={`${-RX} 0 ${RX * 2} ${PED_H + RY}`} style={{position: 'absolute', left: PED_X - RX, top}}>
        <defs><linearGradient id="ped" x1="0" x2="1"><stop offset="0" stopColor="#0E1236" /><stop offset="0.45" stopColor="#3A4396" /><stop offset="1" stopColor="#0E1236" /></linearGradient></defs>
        <path d={cyl} fill="url(#ped)" />
        <path d={lip} fill="#39418C" />
        <path d={`M ${-RX} 0 A ${RX} ${RY} 0 0 0 ${RX} 0`} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
      </svg>
      {/* 양옆 제품: 바닥에 세우고 옆에서 미끄러져 들어오기 */}
      {SIDES.map((s, i) => {
        const p = spring({frame: f - s.delay, fps, config: {damping: 15}});
        const w = s.h * s.ratio;
        return <Img key={i} src={s.src} style={{position: 'absolute', left: s.x - w / 2, top: FLOOR - s.h, width: w, height: s.h, opacity: p,
          transformOrigin: '50% 100%', transform: `${sway(40 + i * 50)} translateX(${(1 - p) * (s.x < PED_X ? -300 : 300)}px)`}} />;
      })}
    </AbsoluteFill>
  );
};

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
  const light = interpolate(f, [0, 3, 5, 8, 14], [0, 0.8, 0.2, 1, 1], clamp); // 조명 깜빡이며 켜짐
  const text = spring({frame: f - 50, fps, config: {damping: 16}});

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: `linear-gradient(${BG[0]}, ${BG[1]} 75%)`}}>
      {/* 스포트라이트: 위가 좁고 아래가 넓은 사다리꼴 + 흐림 */}
      <div style={{position: 'absolute', left: PED_X - 420, top: -40, width: 840, height: FLOOR + 60, opacity: light * 0.55, filter: 'blur(36px)'}}>
        <div style={{width: '100%', height: '100%', clipPath: 'polygon(42% 0, 58% 0, 92% 100%, 8% 100%)',
          background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,240,210,0.8), rgba(255,240,210,0.05))'}} />
      </div>
      {DUST.map((d, i) => (
        <div key={i} style={{position: 'absolute', left: d.x, top: (d.y - f * 0.6 + 600) % 520, width: d.s, height: d.s, borderRadius: '50%',
          background: '#fff', opacity: light * 0.35}} />
      ))}
      {/* 바닥: 반들반들한 면 + 조명 웅덩이 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: FLOOR, bottom: 0, background: 'linear-gradient(#1A2154, #05071A)', boxShadow: '0 -30px 60px rgba(40,50,120,0.35)'}} />
      <div style={{position: 'absolute', left: PED_X - 520, top: FLOOR - 40, width: 1040, height: 110, borderRadius: '50%', opacity: light,
        background: 'radial-gradient(closest-side, rgba(255,235,200,0.28), transparent)'}} />

      {/* 바닥 반사: 무대를 위아래로 뒤집고(scaleY -1) 바닥선 근처만 보이게 마스크 */}
      <AbsoluteFill style={{transformOrigin: '0 0', transform: `translateY(${FLOOR * 2}px) scaleY(-1)`, opacity: 0.3,
        WebkitMaskImage: `linear-gradient(transparent ${FLOOR - 160}px, #000 ${FLOOR}px)`}}>
        <Stage f={f} fps={fps} />
      </AbsoluteFill>
      <Stage f={f} fps={fps} />

      {/* 문구 */}
      <div style={{position: 'absolute', left: 50, top: 46, color: '#fff', opacity: text, transform: `translateY(${(1 - text) * 30}px)`}}>
        <div style={{fontSize: 20, fontWeight: 800, letterSpacing: '0.4em', color: '#FFD98A'}}>{EYEBROW}</div>
        <div style={{fontSize: 64, fontWeight: 900, lineHeight: 1.15}}>{HEADLINE}</div>
      </div>
      <div style={{position: 'absolute', left: 26, bottom: 20, fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.75)'}}>{NOTE}</div>
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
