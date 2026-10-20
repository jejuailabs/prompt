// frames=150 size=1280x720
import {AbsoluteFill, Audio, Easing, interpolate, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {MacOSCursor} from '@remotion/mac-cursors';
import {mouseClick} from '@remotion/sfx';
import {FONT} from './font';

const CLICK = 75; // 클릭하는 프레임 (2.5초)
const BTN = {x: 540, y: 400, w: 200, h: 70}; // 가짜 "시작하기" 버튼 위치

const SceneBody = () => {
  const f = useCurrentFrame();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // 1) 커서 경로: 왼쪽 아래 → 버튼 가운데 (부드럽게 감속)
  const move = interpolate(f, [15, 60], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const x = interpolate(move, [0, 1], [260, BTN.x + BTN.w / 2]);
  const y = interpolate(move, [0, 1], [620, BTN.y + BTN.h / 2]);

  // 2) 버튼 위에 있으면 손가락(pointer), 아니면 기본 화살표(default)
  const over = x > BTN.x && x < BTN.x + BTN.w && y > BTN.y && y < BTN.y + BTN.h;
  const cursor = over ? 'pointer' : 'default';

  // 3) 클릭 효과: 버튼이 살짝 눌리고, 동그란 물결(ripple)이 퍼짐
  const press = f >= CLICK && f < CLICK + 5 ? 0.93 : 1;
  const ripple = interpolate(f, [CLICK, CLICK + 20], [0.2, 1], clamp);
  const done = interpolate(f, [CLICK + 10, CLICK + 20], [0, 1], clamp);

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT}}>
      {/* 4) 클릭 순간에 효과음 — @remotion/sfx 의 mouseClick 은 그냥 URL 문자열이에요 */}
      <Sequence from={CLICK}><Audio src={mouseClick} volume={0.9} /></Sequence>

      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center'}}>
        <div style={{color: '#FFC93C', fontSize: 40, fontWeight: 700}}>{`<MacOSCursor cursor="${cursor}" />`}</div>
        <div style={{color: '#fff', opacity: 0.7, fontSize: 26}}>튜토리얼 영상용 진짜 맥 커서 + 클릭 소리</div>
      </div>

      {/* 가짜 앱 창 */}
      <div style={{position: 'absolute', left: 240, top: 170, width: 800, height: 470, borderRadius: 18, background: '#101a36', border: '1px solid #ffffff22'}}>
        <div style={{display: 'flex', gap: 8, padding: 16}}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
        </div>
        <div style={{color: '#fff', fontSize: 34, fontWeight: 700, textAlign: 'center', marginTop: 60}}>AI 영상 만들기</div>
        <div style={{color: '#FFC93C', fontSize: 26, textAlign: 'center', marginTop: 260, opacity: done}}>✔ 렌더링을 시작했어요!</div>
      </div>

      {/* 버튼 + ripple */}
      <div style={{position: 'absolute', left: BTN.x, top: BTN.y, width: BTN.w, height: BTN.h, borderRadius: 14, background: over ? '#FFD86B' : '#FFC93C',
        color: '#050914', fontSize: 28, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${press})`}}>
        시작하기
      </div>
      <div style={{position: 'absolute', left: x - 90, top: y - 90, width: 180, height: 180, borderRadius: 90, border: '6px solid #fff',
        transform: `scale(${ripple})`, opacity: f >= CLICK ? 1 - ripple : 0}} />

      {/* 5) 커서: 부모 div 의 왼쪽 위 = 커서 끝(핫스팟). 2배 크게 */}
      <div style={{position: 'absolute', left: x, top: y, transform: 'scale(2)', transformOrigin: '0 0'}}>
        <MacOSCursor cursor={cursor} />
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
