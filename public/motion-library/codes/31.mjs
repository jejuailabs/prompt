// @remotion/media-parser — 영상 파일을 "열어보지 않고" 정보만 쏙 꺼내는 Node 스크립트 (렌더링 X)
// 실행: remotion_lab 폴더 안에서  node 31_media_parser.mjs
import {parseMedia} from '@remotion/media-parser';

// 1) 분석할 영상 주소 (인터넷 URL 이면 기본 리더가 fetch 로 필요한 부분만 내려받아요)
console.log('── CONNECT AI LAB · 리모션 실습 ──');
const src = 'https://www.aicitybuilders.com/video/remotion/assets/jay.mp4';

const start = Date.now();

// 2) fields 에 "알고 싶은 정보"만 true 로 적습니다 → 그 정보가 나오면 바로 멈춰서 빨라요
const result = await parseMedia({
  src,
  fields: {
    durationInSeconds: true, // 길이(초)
    dimensions: true, // 가로 x 세로
    fps: true, // 초당 프레임
    videoCodec: true, // 영상 코덱 (h264 등)
    audioCodec: true, // 소리 코덱 (aac 등)
    size: true, // 파일 크기(바이트)
    container: true, // 파일 형식 (mp4, webm…)
  },
  acknowledgeRemotionLicense: true, // 라이선스 안내 메시지 끄기
});

// 3) 보기 좋게 출력
console.log('파일      :', src);
console.log('형식      :', result.container);
console.log('길이      :', result.durationInSeconds?.toFixed(2), '초');
console.log('해상도    :', `${result.dimensions?.width} x ${result.dimensions?.height}`);
console.log('fps       :', result.fps);
console.log('영상 코덱 :', result.videoCodec);
console.log('소리 코덱 :', result.audioCodec);
console.log('파일 크기 :', (result.size / 1e6).toFixed(2), 'MB');
console.log('분석 시간 :', Date.now() - start, 'ms');
