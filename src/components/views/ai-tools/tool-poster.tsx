import type { CSSProperties } from 'react';
import type { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { Icon } from '@/components/layout/icon';
import styles from './tools.module.css';

type ToolId = (typeof AI_STUDIO_TOOLS)[number]['id'];
type Graphic = 'narration' | 'storyboard' | 'lyrics' | 'record' | 'prompt' | 'page' | 'pages' | 'files' | 'transcript' | 'timeline' | 'captions' | 'link' | 'qr' | 'thumbnail';
type PosterSpec = { code: string; flow: string; accent: string; surface: string; graphic: Graphic; split: number };
const POSTERS = {
  'tool-tts': { code: 'VOICE / TEXT TO SPEECH', flow: '대본 → 내레이션', accent: '#b8e7d2', surface: '#183d36', graphic: 'narration', split: 1 },
  'tool-storyboard': { code: 'VISUAL / STORYBOARD', flow: '기획 → 컷 → 프롬프트', accent: '#b7d9f4', surface: '#20344c', graphic: 'storyboard', split: 1 },
  'tool-suno': { code: 'MUSIC / SUNO', flow: '무드 → 가사 · 음악 프롬프트', accent: '#f7d68e', surface: '#4b3922', graphic: 'lyrics', split: 2 },
  'tool-ace-music': { code: 'MUSIC / ACE-STEP', flow: '가사 → 노래 · MP3', accent: '#ffb68f', surface: '#4b2b29', graphic: 'record', split: 1 },
  'tool-metaprompt': { code: 'PROMPTS / AI INTERVIEW', flow: '아이디어 → 완성형 프롬프트', accent: '#d8c3ff', surface: '#362950', graphic: 'prompt', split: 1 },
  'tool-detail': { code: 'COMMERCE / PAGE DESIGN', flow: '상품 정보 → 상세페이지 설계', accent: '#efbfd0', surface: '#422a38', graphic: 'page', split: 1 },
  'tool-detail2': { code: 'COMMERCE / 12 SCENES', flow: '상품 → 12장 설득 구조', accent: '#f1cf9f', surface: '#473826', graphic: 'pages', split: 1 },
  'tool-converter': { code: 'FILES / FREE CONVERTER', flow: 'HEIC · 이미지 · PDF', accent: '#d3e8b3', surface: '#2e3c25', graphic: 'files', split: 1 },
  'tool-whisper': { code: 'VOICE / SPEECH TO TEXT', flow: '음성 → 텍스트', accent: '#a5dce7', surface: '#193942', graphic: 'transcript', split: 1 },
  'tool-autocut': { code: 'EDIT / SCRIPT & SEGMENTS', flow: '영상 · 음성 → 편집용 대본', accent: '#aac4fa', surface: '#25354f', graphic: 'timeline', split: 1 },
  'tool-srt': { code: 'VOICE / TIMED CAPTIONS', flow: '음성 → 시간 자막', accent: '#b0daca', surface: '#25443b', graphic: 'captions', split: 1 },
  'tool-url': { code: 'LINKS / SHORT URL', flow: '긴 주소 → 짧은 링크', accent: '#c9d9b5', surface: '#323d28', graphic: 'link', split: 1 },
  'tool-qr': { code: 'UTILITY / QR CODE', flow: 'URL → QR 코드 · PNG', accent: '#e1df99', surface: '#3c3d24', graphic: 'qr', split: 2 },
  'tool-thumbnail': { code: 'VISUAL / YOUTUBE', flow: 'CTR → 썸네일 프롬프트', accent: '#e5bbeb', surface: '#472b49', graphic: 'thumbnail', split: 2 },
} satisfies Record<ToolId, PosterSpec>;

function TextLines({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`} strokeLinecap="round"><path d="M0 0h33M0 9h42M0 18h27" opacity=".7" /><path d="M0 27h37" opacity=".35" /></g>;
}
function Wave({ x = 0, y = 0 }: { x?: number; y?: number }) {
  return <g transform={`translate(${x} ${y})`} strokeWidth="3" strokeLinecap="round">{[10,22,36,20,46,32,16,28,8].map((height,i)=><path key={i} d={`M${i*7} ${-height/2}v${height}`} opacity={.5 + (i % 3)*.2} />)}</g>;
}
function Arrow({ x = 0, y = 0 }: { x?: number; y?: number }) { return <path transform={`translate(${x} ${y})`} d="M0 0h25m-6-6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" opacity=".5" />; }
function File({ x, label }: { x: number; label: string }) {
  return <g transform={`translate(${x} 12)`}><path d="M0 0h29l12 12v48H0z" fill="currentColor" fillOpacity=".05" strokeLinejoin="round" /><path d="M29 0v12h12" opacity=".5" /><text x="20" y="39" fill="currentColor" stroke="none" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="ui-monospace,monospace">{label}</text></g>;
}
function GraphicArt({ graphic }: { graphic: Graphic }) {
  let content;
  switch (graphic) {
    case 'narration': content = <><rect x="7" y="7" width="72" height="68" rx="7" fill="currentColor" fillOpacity=".04" /><TextLines x={20} y={25} /><Arrow x={106} y={42} /><Wave x={162} y={42} /></>; break;
    case 'storyboard': content = <>{[8,94,180].map((x,i)=><g key={x} transform={`translate(${x} 14)`}><rect width="72" height="48" rx="4" fill="currentColor" fillOpacity=".04" /><path d="M0 10h72M9 5h2m5 0h2m5 0h2" opacity=".5" /><path d={i===1?'M22 41v-8l12-12 14 13v7':'M12 39l16-17 14 13 9-8 9 12'} strokeLinejoin="round" opacity=".8" /><text x="0" y="63" stroke="none" fill="currentColor" fontSize="8" fontFamily="monospace">0{i+1} / CUT</text></g>)}</>; break;
    case 'lyrics': content = <><g transform="translate(11 8)"><rect width="113" height="66" rx="5" fill="currentColor" fillOpacity=".04" /><path d="M0 17h113" opacity=".25" /><text x="11" y="12" fill="currentColor" stroke="none" fontSize="8" fontFamily="monospace">LYRICS & STYLE</text><TextLines x={12} y={29} /><path d="M67 29h31m-31 9h20m-20 9h27" opacity=".3" /></g><path d="M168 64V23l44-10v40M168 32l44-10" strokeWidth="3" strokeLinejoin="round" /><ellipse cx="159" cy="65" rx="10" ry="6" fill="currentColor" fillOpacity=".75" stroke="none" /><ellipse cx="203" cy="54" rx="10" ry="6" fill="currentColor" fillOpacity=".75" stroke="none" /></>; break;
    case 'record': content = <><circle cx="53" cy="42" r="34" fill="currentColor" fillOpacity=".05" /><circle cx="53" cy="42" r="25" opacity=".25" /><circle cx="53" cy="42" r="15" opacity=".45" /><circle cx="53" cy="42" r="5" fill="currentColor" /><g transform="translate(111 9)"><rect width="132" height="65" rx="9" fill="currentColor" fillOpacity=".04" /><path d="m14 15 11 6-11 6z" fill="currentColor" stroke="none" /><text x="36" y="24" fill="currentColor" stroke="none" fontSize="10" fontWeight="700" fontFamily="monospace">MP3 / AUDIO</text><g transform="translate(17 46) scale(1.55 .48)"><Wave /></g></g></>; break;
    case 'prompt': content = <><path d="M11 15h67v35H30L11 62z" fill="currentColor" fillOpacity=".05" strokeLinejoin="round" /><TextLines x={24} y={25} /><Arrow x={100} y={40} /><g transform="translate(147 9)"><rect width="104" height="66" rx="6" fill="currentColor" fillOpacity=".04" /><path d="m20 20-8 12 8 12m61-24 8 12-8 12M61 15 43 50" strokeWidth="2.5" strokeLinejoin="round" /></g></>; break;
    case 'page': content = <><g transform="translate(9 7)"><rect width="66" height="70" rx="4" fill="currentColor" fillOpacity=".04" /><path d="M0 11h66" opacity=".35" /><rect x="8" y="19" width="50" height="23" rx="2" fill="currentColor" fillOpacity=".18" stroke="none" /><path d="M9 50h38M9 57h48M9 64h25" opacity=".6" /></g><Arrow x={93} y={42} /><g transform="translate(146 11)"><text fill="currentColor" stroke="none" x="0" y="13" fontSize="11" fontWeight="700">STYLE DNA</text><path d="M0 24h75M0 33h91M0 42h61" opacity=".5" /><rect y="53" width="25" height="10" rx="5" fill="currentColor" fillOpacity=".25" stroke="none" /><rect x="32" y="53" width="25" height="10" rx="5" fill="currentColor" fillOpacity=".5" stroke="none" /><rect x="64" y="53" width="25" height="10" rx="5" fill="currentColor" stroke="none" /></g></>; break;
    case 'pages': content = <>{Array.from({length:12},(_,i)=><g key={i} transform={`translate(${10+(i%6)*41} ${9+Math.floor(i/6)*38})`}><rect width="31" height="29" rx="3" fill="currentColor" fillOpacity={i===0?.25:.04} /><text x="15.5" y="18" fill="currentColor" stroke="none" textAnchor="middle" fontSize="9" fontFamily="monospace">{String(i+1).padStart(2,'0')}</text></g>)}</>; break;
    case 'files': content = <><File x={10} label="HEIC" /><Arrow x={63} y={42} /><File x={111} label="JPG" /><Arrow x={164} y={42} /><File x={212} label="PDF" /></>; break;
    case 'transcript': content = <><Wave x={15} y={42} /><Arrow x={105} y={42} /><g transform="translate(158 10)"><rect width="95" height="66" rx="5" fill="currentColor" fillOpacity=".04" /><text x="12" y="22" fill="currentColor" stroke="none" fontSize="13" fontWeight="700">가나다</text><TextLines x={13} y={35} /></g></>; break;
    case 'timeline': content = <><path d="M9 13h242m-242 61h242" opacity=".3" />{[10,70,145,205].map((x,i)=><g key={x}><rect x={x} y="22" width={i===1?65:46} height="39" rx="4" fill="currentColor" fillOpacity={i%2?.18:.08} /><path d={`M${x+7} 43h9m4-8v16m6-22v28m6-21v14`} strokeLinecap="round" opacity=".6" /></g>)}<path d="M137 8v69" strokeDasharray="3 4" /><path d="m132 3 5 5 5-5" strokeLinejoin="round" /></>; break;
    case 'captions': content = <><g transform="translate(10 9)"><rect width="153" height="68" rx="5" fill="currentColor" fillOpacity=".04" /><path d="m69 14 19 12-19 12z" fill="currentColor" fillOpacity=".25" stroke="none" /><rect x="18" y="46" width="116" height="14" rx="3" fill="currentColor" fillOpacity=".13" stroke="none" /><path d="M28 53h34m8 0h52" opacity=".7" /></g><File x={206} label="SRT" /><path d="M178 29h17m-17 11h17m-17 11h17" opacity=".5" /></>; break;
    case 'link': content = <><rect x="9" y="18" width="150" height="31" rx="15" fill="currentColor" fillOpacity=".06" /><text x="23" y="38" fill="currentColor" stroke="none" fontSize="10" fontFamily="monospace">https://long-url/…</text><path d="M83 57v13h97" opacity=".4" /><path d="m174 65 6 5-6 5" opacity=".4" /><rect x="184" y="55" width="65" height="28" rx="14" fill="currentColor" fillOpacity=".15" /><text x="216" y="73" fill="currentColor" stroke="none" textAnchor="middle" fontSize="11" fontFamily="monospace">/go</text></>; break;
    case 'qr': content = <><g transform="translate(10 21)"><rect width="107" height="35" rx="6" fill="currentColor" fillOpacity=".04" /><text x="53" y="22" fill="currentColor" stroke="none" textAnchor="middle" fontSize="13" fontWeight="700" fontFamily="monospace">https://</text></g><Arrow x={134} y={40} /><g transform="translate(191 5)" fill="currentColor" stroke="none">{[[0,0],[42,0],[0,42]].map(([x,y])=><g key={x+','+y}><rect x={x} y={y} width="28" height="28" rx="2" /><rect x={x+5} y={y+5} width="18" height="18" fill="var(--poster-surface)" /><rect x={x+9} y={y+9} width="10" height="10" /></g>)}{[[35,0],[35,14],[28,35],[42,35],[56,35],[35,49],[49,49],[63,49],[35,63],[56,63],[63,63]].map(([x,y])=><rect key={x+','+y} x={x} y={y} width="7" height="7" opacity=".8" />)}</g></>; break;
    case 'thumbnail': content = <><g transform="translate(17 8)"><rect width="185" height="69" rx="4" fill="currentColor" fillOpacity=".05" /><rect x="8" y="8" width="167" height="52" rx="2" strokeDasharray="3 4" opacity=".4" /><text x="21" y="39" fill="currentColor" stroke="none" fontSize="24" fontWeight="900" fontFamily="sans-serif">Aa</text><path d="M72 24h83M72 36h59M72 47h72" strokeWidth="4" strokeLinecap="round" opacity=".7" /></g><path d="m232 6 4 15 15 4-15 4-4 15-4-15-15-4 15-4z" fill="currentColor" fillOpacity=".8" stroke="none" /></>; break;
  }
  return <svg className={styles.posterGraphic} viewBox="0 0 270 86" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{content}</svg>;
}

export function ToolPoster({ id, title, icon }: { id: ToolId; title: string; icon: string }) {
  const spec = POSTERS[id];
  const words = title.split(' ');
  const lines = [words.slice(0,spec.split).join(' '),words.slice(spec.split).join(' ')];
  const palette = { '--poster-accent': spec.accent, '--poster-surface': spec.surface } as CSSProperties;
  return <div className={styles.poster} style={palette} aria-hidden="true">
    <div className={styles.posterHeader}><span>{spec.code}</span><Icon name={icon} className={styles.posterIcon} /></div>
    <div className={styles.posterTitle}>{lines.map((line,i)=>line && <span key={i}>{line}</span>)}</div>
    <GraphicArt graphic={spec.graphic} />
    <div className={styles.posterFlow}>{spec.flow}</div>
  </div>;
}
