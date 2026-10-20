// frames=315 size=1280x720
import {AbsoluteFill, Sequence, useVideoConfig} from 'remotion';
import {TransitionSeries, linearTiming, springTiming} from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {flip} from '@remotion/transitions/flip';
import {clockWipe} from '@remotion/transitions/clock-wipe';
import {iris} from '@remotion/transitions/iris';
import {filmBurn} from '@remotion/transitions/film-burn';
import {dissolve} from '@remotion/transitions/dissolve';
import {FONT} from './font';

const SCENE = 45; // 장면 하나의 길이 (프레임)
const T = 20; // 전환 길이 (이 동안 두 장면이 겹침)
const COLORS = ['#13224d', '#FFC93C', '#5B8CFF', '#7CF3C8', '#ff8a7a', '#b48cff', '#FFC93C', '#5BC8FF', '#13224d', '#FFC93C'];

// 장면 카드: 들어올 때 쓴 전환 이름을 크게 보여 줌
const Card = ({i, name, ko}: {i: number; name: string; ko: string}) => {
  const dark = [0, 2, 8].includes(i); // 어두운 배경이면 흰 글자
  return (
    <AbsoluteFill style={{background: COLORS[i], alignItems: 'center', justifyContent: 'center', fontFamily: FONT, color: dark ? '#fff' : '#050914'}}>
      {/* 가장자리를 어둡게: 밝기 차이가 있어야 dissolve 같은 셰이더 전환이 예쁘게 번짐 */}
      <AbsoluteFill style={{background: 'radial-gradient(circle, transparent 25%, rgba(0,0,0,0.6) 100%)'}} />
      <div style={{fontSize: 30, fontWeight: 700, opacity: 0.7, zIndex: 1}}>장면 {i + 1}</div>
      <div style={{zIndex: 1, fontSize: 92, fontWeight: 900, color: dark ? '#FFC93C' : '#050914'}}>{name}</div>
      <div style={{zIndex: 1, fontSize: 40, fontWeight: 700}}>{ko}</div>
    </AbsoluteFill>
  );
};

const lin = linearTiming({durationInFrames: T}); // 일정한 속도
const slow = linearTiming({durationInFrames: 30}); // 셰이더 전환은 조금 길게
const spr = springTiming({config: {damping: 200}, durationInFrames: T}); // 부드럽게 감속

// ⚠️ 4.0.529 버그: 셰이더(WebGL) 전환이 CSS 전환 바로 뒤에 오면 새 장면만 보입니다.
//    → 셰이더 전환은 따로 TransitionSeries에 먼저 넣고, 하드 컷 후 CSS 전환 묶음으로 이어 갑니다.
const LONG = 60; // 1부 장면은 조금 길게 (전환 30프레임이 앞뒤로 겹치므로)
const PART1 = LONG * 3 - 30 * 2; // 1부 길이 = 120프레임

const SceneBody = () => (
  <AbsoluteFill style={{background: '#050914'}}>
    {/* 1부: 셰이더 전환 2개 (filmBurn, dissolve) */}
    <Sequence durationInFrames={PART1}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={LONG}>
          <Card i={0} name="TransitionSeries" ko="장면 전환 8가지" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={filmBurn({})} timing={slow} />
        <TransitionSeries.Sequence durationInFrames={LONG}>
          <Card i={1} name="filmBurn()" ko="필름이 타듯 · 오프닝" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={dissolve({})} timing={slow} />
        <TransitionSeries.Sequence durationInFrames={LONG}>
          <Card i={2} name="dissolve()" ko="불타듯 사라짐 · 극적 전환" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Sequence>

    {/* 2부: 하드 컷 후 CSS 전환 6개 */}
    <Sequence from={PART1}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={3} name="(하드 컷)" ko="여기서 새 TransitionSeries 시작" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={lin} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={4} name="fade()" ko="가장 무난한 기본 전환" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={spr} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={5} name="slide()" ko="다음 단계로 · springTiming" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({direction: 'from-left'})} timing={lin} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={6} name="wipe()" ko="전/후 비교를 쓸어 넘기기" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={flip()} timing={spr} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={7} name="flip()" ko="카드 뒤집듯 · 정답 공개" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={clockWipe({width: 1280, height: 720})} timing={lin} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={8} name="clockWipe()" ko="시계 바늘처럼 · 시간 경과" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({width: 1280, height: 720})} timing={lin} />
        <TransitionSeries.Sequence durationInFrames={SCENE}>
          <Card i={9} name="iris()" ko="원형으로 열리며 집중" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </Sequence>
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
