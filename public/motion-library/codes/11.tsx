// frames=150 size=1280x720
import {AbsoluteFill, Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {interpolateStyles, makeTransform, rotate, scale, translateY} from '@remotion/animation-utils';
import {FONT} from './font';

const GOLD = '#FFC93C';

const SceneBody = () => {
  const f = useCurrentFrame();

  // 1) interpolateStyles(프레임, [키프레임], [스타일 객체들])
  //    숫자·색·단위(px)·transform 문자열까지 스타일 객체를 통째로 보간해요
  const bar = interpolateStyles(
    f,
    [10, 35, 120, 140], // 들어오기 → 머무르기 → 나가기
    [
      {opacity: 0, transform: 'translateX(-80px)', maxWidth: '0px', backgroundColor: 'rgba(91,140,255,0.6)'},
      {opacity: 1, transform: 'translateX(0px)', maxWidth: '700px', backgroundColor: 'rgba(5,9,20,0.88)'},
      {opacity: 1, transform: 'translateX(0px)', maxWidth: '700px', backgroundColor: 'rgba(5,9,20,0.88)'},
      {opacity: 0, transform: 'translateX(40px)', maxWidth: '700px', backgroundColor: 'rgba(5,9,20,0.88)'},
    ],
    {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // 핵심 단어만 색·글자 간격 강조
  const word = interpolateStyles(f, [45, 60, 75], [
    {color: '#ffffff', letterSpacing: '0px'},
    {color: GOLD, letterSpacing: '8px'},
    {color: GOLD, letterSpacing: '2px'},
  ], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 2) makeTransform([...]) → "translateY(..) rotate(..) scale(..)" 문자열을 만들어 줘요
  const bob = Math.sin(f / 10);
  const r2 = (n: number) => Math.round(n * 100) / 100; // 화면에 보여줄 문자열이 짧도록 소수 둘째 자리까지
  const badge = makeTransform([translateY(r2(bob * 15)), rotate(r2(bob * 8)), scale(r2(1 + bob * 0.06))]);

  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #1b2b5e, #050914)', fontFamily: FONT}}>
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/animation-utils</div>

      {/* makeTransform 예시: 흔들리는 배지 + 만들어진 문자열 */}
      <div style={{position: 'absolute', right: 90, top: 160, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{transform: badge, background: GOLD, color: '#050914', fontSize: 40, fontWeight: 900, padding: '18px 36px', borderRadius: 999}}>NEW 강의</div>
        <div style={{color: GOLD, fontSize: 28, fontWeight: 900, marginTop: 40}}>makeTransform([...])</div>
        <div style={{color: '#9fb0d0', fontSize: 18, fontFamily: 'monospace', marginTop: 8, width: 420, textAlign: 'center'}}>{badge}</div>
      </div>

      {/* interpolateStyles 예시: 하단 자막 바(lower third) */}
      <div style={{position: 'absolute', left: 80, top: 170, color: GOLD, fontSize: 28, fontWeight: 900}}>interpolateStyles()</div>
      <div style={{position: 'absolute', left: 80, top: 210, color: '#fff', fontSize: 22}}>하단 자막 바: 너비·색·위치를 한 번에</div>
      <div style={{position: 'absolute', left: 80, bottom: 90, padding: '22px 40px', borderRadius: 16, borderLeft: `10px solid ${GOLD}`, overflow: 'hidden', whiteSpace: 'nowrap', ...bar}}>
        <div style={{fontSize: 28, fontWeight: 300, color: 'rgba(255,255,255,0.8)'}}>오늘의 핵심</div>
        <div style={{fontSize: 52, fontWeight: 900, color: '#fff', marginTop: 4}}>
          AI에게 <span style={{...word, display: 'inline-block'}}>맥락</span>을 주는 법
        </div>
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
