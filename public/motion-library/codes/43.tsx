// frames=180 size=1280x720
import {AbsoluteFill, Easing, Img, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {getLength, getPointAtLength} from '@remotion/paths';
import {FONT} from './font';

const GOLD = '#FFC93C';
const CHAR = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char.png'; // 400×694, 배경 투명 PNG
const CW = 190;
const CH = Math.round((CW * 694) / 400);
const GROUND = 615; // 땅의 y
const H = 150; // 점프 높이
const XS = [190, 500, 810, 1090]; // 착지 지점들
const HOP = 50; // 점프 한 번 = 50프레임 (웅크리기 8 + 공중 24 + 착지 18)
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
// 각 점프의 포물선 경로 (Q = 2차 곡선, 조절점을 2H 위로 두면 꼭대기가 H)
const ARCS = XS.slice(1).map((x1, i) => `M ${XS[i]} ${GROUND} Q ${(XS[i] + x1) / 2} ${GROUND - 2 * H} ${x1} ${GROUND}`);

const SceneBody = () => {
  const f = useCurrentFrame();
  // 지금 몇 번째 점프인지, 그 안에서 몇 프레임째인지
  const i = Math.max(0, Math.min(ARCS.length - 1, Math.floor((f - 10) / HOP)));
  const k = f - 10 - i * HOP;
  const air = interpolate(k, [8, 32], [0, 1], {...clamp, easing: Easing.inOut(Easing.sin)});
  const p = getPointAtLength(ARCS[i], getLength(ARCS[i]) * air); // 곡선 위 좌표
  const h = GROUND - p.y; // 땅에서 높이

  // squash & stretch: 웅크리기 → 공중에서 길쭉 → 착지 순간 납작 → 출렁
  let s = 0; // +면 납작, -면 길쭉
  if (k < 8) s = 0.16 * Math.sin((Math.max(0, k) / 8) * (Math.PI / 2));
  else if (k < 32) s = -0.12 * Math.abs(1 - 2 * air);
  else s = 0.16 * Math.exp(-(k - 32) / 5) * Math.cos((k - 32) / 2.6);
  const phase = k < 8 ? 0 : k < 32 ? 1 : 2;
  const lean = k >= 8 && k < 32 ? 7 * Math.sin(Math.PI * air) : 0; // 진행 방향으로 살짝 기울기

  // 착지 먼지: 마지막으로 착지한 곳에서 퍼지는 동그라미들
  const landF = k - 32;
  const dust = Array.from({length: 7}, (_, j) => {
    const q = interpolate(landF, [0, 20], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    const dir = j % 2 === 0 ? 1 : -1;
    return {x: p.x + dir * (70 + (30 + random(`dx${j}`) * 90) * q), y: GROUND - 8 - random(`dy${j}`) * 26 * q,
      r: (12 + random(`r${j}`) * 16) * (0.4 + q), o: landF >= 0 ? (1 - q) * 0.8 : 0};
  });

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', overflow: 'hidden', background: 'linear-gradient(#050914 0%, #0d1a3a 100%)'}}>
      <div style={{position: 'absolute', top: 34, left: 60, fontSize: 42, fontWeight: 900}}>
        점프하며 이동 <span style={{color: GOLD, fontSize: 30}}>getPointAtLength()</span>
      </div>

      {/* 점프 궤적 (점선) */}
      <svg width={1280} height={720} style={{position: 'absolute'}}>
        {ARCS.map((d) => <path key={d} d={d} fill="none" stroke="rgba(255,201,60,0.3)" strokeWidth={3} strokeDasharray="4 12" strokeLinecap="round" />)}
      </svg>

      {/* 땅 */}
      <div style={{position: 'absolute', left: 0, right: 0, top: GROUND, bottom: 0, background: 'linear-gradient(#1f3263, #0b1430)', borderTop: `3px solid ${GOLD}`}} />

      {/* 그림자: 높이 올라갈수록 작고 옅게 */}
      <div style={{position: 'absolute', left: p.x - 100 * (1 - h / H / 2), top: GROUND - 12, width: 200 * (1 - h / H / 2), height: 24, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(0,0,0,0.95), rgba(0,0,0,0))', opacity: 1 - (h / H) * 0.5}} />


      {/* 캐릭터 + 통통 컵: 컵이 PNG의 허리 잘린 부분을 가려 줘요. 기준점 = 컵 바닥 가운데 */}
      <div style={{position: 'absolute', left: p.x - 120, top: p.y - (CH + 36), width: 240, height: CH + 36, transformOrigin: '50% 100%',
        transform: `rotate(${lean}deg) scale(${1 + s * 0.8}, ${1 - s})`}}>
        <svg width={240} height={120} viewBox="0 0 220 110" style={{position: 'absolute', top: CH - 80}}>
          <ellipse cx={110} cy={20} rx={100} ry={18} fill="#6b4a0c" />
        </svg>
        <Img src={CHAR} style={{position: 'absolute', left: 25, top: 0, width: CW, height: CH}} />
        <svg width={240} height={120} viewBox="0 0 220 110" style={{position: 'absolute', top: CH - 80}}>
          <defs>
            <linearGradient id="cup" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd970" /><stop offset="1" stopColor="#d9930f" /></linearGradient>
          </defs>
          <path d="M 10 20 A 100 18 0 0 0 210 20 C 206 78 172 106 110 106 C 48 106 14 78 10 20 Z" fill="url(#cup)" />
          <path d="M 10 20 A 100 18 0 0 0 210 20" fill="none" stroke="#fff3c8" strokeWidth={5} strokeLinecap="round" />
          <path d="M 22 58 Q 110 84 198 58" fill="none" stroke="#b36f00" strokeWidth={6} strokeLinecap="round" opacity={0.6} />
        </svg>
      </div>

      {/* 먼지는 컵 앞에 그려요 */}
      {dust.map((d, j) => (
        <div key={j} style={{position: 'absolute', left: d.x - d.r, top: d.y - d.r, width: d.r * 2, height: d.r * 2, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #ffffff, #b9c8f5)', opacity: d.o, filter: 'blur(1.5px)'}} />
      ))}
      {/* 단계 표시: 지금 단계만 금색 */}
      <div style={{position: 'absolute', left: 60, top: GROUND + 28, display: 'flex', gap: 34, fontSize: 27, fontWeight: 900}}>
        {['① 웅크리기 scaleY↓', '② 공중에서 늘어나기 scaleY↑', '③ 착지 찌그러짐'].map((t, j) => (
          <div key={t} style={{color: phase === j ? GOLD : 'rgba(255,255,255,0.35)'}}>{t}</div>
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
