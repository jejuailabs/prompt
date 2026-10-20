// frames=180 size=1280x720
import {AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT} from './font';

const GOLD = '#FFC93C';
// 내 캐릭터 PNG(배경 투명) 주소만 바꾸면 그대로 내 캐릭터가 등장해요
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694
const CW = 330; // 화면에 그릴 크기 (원본 비율 400:694 유지)
const CH = Math.round((CW * 694) / 400);
const TEXT = '안녕하세요! 제이예요';
const LAND = 28; // 바닥에 닿는 프레임
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 1) 떨어지기: 점점 빨라지게(Easing.in) 위에서 아래로
  const fall = interpolate(f, [6, LAND], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const y = (1 - fall) * -760;
  // 2) 찌그러짐(squash & stretch): 떨어질 땐 길쭉, 닿는 순간 납작 → 출렁이며 원래대로
  const t = f - LAND;
  const squash = t < 0 ? -0.06 * fall : 0.13 * Math.exp(-t / 7) * Math.cos(t / 3.2);
  const sx = 1 + squash * 0.8;
  const sy = 1 - squash;
  // 3) 그림자: 캐릭터가 가까워질수록 진하고 크게
  const shadow = interpolate(fall, [0, 1], [0.2, 1]);

  // 4) 말풍선: spring으로 톡 튀어나오고, 글자는 slice로 한 글자씩
  const bubble = spring({frame: f - 52, fps, config: {damping: 14}});
  const chars = Math.floor(interpolate(f, [64, 64 + TEXT.length * 3], [0, TEXT.length], clamp));
  const cursor = Math.floor(f / 8) % 2 === 0 && chars < TEXT.length + 1;

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden',
      background: 'radial-gradient(ellipse 60% 70% at 38% 55%, #1b2b55 0%, #0b1430 45%, #050914 100%)'}}>
      <div style={{position: 'absolute', top: 30, left: 60, fontSize: 40, fontWeight: 900}}>
        등장 + 말풍선 <span style={{color: GOLD, fontSize: 30}}>spring() · scaleX / scaleY</span>
      </div>

      {/* 무대 윗면(바닥) + 그림자: 캐릭터 뒤에 깔려요 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 540, height: 110,
        background: 'radial-gradient(ellipse 34% 90% at 37% 100%, rgba(120,160,255,0.35), rgba(0,0,0,0)), linear-gradient(rgba(30,48,96,0), #253a6d)'}} />
      <div style={{position: 'absolute', left: 470 - 260 * shadow, top: 618, width: 520 * shadow, height: 50, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(0,0,0,0.85), rgba(0,0,0,0))', opacity: shadow}} />

      {/* 캐릭터: 발밑(아래 가운데)을 기준점으로 늘리고 줄여요 */}
      <div style={{position: 'absolute', left: 470 - CW / 2, top: 690 - CH, width: CW, height: CH,
        transform: `translateY(${y}px) scale(${sx}, ${sy})`, transformOrigin: '50% 100%'}}>
        <Img src={CHAR} style={{width: CW, height: CH}} />
      </div>

      {/* 앞쪽 무대 턱: PNG의 허리 잘린 부분을 가려 줘요 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 650, bottom: 0, background: 'linear-gradient(#18244a, #0a1128)',
        borderTop: `3px solid ${GOLD}`, boxShadow: '0 -10px 30px rgba(0,0,0,0.5)'}}>
        <div style={{position: 'absolute', left: 60, top: 18, fontSize: 25, fontWeight: 800, color: 'rgba(255,255,255,0.8)'}}>
          <span style={{color: GOLD}}>Easing.in()</span> 떨어지기 → <span style={{color: GOLD}}>scale(sx, sy)</span> 찌그러짐 → <span style={{color: GOLD}}>TEXT.slice(0, n)</span> 타이핑
        </div>
      </div>

      {/* 말풍선: 꼬리가 입 쪽을 가리켜요 */}
      <div style={{position: 'absolute', left: 680, top: 170, transform: `scale(${bubble})`, transformOrigin: '0% 100%', opacity: bubble}}>
        <div style={{background: '#fff', color: '#0b1430', borderRadius: 34, padding: '26px 38px', fontSize: 46, fontWeight: 900,
          minWidth: 470, boxShadow: '0 16px 40px rgba(0,0,0,0.45)', whiteSpace: 'nowrap'}}>
          {TEXT.slice(0, chars)}
          <span style={{color: GOLD, opacity: cursor ? 1 : 0}}>|</span>
        </div>
        <svg width={80} height={60} style={{position: 'absolute', left: 30, top: '100%', marginTop: -2}}>
          <path d="M 10 0 L 60 0 L 0 52 Z" fill="#fff" />
        </svg>
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
