// frames=180 size=1280x720
import {AbsoluteFill, Freeze, Loop, Sequence, Series, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReactNode} from 'react';
import {FONT} from './font';

const GOLD = '#FFC93C';

// 장면 하나: 안에서 쓰는 useCurrentFrame()은 "이 장면이 시작된 뒤" 프레임(0부터)입니다.
const Beat = ({num, title, color}: {num: string; title: string; color: string}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pop = spring({frame: f, fps, config: {damping: 12}});
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{transform: `scale(${pop})`, background: color, borderRadius: 28, padding: '30px 60px', textAlign: 'center', color: '#050914'}}>
        <div style={{fontSize: 34, fontWeight: 700}}>{num}</div>
        <div style={{fontSize: 64, fontWeight: 900}}>{title}</div>
      </div>
    </AbsoluteFill>
  );
};

// 지금 프레임 숫자를 그대로 보여 주는 작은 카운터
const Counter = () => <span style={{color: GOLD}}>{useCurrentFrame()}</span>;

// 0 → 1 로 차오르는 막대 (Loop 안에 넣으면 계속 반복)
const Bar = () => {
  const p = useCurrentFrame() / 29;
  return <div style={{height: 18, width: `${p * 100}%`, background: GOLD, borderRadius: 9}} />;
};

const Box = ({title, children}: {title: string; children: ReactNode}) => (
  <div style={{width: 390, height: 150, padding: 20, borderRadius: 18, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,201,60,0.4)'}}>
    <div style={{fontSize: 22, fontWeight: 900, color: GOLD, marginBottom: 16, whiteSpace: 'nowrap'}}>{title}</div>
    <div style={{fontSize: 30, fontWeight: 700}}>{children}</div>
  </div>
);

const SceneBody = () => (
  <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
    <div style={{position: 'absolute', top: 30, width: '100%', textAlign: 'center', fontSize: 40, fontWeight: 900}}>
      {'<Series>'} 로 3장면 이어 붙이기 (각 60프레임)
    </div>

    {/* 1) Series: 장면을 순서대로 자동 배치 — from 계산이 필요 없어요 */}
    <AbsoluteFill style={{top: 90, height: 360}}>
      <Series>
        <Series.Sequence durationInFrames={60}>
          <Beat num="① 문제" title="편집이 너무 오래 걸려요" color="#ff8a7a" />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <Beat num="② 해결" title="코드로 자동화!" color="#7CF3C8" />
        </Series.Sequence>
        <Series.Sequence durationInFrames={60}>
          <Beat num="③ 결과" title="10분 → 1분" color={GOLD} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>

    <div style={{position: 'absolute', left: 40, right: 40, top: 480, display: 'flex', justifyContent: 'space-between'}}>
      {/* 2) Loop: 30프레임짜리 움직임을 계속 반복 */}
      <Box title="<Loop durationInFrames={30}>">
        <Loop durationInFrames={30} layout="none">
          <Bar />
        </Loop>
      </Box>
      {/* 3) Freeze: 안쪽 시간을 45프레임에 멈춰 둠 (정지 화면) */}
      <Box title="<Freeze frame={45}>">
        프레임 = <Freeze frame={45}><Counter /></Freeze> 에서 멈춤
      </Box>
      {/* 4) Sequence: 90프레임(3초)부터 등장, 안쪽 프레임은 0부터 다시 셈 */}
      <Box title="<Sequence from={90}>">
        <Sequence durationInFrames={90} layout="none">
          <span style={{opacity: 0.4}}>3초 뒤 등장…</span>
        </Sequence>
        <Sequence from={90} layout="none">
          안쪽 프레임 = <Counter />
        </Sequence>
      </Box>
    </div>

    {/* 전체 시간(바깥 프레임) 표시 */}
    <div style={{position: 'absolute', bottom: 24, width: '100%', textAlign: 'center', fontSize: 26, opacity: 0.8}}>
      전체 프레임 = <Counter />
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
