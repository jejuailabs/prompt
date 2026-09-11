'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ModuleDTO } from '@/lib/types';
import { Icon } from '@/components/layout/icon';
import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';

const LIVE_TOOL_IDS = new Set(['tool-tts', 'tool-suno', 'tool-metaprompt', 'tool-qr', 'tool-thumbnail']);
const VISUALS: Record<string, { accent: string; soft: string; glow: string }> = {
  'tool-tts': { accent: 'from-cyan-500 to-blue-600', soft: 'bg-cyan-50 text-cyan-600', glow: 'group-hover:shadow-cyan-100' },
  'tool-storyboard': { accent: 'from-amber-400 to-orange-500', soft: 'bg-amber-50 text-amber-600', glow: 'group-hover:shadow-amber-100' },
  'tool-suno': { accent: 'from-fuchsia-500 to-pink-500', soft: 'bg-fuchsia-50 text-fuchsia-600', glow: 'group-hover:shadow-fuchsia-100' },
  'tool-metaprompt': { accent: 'from-violet-500 to-indigo-600', soft: 'bg-violet-50 text-violet-600', glow: 'group-hover:shadow-violet-100' },
  'tool-detail': { accent: 'from-sky-500 to-blue-600', soft: 'bg-sky-50 text-sky-600', glow: 'group-hover:shadow-sky-100' },
  'tool-detail2': { accent: 'from-orange-500 to-rose-500', soft: 'bg-orange-50 text-orange-600', glow: 'group-hover:shadow-orange-100' },
  'tool-converter': { accent: 'from-emerald-500 to-teal-600', soft: 'bg-emerald-50 text-emerald-600', glow: 'group-hover:shadow-emerald-100' },
  'tool-autocut': { accent: 'from-purple-500 to-pink-500', soft: 'bg-purple-50 text-purple-600', glow: 'group-hover:shadow-purple-100' },
  'tool-srt': { accent: 'from-blue-500 to-indigo-600', soft: 'bg-blue-50 text-blue-600', glow: 'group-hover:shadow-blue-100' },
  'tool-url': { accent: 'from-slate-600 to-slate-800', soft: 'bg-slate-100 text-slate-600', glow: 'group-hover:shadow-slate-200' },
  'tool-qr': { accent: 'from-rose-500 to-red-600', soft: 'bg-rose-50 text-rose-600', glow: 'group-hover:shadow-rose-100' },
  'tool-thumbnail': { accent: 'from-pink-500 to-orange-500', soft: 'bg-pink-50 text-pink-600', glow: 'group-hover:shadow-pink-100' },
};

export default function AiToolsView() {
  const navigate = useAppStore((state) => state.navigate);
  const tools = useQuery({ queryKey: ['modules'], queryFn: () => api.get<ModuleDTO[]>('/api/modules') });
  // Admin's module ON/OFF switch is the publication control: hidden tools
  // stay registered but never appear in this public catalogue.
  const moduleById = new Map((tools.data ?? []).map((m) => [m.id, m]));
  const items = AI_STUDIO_TOOLS.map((detail) => ({ detail, module: moduleById.get(detail.id) })).filter((x) => x.module?.enabled);
  return <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6 lg:p-8">
    <ViewHeader title="AI Tools" subtitle="필요한 AI 도구를 선택해 바로 작업을 시작하세요" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items.map(({ detail, module }) => { const tool = module!; const isLive = LIVE_TOOL_IDS.has(tool.id); const visual = VISUALS[tool.id] || VISUALS['tool-metaprompt']; return <Card key={tool.id} className={`group relative overflow-hidden border-border/80 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl ${visual.glow}`}>
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${visual.accent}`} />
        <div className="flex items-start justify-between gap-2"><span className={`flex size-10 items-center justify-center rounded-xl ${visual.soft}`}><Icon name={tool.icon} className="size-5" /></span><Badge variant={isLive ? 'default' : 'secondary'} className="px-2 py-0.5 text-[10px]">{isLive ? '사용 가능' : '준비 중'}</Badge></div>
        <h2 className="mt-4 truncate text-base font-bold tracking-tight">{detail.titleKo}</h2><p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">{detail.descKo}</p><ul className="mt-3 space-y-1 text-[11px] leading-4 text-muted-foreground">{detail.features.slice(0, 2).map((feature) => <li key={feature} className="truncate">✓ {feature}</li>)}</ul>
        <Button size="sm" className={`mt-4 h-8 w-full bg-gradient-to-r text-xs shadow-none ${visual.accent}`} disabled={!isLive} onClick={() => navigate('tool', { slug: tool.id.replace('tool-', '') })}><Sparkles className="size-3.5" />{isLive ? '도구 열기' : '이식 중'}</Button>
      </Card>; })}
    </div>
  </div>;
}
