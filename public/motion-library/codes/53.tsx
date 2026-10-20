// frames=180 size=1280x720
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {evolvePath} from '@remotion/paths';
import {FONT} from './font';

// ── 여기만 바꾸면 내 제품 특징 광고가 돼요 ──
const PRODUCT = 'https://www.aicitybuilders.com/video/remotion/assets/product_chips_bag.png'; // 배경이 투명한 PNG
const PW = 700; // 화면에 보일 제품 너비(px)
const PH = PW * (540 / 900); // 원본 비율(세로/가로)로 높이 계산
const CX = 640; // 제품 가운데 x
const CY = 375; // 제품 가운데 y
const BG1 = '#FFD54A'; // 배경 위쪽 색
const BG2 = '#FF9F1C'; // 배경 아래쪽 색
const INK = '#1E1300'; // 선·글자 색
const EYEBROW = 'NEW ARRIVAL';
const HEADLINE = '오늘의 간식, 바삭하게';

// 콜아웃: u·v = 제품 이미지 안의 위치(0~1 비율, 제품 크기를 바꿔도 점이 따라가요)
//        x·y = 글자 쪽 선 끝(화면 좌표), side = 글자가 선의 왼쪽/오른쪽 중 어디에 붙는지, at = 시작 프레임
const CALLOUTS = [
  {title: '바삭한 식감', sub: 'CRUNCHY', u: 0.367, v: 0.26, x: 300, y: 190, side: 'left', at: 35},
  {title: '한 봉지 60g', sub: 'NET WT.', u: 0.6, v: 0.17, x: 980, y: 160, side: 'right', at: 55},
  {title: '국산 감자', sub: 'LOCAL POTATO', u: 0.167, v: 0.8, x: 270, y: 575, side: 'left', at: 75},
] as const;

// 점 → 45도 사선 → 수평선으로 꺾이는 SVG 경로 만들기
const calloutPath = (c: (typeof CALLOUTS)[number]) => {
  const dx = CX - PW / 2 + c.u * PW;
  const dy = CY - PH / 2 + c.v * PH;
  const elbowX = dx + (c.side === 'left' ? -1 : 1) * Math.abs(dy - c.y);
  return {dx, dy, d: `M ${dx} ${dy} L ${elbowX} ${c.y} L ${c.x} ${c.y}`};
};

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // 1) 제품 등장: 작게 → 크게 (스프링) + 살짝 회전 (콜아웃 점이 맞도록 그 뒤엔 고정)
  const pop = spring({frame: f - 4, fps, config: {damping: 12}});

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: `linear-gradient(160deg, ${BG1}, ${BG2})`}}>
      {/* 제품 뒤 하얀 원광 */}
      <div style={{position: 'absolute', left: CX - 360, top: CY - 360, width: 720, height: 720, borderRadius: '50%',
        background: 'radial-gradient(closest-side, rgba(255,255,255,0.75), rgba(255,255,255,0))', transform: `scale(${pop})`}} />
      <div style={{position: 'absolute', top: 44, width: '100%', textAlign: 'center', fontSize: 22, fontWeight: 900, letterSpacing: '0.4em', color: INK,
        opacity: interpolate(f, [10, 25], [0, 1], clamp)}}>{EYEBROW}</div>

      {/* 제품 */}
      <Img src={PRODUCT} style={{position: 'absolute', left: CX - PW / 2, top: CY - PH / 2, width: PW, height: PH,
        transform: `scale(${pop}) rotate(${(1 - pop) * -10}deg)`, filter: 'drop-shadow(0 24px 30px rgba(120,60,0,0.35))'}} />

      {/* 2) 콜아웃 선: evolvePath(진행률, 경로) → 선이 점점 그려지는 효과 */}
      <svg width={1280} height={720} style={{position: 'absolute'}}>
        {CALLOUTS.map((c, i) => {
          const p = interpolate(f, [c.at, c.at + 18], [0, 1], clamp);
          const {dx: x, dy: y, d} = calloutPath(c);
          const {strokeDasharray, strokeDashoffset} = evolvePath(p, d);
          const ring = ((f - c.at) % 40) / 40; // 0→1 반복: 퍼지는 고리
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={d} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />
              <circle cx={x} cy={y} r={8 + ring * 22} fill="none" stroke="#fff" strokeWidth={3} opacity={1 - ring} />
              <circle cx={x} cy={y} r={9} fill={INK} stroke="#fff" strokeWidth={3} />
            </g>
          );
        })}
      </svg>

      {/* 3) 콜아웃 글자: 선이 다 그려진 뒤 옆으로 미끄러져 나타나기 */}
      {CALLOUTS.map((c, i) => {
        const t = spring({frame: f - c.at - 14, fps, config: {damping: 16}});
        const dir = c.side === 'left' ? 1 : -1;
        return (
          <div key={i} style={{position: 'absolute', top: c.y - 44, textAlign: c.side === 'left' ? 'right' : 'left', color: INK, opacity: t,
            ...(c.side === 'left' ? {right: 1280 - c.x + 10} : {left: c.x + 10}), transform: `translateX(${(1 - t) * 30 * dir}px)`}}>
            <div style={{fontSize: 46, fontWeight: 900, lineHeight: 1.1}}>{c.title}</div>
            <div style={{fontSize: 17, fontWeight: 800, letterSpacing: '0.25em', opacity: 0.7, marginTop: 4}}>{c.sub}</div>
          </div>
        );
      })}

      {/* 4) 마지막 헤드라인: 아래에서 올라오는 검은 띠 */}
      {(() => {
        const t = spring({frame: f - 110, fps, config: {damping: 15}});
        return (
          <div style={{position: 'absolute', bottom: 40, width: '100%', display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - t) * 120}px)`}}>
            <div style={{background: INK, color: '#FFD54A', fontSize: 40, fontWeight: 900, padding: '10px 34px', borderRadius: 14}}>{HEADLINE}</div>
          </div>
        );
      })()}
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
