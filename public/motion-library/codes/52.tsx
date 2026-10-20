// frames=240 size=1280x720
import {AbsoluteFill, Img, interpolate, interpolateColors, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './font';

// ── 여기만 바꾸면 내 제품 라인업이 돼요 (제품 수는 늘리거나 줄여도 OK) ──
const BASE = 'https://www.aicitybuilders.com/video/remotion/assets/';
const PRODUCTS = [
  {src: BASE + 'product_can.png', w: 409, h: 900, show: 400, name: '스파클링 캔', tag: 'NEW', price: '1,900원', bg: '#2A4FD6'},
  {src: BASE + 'product_juice.png', w: 400, h: 900, show: 420, name: '생오렌지 주스', tag: 'BEST', price: '3,500원', bg: '#F26B1D'},
  {src: BASE + 'product_chips_bag.png', w: 900, h: 540, show: 320, name: '포테이토 칩', tag: 'HOT', price: '2,800원', bg: '#D7263D'},
];
const TITLE = '이번 주 라인업'; // 왼쪽 위 작은 제목
const STEP = 80; // 제품 하나가 주인공인 시간(프레임)
const GAP = 440; // 제품 사이 간격(px)

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 1) p = 지금 가운데 있는 제품 번호(소수). 0 → 1 → 2 로 스프링처럼 넘어가요
  let p = interpolate(spring({frame: f, fps, config: {damping: 15}}), [0, 1], [-1.6, 0]);
  for (let i = 1; i < PRODUCTS.length; i++) p += spring({frame: f - i * STEP, fps, config: {damping: 15}});
  const cur = Math.min(PRODUCTS.length - 1, Math.max(0, Math.round(p)));

  // 2) 배경색: p 값에 맞춰 제품 색끼리 부드럽게 섞기 (interpolateColors)
  const idx = PRODUCTS.map((_, i) => i);
  const bg = interpolateColors(Math.max(0, p), idx, PRODUCTS.map((x) => x.bg));

  // 3) 문구는 제품이 바뀔 때마다 아래에서 올라오기
  const textIn = spring({frame: f - cur * STEP - 10, fps, config: {damping: 14}});

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: bg}}>
      {/* 가운데 밝은 빛 + 바깥 어둡게 → 입체감 */}
      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 42%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,0.38) 100%)'}} />
      {/* 뒤쪽 큰 번호 01 / 02 / 03 */}
      <div style={{position: 'absolute', width: '100%', top: 10, textAlign: 'center', fontSize: 420, fontWeight: 900, lineHeight: 1,
        color: 'rgba(255,255,255,0.12)', letterSpacing: '-0.04em'}}>{String(cur + 1).padStart(2, '0')}</div>

      {/* 제품 줄: 가운데에서 멀수록 작고 흐리게 (포커스 효과) */}
      {PRODUCTS.map((it, i) => {
        const d = Math.min(1.5, Math.abs(i - p)); // 가운데와의 거리
        const scale = interpolate(d, [0, 1], [1, 0.62], {extrapolateRight: 'clamp'});
        const w = (it.show * it.w) / it.h;
        return (
          <div key={i} style={{position: 'absolute', left: 640 + (i - p) * GAP - w / 2, top: 300 - it.show / 2, width: w, height: it.show,
            transform: `scale(${scale}) rotate(${(i - p) * 6}deg)`, opacity: interpolate(d, [0, 1, 1.5], [1, 0.55, 0]),
            filter: `blur(${d * 3}px) drop-shadow(0 28px 30px rgba(0,0,0,0.35))`}}>
            {/* 바닥 그림자 */}
            <div style={{position: 'absolute', left: '5%', right: '5%', bottom: -26, height: 30, borderRadius: '50%', background: 'radial-gradient(closest-side, rgba(0,0,0,0.4), transparent)'}} />
            <Img src={it.src} style={{width: '100%', height: '100%', transform: `translateY(${Math.sin((f + i * 20) / 16) * 6}px)`}} />
          </div>
        );
      })}

      {/* 아래 문구: 태그 + 제품명 + 가격 */}
      <div style={{position: 'absolute', top: 500, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#fff',
        opacity: textIn, transform: `translateY(${(1 - textIn) * 40}px)`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{fontSize: 18, fontWeight: 900, letterSpacing: '0.2em', padding: '4px 12px', borderRadius: 6, background: '#fff', color: PRODUCTS[cur].bg}}>
            {PRODUCTS[cur].tag}</div>
          <div style={{fontSize: 60, fontWeight: 900, textShadow: '0 4px 20px rgba(0,0,0,0.25)'}}>{PRODUCTS[cur].name}</div>
        </div>
        <div style={{marginTop: 12, fontSize: 40, fontWeight: 800, padding: '6px 30px', borderRadius: 40, background: 'rgba(0,0,0,0.25)',
          border: '2px solid rgba(255,255,255,0.6)'}}>{PRODUCTS[cur].price}</div>
      </div>

      {/* 왼쪽 위 제목 + 오른쪽 위 페이지 점 */}
      <div style={{position: 'absolute', left: 40, top: 34, color: '#fff', fontSize: 26, fontWeight: 800, letterSpacing: '0.04em'}}>{TITLE}</div>
      <div style={{position: 'absolute', right: 40, top: 44, display: 'flex', gap: 10}}>
        {PRODUCTS.map((_, i) => (
          <div key={i} style={{height: 10, borderRadius: 5, background: '#fff', opacity: i === cur ? 1 : 0.4, width: i === cur ? 34 : 10}} />
        ))}
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
