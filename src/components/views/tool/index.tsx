'use client';

import { ArrowLeft } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { TOOL_SEO } from '@/lib/tool-seo';
import { ToolExperience } from '@/components/tools/tool-experience';
import { Button } from '@/components/ui/button';
import type { ViewKey } from '@/lib/types';

export default function ToolView() {
  const slug = useAppStore((state) => state.params.slug || '');
  const navigate = useAppStore((state) => state.navigate);
  const tool = TOOL_SEO[slug];
  if (!tool) return <div className="mx-auto max-w-5xl py-16 text-center"><h1 className="text-2xl font-bold">도구를 찾을 수 없습니다.</h1><Button className="mt-5" onClick={() => navigate('ai-tools')}>AI Tools로 돌아가기</Button></div>;
  const legacyTarget = ({ '3d-asset': '3d-studio', 'shortform-video': 'video-studio', 'detail-page': 'tool', 'game-maker': 'game-room' } as Record<string, ViewKey>)[slug];
  return <div className="editorial-page mx-auto w-full max-w-6xl"><Button variant="ghost" size="sm" onClick={() => navigate('ai-tools')}><ArrowLeft className="size-4" />AI Tools</Button><div className="mt-5"><p className="eyebrow text-primary">PLAYLAB AI TOOLS</p><h1 className="mt-2 editorial-page-title">{tool.title}</h1><p className="mt-2 text-muted-foreground">{tool.description}</p></div>{legacyTarget ? <section className="mt-8 rounded-lg border p-6"><p>{slug === 'game-maker' ? 'AI 게임 생성은 준비 중입니다. 완성한 게임은 게임룸에서 등록하고 플레이할 수 있어요.' : '아래 제작 화면에서 시작할 수 있어요.'}</p><Button className="mt-4" onClick={() => navigate(legacyTarget, slug === 'detail-page' ? { slug: 'detail' } : undefined)}>{slug === 'game-maker' ? '게임룸 열기' : '제작 화면 열기'}</Button></section> : <ToolExperience slug={slug} />}</div>;
}
