// frames=180 size=1280x720
// No Remotion: same scene code, imports switched from `remotion` to the Motion Lite runtime.
import {AbsoluteFill, Easing, FONT, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig} from '../runtime';

const GOLD = '#FFC93C';
// 상반신 PNG를 동그라미에 넣으면 얼굴 아래(마이크·어깨)까지 자연스럽게 보여요
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694, 배경 투명 PNG
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const BOKEH = Array.from({length: 14}, (_, i) => ({x: random(`bx${i}`) * 1280, y: random(`by${i}`) * 720, r: 30 + random(`br${i}`) * 80}));

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;

  // 1) 카드 등장: 옆으로 누워 있다가(rotateY -75도) spring으로 정면을 봐요
  const enter = spring({frame: f - 4, fps, config: {damping: 16, mass: 0.9}});
  // 2) 등장 후에는 천천히 좌우로 기울기 (3D 느낌 유지)
  const swayY = -75 * (1 - enter) + 9 * Math.sin(t * 1.3) * enter;
  const swayX = 3 * Math.cos(t * 1.1) * enter;
  // 3) 얼굴 원 · 이름 · 부제가 차례로
  const face = spring({frame: f - 16, fps, config: {damping: 11}});
  const name = interpolate(f, [24, 40], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const sub = interpolate(f, [32, 48], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  // 4) 빛 줄기: 두 번 쓱 지나가기 (-100% → 200%)
  const shine = (s: number) => interpolate(f, [s, s + 28], [-60, 160], {...clamp, easing: Easing.inOut(Easing.quad)});
  const sweep = f < 110 ? shine(56) : shine(126);

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', background: 'radial-gradient(ellipse at 50% 45%, #15234a 0%, #050914 70%)'}}>
      {BOKEH.map((b, i) => (
        <div key={i} style={{position: 'absolute', left: b.x - b.r, top: b.y - b.r + Math.sin(t + i) * 10, width: b.r * 2, height: b.r * 2, borderRadius: '50%',
          background: i % 3 ? 'rgba(91,140,255,0.10)' : 'rgba(255,201,60,0.08)', filter: 'blur(6px)'}} />
      ))}
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', fontSize: 42, fontWeight: 900}}>캐릭터 강의 카드</div>

      {/* perspective: 3D로 기울일 때 원근감의 세기 (작을수록 과장) */}
      <AbsoluteFill style={{perspective: 1100, alignItems: 'center', justifyContent: 'center'}}>
        <div style={{width: 820, height: 250, borderRadius: 32, position: 'relative', overflow: 'hidden', opacity: Math.min(1, enter * 1.5),
          transform: `rotateY(${swayY}deg) rotateX(${swayX}deg)`, background: 'linear-gradient(120deg, #182a5e 0%, #0d1736 60%, #0a1129 100%)',
          border: '2px solid rgba(255,201,60,0.55)', boxShadow: '0 30px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.15)'}}>
          {/* 왼쪽 금색 띠 */}
          <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: GOLD}} />

          {/* 얼굴 원: borderRadius 50% + overflow hidden 으로 동그랗게 자르기 */}
          <div style={{position: 'absolute', left: 50, top: 25, width: 200, height: 200, borderRadius: '50%', overflow: 'hidden',
            border: `6px solid ${GOLD}`, background: 'radial-gradient(circle at 50% 35%, #ffe7a6, #f0a93a)', transform: `scale(${face})`}}>
            {/* 얼굴이 원 가운데 오도록 크기(width)와 위치(left/top)를 맞추기 */}
            <Img src={CHAR} style={{position: 'absolute', left: 2, top: -28, width: 200, height: 347}} />
          </div>

          <div style={{position: 'absolute', left: 290, top: 52, opacity: name, transform: `translateX(${(1 - name) * 40}px)`, whiteSpace: 'nowrap'}}>
            <span style={{fontSize: 58, fontWeight: 900}}>제이</span>
            <span style={{fontSize: 40, fontWeight: 800, color: GOLD, letterSpacing: '0.04em'}}> · CONNECT AI LAB</span>
          </div>
          <div style={{position: 'absolute', left: 292, top: 142, display: 'flex', alignItems: 'center', gap: 14, opacity: sub, transform: `translateX(${(1 - sub) * 40}px)`}}>
            <span style={{fontSize: 22, fontWeight: 900, color: '#0a1129', background: GOLD, borderRadius: 999, padding: '6px 16px'}}>강의</span>
            <span style={{fontSize: 38, fontWeight: 800}}>AI 두뇌 만들기</span>
          </div>

          {/* 빛 줄기: 비스듬한 흰 그라데이션 띠를 왼쪽 → 오른쪽으로 이동 */}
          <div style={{position: 'absolute', top: -60, bottom: -60, left: `${sweep}%`, width: 160, transform: 'rotate(18deg)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))', mixBlendMode: 'screen'}} />
        </div>
      </AbsoluteFill>

      <div style={{position: 'absolute', bottom: 70, width: '100%', display: 'flex', justifyContent: 'center', gap: 40, fontSize: 25, fontWeight: 800}}>
        <div><span style={{color: GOLD}}>perspective + rotateY()</span> 3D 기울기</div>
        <div><span style={{color: GOLD}}>linear-gradient</span> 빛 줄기</div>
        <div><span style={{color: GOLD}}>borderRadius: 50%</span> 얼굴 원</div>
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
