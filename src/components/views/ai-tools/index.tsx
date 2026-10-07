'use client';
import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Search } from 'lucide-react';
import { useModules } from '@/hooks/use-session';
import { ToolPoster } from './tool-poster';
import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { useAppStore } from '@/lib/store';
import { PreviewNotice } from '@/components/runtime-context';
import styles from './tools.module.css';

const LIVE_TOOL_IDS = new Set(['tool-tts', 'tool-suno', 'tool-ace-music', 'tool-metaprompt', 'tool-qr', 'tool-thumbnail', 'tool-storyboard', 'tool-detail', 'tool-detail2', 'tool-converter', 'tool-srt', 'tool-autocut', 'tool-whisper']);
const GROUPS = { voice: ['음성', 'Voice'], music: ['음악', 'Music'], visual: ['이미지 · 영상', 'Visual'], writing: ['프롬프트', 'Prompts'], utility: ['변환 · 유틸리티', 'Utilities'] } as const;
type Group = keyof typeof GROUPS;
function groupFor(id: string): Group {
  if (['tool-tts','tool-whisper','tool-srt'].includes(id)) return 'voice';
  if (['tool-suno','tool-ace-music'].includes(id)) return 'music';
  if (id === 'tool-metaprompt') return 'writing';
  if (['tool-converter','tool-qr','tool-url'].includes(id)) return 'utility';
  return 'visual';
}
export default function AiToolsView() {
  const navigate = useAppStore(s => s.navigate);
  const session = useAppStore(s => s.session);
  const setLoginOpen = useAppStore(s => s.setLoginOpen);
  const en = useAppStore(s => s.locale) === 'en';
  const modules = useModules();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group | ''>('');
  const byId = new Map((modules.data ?? []).map(m => [m.id,m]));
  const available = AI_STUDIO_TOOLS.filter(d => byId.get(d.id)?.enabled && !byId.get(d.id)?.adminOnly);
  const items = available.filter(d => (!group || groupFor(d.id) === group) && (d.titleKo + d.descKo).toLowerCase().includes(query.toLowerCase().trim()));
  return <div className={styles.page}>
    <section className={styles.hero}>
      <img className={styles.heroImage} src="/design/streaming-v1/assets/glass-garden.png" alt="" fetchPriority="high" />
      <div className={styles.heroCopy}><p className={styles.eyebrow}>P / THE PLAYLAB TOOLBOX</p><h1>{en ? <>Small tools.<br />Big possibilities<span>.</span></> : <>상상 다음은,<br />만들 차례<span>.</span></>}</h1><p>{en ? 'A voice, an image, the beginning of your next idea.' : '목소리 하나, 이미지 한 장, 나만의 음악까지.'}<br />{en ? 'Choose a tool. Start something.' : '만들고 싶은 것을 고르면, 시작은 가벼워져요.'}</p><div className={styles.heroActions}><a href="#tool-collection" onClick={e => { e.preventDefault(); document.getElementById('tool-collection')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); }}>{en ? 'Explore tools' : '도구 둘러보기'} <ArrowRight size={16} /></a>{!session && <button onClick={() => setLoginOpen(true)}>{en ? 'Sign in to start' : '로그인하고 시작하기'} <ArrowUpRight size={16} /></button>}</div></div>
      <div className={styles.creditNote}><span>{session ? 'YOUR CREATIVE FUEL' : 'A LITTLE HELP FOR YOUR NEXT IDEA'}</span><strong>{session ? `${session.credits.toLocaleString()} 크레딧` : '작은 도구, 새로운 가능성.'}</strong><small>{session ? 'AI 도구에서 사용할 수 있는 크레딧' : '무료 변환 · QR부터 AI 생성 도구까지'}</small></div>
    </section>
    <div className={styles.body}><PreviewNotice />
      <div id="tool-collection" className={styles.collectionHead}><div><p className={styles.eyebrow}>CHOOSE YOUR NEXT TOOL</p><h2>{en ? 'What will you make?' : '오늘은 무엇을 만들까요?'} <small>{available.length}</small></h2></div><label className={styles.search}><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={en ? 'Find a tool' : '어떤 도구가 필요하세요?'} aria-label={en ? 'Find a tool' : '도구 검색'} /></label></div>
      <div className={styles.filters} aria-label="도구 용도"><button aria-pressed={!group} onClick={() => setGroup('')}>{en ? 'All' : '전체'}</button>{(Object.keys(GROUPS) as Group[]).map(key => <button key={key} aria-pressed={group === key} onClick={() => setGroup(key)}>{GROUPS[key][en ? 1 : 0]}</button>)}</div>
      {modules.isError && <div className={styles.empty}>도구 목록을 갱신하지 못했어요. <button onClick={() => void modules.refetch()}>다시 불러오기</button></div>}
      <div className={styles.grid}>{items.map(detail => { const tool = byId.get(detail.id)!; const live = LIVE_TOOL_IDS.has(tool.id); return <article key={detail.id} className={styles.card}>
        <button className={styles.cardButton} disabled={!live} onClick={() => navigate('tool', { slug: tool.id.replace('tool-', '') })} aria-label={`${detail.titleKo} ${live ? '열기' : '준비 중'}`}><ToolPoster id={detail.id} title={detail.titleKo} icon={tool.icon} /><span className={styles.cardArrow}>{live ? <ArrowUpRight size={18} /> : '준비 중'}</span></button>
        <h3><button disabled={!live} onClick={() => navigate('tool', { slug: tool.id.replace('tool-', '') })}>{detail.titleKo}</button></h3><p>{detail.descKo}</p><span className={styles.cardMeta}>{['tool-qr','tool-converter'].includes(detail.id) ? '무료 · 브라우저에서 바로 사용' : live ? 'AI TOOL · 로그인 후 사용' : 'COMING SOON'}</span>
      </article>; })}</div>
      {!items.length && !modules.isError && <p className={styles.empty}>검색한 도구가 없어요. 다른 단어로 찾아보세요.</p>}
      <a href="/mcp-connect" className={styles.connection}><div><span className={styles.eyebrow}>GO ONE STEP FURTHER / MCP</span><h2>당신의 AI와 직접 연결하세요.</h2><p>Codex · Claude Code에서 영상, 3D, 음악 만들기</p></div><ArrowUpRight size={27} /></a>
    </div>
  </div>;
}
