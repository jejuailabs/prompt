'use client';

import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { TOOL_SEO } from '@/lib/tool-seo';
import { ToolExperience } from '@/components/tools/tool-experience';
import { Button } from '@/components/ui/button';

export default function ToolView() {
  const slug = useAppStore((state) => state.params.slug || '');
  const navigate = useAppStore((state) => state.navigate);
  const tool = TOOL_SEO[slug];
  if (!tool) return <div className="mx-auto max-w-5xl py-16 text-center"><h1 className="text-2xl font-bold">도구를 찾을 수 없습니다.</h1><Button className="mt-5" onClick={() => navigate('ai-tools')}>AI Tools로 돌아가기</Button></div>;
  return <div className="mx-auto w-full max-w-5xl py-2 md:py-4"><Button variant="ghost" size="sm" onClick={() => navigate('ai-tools')}><ArrowLeft className="size-4" />AI Tools</Button><div className="mt-5"><p className="text-sm font-semibold text-primary">PLAYLAB AI TOOLS</p><h1 className="mt-2 text-3xl font-bold tracking-tight">{tool.title}</h1><p className="mt-2 text-muted-foreground">{tool.description}</p></div><ToolExperience slug={slug} /></div>;
}
