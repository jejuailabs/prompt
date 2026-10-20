// frames=180 size=1280x720
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Audio, Video} from '@remotion/media';
import {FONT} from './font';

// 리모션 공식 예제 영상 (1920x1080, 30fps, 10초)
const SRC = 'https://www.aicitybuilders.com/video/remotion/assets/jay.mp4'; // 제이 강의 영상 10초

const Box = ({api, ko, children}: {api: string; ko: string; children: React.ReactNode}) => (
  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
    <div style={{width: 560, height: 315, borderRadius: 16, overflow: 'hidden', border: '3px solid #FFC93C'}}>{children}</div>
    <div style={{color: '#FFC93C', fontSize: 26, fontFamily: 'monospace', marginTop: 14}}>{api}</div>
    <div style={{color: '#fff', fontSize: 24}}>{ko}</div>
  </div>
);

const SceneBody = () => {
  const frame = useCurrentFrame();
  const fill = {width: '100%', height: '100%'};

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
      <div style={{color: '#FFC93C', fontSize: 44, fontWeight: 700}}>{'<Video> · <Audio> (@remotion/media)'}</div>
      <div style={{color: '#fff', opacity: 0.7, fontSize: 26, marginBottom: 40}}>영상 자르기 · 속도 바꾸기 · 볼륨 조절</div>

      <div style={{display: 'flex', gap: 40}}>
        {/* 1) trimBefore / trimAfter: 원본의 2초(60프레임)~8초(240프레임) 구간만 사용 (단위는 프레임) */}
        <Box api="trimBefore={60} trimAfter={240}" ko="원본 2초 지점부터 재생">
          <Video src={SRC} trimBefore={60} trimAfter={240} muted style={fill} />
        </Box>
        {/* 2) playbackRate: 0.5 = 슬로모션, 2 = 2배속 */}
        <Box api="playbackRate={2}" ko="2배 빠르게">
          <Video src={SRC} playbackRate={2} muted style={fill} />
        </Box>
      </div>

      {/* 3) 소리는 <Audio> 로 따로. volume 에 함수를 주면 프레임마다 볼륨을 바꿀 수 있어요
             → 처음 1초 동안 커지고(fade in), 마지막 1초 동안 작아짐(fade out) */}
      <Audio
        src={SRC}
        volume={(f) => interpolate(f, [0, 30, 150, 180], [0, 0.8, 0.8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}
      />
      <div style={{color: '#fff', fontSize: 26, marginTop: 30}}>
        <span style={{color: '#FFC93C', fontFamily: 'monospace'}}>{'<Audio volume={f => …} />'}</span>
        {`  지금 볼륨 ${interpolate(frame, [0, 30, 150, 180], [0, 0.8, 0.8, 0], {extrapolateRight: 'clamp'}).toFixed(2)}`}
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
