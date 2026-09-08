'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Eye,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Play,
  Send,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import type { ArtifactDTO, CommentDTO, LandingContent, RevenueOverviewDTO } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/shared/empty-state';
import { PreviewRenderer } from '@/components/shared/preview-renderer';
import { StatCard } from '@/components/shared/stat-card';

// ─── helpers ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  image: { ko: '이미지', en: 'Image' },
  text: { ko: '텍스트', en: 'Text' },
  video: { ko: '영상', en: 'Video' },
  '3d_asset': { ko: '3D', en: '3D' },
  landing_page: { ko: '상세페이지', en: 'Detail Page' },
  game: { ko: '게임', en: 'Game' },
  app: { ko: '앱', en: 'App' },
};

function errMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return String(e);
}

// ─── view ───────────────────────────────────────────────────────────────────

export default function ProjectView() {
  const t = useTranslations('project');
  const tc = useTranslations('core');
  const id = useAppStore((s) => s.params.id ?? '');
  const session = useAppStore((s) => s.session);
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const { toast } = useToast();
  const qc = useQueryClient();

  const localeTag = locale === 'ko' ? 'ko-KR' : 'en-US';
  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(localeTag);
  const fmtWon = (n: number) => `₩${new Intl.NumberFormat(localeTag).format(n)}`;

  // playing is keyed by artifact id → auto-resets when the id changes (no effect needed)
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const artifactQ = useQuery({
    queryKey: ['artifact', id],
    queryFn: () => api.get<ArtifactDTO>(`/api/artifacts/${id}`),
    enabled: !!id,
  });
  const a = artifactQ.data;

  const commentsQ = useQuery({
    queryKey: ['comments', 'artifact', id],
    queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=artifact&targetId=${id}`),
    enabled: !!id && !!a,
  });

  const isOwner = !!session && !!a && session.id === a.ownerId;
  const revenueQ = useQuery({
    queryKey: ['revenue'],
    queryFn: () => api.get<RevenueOverviewDTO>('/api/revenue'),
    enabled: isOwner,
  });

  const toastErr = (e: unknown) => toast({ title: tc('error'), description: errMsg(e), variant: 'destructive' });

  // ── guards & states ──
  if (!id) {
    return <EmptyState title={t('notFound')} description={t('notFoundDesc')} />;
  }
  if (artifactQ.isLoading) {
    return null;
  }
  if (artifactQ.isError || !a) {
    return (
      <EmptyState
        title={t('loadFailed')}
        description={errMsg(artifactQ.error)}
        action={
          <Button variant="outline" size="sm" onClick={() => void artifactQ.refetch()}>
            {tc('retry')}
          </Button>
        }
      />
    );
  }

  const meta = a.metadata ?? {};
  const isExecutable = (a.type === 'game' || a.type === 'app') && !!a.contentUrl;
  const isPlaying = playingId === a.id;
  const categoryLabel = meta.categoryLabel ?? TYPE_LABELS[a.type]?.[locale] ?? a.type;
  const shares = (revenueQ.data?.shares ?? []).filter((s) => s.artifactId === a.id);

  // ── actions ──
  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: t('linkCopied') });
    } catch {
      toastErr(new Error('clipboard unavailable'));
    }
  };

  const saveEdit = async () => {
    setBusy('edit');
    try {
      await api.patch(`/api/artifacts/${a.id}`, { title: editTitle.trim() || a.title, description: editDesc });
      await qc.invalidateQueries({ queryKey: ['artifact', a.id] });
      toast({ title: tc('saved') });
      setEditOpen(false);
    } catch (e) {
      toastErr(e);
    } finally {
      setBusy(null);
    }
  };

  const report = async () => {
    if (!requireLogin()) return;
    try {
      await api.post('/api/report', { targetType: 'artifact', targetId: a.id });
      toast({ title: t('reported') });
    } catch (e) {
      toastErr(e);
    }
  };

  const remove = async () => {
    setBusy('delete');
    try {
      await api.del(`/api/artifacts/${a.id}`);
      toast({ title: tc('deleted') });
      navigate('gallery');
    } catch (e) {
      toastErr(e);
    } finally {
      setBusy(null);
    }
  };

  const postComment = async () => {
    if (!requireLogin()) return;
    const body = comment.trim();
    if (!body) return;
    try {
      await api.post('/api/comment', { targetType: 'artifact', targetId: a.id, body });
      setComment('');
      await qc.invalidateQueries({ queryKey: ['comments', 'artifact', a.id] });
      await qc.invalidateQueries({ queryKey: ['artifact', a.id] });
    } catch (e) {
      toastErr(e);
    }
  };

  // ── render ──
  return (
    <div className="min-w-0">
      {/* breadcrumb row */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 text-muted-foreground"
          onClick={() => navigate(isOwner ? 'my-projects' : 'gallery')}
        >
          {t('back')}
        </Button>
        <span className="text-sm text-muted-foreground">/</span>
        <span className="text-sm font-medium">{a.title}</span>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline">{a.version}</Badge>
          <Badge variant={a.status === 'published' ? 'secondary' : 'outline'}>
            {a.status === 'published' ? tc('publicBadge') : tc('draftBadge')}
          </Badge>
        </div>
      </div>

      {/* body — single column for static types, two-column for executable */}
      <div className={`grid items-start gap-6 ${isExecutable ? 'lg:grid-cols-[1fr_1.1fr]' : 'mx-auto max-w-4xl'}`}>
        {/* Preview */}
        <Card className={`overflow-hidden ${isExecutable ? 'lg:order-2' : ''}`}>
          <div className="relative">
            <PreviewRenderer artifact={a} playing={isPlaying} expanded={a.type === 'landing_page'} className={isExecutable ? 'aspect-[4/3] w-full' : a.type === 'landing_page' ? 'min-h-[400px] w-full' : 'w-full'} />
            {isExecutable && !isPlaying && (
              <button
                type="button"
                onClick={() => setPlayingId(a.id)}
                className="absolute inset-0 z-10 flex cursor-pointer flex-col items-center justify-center gap-3 bg-black/30"
                aria-label={a.type === 'game' ? t('playGameCaption') : t('playAppCaption')}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:bg-primary/90">
                  <Play className="size-6 translate-x-0.5 fill-current" />
                </span>
                <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                  {a.type === 'game' ? t('playGameCaption') : t('playAppCaption')}
                </span>
              </button>
            )}
          </div>
        </Card>

        {/* Info */}
        <div className={`min-w-0 ${isExecutable ? 'lg:order-1' : ''}`}>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{a.title}</h1>
            <Badge variant="secondary">{categoryLabel}</Badge>
          </div>

          {a.description && <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>}

          {!!meta.tags?.length && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {meta.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Avatar className="size-5">
                {a.owner?.avatarUrl ? <AvatarImage src={a.owner.avatarUrl} alt={a.owner.username} /> : null}
                <AvatarFallback className="text-[10px]">{(a.owner?.username ?? '?')[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">@{a.owner?.username}</span>
            </span>
            <span>· {t('updatedAt', { date: fmtDate(a.createdAt) })}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" /> {a.views.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="size-3.5" /> {a.likeCount.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5" /> {a.commentCount.toLocaleString()}
            </span>
          </div>

          {/* action row */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {isExecutable && (
              <Button onClick={() => setPlayingId(a.id)}>
                <Play /> {tc('play')}
              </Button>
            )}
            {isOwner && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditTitle(a.title);
                  setEditDesc(a.description ?? '');
                  setEditOpen(true);
                }}
              >
                {tc('edit')}
              </Button>
            )}
            <Button variant="ghost" onClick={() => void share()}>
              {tc('share')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={tc('more')}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void report()}>
                  <Flag className="size-4" /> {t('report')}
                </DropdownMenuItem>
                {isOwner && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => void remove()} disabled={busy === 'delete'}>
                      <Trash2 className="size-4" /> {tc('delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* tabs */}
      <Tabs defaultValue="overview" className="mt-6">
        <TabsList className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="overview">{t('tabOverview')}</TabsTrigger>
          <TabsTrigger value="analytics">{t('tabAnalytics')}</TabsTrigger>
          <TabsTrigger value="revenue">{t('tabRevenue')}</TabsTrigger>
          <TabsTrigger value="comments">
            {t('tabComments')} ({a.commentCount.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="versions">{t('tabVersions')}</TabsTrigger>
        </TabsList>

        {/* 개요 */}
        <TabsContent value="overview" className="mt-4">
          <Card className="p-6">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{a.description || a.title}</p>
            {a.sourcePromptId && (
              <Button
                variant="link"
                size="sm"
                className="-ml-2 mt-3 h-auto p-0"
                onClick={() => navigate('prompt', { id: a.sourcePromptId as string })}
              >
                {t('viewOriginalPrompt')}
              </Button>
            )}
            {meta.content && <ContentSections content={meta.content} />}
          </Card>
        </TabsContent>

        {/* 분석 */}
        <TabsContent value="analytics" className="mt-4">
          {meta.stats ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard label={t('statViews')} value={meta.stats.views} icon={<Eye className="size-4" />} />
              <StatCard label={t('statPlays')} value={meta.stats.plays} icon={<Play className="size-4" />} />
              <StatCard label={t('statLikes')} value={meta.stats.likes} icon={<Heart className="size-4" />} />
              <StatCard
                label={t('statCompletion')}
                value={`${meta.stats.completionRate}%`}
                icon={<TrendingUp className="size-4" />}
              />
            </div>
          ) : (
            <EmptyState
              icon={<TrendingUp className="size-5" />}
              title={t('analyticsPending')}
              description={t('analyticsPendingDesc')}
            />
          )}
        </TabsContent>

        {/* 수익 */}
        <TabsContent value="revenue" className="mt-4">
          {!isOwner ? (
            <EmptyState title={t('revenuePrivate')} description={t('revenuePrivateDesc')} />
          ) : revenueQ.isLoading ? null : shares.length ? (
            <Card className="divide-y p-0 py-0">
              {shares.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.period}</p>
                    <p className="text-xs text-muted-foreground">{s.sharePercent}%</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{fmtWon(s.amount)}</span>
                  <Badge
                    variant={s.status === 'settled' ? 'outline' : 'secondary'}
                    className={s.status === 'settled' ? 'border-emerald-500/40 text-emerald-500' : undefined}
                  >
                    {s.status === 'settled' ? t('settled') : t('pending')}
                  </Badge>
                </div>
              ))}
            </Card>
          ) : (
            <EmptyState title={t('revenueEmpty')} />
          )}
        </TabsContent>

        {/* 댓글 */}
        <TabsContent value="comments" className="mt-4">
          <Card className="p-6">
            <div className="flex gap-2">
              <Input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t('commentPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.nativeEvent.isComposing) void postComment();
                }}
              />
              <Button onClick={() => void postComment()} disabled={!comment.trim()}>
                <Send /> {t('commentSend')}
              </Button>
            </div>
            <div className="mt-6 space-y-4">
              {commentsQ.isLoading ? null : (commentsQ.data ?? []).length ? (
                (commentsQ.data ?? []).map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <Avatar className="size-7">
                      {c.user?.avatarUrl ? <AvatarImage src={c.user.avatarUrl} alt={c.user.username} /> : null}
                      <AvatarFallback className="text-xs">{(c.user?.username ?? '?')[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">@{c.user?.username}</span> · {fmtDate(c.createdAt)}
                      </p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">{t('noComments')}</p>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 버전 */}
        <TabsContent value="versions" className="mt-4">
          {meta.versions?.length ? (
            <Card className="p-6">
              <ol className="relative space-y-6 border-l pl-6">
                {meta.versions.map((v, i) => (
                  <li key={`${v.version}-${i}`} className="relative">
                    <span className="absolute -left-[27px] top-1 size-2.5 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{v.version}</Badge>
                      <span className="text-xs text-muted-foreground">{fmtDate(v.date)}</span>
                    </div>
                    {v.note && <p className="mt-1 text-sm text-muted-foreground">{v.note}</p>}
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <EmptyState icon={<MessageCircle className="size-5" />} title={t('noVersions')} />
          )}
        </TabsContent>
      </Tabs>

      {/* edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('editDialogTitle')}</DialogTitle>
            <DialogDescription>{t('editDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder={tc('title')} />
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={4}
              placeholder={tc('body')}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={() => void saveEdit()} disabled={busy === 'edit'}>
              {busy === 'edit' && <Loader2 className="animate-spin" />} {tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── landing/text content sections (개요 탭) ────────────────────────────────

function ContentSections({ content }: { content: LandingContent }) {
  return (
    <div className="mt-6 border-t pt-6">
      {content.hero?.title && (
        <>
          <h3 className="text-lg font-bold">{content.hero.title}</h3>
          {content.hero.subtitle && <p className="mt-1 text-sm text-muted-foreground">{content.hero.subtitle}</p>}
        </>
      )}
      <div className="mt-4 space-y-5">
        {(content.sections ?? []).map((s, i) => (
          <section key={i}>
            {s.title && <h4 className="font-semibold">{s.title}</h4>}
            {s.body && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{s.body}</p>}
            {!!s.bullets?.length && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {content.footer && <p className="mt-6 border-t pt-4 text-xs text-muted-foreground">{content.footer}</p>}
    </div>
  );
}
