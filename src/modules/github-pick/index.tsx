'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, Check, Copy, Eye, GitBranch, MessageCircle, PlayCircle, Star, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import type { CommentDTO } from '@/lib/types';
import { formatStars, type PickDTO } from './pick';
import styles from './pick.module.css';

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

function channelCount(pick: PickDTO) {
  return new Set(pick.videos.map((video) => video.channel)).size;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); window.setTimeout(() => setDone(false), 1500); }
    catch { toast({ title: '복사하지 못했어요. 직접 선택해 복사해 주세요.' }); }
  };
  return (
    <button type="button" className={styles.copy} onClick={() => void copy()} aria-label={label}>
      {done ? <Check size={15} /> : <Copy size={15} />}{done ? '복사됨' : '복사'}
    </button>
  );
}

function Thumb({ pick, className }: { pick: PickDTO; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!pick.imageUrl || failed) return <span className={className} aria-hidden="true"><GitBranch size={28} /></span>;
  return <img className={className} src={pick.imageUrl} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

/** Compact strip for the 뉴스 screen: the latest picks, linking into this module. */
export function GithubPickStrip() {
  const navigate = useAppStore((s) => s.navigate);
  const picks = useQuery({ queryKey: ['github-pick', 'strip'], queryFn: () => api.get<PickDTO[]>('/api/github-pick?limit=3'), staleTime: 60_000 });
  if (!picks.isLoading && !picks.data?.length) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>오늘의 깃허브 픽</h2>
        <button type="button" onClick={() => navigate('github-pick')}>전체 보기<ArrowUpRight size={15} /></button>
      </div>
      <div className={styles.strip}>
        {picks.isLoading && Array.from({ length: 3 }, (_, i) => <div key={i} className={styles.stripSkeleton} />)}
        {picks.data?.map((pick) => (
          <button key={pick.id} type="button" className={styles.stripCard} onClick={() => navigate('github-pick', { id: pick.id })}>
            <Thumb pick={pick} className={styles.stripThumb} />
            <span className={styles.stripBody}>
              <span className={styles.repo}>{pick.repo}</span>
              <strong>{pick.title}</strong>
              <span className={styles.meta}><span><Star size={13} />{formatStars(pick.stars)}</span><span>{channelCount(pick)}개 채널 소개</span></span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PickList({ open }: { open: (id: string) => void }) {
  const list = useQuery({ queryKey: ['github-pick', 'list'], queryFn: () => api.get<PickDTO[]>('/api/github-pick?limit=60') });
  return (
    <section className={styles.panel}>
      {list.isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className={styles.skeleton} />)}
      {list.data?.map((pick) => (
        <button key={pick.id} type="button" className={styles.item} onClick={() => open(pick.id)}>
          <Thumb pick={pick} className={styles.thumb} />
          <span className={styles.itemBody}>
            <span className={styles.badges}>
              <span className={styles.repo}>{pick.repo}</span>
              <span className={styles.stars}><Star size={13} />{formatStars(pick.stars)}</span>
              {channelCount(pick) > 1 && <span className={styles.hot}>{channelCount(pick)}개 채널 소개</span>}
            </span>
            <strong>{pick.title}</strong>
            <span className={styles.summary}>{pick.oneLine}</span>
            <span className={styles.meta}><span>{formatDate(pick.createdAt)}</span>{pick.language && <span>{pick.language}</span>}<span><MessageCircle size={14} />{pick.commentCount}</span></span>
          </span>
        </button>
      ))}
      {!list.isLoading && !list.data?.length && (
        <div className={styles.empty}>
          <GitBranch size={32} />
          <p>아직 올라온 깃허브 픽이 없어요.</p>
          <small>매일 아침 유튜버들이 소개한 깃허브 도구를 골라 쉬운 말로 정리해 올려요.</small>
        </div>
      )}
    </section>
  );
}

function PickDetail({ id, back, isAdmin }: { id: string; back: () => void; isAdmin: boolean }) {
  const requireLogin = useAppStore((s) => s.requireLogin);
  const client = useQueryClient();
  const pick = useQuery({ queryKey: ['github-pick-item', id], queryFn: () => api.get<PickDTO>(`/api/github-pick/${id}`), staleTime: 60_000 });
  const comments = useQuery({ queryKey: ['github-pick-comments', id], queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=artifact&targetId=${id}`) });
  const [reply, setReply] = useState('');
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireLogin() || !reply.trim()) return;
    try { await api.post('/api/comment', { targetType: 'artifact', targetId: id, body: reply }); setReply(''); await comments.refetch(); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '댓글을 남기지 못했어요.' }); }
  };
  const remove = async () => {
    if (!window.confirm('이 깃허브 픽을 내릴까요?')) return;
    try { await api.del(`/api/github-pick/${id}`); void client.invalidateQueries({ queryKey: ['github-pick'] }); back(); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '내리지 못했어요.' }); }
  };
  const data = pick.data;
  return (
    <article className={styles.panel}>
      <button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} />깃허브 픽 목록</button>
      {pick.isLoading && <div className={styles.skeleton} style={{ height: 300 }} />}
      {!pick.isLoading && !data && <p className={styles.empty}>깃허브 픽을 찾을 수 없어요.</p>}
      {data && <>
        <span className={styles.badges}>
          <span className={styles.repo}>{data.repo}</span>
          <span className={styles.stars}><Star size={13} />{formatStars(data.stars)}</span>
          {data.license && <span className={styles.tag}>{data.license}</span>}
          {data.language && <span className={styles.tag}>{data.language}</span>}
        </span>
        <h1 className={styles.title}>{data.title}</h1>
        <div className={styles.meta}><span>{formatDate(data.createdAt)}</span><span>최근 업데이트 {data.pushedAt.slice(0, 10).replaceAll('-', '.')}</span><span><Eye size={14} />{data.views}</span></div>
        {data.imageUrl && <img className={styles.hero} src={data.imageUrl} alt={`${data.repo} 저장소 미리보기`} />}

        <section className={styles.box}><h2>무엇인가요?</h2><ol>{data.what.map((line, i) => <li key={i}>{line}</li>)}</ol></section>

        <section className={styles.block}>
          <h2>이럴 때 써 보세요</h2>
          <div className={styles.cases}>
            {data.useCases.map((item, i) => <div key={i} className={styles.case}><strong>{item.who}</strong><p>{item.how}</p></div>)}
          </div>
        </section>

        {data.whyNow && <section className={styles.why}><h2>왜 지금 화제일까?</h2><p>{data.whyNow}</p></section>}

        {data.install && (
          <section className={styles.block}>
            <h2>설치 한 줄</h2>
            <div className={styles.code}><code>{data.install}</code><CopyButton text={data.install} label="설치 명령 복사" /></div>
            <small className={styles.hint}>README에 적힌 명령 그대로예요. 실행 전에 저장소 안내를 한 번 확인하세요.</small>
          </section>
        )}

        {data.prompts.length > 0 && (
          <section className={styles.block}>
            <h2>바로 써 보는 프롬프트</h2>
            {data.prompts.map((prompt, i) => <div key={i} className={styles.prompt}><p>{prompt}</p><CopyButton text={prompt} label="프롬프트 복사" /></div>)}
          </section>
        )}

        <section className={styles.block}>
          <h2>소개한 영상</h2>
          <ul className={styles.videos}>
            {data.videos.map((video) => (
              <li key={video.videoId}>
                <a href={video.url} target="_blank" rel="noreferrer"><PlayCircle size={18} /><span><strong>{video.channel}</strong>{video.title}</span><ArrowUpRight size={15} /></a>
              </li>
            ))}
          </ul>
        </section>

        <a className={styles.source} href={data.repoUrl} target="_blank" rel="noreferrer">깃허브에서 보기 · {data.repo}<ArrowUpRight size={16} /></a>
        {isAdmin && <button type="button" className={styles.ghost} onClick={() => void remove()}><Trash2 size={16} />깃허브 픽 내리기</button>}

        <section className={styles.comments}>
          <h2>댓글 {comments.data?.length ?? 0}</h2>
          <ul>{comments.data?.map((comment) => <li key={comment.id}><strong>{comment.user.username}</strong><p>{comment.body}</p></li>)}</ul>
          <form onSubmit={(event) => void send(event)}>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} maxLength={1000} placeholder="써 봤다면 후기나 팁을 나눠 주세요." aria-label="댓글" />
            <button type="submit" className={styles.primary} disabled={!reply.trim()}>댓글 등록</button>
          </form>
        </section>
      </>}
    </article>
  );
}

/** 깃허브 픽: repos introduced by whitelisted YouTube channels, rewritten daily into plain-language cards. */
export default function GithubPick() {
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const isAdmin = useAppStore((s) => s.session?.role === 'admin');
  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>뉴스·이벤트</p>
          <h1>깃허브 픽</h1>
          <p>유튜버들이 요즘 소개한 깃허브 도구를 매일 골라, 무엇인지와 어디에 쓰는지를 쉬운 말로 정리해요.</p>
        </div>
      </header>
      {params.id
        ? <PickDetail key={params.id} id={params.id} back={() => navigate('github-pick')} isAdmin={isAdmin} />
        : <PickList open={(id) => navigate('github-pick', { id })} />}
    </div>
  );
}
