// frames=200 size=1080x1920
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {ding, whoosh} from '@remotion/sfx';
import {FONT} from './font';

// ── 여기만 바꾸면 내 제품 쇼츠 광고가 돼요 ──
const PRODUCT = 'https://www.aicitybuilders.com/video/remotion/assets/product_dew.png'; // 배경이 투명한 PNG
const RATIO = 490 / 900; // 가로 ÷ 세로
const GREEN = '#17A43B';
const DARK = '#0A5A21';
const YELLOW = '#EEF53A';
// 박자마다 하나씩 쾅! (frame = 등장 프레임, bg = 그때 배경색, color = 글자색)
const WORDS = [
  {text: '오늘', frame: 0, bg: GREEN, color: YELLOW},
  {text: '기분', frame: 30, bg: YELLOW, color: DARK},
  {text: '리프레시', frame: 60, bg: DARK, color: YELLOW},
];
const DROP = 92; // 제품이 떨어지는 프레임
const NOTE = '교육용 예시 · 해당 브랜드와 관계없음';

const CH = 1000; // 제품 높이(px)
const CW = CH * RATIO;

const SceneBody = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

  // 1) 지금 박자의 단어 (마지막 단어 이후엔 제품 장면)
  const cur = [...WORDS].reverse().find((w) => f >= w.frame) ?? WORDS[0];
  const slam = spring({frame: f - cur.frame, fps, config: {damping: 11, mass: 0.6}}); // 크게 → 제자리
  const scene2 = f >= DROP;

  // 2) 제품 낙하: 낮은 damping = 통통 튀는 바운스, 착지 순간 흔들림(점점 줄어듦)
  const drop = spring({frame: f - DROP, fps, config: {damping: 7, mass: 0.9}});
  const land = DROP + 7;
  const shake = f > land ? Math.sin((f - land) * 2.6) * 26 * Math.exp(-(f - land) / 7) : 0;
  const beat = scene2 ? interpolate((f - DROP) % 15, [0, 4, 15], [1.04, 1, 1]) : 1; // 15프레임(=120BPM)마다 쿵

  // 3) 2장면: 배경이 박자마다 진한 초록 ↔ 초록으로 깜빡
  const bg = scene2 ? (Math.floor((f - DROP) / 15) % 2 ? GREEN : DARK) : cur.bg;
  const title = spring({frame: f - DROP - 14, fps, config: {damping: 13}});
  const bottomY = interpolate(spring({frame: f - DROP, fps, config: {damping: 16}}), [0, 1], [0, 640]); // '리프레시'가 아래로 이동

  return (
    <AbsoluteFill style={{fontFamily: FONT, overflow: 'hidden', background: bg}}>
      {/* 효과음: 단어마다 휙, 착지 때 띵 */}
      {WORDS.map((w) => (
        <Sequence key={w.text} from={w.frame}><Audio src={whoosh} volume={0.5} /></Sequence>
      ))}
      <Sequence from={DROP - 4}><Audio src={whoosh} volume={0.7} /></Sequence>
      <Sequence from={land}><Audio src={ding} volume={0.6} /></Sequence>

      {/* 회전하는 줄무늬 빛 (2장면) */}
      <AbsoluteFill style={{opacity: scene2 ? 0.35 : 0, transform: `rotate(${f * 0.5}deg) scale(2.4)`,
        background: `repeating-conic-gradient(from 0deg at 50% 50%, ${YELLOW}55 0deg 8deg, transparent 8deg 22deg)`,
        WebkitMaskImage: 'radial-gradient(circle, #000 0%, transparent 50%)'}} />

      {/* 단어 잔상: 테두리만 있는 큰 글자가 뒤에서 퍼져 나가기 (1장면) */}
      {!scene2 && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontSize: cur.text.length > 2 ? 250 : 360, fontWeight: 900, color: 'transparent', WebkitTextStroke: `4px ${cur.color}`,
            transform: `scale(${1 + slam * 0.9})`, opacity: 0.5 * (1 - slam * 0.7)}}>{cur.text}</div>
        </AbsoluteFill>
      )}
      {/* 1장면: 화면 가득 단어 쾅 / 2장면: '리프레시'가 아래로 내려가 자리 잡기 */}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{fontSize: cur.text.length > 2 ? 250 : 360, fontWeight: 900, letterSpacing: '-0.03em', color: cur.color,
          transform: `translateY(${bottomY}px) scale(${scene2 ? 0.86 : 2.2 - slam * 1.2}) rotate(${(1 - slam) * -8}deg)`,
          textShadow: '0 14px 40px rgba(0,0,0,0.3)'}}>{cur.text}</div>
      </AbsoluteFill>

      {scene2 && (
        <>
          {/* 위쪽 문구 */}
          <div style={{position: 'absolute', top: 150, width: '100%', textAlign: 'center', color: '#fff', opacity: title,
            transform: `translateY(${(1 - title) * -80}px)`}}>
            <div style={{fontSize: 40, fontWeight: 900, letterSpacing: '0.4em', color: YELLOW}}>NEW</div>
            <div style={{fontSize: 150, fontWeight: 900, lineHeight: 1.1, textShadow: '0 10px 30px rgba(0,0,0,0.3)'}}>오늘 기분</div>
          </div>
          {/* 바닥 그림자 */}
          <div style={{position: 'absolute', left: 540 - 220, top: 1460, width: 440, height: 60, borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(0,0,0,0.45), transparent)', opacity: drop}} />
          {/* 제품: 위에서 떨어져 통통 + 흔들 + 박자마다 쿵 */}
          <Img src={PRODUCT} style={{position: 'absolute', left: 540 - CW / 2, top: 1000 - CH / 2, width: CW, height: CH,
            transform: `translate(${shake}px, ${(1 - drop) * -1500}px) rotate(${shake * 0.25 + 4}deg) scale(${beat})`,
            filter: 'drop-shadow(0 40px 50px rgba(0,0,0,0.45))'}} />
        </>
      )}

      {/* 착지 순간 하얀 번쩍 */}
      <AbsoluteFill style={{background: '#fff', opacity: interpolate(f, [land, land + 2, land + 10], [0, 0.6, 0], clamp)}} />
      <div style={{position: 'absolute', left: 36, bottom: 30, fontSize: 26, fontWeight: 600, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 6px rgba(0,0,0,0.5)'}}>{NOTE}</div>
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
