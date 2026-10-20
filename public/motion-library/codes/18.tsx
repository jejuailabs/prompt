// frames=150 size=1280x720
import {AbsoluteFill, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {AnimatedEmoji, CalculateEmojiSrc, EmojiName} from '@remotion/animated-emoji';
import {FONT} from './font';

// 1) 이모지 영상 파일 위치 알려주기
//    기본값은 내 프로젝트의 public/ 폴더를 찾기 때문에, 공식 저장소(GitHub)의 파일을 바로 쓰도록 바꿉니다.
const calculateSrc: CalculateEmojiSrc = ({emoji, scale, format}) =>
  `https://raw.githubusercontent.com/remotion-dev/animated-emoji/main/public/${emoji}-${scale}x.${format === 'hevc' ? 'mp4' : 'webm'}`;

// 2) 보여줄 이모지 8개 (이름은 getAvailableEmojis() 로 전부 볼 수 있어요)
const EMOJIS: [EmojiName, string][] = [
  ['fire', '불꽃'], ['rocket', '로켓'], ['party-popper', '축하'], ['thumbs-up', '좋아요'],
  ['red-heart', '하트'], ['mind-blown', '충격'], ['robot', '로봇'], ['light-bulb', '아이디어'],
];

const SceneBody = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{color: '#FFC93C', fontSize: 44, fontWeight: 700}}>{'<AnimatedEmoji emoji="fire" />'}</div>
      <div style={{color: '#fff', opacity: 0.7, fontSize: 26, marginTop: 6}}>이름만 넣으면 움직이는 이모지 (구글 Noto)</div>

      {/* 3) 4 x 2 격자 — 하나씩 튀어나오게 spring */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 240px)', gap: '20px 30px', marginTop: 40}}>
        {EMOJIS.map(([name, ko], i) => {
          const s = spring({frame: frame - i * 5, fps, config: {damping: 12}});
          return (
            <div key={name} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${s})`}}>
              <AnimatedEmoji emoji={name} scale="0.5" calculateSrc={calculateSrc} style={{width: 170, height: 170}} />
              <div style={{color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 4}}>{ko}</div>
              <div style={{color: '#FFC93C', fontSize: 20, fontFamily: 'monospace'}}>{name}</div>
            </div>
          );
        })}
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
