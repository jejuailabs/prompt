'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Edit2, FlaskConical, GitFork, Heart, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import { api, ApiError, uploadFile } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { CommentDTO, PromptDetailDTO } from '@/lib/types';
import { ArtifactCard } from '@/components/shared/artifact-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editThumb, setEditThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const isOwner = !!session && !!prompt && session.id === prompt.ownerId;
  const canEdit = isOwner;

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

  const openEdit = () => {
    if (!prompt) return;
    setEditTitle(prompt.title);
    setEditBody(prompt.body);
    setEditCategory(prompt.category);
    setEditThumb(prompt.thumbnailUrl ?? null);
    setEditOpen(true);
  };

  const handleThumbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { url } = await uploadFile(file);
      setEditThumb(url);
    } catch (err) {
      toast({ title: '업로드 실패', description: err instanceof ApiError ? err.message : '다시 시도해주세요', variant: 'destructive' });
    }
  };

  const saveEdit = async () => {
    if (!promptId) return;
    setBusy('edit');
    try {
      await api.patch(`/api/prompts/${promptId}`, {
        title: editTitle.trim(),
        body: editBody,
        category: editCategory,
        thumbnailUrl: editThumb,
      });
      qc.invalidateQueries({ queryKey: ['prompt', promptId] });
      qc.invalidateQueries({ queryKey: ['prompts'] });
      toast({ title: '수정 완료' });
      setEditOpen(false);
    } catch (err) {
      toast({ title: '오류', description: err instanceof ApiError ? err.message : '수정에 실패했습니다', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!promptId) return;
    setBusy('delete');
    try {
      await api.del(`/api/prompts/${promptId}`);
      toast({ title: '삭제 완료' });
      qc.invalidateQueries({ queryKey: ['prompts'] });
      navigate('gallery');
    } catch (err) {
      toast({ title: '오류', description: err instanceof ApiError ? err.message : '삭제에 실패했습니다', variant: 'destructive' });
    } finally {
      setBusy(null);
      setDeleteConfirm(false);
    }
  };

  if (isLoading) {
    return null;
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
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold">{prompt.title}</h1>
          {canEdit && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Edit2 className="mr-1 h-4 w-4" /> 수정
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(true)}>
                <Trash2 className="mr-1 h-4 w-4" /> 삭제
              </Button>
            </div>
          )}
        </div>
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

      {/* Thumbnail */}
      {prompt.thumbnailUrl && (
        <div className="overflow-hidden rounded-xl">
          <img src={prompt.thumbnailUrl} alt={prompt.title} className="w-full max-h-80 object-cover" />
        </div>
      )}

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

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>프롬프트 수정</DialogTitle>
            <DialogDescription>제목, 내용, 썸네일을 수정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="제목" />
            <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} placeholder="프롬프트 내용" />
            <div className="space-y-2">
              <p className="text-sm font-medium">썸네일 이미지</p>
              {editThumb && (
                <div className="relative">
                  <img src={editThumb} alt="" className="h-32 w-full rounded-lg object-cover" />
                  <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-7 text-xs" onClick={() => setEditThumb(null)}>제거</Button>
                </div>
              )}
              <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleThumbUpload} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>취소</Button>
            <Button onClick={() => void saveEdit()} disabled={busy === 'edit' || !editTitle.trim() || !editBody.trim()}>
              {busy === 'edit' && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} 저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>프롬프트 삭제</DialogTitle>
            <DialogDescription>정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>취소</Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={busy === 'delete'}>
              {busy === 'delete' && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
