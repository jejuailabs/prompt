// frames=150 size=1280x720
import {AbsoluteFill, useVideoConfig} from 'remotion';
import {Gif} from '@remotion/gif';
import {FONT} from './font';

// 1) 인터넷에 있는 GIF 주소 (CONNECT AI LAB 강의 장면, 480x270 가로 GIF)
const JAY_GIF = 'https://www.aicitybuilders.com/video/remotion/assets/jay.gif'; // 제이 강의 GIF

// 2) 정사각형 GIF 를 "가로로 긴 상자"에 넣을 때 맞춤 방식(fit) 3가지
const FITS = [
  {fit: 'contain', ko: '전부 보이게 (양옆 여백)'},
  {fit: 'cover', ko: '꽉 채우고 넘치면 자름'},
  {fit: 'fill', ko: '비율 무시하고 늘림'},
] as const;

const SceneBody = () => (
  <AbsoluteFill style={{background: '#050914', fontFamily: FONT, alignItems: 'center', justifyContent: 'center'}}>
    <div style={{color: '#FFC93C', fontSize: 44, fontWeight: 700}}>{'<Gif src={url} fit="cover" />'}</div>
    <div style={{color: '#fff', opacity: 0.7, fontSize: 26, marginTop: 6}}>GIF 가 영상 프레임에 맞춰 정확히 재생돼요</div>
    <div style={{display: 'flex', gap: 30, marginTop: 50}}>
      {FITS.map(({fit, ko}) => (
        <div key={fit} style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {/* 3) width/height 로 상자 크기를 정하고, fit 으로 채우는 방식을 고릅니다 */}
          <div style={{border: '3px solid #FFC93C', borderRadius: 12, overflow: 'hidden', background: '#101a36'}}>
            <Gif src={JAY_GIF} width={360} height={220} fit={fit} />
          </div>
          <div style={{color: '#FFC93C', fontSize: 30, fontFamily: 'monospace', marginTop: 16}}>{`fit="${fit}"`}</div>
          <div style={{color: '#fff', fontSize: 26}}>{ko}</div>
        </div>
      ))}
    </div>
  </AbsoluteFill>
);

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
