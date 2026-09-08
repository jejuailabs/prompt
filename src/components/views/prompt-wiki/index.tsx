'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitFork, Heart, MessageCircle, Image, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

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

function ForkNode({ node, depth, navigate }: { node: TreeNode; depth: number; navigate: (view: string, params: Record<string, string>) => void }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasForks = node.children.length > 0;

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-border/50 pl-4' : ''}>
      <div className="group relative">
        {depth > 0 && (
          <div className="absolute -left-4 top-5 h-px w-4 bg-border/50" />
        )}
        <Card
          className="cursor-pointer gap-0 overflow-hidden p-0 transition-all hover:ring-1 hover:ring-primary/40"
          onClick={() => navigate('prompt', { id: node.id })}
        >
          <div className="flex gap-3 p-3">
            {node.thumbnailUrl ? (
              <img
                src={node.thumbnailUrl}
                alt=""
                className="size-14 shrink-0 rounded-md object-cover"
              />
            ) : (
              <div className="flex size-14 shrink-0 items-center justify-center rounded-md bg-muted">
                <Image className="size-6 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-sm font-semibold leading-tight">{node.title}</h3>
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
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{node.body}</p>
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

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ['prompt-trees'],
    queryFn: () => api.get<TreeNode[]>('/api/prompts/trees'),
    staleTime: 30_000,
  });

  const totalForks = trees.reduce((sum, t) => sum + countDescendants(t), 0);
  const totalRoots = trees.length;

  if (isLoading) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">
          {locale === 'en' ? 'Prompt Wiki' : '프롬프트 위키'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {locale === 'en'
            ? 'See how prompts evolve through forks and remixes'
            : '프롬프트가 포크와 수정을 거쳐 어떻게 진화하는지 확인하세요'}
        </p>
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
        <div className="space-y-4">
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
