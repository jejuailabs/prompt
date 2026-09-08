'use client';

// Prompt detail view — shows prompt body, versions, linked artifacts, comments
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, FlaskConical, GitFork, Heart, Loader2, MessageCircle, Send } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { CommentDTO, PromptDetailDTO } from '@/lib/types';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

export default function PromptDetailView() {
  const t = useTranslations('prompt');
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const session = useAppStore((s) => s.session);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const { toast } = useToast();
  const qc = useQueryClient();
  const promptId = params.id;

  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: () => api.get<PromptDetailDTO>(`/api/prompts/${promptId}`),
    enabled: !!promptId,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['comments', 'prompt', promptId],
    queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=prompt&targetId=${promptId}`),
    enabled: !!promptId,
  });

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLike = async () => {
    if (!requireLogin() || !promptId) return;
    await api.post('/api/vote', { targetType: 'prompt', targetId: promptId });
    qc.invalidateQueries({ queryKey: ['prompt', promptId] });
  };

  const handleFork = async () => {
    if (!requireLogin() || !promptId) return;
    try {
      const forked = await api.post<{ id: string }>(`/api/prompts/${promptId}/fork`);
      toast({ title: '포크 완료', description: '새 프롬프트가 생성되었습니다' });
      navigate('prompt', { id: forked.id });
    } catch {
      toast({ title: '오류', description: '포크에 실패했습니다', variant: 'destructive' });
    }
  };

  const handleComment = async () => {
    if (!requireLogin() || !commentText.trim() || !promptId) return;
    setSubmitting(true);
    try {
      await api.post('/api/comment', { targetType: 'prompt', targetId: promptId, body: commentText.trim() });
      setCommentText('');
      qc.invalidateQueries({ queryKey: ['comments', 'prompt', promptId] });
      qc.invalidateQueries({ queryKey: ['prompt', promptId] });
    } catch {
      toast({ title: '오류', description: '댓글 등록에 실패했습니다', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !prompt) {
    return <EmptyState title={t('loadError')} description="" />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate('gallery')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> {t('back')}
      </Button>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{prompt.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          <span>@{prompt.owner.username}</span>
          <Badge variant="outline">{prompt.category}</Badge>
          {prompt.forkedFromId && prompt.forkParent && (
            <span className="text-xs">
              {t('forkedFrom')}: <button className="underline" onClick={() => navigate('prompt', { id: prompt.forkedFromId! })}>{prompt.forkParent.title}</button>
            </span>
          )}
        </div>
      </div>

      {/* Prompt body */}
      <Card className="p-4 bg-muted/50">
        <pre className="whitespace-pre-wrap text-sm font-mono">{prompt.body}</pre>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleLike}>
          <Heart className={`mr-1 h-4 w-4 ${prompt.likedByMe ? 'fill-primary text-primary' : ''}`} />
          {prompt.likeCount}
        </Button>
        <Button variant="outline" size="sm" onClick={handleFork}>
          <GitFork className="mr-1 h-4 w-4" /> {t('fork')} ({prompt.forkCount})
        </Button>
        <Button variant="outline" size="sm" onClick={() => navigate('lab', { promptId: prompt.id, promptText: prompt.body })}>
          <FlaskConical className="mr-1 h-4 w-4" /> {t('tryInLab')}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions">{t('versions')}</TabsTrigger>
          <TabsTrigger value="artifacts">{t('artifacts')} ({prompt.artifacts.length})</TabsTrigger>
          <TabsTrigger value="comments">{t('comments')} ({comments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-3 mt-4">
          {prompt.versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noVersions')}</p>
          ) : (
            prompt.versions.map((v) => (
              <Card key={v.id} className="p-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{v.createdByName ?? v.createdBy}</span>
                  <span>{new Date(v.createdAt).toLocaleDateString()}</span>
                </div>
                {v.versionNote && <p className="text-sm mb-1 font-medium">{v.versionNote}</p>}
                <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/30 rounded p-2">{v.body}</pre>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="artifacts" className="mt-4">
          {prompt.artifacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noArtifacts')}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {prompt.artifacts.map((a) => (
                <ArtifactCard key={a.id} artifact={a} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="comments" className="space-y-4 mt-4">
          {/* Comment input */}
          {session && (
            <div className="flex gap-2">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder={t('commentPlaceholder')}
                className="min-h-[60px]"
              />
              <Button size="sm" onClick={handleComment} disabled={submitting || !commentText.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noComments')}</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs">{c.user.username[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-xs text-muted-foreground">
                    @{c.user.username} · {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                  <p className="text-sm mt-0.5">{c.body}</p>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
