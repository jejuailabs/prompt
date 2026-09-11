'use client';

// 커뮤니티 — 🏆 ranking (top 5 prompts/artifacts) + recent activity feed (docs/09 §5)
import type { ComponentType } from 'react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ko as koLocale } from 'date-fns/locale';
import {
  Activity,
  GitFork,
  PenLine,
  Radar,
  Rocket,
  Settings,
  Sparkles,
  Store,
  Trophy,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { EventDTO, PromptDTO, ArtifactDTO, BriefDTO, CommentDTO } from '@/lib/types';
import { EmptyState } from '@/components/shared/empty-state';
import { ViewHeader } from '@/components/shared/view-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

type RankingDTO = { prompts: PromptDTO[]; artifacts: ArtifactDTO[] };

function HelpCard({ brief, onChanged }: { brief: BriefDTO; onChanged: () => void }) {
  const requireLogin = useAppStore((s) => s.requireLogin); const session = useAppStore((s) => s.session);
  const [reply, setReply] = useState(''); const [sending, setSending] = useState(false);
  const comments = useQuery({ queryKey: ['brief-comments', brief.id], queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=brief&targetId=${brief.id}`) });
  const send = async () => { if (!requireLogin() || !reply.trim()) return; setSending(true); try { await api.post('/api/comment', { targetType: 'brief', targetId: brief.id, body: reply }); setReply(''); await comments.refetch(); } finally { setSending(false); } };
  const resolve = async () => { await api.post(`/api/community/requests/${brief.id}/resolve`, {}); onChanged(); };
  return <article className="rounded-lg border p-3"><div className="flex justify-between gap-2"><p className="font-medium">{brief.title}</p><span className="text-xs text-muted-foreground">{brief.status === 'matched' ? '해결됨' : '도움 필요'}</span></div><p className="mt-1 text-sm text-muted-foreground">{brief.rawText}</p><p className="mt-2 text-xs text-muted-foreground">@{brief.author.username} · 답변 {comments.data?.length ?? 0}개</p>{comments.data?.map((comment) => <p key={comment.id} className="mt-2 rounded bg-muted p-2 text-xs"><b>@{comment.user.username}</b> {comment.body}</p>)}{brief.status !== 'matched' && <div className="mt-3 flex gap-2"><input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="도움이 되는 답변을 남겨주세요" className="min-w-0 flex-1 rounded border px-2 py-1.5 text-xs" /><Button size="sm" disabled={sending || !reply.trim()} onClick={() => void send()}>답변</Button>{session?.id === brief.author.id && <Button size="sm" variant="outline" onClick={() => void resolve()}>해결</Button>}</div>}</article>;
}

// event type → visual + label key (labels resolved via t() below)
const EVENT_META: Record<string, { icon: LucideIcon; className: string; labelKey: string }> = {
  'artifact.published': { icon: Rocket, className: 'bg-primary/10 text-primary', labelKey: 'evArtifactPublished' },
  'prompt.created': { icon: PenLine, className: 'bg-primary/10 text-primary', labelKey: 'evPromptCreated' },
  'smoke_test.completed': { icon: Radar, className: 'bg-amber-500/10 text-amber-600', labelKey: 'evSmokeCompleted' },
  'problem_brief.matched': { icon: Sparkles, className: 'bg-primary/10 text-primary', labelKey: 'evBriefMatched' },
  'marketplace.listed': { icon: Store, className: 'bg-emerald-500/10 text-emerald-600', labelKey: 'evListingCreated' },
  'user.joined': { icon: UserPlus, className: 'bg-primary/10 text-primary', labelKey: 'evUserJoined' },
  'module.updated': { icon: Settings, className: 'bg-muted text-muted-foreground', labelKey: 'evModuleUpdated' },
  'prompt.forked': { icon: GitFork, className: 'bg-primary/10 text-primary', labelKey: 'evPromptForked' },
};
const EVENT_DEFAULT_META = { icon: Zap, className: 'bg-muted text-muted-foreground', labelKey: 'evDefault' };

function RankRow({
  rank,
  title,
  likes,
  onClick,
}: {
  rank: number;
  title: string;
  likes: number;
  onClick: () => void;
}) {
  const locale = useAppStore((s) => s.locale);
  const top3 = rank <= 3;
  return (
    <div className="flex items-center gap-2.5 py-2">
      <span
        className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
          top3 ? 'bg-primary text-primary-foreground' : 'bg-primary/15 text-primary',
        )}
      >
        {rank}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
      >
        {title}
      </button>
      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        <Heart className="size-3.5" aria-hidden="true" />
        <span className="tabular-nums">{likes.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR')}</span>
      </span>
    </div>
  );
}

function RankingSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

export default function CommunityView() {
  const t = useTranslations('community');
  const tc = useTranslations('core');
  const locale = useAppStore((s) => s.locale);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const [request, setRequest] = useState('');
  const [requesting, setRequesting] = useState(false);

  const ranking = useQuery({
    queryKey: ['ranking'],
    queryFn: () => api.get<RankingDTO>('/api/ranking'),
  });

  const events = useQuery({
    queryKey: ['events', 15],
    queryFn: () => api.get<EventDTO[]>('/api/events?limit=15'),
  });
  const helpRequests = useQuery({ queryKey: ['community-help'], queryFn: () => api.get<BriefDTO[]>('/api/briefs?scope=community') });
  const createHelp = async () => {
    if (!requireLogin() || request.trim().length < 10) return;
    setRequesting(true);
    try { await api.post('/api/briefs', { rawText: request, community: true }); setRequest(''); await helpRequests.refetch(); }
    finally { setRequesting(false); }
  };

  const eventLabel = (type: string) => {
    const meta = EVENT_META[type] ?? EVENT_DEFAULT_META;
    return t(meta.labelKey);
  };

  const eventTitle = (e: EventDTO) => {
    const payload = e.payload ?? {};
    const title = typeof payload.title === 'string' ? payload.title : '';
    return title ? `${eventLabel(e.type)} · ${title}` : eventLabel(e.type);
  };

  const renderRanking = (
    items: { id: string; title: string; likeCount: number }[],
    onOpen: (id: string) => void,
  ) => (
    <div className="divide-y">
      {items.map((item, i) => (
        <RankRow key={item.id} rank={i + 1} title={item.title} likes={item.likeCount} onClick={() => onOpen(item.id)} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">
      <ViewHeader title={t('title')} subtitle={t('subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── ranking ───────────────────────────────────────── */}
        <Card className="gap-4 p-6">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t('ranking')}</h2>
          </div>

          {ranking.isLoading && <RankingSkeleton />}
          {ranking.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void ranking.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {ranking.data && (
            <>
              <section>
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">{t('topPrompts')}</h3>
                {ranking.data.prompts.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">{t('emptyRanking')}</p>
                ) : (
                  renderRanking(ranking.data.prompts, (id) => navigate('prompt', { id }))
                )}
              </section>
              <section className="mt-4">
                <h3 className="mb-1 text-sm font-medium text-muted-foreground">{t('topArtifacts')}</h3>
                {ranking.data.artifacts.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">{t('emptyRanking')}</p>
                ) : (
                  renderRanking(ranking.data.artifacts, (id) => navigate('project', { id }))
                )}
              </section>
            </>
          )}
        </Card>

        {/* ── recent activity ───────────────────────────────── */}
        <Card className="gap-4 p-6">
          <div className="flex items-center gap-2">
            <Activity className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">{t('recentActivity')}</h2>
          </div>

          {events.isLoading && <RankingSkeleton />}
          {events.isError && (
            <EmptyState
              title={t('loadError')}
              action={
                <Button variant="outline" size="sm" onClick={() => void events.refetch()}>
                  {tc('retry')}
                </Button>
              }
            />
          )}
          {!events.isLoading && !events.isError && (events.data?.length ?? 0) === 0 && (
            <EmptyState title={t('emptyEvents')} />
          )}
          {(events.data?.length ?? 0) > 0 && (
            <div className="scrollbar-thin max-h-96 space-y-1 overflow-y-auto pr-1">
              {events.data!.map((e) => {
                const meta = EVENT_META[e.type] ?? EVENT_DEFAULT_META;
                const EventIcon = meta.icon as ComponentType<{ className?: string }>;
                const username = typeof e.payload?.username === 'string' ? e.payload.username : null;
                return (
                  <div key={e.id} className="flex items-start gap-2.5 rounded-md px-1 py-1.5">
                    <span
                      className={cn(
                        'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
                        meta.className,
                      )}
                    >
                      <EventIcon className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{eventTitle(e)}</p>
                      <p className="text-xs text-muted-foreground">
                        {username ? `@${username} · ` : ''}
                        {formatDistanceToNow(new Date(e.createdAt), {
                          addSuffix: true,
                          locale: locale === 'en' ? enUS : koLocale,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6"><h2 className="font-semibold">도와주세요</h2><p className="mt-1 text-sm text-muted-foreground">프롬프트, 기획, 결과물 개선이 필요한 내용을 올리면 커뮤니티가 답변합니다.</p><Textarea value={request} onChange={(e) => setRequest(e.target.value)} className="mt-4" placeholder="예: 제주 여행 숏폼 프롬프트를 더 클릭하게 개선하고 싶어요. 타깃은 20대 여행객입니다." /><Button className="mt-3" disabled={requesting || request.trim().length < 10} onClick={() => void createHelp()}>{requesting ? '등록 중…' : '도움 요청 올리기'}</Button></Card>
        <Card className="p-6"><div className="flex items-center justify-between"><h2 className="font-semibold">최근 도움 요청</h2><Button variant="ghost" size="sm" onClick={() => void helpRequests.refetch()}>새로고침</Button></div><div className="mt-3 space-y-3">{(helpRequests.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">아직 도움 요청이 없습니다. 첫 질문을 올려보세요.</p> : helpRequests.data!.map((brief) => <HelpCard key={brief.id} brief={brief} onChanged={() => void helpRequests.refetch()} />)}</div></Card>
      </div>
    </div>
  );
}
