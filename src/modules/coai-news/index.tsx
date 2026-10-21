'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CalendarDays, ChevronRight, Eye, MapPin, MessageCircle, Newspaper, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import type { CommentDTO } from '@/lib/types';
import { eventStatus, filterEvents, type AiEvent } from '@/modules/ai-events/catalogue';
import { EventPoster } from '@/modules/ai-events/event-poster';
import { NEWS_CATEGORIES, newsCategoryLabel, type NewsCategory, type NewsDTO, type NewsInput } from './news';
import styles from './news.module.css';

function formatDate(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}`;
}

/** Upcoming 행사·모임 posters shown above the news list; the full board stays at #ai-events. */
function EventStrip() {
  const navigate = useAppStore((s) => s.navigate);
  const events = useQuery({ queryKey: ['ai-events', 'public'], queryFn: () => api.get<AiEvent[]>('/api/ai-events'), staleTime: 60_000 });
  const now = new Date();
  const items = filterEvents(events.data ?? [], {}, now).slice(0, 4);
  if (!events.isLoading && !items.length) return null;
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>행사·모임</h2>
        <button type="button" onClick={() => navigate('ai-events')}>전체 일정<ChevronRight size={16} /></button>
      </div>
      <div className={styles.events}>
        {events.isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className={styles.eventSkeleton} />)}
        {items.map((item) => {
          const status = eventStatus(item, now);
          return (
            <button key={item.id} type="button" className={styles.event} onClick={() => navigate('ai-events', { id: item.id })}>
              <span className={styles.eventPoster}><EventPoster item={item} now={now} /></span>
              <span className={styles.eventInfo}>
                <span className={styles.eventStatus} data-status={status.code}>{status.label}</span>
                <strong>{item.title}</strong>
                <span><CalendarDays size={13} />{item.registrationClosed ? '주최측 접수 마감 안내' : item.applyUntil ? '접수 ~ ' + item.applyUntil.replaceAll('-', '.') : item.schedule}</span>
                <span><MapPin size={13} />{item.location}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function NewsList({ open, isAdmin, write }: { open: (id: string) => void; isAdmin: boolean; write: () => void }) {
  const [category, setCategory] = useState<NewsCategory | ''>('');
  const list = useQuery({ queryKey: ['news', category], queryFn: () => api.get<NewsDTO[]>(`/api/news?category=${category}`) });
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}><h2>AI 뉴스</h2></div>
      <div className={styles.filters} role="group" aria-label="뉴스 분류">
        <button type="button" aria-pressed={!category} onClick={() => setCategory('')}>전체</button>
        {NEWS_CATEGORIES.map((item) => <button key={item.id} type="button" aria-pressed={category === item.id} onClick={() => setCategory(item.id)}>{item.label}</button>)}
      </div>
      <section className={styles.panel}>
        {list.isLoading && Array.from({ length: 4 }, (_, i) => <div key={i} className={styles.skeleton} />)}
        {list.data?.map((news) => (
          <button key={news.id} type="button" className={styles.item} onClick={() => open(news.id)}>
            {news.imageUrl
              ? <img className={styles.thumb} src={news.imageUrl} alt="" loading="lazy" />
              : <span className={styles.thumb} aria-hidden="true"><Newspaper size={28} /></span>}
            <span className={styles.itemBody}>
              <span className={styles.category}>{newsCategoryLabel(news.category)}</span>
              <strong>{news.title}</strong>
              <span className={styles.summary}>{news.summary[0]}</span>
              <span className={styles.meta}><span>{formatDate(news.createdAt)}</span><span>{news.sourceName}</span><span><MessageCircle size={14} />{news.commentCount}</span></span>
            </span>
          </button>
        ))}
        {!list.isLoading && !list.data?.length && (
          <div className={styles.empty}>
            <Newspaper size={32} />
            <p>아직 등록된 뉴스가 없어요.</p>
            <small>운영진이 AI 소식을 3줄 요약과 해설로 정리해 올려요.</small>
            {isAdmin && <button type="button" className={styles.primary} onClick={write}><Plus size={16} />첫 뉴스 등록</button>}
          </div>
        )}
      </section>
    </section>
  );
}

function NewsDetail({ id, back, isAdmin }: { id: string; back: () => void; isAdmin: boolean }) {
  const requireLogin = useAppStore((s) => s.requireLogin);
  const client = useQueryClient();
  const news = useQuery({ queryKey: ['news-item', id], queryFn: () => api.get<NewsDTO>(`/api/news/${id}`), staleTime: 60_000 });
  const comments = useQuery({ queryKey: ['news-comments', id], queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=artifact&targetId=${id}`) });
  const [reply, setReply] = useState('');
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireLogin() || !reply.trim()) return;
    try { await api.post('/api/comment', { targetType: 'artifact', targetId: id, body: reply }); setReply(''); await comments.refetch(); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '댓글을 남기지 못했어요.' }); }
  };
  const remove = async () => {
    if (!window.confirm('이 뉴스를 내릴까요?')) return;
    try { await api.del(`/api/news/${id}`); void client.invalidateQueries({ queryKey: ['news'] }); back(); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '삭제하지 못했어요.' }); }
  };
  const data = news.data;
  return (
    <article className={styles.panel}>
      <button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} />뉴스 목록</button>
      {news.isLoading && <div className={styles.skeleton} style={{ height: 300 }} />}
      {!news.isLoading && !data && <p className={styles.empty}>뉴스를 찾을 수 없어요.</p>}
      {data && <>
        <span className={styles.category}>{newsCategoryLabel(data.category)}</span>
        <h1 className={styles.title}>{data.title}</h1>
        <div className={styles.meta}><span>{formatDate(data.createdAt)}</span><span>출처 · {data.sourceName}</span><span><Eye size={14} />{data.views}</span></div>
        {data.imageUrl && <img className={styles.hero} src={data.imageUrl} alt="" />}
        <section className={styles.box}><h2>3줄 요약</h2><ol>{data.summary.map((line, i) => <li key={i}>{line}</li>)}</ol></section>
        {data.commentary && <section className={styles.commentary}><h2>운영진 해설</h2><p>{data.commentary}</p></section>}
        {data.meaning && <section className={styles.meaning}><h2>이게 나한테 무슨 의미?</h2><p>{data.meaning}</p></section>}
        <a className={styles.source} href={data.sourceUrl} target="_blank" rel="noreferrer">원문 기사 보기 · {data.sourceName}<ArrowUpRight size={16} /></a>
        {isAdmin && <button type="button" className={styles.ghost} onClick={() => void remove()}><Trash2 size={16} />뉴스 내리기</button>}
        <section className={styles.comments}>
          <h2>댓글 {comments.data?.length ?? 0}</h2>
          <ul>{comments.data?.map((comment) => <li key={comment.id}><strong>{comment.user.username}</strong><p>{comment.body}</p></li>)}</ul>
          <form onSubmit={(event) => void send(event)}>
            <textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={3} maxLength={1000} placeholder="이 소식에 대한 생각을 나눠 주세요." aria-label="댓글" />
            <button type="submit" className={styles.primary} disabled={!reply.trim()}>댓글 등록</button>
          </form>
        </section>
      </>}
    </article>
  );
}

