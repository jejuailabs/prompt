// frames=180 size=1280x720
import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, interpolateColors, random, useCurrentFrame, useVideoConfig} from 'remotion';
import type {ReactNode} from 'react';
import {FONT} from './font';

const GOLD = '#FFC93C';
// 인터넷 주소(URL)를 바로 src에 넣을 수 있어요 (Colab에는 내 파일이 없으니 URL 사용)
const PHOTO = 'https://www.aicitybuilders.com/video/remotion/assets/jay_photo.jpg'; // 제이 사진 (CONNECT AI LAB)
const VIDEO = 'https://www.aicitybuilders.com/video/remotion/assets/jay.mp4'; // 제이 강의 영상 10초
const WHOOSH = 'https://remotion.media/whoosh.wav';

// random(시드): 같은 시드면 렌더할 때마다 같은 값 → Math.random() 대신 꼭 이걸 쓰기
const STARS = new Array(40).fill(0).map((_, i) => ({
  x: random(`x${i}`) * 1280,
  y: random(`y${i}`) * 720,
  size: 2 + random(`s${i}`) * 5,
}));

const Card = ({label, children}: {label: string; children: ReactNode}) => (
  <div style={{width: 560}}>
    <div style={{width: 560, height: 315, borderRadius: 18, overflow: 'hidden', border: `3px solid ${GOLD}`}}>{children}</div>
    <div style={{fontSize: 30, fontWeight: 900, color: GOLD, marginTop: 12}}>{label}</div>
  </div>
);

const SceneBody = () => {
  const f = useCurrentFrame();
  // interpolateColors: 프레임에 따라 색을 부드럽게 바꾸기 (금색 → 하늘색 → 분홍)
  const titleColor = interpolateColors(f, [0, 90, 180], [GOLD, '#5BC8FF', '#FF7AB6']);
  const zoom = interpolate(f, [0, 180], [1, 1.2]); // 사진 천천히 확대 (켄 번스)

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, color: '#fff'}}>
      {/* 별 40개: random(seed)로 위치·크기 결정 */}
      {STARS.map((s, i) => (
        <div key={i} style={{position: 'absolute', left: s.x, top: s.y, width: s.size, height: s.size, borderRadius: '50%', background: '#fff', opacity: 0.5}} />
      ))}

      <div style={{position: 'absolute', top: 40, width: '100%', textAlign: 'center', fontSize: 50, fontWeight: 900, color: titleColor}}>
        interpolateColors() 로 색 바꾸기
      </div>

      <div style={{position: 'absolute', top: 150, left: 60, right: 60, display: 'flex', justifyContent: 'space-between'}}>
        {/* OffthreadVideo: 영상 클립 넣기 (렌더 때 프레임을 정확히 뽑아 줌) */}
        <Card label="<OffthreadVideo src={URL} />">
          <OffthreadVideo src={VIDEO} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        </Card>
        {/* Img: 이미지가 다 불러와질 때까지 렌더를 기다려 줌 */}
        <Card label="<Img src={URL} />">
          <Img src={PHOTO} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})`}} />
        </Card>
      </div>

      {/* Audio: 효과음. Sequence로 감싸면 그 시점(1초)에 재생 */}
      <Sequence from={30}>
        <Audio src={WHOOSH} volume={0.8} />
      </Sequence>
      <div style={{position: 'absolute', bottom: 100, width: '100%', textAlign: 'center', fontSize: 30}}>
        배경 별 40개 = <span style={{color: GOLD}}>random(seed)</span> — 몇 번을 렌더해도 같은 자리
      </div>
      <div style={{position: 'absolute', bottom: 40, width: '100%', textAlign: 'center', fontSize: 30, opacity: f >= 30 ? 1 : 0.3}}>
        {'<Audio src={URL} />'} — 1초에 "휙" 효과음
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
