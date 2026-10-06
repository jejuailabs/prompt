'use client';
import { useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import { useModules } from '@/hooks/use-session';
import { Icon } from '@/components/layout/icon';
import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { useAppStore } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { PreviewNotice } from '@/components/runtime-context';
const LIVE_TOOL_IDS = new Set(['tool-tts', 'tool-suno', 'tool-ace-music', 'tool-metaprompt', 'tool-qr', 'tool-thumbnail', 'tool-storyboard', 'tool-detail', 'tool-detail2', 'tool-converter', 'tool-srt', 'tool-autocut', 'tool-whisper']);
export default function AiToolsView() {
  const navigate = useAppStore(s => s.navigate);
  const session = useAppStore(s => s.session);
  const en = useAppStore(s => s.locale) === 'en';
  const modules = useModules();
  const [query, setQuery] = useState('');
  const byId = new Map((modules.data ?? []).map(m => [m.id,m]));
  const items = AI_STUDIO_TOOLS.filter(d => byId.get(d.id)?.enabled && (d.titleKo + d.descKo).toLowerCase().includes(query.toLowerCase()));
  return <div className="editorial-page">
    <div className="editorial-page-intro"><div><p className="eyebrow">THE EVERYDAY TOOLBOX / PLAYLAB</p><h1 className="editorial-page-title">Small tools.<br />Big possibilities<span className="text-primary">.</span></h1><p>{en ? 'A voice, an image, the beginning of your next idea.' : '목소리 하나, 이미지 한 장. 다음 아이디어를 완성하는 작은 도구들.'}</p></div><span className="text-sm text-muted-foreground">{session ? `◉ ${session.credits.toLocaleString()} 크레딧` : '가입하면 1,000 크레딧으로 시작'}</span></div>
    <PreviewNotice />
    <a href="/mcp-connect" className="mb-8 flex items-center justify-between border border-border px-5 py-4 text-sm hover:border-primary"><span>Codex · Claude Code에서 영상, 3D, 음악 만들기</span><ArrowUpRight size={18} /></a>
    <div className="mb-8 flex items-center gap-3"><Search size={17} className="text-muted-foreground" /><Input value={query} onChange={e => setQuery(e.target.value)} placeholder={en ? 'Find a tool' : '어떤 도구가 필요하세요?'} aria-label={en ? 'Find a tool' : '도구 검색'} className="max-w-sm border-0 border-b rounded-none bg-transparent" /><span className="ml-auto text-xs text-muted-foreground">{items.length} TOOLS</span></div>
    {modules.isError && <div className="mb-5 text-sm text-muted-foreground">도구 목록을 갱신하지 못했어요. <button className="underline" onClick={() => void modules.refetch()}>다시 불러오기</button></div>}
    <div className="tool-catalogue">{items.map((detail,i) => { const tool=byId.get(detail.id)!; const live=LIVE_TOOL_IDS.has(tool.id); return <article key={detail.id} className="tool-tile"><div className="flex items-center justify-between"><Icon name={tool.icon} className="size-7 text-primary" /><span className="eyebrow">{String(i+1).padStart(2,'0')} / {live ? 'READY TO MAKE' : 'COMING SOON'}</span></div><h2>{detail.titleKo}</h2><p>{detail.descKo}</p><button disabled={!live} onClick={() => navigate('tool',{slug:tool.id.replace('tool-','')})}>{live ? (en ? 'Open tool' : '도구 열기') : '준비 중'} <ArrowUpRight size={16} /></button></article>; })}</div>
    {!items.length && !modules.isError && <p className="py-20 text-center text-muted-foreground">검색한 도구가 없어요. 다른 단어로 찾아보세요.</p>}
  </div>;
}
