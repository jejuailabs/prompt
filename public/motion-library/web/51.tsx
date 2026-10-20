// frames=180 size=1280x720
// No Remotion: same scene code, imports switched from `remotion` to the Motion Lite runtime.
import {AbsoluteFill, FONT, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig} from '../runtime';

// ── 여기만 바꾸면 내 제품 광고가 돼요 ──
const PRODUCT = 'https://www.aicitybuilders.com/video/remotion/assets/product_coke.png'; // 배경이 투명한 PNG
const RATIO = 369 / 900; // 제품 이미지 가로 ÷ 세로
const MAIN = '#E4002B'; // 제품 대표색 (배경)
const DEEP = '#3a0008'; // 바깥쪽 어두운 색
const COPY_L = '시원하게'; // 제품 왼쪽 문구
const COPY_R = '한 캔'; // 제품 오른쪽 문구
const BACK_WORD = 'REFRESH'; // 제품 뒤 큰 글자
const NOTE = '교육용 예시 · 해당 브랜드와 관계없음'; // 실제 브랜드를 쓸 때 꼭 넣기

const H = 560; // 제품 높이(px)
const W = H * RATIO;

// 반짝이(물방울 빛) 위치: random(seed)로 고정 → 렌더할 때마다 같은 자리
const SPARKS = new Array(14).fill(0).map((_, i) => ({
  x: 0.15 + random(`sx${i}`) * 0.7, // 제품 안쪽 비율(0~1)
  y: 0.08 + random(`sy${i}`) * 0.84,
  size: 10 + random(`ss${i}`) * 16,
  delay: random(`sd${i}`) * 60,
}));

// 4갈래 반짝이 모양
const Sparkle = ({size, opacity}: {size: number; opacity: number}) => (
  <svg width={size} height={size} viewBox="-10 -10 20 20" style={{opacity, filter: 'drop-shadow(0 0 4px #fff)'}}>
    <path d="M0 -10 Q1 -1 10 0 Q1 1 0 10 Q-1 1 -10 0 Q-1 -1 0 -10Z" fill="#fff" />
  </svg>
);

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // 1) 제품 등장: 아래에서 스프링으로 솟아오르며 살짝 기울어짐
  const rise = spring({frame: f - 8, fps, config: {damping: 13, mass: 1.1}});
  const y = interpolate(rise, [0, 1], [620, 0]);
  const tilt = interpolate(rise, [0, 1], [-18, -6]) + Math.sin(f / 22) * 1.2; // 등장 후엔 아주 천천히 흔들
  const float = Math.sin(f / 18) * 6; // 둥실둥실

  // 2) 빛줄기 회전 + 빛 쓸기(사선 하이라이트) 위치
  const rays = interpolate(f, [0, 30], [0, 1], clamp);
  const sweep = interpolate(f, [55, 90], [-60, 160], clamp); // % 단위로 왼→오 이동

  // 3) 문구: 양옆에서 미끄러져 들어오기
  const txt = (d: number) => spring({frame: f - d, fps, config: {damping: 16}});
  const flash = interpolate(f, [40, 44, 60], [0, 0.55, 0], clamp); // 착지 순간 번쩍

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: `radial-gradient(circle at 50% 55%, ${MAIN} 0%, #9c0018 45%, ${DEEP} 100%)`}}>
      {/* 회전하는 빛줄기: conic-gradient를 반복해서 부채꼴 줄무늬 → 가운데만 보이게 radial 마스크 */}
      <AbsoluteFill style={{opacity: rays * 0.5, transform: `rotate(${f * 0.35}deg) scale(1.8)`,
        background: 'repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,255,255,0.22) 0deg 6deg, transparent 6deg 18deg)',
        WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0%, transparent 45%)'}} />

      {/* 제품 뒤 큰 글자 */}
      <AbsoluteFill style={{alignItems: 'center', top: 70}}>
        <div style={{fontSize: 230, fontWeight: 900, letterSpacing: '0.04em', color: 'transparent', WebkitTextStroke: '3px rgba(255,255,255,0.28)',
          transform: `scale(${interpolate(f, [20, 180], [1.15, 1])})`, opacity: interpolate(f, [20, 45], [0, 1], clamp)}}>{BACK_WORD}</div>
      </AbsoluteFill>

      {/* 바닥 그림자 */}
      <div style={{position: 'absolute', left: 640 - 150, top: 650, width: 300, height: 40, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(0,0,0,0.55), transparent)', opacity: rise}} />

      {/* 제품 + 빛 쓸기 + 반짝이를 한 묶음으로 움직이기 */}
      <div style={{position: 'absolute', left: 640 - W / 2, top: 360 - H / 2 + 10, width: W, height: H,
        transform: `translateY(${y + float}px) rotate(${tilt}deg)`}}>
        <Img src={PRODUCT} style={{width: W, height: H, filter: 'drop-shadow(0 30px 40px rgba(0,0,0,0.5))'}} />
        {/* 빛 쓸기: 제품 모양으로 마스크한 사선 그라데이션을 옆으로 이동 */}
        <div style={{position: 'absolute', inset: 0, mixBlendMode: 'screen',
          WebkitMaskImage: `url(${PRODUCT})`, WebkitMaskSize: '100% 100%',
          background: `linear-gradient(110deg, transparent ${sweep - 18}%, rgba(255,255,255,0.85) ${sweep}%, transparent ${sweep + 18}%)`}} />
        {SPARKS.map((s, i) => {
          const t = (f - 50 - s.delay) / 30; // 반짝: 0→1→0
          const o = t > 0 ? Math.max(0, Math.sin(t * Math.PI)) * (t < 3 ? 1 : 0) : 0;
          return <div key={i} style={{position: 'absolute', left: s.x * W - s.size / 2, top: s.y * H - s.size / 2, transform: `scale(${0.4 + o})`}}>
            <Sparkle size={s.size} opacity={o} /></div>;
        })}
      </div>

      {/* 양옆 문구 */}
      <div style={{position: 'absolute', right: 640 + W / 2 + 36, top: 400, textAlign: 'right', color: '#fff',
        transform: `translateX(${(1 - txt(70)) * -120}px)`, opacity: txt(70)}}>
        <div style={{fontSize: 22, fontWeight: 800, letterSpacing: '0.3em', opacity: 0.85}}>NEW</div>
        <div style={{fontSize: 84, fontWeight: 900, lineHeight: 1.05, textShadow: '0 6px 30px rgba(0,0,0,0.35)'}}>{COPY_L}</div>
      </div>
      <div style={{position: 'absolute', left: 640 + W / 2 + 36, top: 426, color: '#fff',
        transform: `translateX(${(1 - txt(80)) * 120}px)`, opacity: txt(80)}}>
        <div style={{fontSize: 84, fontWeight: 900, lineHeight: 1.05, textShadow: '0 6px 30px rgba(0,0,0,0.35)'}}>{COPY_R}</div>
        <div style={{width: interpolate(f, [95, 120], [0, 180], clamp), height: 6, background: '#fff', borderRadius: 3, marginTop: 14}} />
      </div>

      <AbsoluteFill style={{background: '#fff', opacity: flash}} />
      {/* 실제 브랜드 고지 문구 (왼쪽 아래) */}
      <div style={{position: 'absolute', left: 26, bottom: 20, fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.8)'}}>{NOTE}</div>
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
