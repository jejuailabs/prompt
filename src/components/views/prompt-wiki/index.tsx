'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitFork, Heart, MessageCircle, ChevronDown, ChevronRight, ArrowUpRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { ViewKey } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';

interface TreeNode {
  id: string;
  title: string;
  body: string;
  category: string;
  thumbnailUrl: string | null;
  ownerId: string;
  ownerName: string;
  ownerAvatar: string | null;
  forkedFromId: string | null;
  likeCount: number;
  forkCount: number;
  commentCount: number;
  artifactCount: number;
  createdAt: string;
  children: TreeNode[];
}

function ForkNode({ node, depth, navigate }: { node: TreeNode; depth: number; navigate: (view: ViewKey, params?: Record<string, string>) => void }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasForks = node.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-border/50 pl-4' : ''}>
      <div className="group relative">
        {depth > 0 && (
          <div className="absolute -left-4 top-5 h-px w-4 bg-border/50" />
        )}
        <Card
          role="button"
          tabIndex={0}
          aria-label={`${node.title} 프롬프트 보기`}
          className={`wiki-prompt-card cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:ring-1 hover:ring-primary/40 ${depth === 0 ? 'wiki-root-card' : ''}`}
          onClick={() => navigate('prompt', { id: node.id })}
          onKeyDown={event => { if (event.target === event.currentTarget && ['Enter', ' '].includes(event.key)) { event.preventDefault(); navigate('prompt', { id: node.id }); } }}
        >
          <div className="wiki-card-inner">
            {node.thumbnailUrl ? (
              <img
                src={node.thumbnailUrl}
                alt={`${node.title} 대표 이미지`}
                className="wiki-card-image"
              />
            ) : (
              <div className="wiki-card-image wiki-card-placeholder" aria-hidden="true">
                <span>PLAYLAB / PROMPT</span><strong>{node.category}</strong>
              </div>
            )}
            <div className="wiki-card-content">
              <div className="flex items-start justify-between gap-2">
                <h3>{node.title}</h3>
                {hasForks && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                    className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="sr-only">{expanded ? 'Collapse' : 'Expand'}</span>
                  </button>
                )}
              </div>
              <p className="wiki-card-excerpt">{node.body}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Avatar className="size-4">
                    {node.ownerAvatar && <AvatarImage src={node.ownerAvatar} />}
                    <AvatarFallback className="text-[8px]">{node.ownerName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {node.ownerName}
                </span>
                <span className="flex items-center gap-0.5"><Heart className="size-3" />{node.likeCount}</span>
                <span className="flex items-center gap-0.5"><GitFork className="size-3" />{node.forkCount}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="size-3" />{node.commentCount}</span>
                {node.artifactCount > 0 && (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    결과물 {node.artifactCount}
                  </Badge>
                )}
                <Badge variant="outline" className="px-1 py-0 text-[10px]">{node.category}</Badge>
              </div>
              {depth === 0 && <span className="wiki-card-open">프롬프트 보기 <ArrowUpRight size={15} /></span>}
            </div>
          </div>
        </Card>
      </div>

      {hasForks && expanded && (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <ForkNode key={child.id} node={child} depth={depth + 1} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PromptWikiView() {
  const navigate = useAppStore((s) => s.navigate);
  const locale = useAppStore((s) => s.locale);

  const { data: trees = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['prompt-trees'],
    queryFn: () => api.get<TreeNode[]>('/api/prompts/trees'),
    staleTime: 30_000,
  });

  const totalForks = trees.reduce((sum, t) => sum + countDescendants(t), 0);
  const totalRoots = trees.length;

  if (isLoading) return <div className="editorial-page" role="status">프롬프트를 불러오는 중이에요.</div>;
  if (isError) return <EmptyState title="프롬프트를 불러오지 못했어요." action={<Button onClick={() => void refetch()}>다시 불러오기</Button>} />;

  return (
    <div className="wiki-page editorial-page space-y-6">
      <div>
        <ViewHeader eyebrow="THE PROMPT COLLECTION" title={locale === 'en' ? 'Prompt Wiki' : '프롬프트 위키'} subtitle={locale === 'en' ? 'See the result. Make the prompt your own.' : '마음에 드는 결과물에서 시작해, 프롬프트를 내 것으로.'} actions={<Button onClick={() => navigate('gallery', { tab: 'prompts' })}>{locale === 'en' ? 'Find a prompt' : '프롬프트 검색'} ↗</Button>} />
        <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-primary" />
            {locale === 'en' ? 'Original prompts' : '원본 프롬프트'}: <strong className="text-foreground">{totalRoots}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <GitFork className="size-3.5" />
            {locale === 'en' ? 'Total forks' : '총 포크 수'}: <strong className="text-foreground">{totalForks}</strong>
          </span>
        </div>
      </div>

      {trees.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          {locale === 'en' ? 'No prompts yet' : '아직 프롬프트가 없습니다'}
        </div>
      ) : (
        <div className="wiki-collection-grid">
          {trees.map((root) => (
            <ForkNode key={root.id} node={root} depth={0} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}

function countDescendants(node: TreeNode): number {
  let count = node.children.length;
  for (const child of node.children) count += countDescendants(child);
  return count;
}
