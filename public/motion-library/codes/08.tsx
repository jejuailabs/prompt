// frames=180 size=1280x720
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getLength, getPointAtLength, getTangentAtLength, interpolatePath} from '@remotion/paths';
import {FONT} from './font';

const GOLD = '#FFC93C';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 전구 모양 SVG 경로 (둥근 머리 + 목 + 아래 줄 2개)
const BULB = 'M 75 150 C 75 120 40 105 40 70 A 60 60 0 1 1 160 70 C 160 105 125 120 125 150 Z M 78 172 L 122 172 M 85 192 L 115 192';

// 별(★)과 원(●)을 같은 점 10개로 만들기 → 모핑이 깔끔해요
const ring = (rOut: number, rIn: number) =>
  Array.from({length: 10}, (_, i) => {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? rOut : rIn;
    return `${i === 0 ? 'M' : 'L'} ${100 + Math.cos(a) * r} ${100 + Math.sin(a) * r}`;
  }).join(' ') + ' Z';
const STAR = ring(90, 38);
const CIRCLE = ring(75, 75);

// 물체가 따라 달릴 구불구불한 길
const ROAD = 'M 10 160 C 60 20 110 20 150 100 S 230 190 270 40';

const Label = ({api, ko}: {api: string; ko: string}) => (
  <div style={{textAlign: 'center', marginTop: 20}}>
    <div style={{color: GOLD, fontSize: 30, fontWeight: 900}}>{api}</div>
    <div style={{color: '#fff', fontSize: 22, marginTop: 6}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();

  // 1) evolvePath(진행률 0~1, 경로) → stroke-dasharray/offset 값을 돌려줘요
  const draw = interpolate(f, [10, 80], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const bulb = evolvePath(draw, BULB);

  // 2) interpolatePath(0~1, 경로A, 경로B) → 두 모양 사이의 중간 경로
  const morph = interpolate(Math.sin(f / 20), [-1, 1], [0, 1]);
  const shape = interpolatePath(morph, STAR, CIRCLE);

  // 3) getLength로 길 전체 길이 → getPointAtLength로 그 지점 좌표 얻기
  const len = getLength(ROAD);
  const at = interpolate(f % 90, [0, 89], [0, len]);
  const p = getPointAtLength(ROAD, at);
  const tan = getTangentAtLength(ROAD, at); // 진행 방향(기울기)
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', padding: 40}}>
      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', color: '#fff', fontSize: 40, fontWeight: 900}}>@remotion/paths</div>

      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg width={280} height={260} viewBox="0 -20 200 230">
          <path d={BULB} fill="none" stroke={GOLD} strokeWidth={6} strokeLinecap="round"
            strokeDasharray={bulb.strokeDasharray} strokeDashoffset={bulb.strokeDashoffset} />
        </svg>
        <Label api="evolvePath()" ko="선이 그려지는 애니메이션" />
      </div>

      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg width={280} height={260} viewBox="-10 -10 220 220">
          <path d={shape} fill={GOLD} />
        </svg>
        <Label api="interpolatePath()" ko="별 ↔ 원 모양 바꾸기" />
      </div>

      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <svg width={300} height={260} viewBox="0 0 280 200">
          <path d={ROAD} fill="none" stroke="#3a4a6e" strokeWidth={14} strokeLinecap="round" />
          {/* 좌표로 이동 + 진행 방향으로 회전 */}
          <g transform={`translate(${p.x} ${p.y}) rotate(${angle})`}>
            <polygon points="-16,-11 16,0 -16,11" fill={GOLD} />
          </g>
        </svg>
        <Label api="getPointAtLength()" ko="경로 위를 따라 달리기" />
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
