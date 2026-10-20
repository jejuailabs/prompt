// frames=240 size=1280x720
import {AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {ding, mouseClick, pageTurn, uiSwitch, vineBoom, whoosh} from '@remotion/sfx';
import {FONT} from './font';

// 1) @remotion/sfx 의 효과음은 전부 "인터넷 주소(URL) 문자열"이에요.  예) whoosh === 'https://remotion.media/whoosh.wav'
const SOUNDS = [
  {name: 'whoosh', src: whoosh, ko: '휙 — 장면 전환'},
  {name: 'ding', src: ding, ko: '띵 — 정답·포인트'},
  {name: 'mouseClick', src: mouseClick, ko: '딸깍 — 클릭'},
  {name: 'pageTurn', src: pageTurn, ko: '촤락 — 페이지 넘김'},
  {name: 'vineBoom', src: vineBoom, ko: '쿵 — 강조·반전'},
  {name: 'uiSwitch', src: uiSwitch, ko: '탁 — 스위치 켜기'},
];
const SLOT = 40; // 소리 하나당 40프레임 (1.33초)

const SceneBody = () => {
  const f = useCurrentFrame();
  const idx = Math.min(SOUNDS.length - 1, Math.floor(f / SLOT));
  const local = f - idx * SLOT;
  const pop = interpolate(local, [0, 6], [1.25, 1], {extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
      {/* 2) <Sequence from> 로 소리마다 시작 시점을 정하고, 그 안에 <Audio> 를 넣어요 */}
      {SOUNDS.map((s, i) => (
        <Sequence key={s.name} from={i * SLOT} durationInFrames={SLOT}>
          <Audio src={s.src} volume={0.6} />
        </Sequence>
      ))}

      {/* 3) 지금 나는 소리 이름을 크게 */}
      <div style={{color: '#fff', opacity: 0.7, fontSize: 30}}>{`import {${SOUNDS[idx].name}} from '@remotion/sfx'`}</div>
      <div style={{color: '#FFC93C', fontSize: 120, fontWeight: 900, transform: `scale(${pop})`, marginTop: 10}}>{SOUNDS[idx].name}</div>
      <div style={{color: '#fff', fontSize: 44, fontWeight: 700}}>{SOUNDS[idx].ko}</div>

      {/* 진행 표시 점 */}
      <div style={{display: 'flex', gap: 16, marginTop: 60}}>
        {SOUNDS.map((s, i) => (
          <div key={s.name} style={{width: 18, height: 18, borderRadius: 9, background: i === idx ? '#FFC93C' : '#ffffff33'}} />
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