function NewsEditor({ done, cancel }: { done: (id: string) => void; cancel: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState<NewsInput>({ category: 'domestic', title: '', summary: ['', '', ''], commentary: '', meaning: '', sourceName: '', sourceUrl: '', imageUrl: '' });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof NewsInput>(key: K, value: NewsInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true);
    try { const news = await api.post<NewsDTO>('/api/news', form); void client.invalidateQueries({ queryKey: ['news'] }); done(news.id); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '등록하지 못했어요.' }); }
    finally { setSaving(false); }
  };
  return (
    <form className={styles.panel} onSubmit={(event) => void submit(event)}>
      <button type="button" className={styles.back} onClick={cancel}><ArrowLeft size={16} />뉴스 목록</button>
      <h1 className={styles.title}>뉴스 등록</h1>
      <p className={styles.notice}>원문 기사를 그대로 옮기지 말고, 3줄 요약 + 해설 + 원문 링크로 정리해 주세요.</p>
      <div className={styles.filters} role="radiogroup" aria-label="분류">{NEWS_CATEGORIES.map((item) => <button key={item.id} type="button" role="radio" aria-checked={form.category === item.id} onClick={() => set('category', item.id)}>{item.label}</button>)}</div>
      <label className={styles.field}>제목<input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} required /></label>
      <fieldset className={styles.field}><legend>3줄 요약</legend>{form.summary.map((line, i) => <input key={i} value={line} maxLength={200} placeholder={`${i + 1}번째 줄`} onChange={(e) => set('summary', form.summary.map((value, j) => (j === i ? e.target.value : value)))} required={i === 0} />)}</fieldset>
      <label className={styles.field}>운영진 해설<textarea value={form.commentary} onChange={(e) => set('commentary', e.target.value)} rows={5} maxLength={4000} /></label>
      <label className={styles.field}>이게 나한테 무슨 의미?<textarea value={form.meaning} onChange={(e) => set('meaning', e.target.value)} rows={3} maxLength={600} placeholder="예: 내가 쓰는 ChatGPT에서 이제 이런 걸 할 수 있어요." /></label>
      <div className={styles.row}>
        <label className={styles.field}>출처 이름<input value={form.sourceName} onChange={(e) => set('sourceName', e.target.value)} maxLength={60} placeholder="예: 연합뉴스" required /></label>
        <label className={styles.field}>원문 링크<input type="url" value={form.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} placeholder="https://" required /></label>
      </div>
      <label className={styles.field}>대표 이미지 주소 (선택)<input type="url" value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://" /></label>
      <div className={styles.actions}><button type="button" className={styles.ghost} onClick={cancel}>취소</button><button type="submit" className={styles.primary} disabled={saving}>{saving ? '등록 중…' : '등록'}</button></div>
    </form>
  );
}

/** 뉴스·이벤트: upcoming event posters + news list on one screen, news detail (summary · commentary · meaning · source), staff editor. */
export default function CoaiNews() {
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const isAdmin = useAppStore((s) => s.session?.role === 'admin');
  const write = () => navigate('news', { write: '1' });
  return (
    <div className={styles.page}>
      <header className={styles.headerRow}>
        <div><p className={styles.eyebrow}>뉴스·이벤트</p><h1>AI 뉴스·행사</h1><p>오늘 알아두면 좋은 AI 소식과 참여할 만한 행사·강의를 한 화면에서 확인하세요.</p></div>
        {isAdmin && !params.write && <button type="button" className={styles.primary} onClick={write}><Plus size={16} />뉴스 등록</button>}
      </header>
      {params.write && isAdmin ? <NewsEditor done={(id) => navigate('news', { id })} cancel={() => navigate('news')} />
        : params.id ? <NewsDetail key={params.id} id={params.id} back={() => navigate('news')} isAdmin={isAdmin} />
        : <><EventStrip /><NewsList open={(id) => navigate('news', { id })} isAdmin={isAdmin} write={write} /></>}
    </div>
  );
}
