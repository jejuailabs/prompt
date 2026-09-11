'use client';

import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { ModuleDTO } from '@/lib/types';
import { Icon } from '@/components/layout/icon';
import { ViewHeader } from '@/components/shared/view-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function AiToolsView() {
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const tools = useQuery({ queryKey: ['modules'], queryFn: () => api.get<ModuleDTO[]>('/api/modules') });
  // Admin's module ON/OFF switch is the publication control: hidden tools
  // stay registered but never appear in this public catalogue.
  const items = (tools.data ?? []).filter((m) => m.group === 'tools' && m.enabled);
  return <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
    <ViewHeader title="AI Tools" subtitle="필요한 AI 도구를 선택해 바로 작업을 시작하세요" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((tool) => <Card key={tool.id} className="group p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
        <div className="flex items-start justify-between gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon name={tool.icon} className="size-6" /></span><Badge variant="secondary">{tool.status === 'active' ? '사용 가능' : '준비 중'}</Badge></div>
        <h2 className="mt-5 text-lg font-semibold">{locale === 'en' ? tool.titleEn : tool.titleKo}</h2><p className="mt-1 min-h-10 text-sm text-muted-foreground">{locale === 'en' ? tool.descEn : tool.descKo}</p>
        <Button className="mt-5 w-full" disabled={tool.status === 'preparing'} onClick={() => navigate('pipeline-run', { id: tool.id.replace('tool-', 'pipeline-') })}><Sparkles className="size-4" />{tool.status === 'active' ? '도구 열기' : '준비 중'}</Button>
      </Card>)}
    </div>
  </div>;
}
