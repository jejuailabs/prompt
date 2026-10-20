// frames=240 size=1280x720
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Box, Bracket, Circle, Highlight, StrikeThrough, Underline} from '@remotion/rough-notation';
import {FONT} from './font';

const GOLD = '#FFC93C';
const PINK = '#ff5d7a';
const MINT = '#7cf3c8';
const BLUE = '#5b8cff';

const SceneBody = () => {
  const f = useCurrentFrame();
  // progress: 0 = 안 보임, 1 = 다 그려짐. 시작 프레임을 다르게 줘서 하나씩 차례로 그려요
  const p = (start: number) => interpolate(f, [start, start + 20], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // 범례: 지금 그려진 표시는 금색으로
  const legend: [string, number][] = [['Highlight', 15], ['Underline', 45], ['Circle', 75], ['Box', 105], ['StrikeThrough', 135], ['Bracket', 165]];

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{position: 'absolute', top: 40, color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/rough-notation</div>

      {/* Bracket: 문단 전체를 양쪽 괄호로 묶기 */}
      <Bracket progress={p(165)} color={BLUE} strokeWidth={5} bracketLeft bracketRight padding={{left: 30, right: 30, top: 10, bottom: 10}} seed={6}>
        {/* 줄 간격은 lineHeight 대신 gap으로! (lineHeight가 크면 표시가 줄 높이만큼 커져요) */}
        <div style={{color: '#fff', fontSize: 52, fontWeight: 700, lineHeight: 1.3, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 34}}>
          <div>
            프롬프트는{' '}
            {/* Highlight: 형광펜 (글자 뒤에 칠해짐) */}
            <Highlight progress={p(15)} color="rgba(255,201,60,0.45)" iterations={2} seed={1}>짧고 명확하게</Highlight> 쓰고,
          </div>
          <div>
            {/* Underline: 손으로 그은 밑줄 */}
            <Underline progress={p(45)} color={MINT} strokeWidth={6} seed={2}>예시</Underline>를 꼭 넣으세요.{' '}
            {/* Circle: 동그라미 — progress가 0일 땐 disabled로 숨김 */}
            <Circle progress={p(75)} disabled={p(75) === 0} color={PINK} strokeWidth={5} padding={{left: 2, right: 2, top: 0, bottom: 0}} seed={3}>핵심</Circle>은
          </div>
          <div>
            {/* Box: 네모 박스 */}
            <Box progress={p(105)} color={GOLD} strokeWidth={4} padding={{left: 12, right: 12, top: 4, bottom: 4}} seed={4}>맥락</Box>과 함께,{' '}
            {/* StrikeThrough: 가운데 줄 */}
            <StrikeThrough progress={p(135)} color={PINK} strokeWidth={6} seed={5}>길게 늘어놓기</StrikeThrough>는 금지!
          </div>
        </div>
      </Bracket>

      <div style={{position: 'absolute', bottom: 50, display: 'flex', gap: 28, fontSize: 26, fontWeight: 900}}>
        {legend.map(([name, start]) => (
          <div key={name} style={{color: p(start) > 0 ? GOLD : '#3a4a6e'}}>{`<${name}>`}</div>
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
