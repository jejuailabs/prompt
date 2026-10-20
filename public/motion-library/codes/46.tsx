// frames=180 size=1280x720
import {AbsoluteFill, Easing, Img, interpolate, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath, getPointAtLength} from '@remotion/paths';
import {FONT} from './font';

const GOLD = '#FFC93C';
const HEAD = 'https://www.aicitybuilders.com/video/remotion/assets/jay_char_head.png'; // 380×380, 배경 투명 PNG
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const CX = 640;
const CY = 290;

// 가운데 1개 + 둘레 7개. 둘레 위치·크기는 random(seed)로 살짝씩 흐트러뜨려요 (매번 같은 결과)
const NODES = [
  {x: CX, y: CY, size: 170},
  ...Array.from({length: 7}, (_, i) => {
    const a = -Math.PI / 2 + (i / 7) * Math.PI * 2 + (random(`a${i}`) - 0.5) * 0.35;
    return {x: CX + Math.cos(a) * (400 + random(`rx${i}`) * 60), y: CY + Math.sin(a) * (180 + random(`ry${i}`) * 30), size: 96 + random(`s${i}`) * 44};
  }),
];
// 연결선: 가운데 ↔ 둘레 7개, 둘레끼리 이웃 7개
const EDGES = [...Array.from({length: 7}, (_, i) => [0, i + 1]), ...Array.from({length: 7}, (_, i) => [i + 1, ((i + 1) % 7) + 1])];
const line = ([a, b]: number[]) => `M ${NODES[a].x} ${NODES[a].y} L ${NODES[b].x} ${NODES[b].y}`;

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const glow = interpolate(f, [100, 140], [0, 1], clamp); // 다 연결되면 더 밝게
  const text = spring({frame: f - 120, fps, config: {damping: 16}});

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: '#fff', background: 'radial-gradient(ellipse at 50% 42%, #142250 0%, #050914 68%)'}}>
      <div style={{position: 'absolute', bottom: 24, left: 40, fontSize: 22, fontWeight: 800, lineHeight: 1.5}}>
        <div style={{fontSize: 30, fontWeight: 900}}>캐릭터 군단 연결</div>
        <div style={{color: GOLD}}>random(seed) · spring() · evolvePath()</div>
      </div>

      {/* 연결선: evolvePath(진행률, 경로) → 선이 그려지는 효과. 흐린 굵은 선 + 선명한 선 = 빛나는 선 */}
      <svg width={1280} height={720} style={{position: 'absolute'}}>
        {EDGES.map((e, i) => {
          const p = interpolate(f, [40 + i * 4, 64 + i * 4], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
          const ev = evolvePath(p, line(e));
          // 다 그려진 선 위로 빛 알갱이가 오가요
          const dot = getPointAtLength(line(e), Math.hypot(NODES[e[1]].x - NODES[e[0]].x, NODES[e[1]].y - NODES[e[0]].y) * ((f / 40 + i * 0.37) % 1));
          return (
            <g key={i}>
              <path d={line(e)} stroke={GOLD} strokeWidth={10} opacity={0.18 + 0.15 * glow} strokeLinecap="round" style={{filter: 'blur(4px)'}}
                strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              <path d={line(e)} stroke="#ffe39a" strokeWidth={2.5} strokeLinecap="round" strokeDasharray={ev.strokeDasharray} strokeDashoffset={ev.strokeDashoffset} />
              {p === 1 && <circle cx={dot.x} cy={dot.y} r={4} fill="#fff" opacity={0.9} />}
            </g>
          );
        })}
      </svg>

      {/* 얼굴들: 차례로(stagger) spring 등장. 원 크기 = 이미지 크기 → 아래 잘린 단면이 안 보여요 */}
      {NODES.map((n, i) => {
        const pop = spring({frame: f - 4 - i * 4, fps, config: {damping: 12}});
        const bob = Math.sin(f / 22 + i * 1.3) * 4;
        return (
          <div key={i} style={{position: 'absolute', left: n.x - n.size / 2, top: n.y - n.size / 2 + bob, width: n.size, height: n.size, borderRadius: '50%',
            overflow: 'hidden', transform: `scale(${pop})`, border: `${i === 0 ? 5 : 4}px solid ${GOLD}`,
            background: 'radial-gradient(circle at 50% 35%, #2c4a9a, #12204a)', boxShadow: `0 0 ${10 + 30 * glow}px rgba(255,201,60,${0.25 + 0.4 * glow})`}}>
            <Img src={HEAD} style={{width: '100%', height: '100%'}} />
          </div>
        );
      })}

      <div style={{position: 'absolute', top: 592, width: '100%', textAlign: 'center', fontSize: 56, fontWeight: 900, opacity: text,
        transform: `translateY(${(1 - text) * 30}px)`, textShadow: '0 4px 20px rgba(0,0,0,0.6)'}}>
        연결될수록 <span style={{color: GOLD}}>똑똑해진다</span>
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
