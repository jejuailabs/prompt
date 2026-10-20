// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {StrikeThrough} from '@remotion/rough-notation';
import {FONT} from './font';

// ── 여기만 바꾸면 내 제품 할인 광고가 돼요 (브랜드 없는 내 제품에만 가격·할인 표시!) ──
const PRODUCT = 'https://www.aicitybuilders.com/video/remotion/assets/product_chips_bowl.png'; // 배경이 투명한 PNG
const RATIO = 713 / 900; // 세로 ÷ 가로
const NAME = '바삭 포테이토 칩';
const OLD_PRICE = '4,500원';
const NEW_PRICE = '3,150원';
const OFF = '30%';
const RED = '#D3122F';
const YELLOW = '#FFD400';
const TICKER = ['오늘만 특가', 'TODAY ONLY']; // 위쪽 띠에 흐르는 문구
const CELL = 260; // 띠 문구 한 칸 너비(px) → 칸 너비가 같아야 끊김 없이 반복돼요

const PW = 560;
const PH = PW * RATIO;

// 별 모양 배지 꼭짓점 만들기 (뾰족 22개)
const STAR = new Array(44).fill(0).map((_, i) => {
  const r = i % 2 ? 84 : 100;
  const a = (i / 44) * Math.PI * 2;
  return `${100 + r * Math.cos(a)},${100 + r * Math.sin(a)}`;
}).join(' ');

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // 1) 제품: 왼쪽에서 들어오기
  const inP = spring({frame: f, fps, config: {damping: 14}});
  // 2) 가격표: 위에서 툭 떨어진 뒤, 점점 줄어드는 진자 운동 (exp로 감쇠 × cos로 왕복)
  const drop = spring({frame: f - 10, fps, config: {damping: 16}});
  const t = Math.max(0, f - 10);
  const swing = 28 * Math.exp(-t / 24) * Math.sin(t * 0.2);
  // 3) 별 배지: 튀어나오며 커졌다가 제자리 + 천천히 회전
  const badge = spring({frame: f - 50, fps, config: {damping: 8, mass: 0.7}});
  // 4) 옛 가격 줄긋기 → 새 가격 쾅
  const strike = interpolate(f, [75, 92], [0, 1], clamp);
  const newP = spring({frame: f - 92, fps, config: {damping: 10}});
  // 5) 카운트다운: 1초(30프레임)마다 1초씩 줄어듦
  const left = 23 * 3600 + 59 * 60 + 59 - Math.floor(f / 30);
  const hms = [Math.floor(left / 3600), Math.floor(left / 60) % 60, left % 60].map((n) => String(n).padStart(2, '0')).join(':');

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: `radial-gradient(circle at 30% 55%, #F0283F 0%, ${RED} 40%, #6E0616 100%)`}}>
      {/* 제품 + 바닥 그림자 */}
      <div style={{position: 'absolute', left: 390 - 200, top: 590, width: 400, height: 50, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.45), transparent)'}} />
      <Img src={PRODUCT} style={{position: 'absolute', left: 390 - PW / 2, top: 375 - PH / 2, width: PW, height: PH,
        transform: `translateX(${(1 - inP) * -700}px) rotate(${(1 - inP) * -20}deg)`, filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.4))'}} />

      {/* 별 배지 30% OFF */}
      <div style={{position: 'absolute', left: 540, top: 120, width: 200, height: 200, transform: `scale(${badge}) rotate(${-12 + Math.sin(f / 10) * 4}deg)`}}>
        <svg width={200} height={200} style={{position: 'absolute', transform: `rotate(${f * 0.8}deg)`}}>
          <polygon points={STAR} fill={YELLOW} stroke="#fff" strokeWidth={4} />
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: RED}}>
          <div style={{fontSize: 58, fontWeight: 900, lineHeight: 1}}>{OFF}</div>
          <div style={{fontSize: 30, fontWeight: 900, letterSpacing: '0.1em'}}>OFF</div>
        </div>
      </div>

      {/* 가격표: 핀(실 끝)을 기준점(transformOrigin)으로 흔들기 */}
      <div style={{position: 'absolute', left: 930 - 180, top: 92, width: 360, transformOrigin: '180px 0px', transform: `translateY(${(1 - drop) * -520}px) rotate(${swing}deg)`}}>
        <div style={{position: 'absolute', left: 178, top: 0, width: 4, height: 70, background: '#f4e3c3'}} />
        <div style={{position: 'absolute', left: 168, top: -10, width: 24, height: 24, borderRadius: 12, background: '#222', border: '4px solid #f4e3c3'}} />
        <div style={{marginTop: 66, background: '#FFF8EC', borderRadius: 26, padding: '42px 30px 30px', textAlign: 'center', boxShadow: '0 30px 50px rgba(0,0,0,0.35)',
          clipPath: 'polygon(30% 0, 70% 0, 100% 14%, 100% 100%, 0 100%, 0 14%)'}}>
          <div style={{width: 22, height: 22, borderRadius: 11, background: '#6E0616', margin: '-24px auto 14px'}} />
          <div style={{fontSize: 30, fontWeight: 800, color: '#333'}}>{NAME}</div>
          <div style={{fontSize: 34, fontWeight: 700, color: '#888', marginTop: 10, display: 'inline-block'}}>
            {/* rough-notation 줄긋기: progress에 0~1 */}
            <StrikeThrough progress={strike} color={RED} strokeWidth={4} iterations={2} seed={3}>{OLD_PRICE}</StrikeThrough>
          </div>
          <div style={{fontSize: 84, fontWeight: 900, color: RED, lineHeight: 1.1, transform: `scale(${newP})`}}>{NEW_PRICE}</div>
        </div>
      </div>

      {/* 오늘만 카운트다운 */}
      <div style={{position: 'absolute', left: 930 - 170, top: 480, width: 340, display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center',
        opacity: interpolate(f, [100, 115], [0, 1], clamp), color: '#fff'}}>
        <div style={{background: YELLOW, color: '#111', fontWeight: 900, fontSize: 24, padding: '4px 12px', borderRadius: 8}}>오늘만</div>
        <div style={{fontSize: 34, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em'}}>{hms}</div>
      </div>
      {/* 위쪽 흐르는 띠 (마퀴) — 맨 마지막에 그려서 가격표보다 위에 보이게 */}
      <div style={{position: 'absolute', top: 0, height: 52, width: '100%', background: '#111', overflow: 'hidden'}}>
        <div style={{display: 'flex', color: YELLOW, fontSize: 26, fontWeight: 900, lineHeight: '52px', transform: `translateX(${-((f * 4) % (CELL * 2))}px)`}}>
          {new Array(12).fill(0).map((_, i) => <div key={i} style={{width: CELL, flexShrink: 0, textAlign: 'center'}}>{TICKER[i % 2]}  ★</div>)}</div>
      </div>

      <div style={{position: 'absolute', left: 60, bottom: 46, color: '#fff', fontSize: 44, fontWeight: 900, opacity: inP}}>지금이 제일 쌀 때</div>
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
