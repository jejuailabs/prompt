'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ModuleDTO } from '@/lib/types';
import { Icon } from '@/components/layout/icon';
import { AI_STUDIO_TOOLS } from '@/lib/ai-studio-tools';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AiToolsView() {
  const router = useRouter();
  const tools = useQuery({ queryKey: ['modules'], queryFn: () => api.get<ModuleDTO[]>('/api/modules') });
  // Admin's module ON/OFF switch is the publication control: hidden tools
  // stay registered but never appear in this public catalogue.
  const moduleById = new Map((tools.data ?? []).map((m) => [m.id, m]));
  const items = AI_STUDIO_TOOLS.map((detail) => ({ detail, module: moduleById.get(detail.id) })).filter((x) => x.module?.enabled);
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
    <ViewHeader title="AI Tools" subtitle="필요한 AI 도구를 선택해 바로 작업을 시작하세요" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ detail, module }) => { const tool = module!; return <Card key={tool.id} className="group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon name={tool.icon} className="size-6" /></span><Badge variant="secondary">{tool.status === 'active' ? '사용 가능' : tool.status === 'beta' ? 'BETA' : '준비 중'}</Badge></div>
        <h2 className="mt-5 text-lg font-semibold">{detail.titleKo}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{detail.descKo}</p><ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">{detail.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
        <Button className="mt-5 w-full" disabled={tool.status === 'preparing'} onClick={() => router.push(`/tools/${tool.id.replace('tool-', '')}`)}><Sparkles className="size-4" />{tool.status === 'active' ? '도구 열기' : '상세 보기'}</Button>
      </Card>; })}
    </div>
  </div>;
}
