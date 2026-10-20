// frames=240 size=1280x720
import {AbsoluteFill, Audio, useCurrentFrame, useVideoConfig} from 'remotion';
import {useWindowedAudioData, visualizeAudio} from '@remotion/media-utils';
import {FONT} from './font';

// 리모션 공식 예제 음악 (약 2분짜리 mp3)
const MUSIC = 'https://remotion.media/music.mp3';
const BARS = 48;
// 0~1 값 → 데시벨(dB) → 막대 높이 비율(0~1). -70dB 이하는 0, -25dB 이상은 꽉 참
const toHeight = (v: number) => Math.max(0, Math.min(1, (20 * Math.log10(v + 1e-6) + 70) / 45));

const SceneBody = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // 1) 오디오 데이터 불러오기 — 긴 파일도 "지금 프레임 주변 10초"만 내려받아요
  const {audioData, dataOffsetInSeconds} = useWindowedAudioData({src: MUSIC, frame, fps, windowInSeconds: 10});

  // 2) 지금 프레임의 주파수 세기 (왼쪽 = 저음, 오른쪽 = 고음, 값은 0~1)
  const bars = audioData
    ? visualizeAudio({audioData, frame, fps, numberOfSamples: 128, dataOffsetInSeconds, optimizeFor: 'speed'}).slice(0, BARS)
    : [];

  return (
    <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center'}}>
      {/* 3) 소리도 함께 재생 (볼륨 0.6) */}
      <Audio src={MUSIC} volume={0.6} />

      <div style={{marginTop: 50, color: '#FFC93C', fontSize: 40, fontWeight: 700}}>useWindowedAudioData + visualizeAudio</div>
      <div style={{color: '#fff', opacity: 0.7, fontSize: 26, marginTop: 6}}>음악에 맞춰 춤추는 스펙트럼 막대</div>

      {/* 4) 막대 그리기: 고음은 값이 아주 작아서, 사람 귀처럼 데시벨(dB)로 바꾸면 골고루 잘 보여요 */}
      <div style={{position: 'absolute', bottom: 120, display: 'flex', alignItems: 'flex-end', gap: 6, height: 420}}>
        {bars.map((v, i) => (
          <div key={i} style={{width: 18, borderRadius: 9, height: 10 + toHeight(v) * 400,
            background: i % 2 ? '#FFC93C' : '#FFE08A'}} />
        ))}
      </div>
      <div style={{position: 'absolute', bottom: 60, width: 1000, display: 'flex', justifyContent: 'space-between', color: '#fff', opacity: 0.6, fontSize: 24}}>
        <span>← 저음 (베이스)</span><span>고음 →</span>
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
