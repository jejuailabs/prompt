'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Heart, MessageCircle, PenLine, Pin, Search, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import { toast } from '@/hooks/use-toast';
import type { ArtifactDTO, CommentDTO } from '@/lib/types';
import { BOARDS, BOARD_TABS, POST_BODY_MAX, POST_TITLE_MAX, boardDef, isBoardId, type BoardId, type BoardPostDTO, type BoardTab } from './boards';
import styles from './board.module.css';

type ListResponse = { posts: BoardPostDTO[]; total: number; page: number; pageSize: number };

function formatDate(value: string) {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function BoardTag({ board }: { board: BoardId }) {
  const def = boardDef(board);
  return <span className={styles.tag} data-tone={def?.tone}>{def?.label ?? '자유'}</span>;
}

// ── list ────────────────────────────────────────────────────────────────

function PostRows({ posts, pinned = false, open }: { posts: BoardPostDTO[]; pinned?: boolean; open: (id: string) => void }) {
  return <>{posts.map((post) => (
    <li key={post.id} className={styles.row} data-pinned={pinned || undefined}>
      <span className={styles.colNo}>{pinned ? <Pin size={14} aria-label="고정 공지" /> : post.number || '-'}</span>
      <span className={styles.colTag}><BoardTag board={post.board} /></span>
      <button type="button" className={styles.colTitle} onClick={() => open(post.id)}>
        <span className={styles.titleText}>{post.title}</span>
        {post.commentCount > 0 && <span className={styles.commentCount}>[{post.commentCount}]</span>}
      </button>
      <span className={styles.colAuthor}>{post.author.username}</span>
      <span className={styles.colDate}>{formatDate(post.createdAt)}</span>
      <span className={styles.colNum} aria-label="조회">{post.views.toLocaleString()}</span>
      <span className={styles.colNum} aria-label="추천">{post.likeCount.toLocaleString()}</span>
    </li>
  ))}</>;
}

function BoardList({ tab, open, write }: { tab: Exclude<BoardTab, 'gallery'>; open: (id: string) => void; write: () => void }) {
  const [sort, setSort] = useState<'new' | 'popular'>('new');
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const board = tab === 'all' ? '' : tab;
  const list = useQuery({
    queryKey: ['board', tab, sort, q, page],
    queryFn: () => api.get<ListResponse>(`/api/community/posts?board=${board}&sort=${sort}&page=${page}${q ? `&q=${encodeURIComponent(q)}` : ''}`),
  });
  const notices = useQuery({ queryKey: ['board', 'notice-pinned'], queryFn: () => api.get<ListResponse>('/api/community/posts?board=notice&limit=3'), enabled: tab === 'all' && page === 1 && !q });
  const pinned = tab === 'all' && page === 1 && !q ? notices.data?.posts ?? [] : [];
  const posts = (list.data?.posts ?? []).filter((post) => !pinned.some((pin) => pin.id === post.id));
  const pages = Math.max(1, Math.ceil((list.data?.total ?? 0) / (list.data?.pageSize ?? 20)));
  const hint = boardDef(board)?.hint;

  return (
    <section className={styles.panel}>
      <div className={styles.toolbar}>
        <div className={styles.sort} role="group" aria-label="정렬">
          <button type="button" aria-pressed={sort === 'new'} onClick={() => { setSort('new'); setPage(1); }}>최신순</button>
          <button type="button" aria-pressed={sort === 'popular'} onClick={() => { setSort('popular'); setPage(1); }}>인기순</button>
        </div>
        <form className={styles.search} role="search" onSubmit={(event) => { event.preventDefault(); setQ(query.trim()); setPage(1); }}>
          <Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목·내용 검색" aria-label="게시글 검색" />
        </form>
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
      <div className={styles.tableHead} aria-hidden="true"><span>번호</span><span>말머리</span><span>제목</span><span>글쓴이</span><span>날짜</span><span>조회</span><span>추천</span></div>
      <ul className={styles.rows}>
        <PostRows posts={pinned} pinned open={open} />
        {list.isLoading && Array.from({ length: 6 }, (_, i) => <li key={i} className={styles.skeleton} />)}
        <PostRows posts={posts} open={open} />
      </ul>
      {!list.isLoading && posts.length === 0 && pinned.length === 0 && (
        <div className={styles.empty}>
          <p>{q ? '검색 결과가 없어요.' : '아직 글이 없어요. 첫 글을 남겨 주세요!'}</p>
          {!q && <button type="button" className={styles.primary} onClick={write}><PenLine size={16} />글쓰기</button>}
        </div>
      )}
      {list.isError && <p className={styles.empty}>글 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
      {pages > 1 && (
        <nav className={styles.pager} aria-label="페이지">
          {Array.from({ length: pages }, (_, i) => i + 1).slice(Math.max(0, page - 5), page + 4).map((n) => (
            <button key={n} type="button" aria-current={n === page ? 'page' : undefined} onClick={() => setPage(n)}>{n}</button>
          ))}
        </nav>
      )}
    </section>
  );
}

function PopularSide({ open }: { open: (id: string) => void }) {
  const popular = useQuery({ queryKey: ['board', 'popular-side'], queryFn: () => api.get<ListResponse>('/api/community/posts?sort=popular&limit=5') });
  return (
    <aside className={styles.side}>
      <section className={styles.sideCard}>
        <h2>인기글</h2>
        {popular.data?.posts.length ? (
          <ol className={styles.rank}>{popular.data.posts.map((post, i) => (
            <li key={post.id}><b>{i + 1}</b><button type="button" onClick={() => open(post.id)}>{post.title}</button><span><Heart size={13} />{post.likeCount}</span></li>
          ))}</ol>
        ) : <p className={styles.muted}>추천을 많이 받은 글이 여기에 모여요.</p>}
      </section>
      <section className={styles.sideCard}>
        <h2>게시판 안내</h2>
        <ul className={styles.guide}>{BOARDS.map((board) => <li key={board.id}><span className={styles.tag} data-tone={board.tone}>{board.label}</span>{board.hint}</li>)}</ul>
      </section>
    </aside>
  );
}

// ── gallery (member image / video works) ────────────────────────────────

function Gallery() {
  const navigate = useAppStore((s) => s.navigate);
  const works = useQuery({
    queryKey: ['board', 'gallery'],
    queryFn: async () => {
      const [images, videos] = await Promise.all([
        api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&type=image&limit=40'),
        api.get<ArtifactDTO[]>('/api/artifacts?scope=feed&type=video&limit=20'),
      ]);
      return [...images, ...videos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  });
  return (
    <section>
      <p className={styles.hint}>AI로 만든 이미지·영상을 자랑해 보세요. 게임과 웹 작품은 만들어보기에 모여 있어요.</p>
      <div className={styles.gallery}>
        {works.data?.map((work) => {
          const image = work.metadata?.previewUrl || work.metadata?.frames?.[0] || (work.type === 'image' ? work.fileUrl : null);
          const video = !image && work.type === 'video' ? work.fileUrl : null;
          return (
            <button key={work.id} type="button" className={styles.galleryCard} onClick={() => navigate('project', { id: work.id })}>
              {image ? <img src={image} alt="" loading="lazy" /> : video ? <video src={`${video}#t=0.5`} muted playsInline preload="metadata" /> : <span className={styles.galleryBlank} />}
              <span className={styles.galleryInfo}><strong>{work.title}</strong><small>{work.owner?.username} · <Heart size={12} /> {work.likeCount}</small></span>
            </button>
          );
        })}
        {works.isLoading && Array.from({ length: 8 }, (_, i) => <span key={i} className={styles.gallerySkeleton} />)}
      </div>
      {!works.isLoading && !works.data?.length && <p className={styles.empty}>아직 올라온 작품이 없어요.</p>}
    </section>
  );
}

// ── detail ──────────────────────────────────────────────────────────────

function PostDetail({ id, back }: { id: string; back: () => void }) {
  const requireLogin = useAppStore((s) => s.requireLogin);
  const client = useQueryClient();
  const post = useQuery({ queryKey: ['board-post', id], queryFn: () => api.get<BoardPostDTO>(`/api/community/posts/${id}`), staleTime: 60_000 });
  const comments = useQuery({ queryKey: ['board-comments', id], queryFn: () => api.get<CommentDTO[]>(`/api/comments?targetType=artifact&targetId=${id}`) });
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const like = async () => {
    if (!requireLogin()) return;
    try {
      const result = await api.post<{ liked: boolean; likeCount: number }>('/api/vote', { targetType: 'artifact', targetId: id });
      client.setQueryData<BoardPostDTO>(['board-post', id], (old) => old && { ...old, likedByMe: result.liked, likeCount: result.likeCount });
      void client.invalidateQueries({ queryKey: ['board'] });
    } catch { toast({ title: '추천하지 못했어요.' }); }
  };
  const send = async (event: FormEvent) => {
    event.preventDefault();
    if (!requireLogin() || !reply.trim()) return;
    setSending(true);
    try { await api.post('/api/comment', { targetType: 'artifact', targetId: id, body: reply }); setReply(''); await comments.refetch(); void client.invalidateQueries({ queryKey: ['board'] }); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '댓글을 남기지 못했어요.' }); }
    finally { setSending(false); }
  };
  const remove = async () => {
    if (!window.confirm('이 글을 삭제할까요?')) return;
    try { await api.del(`/api/community/posts/${id}`); void client.invalidateQueries({ queryKey: ['board'] }); back(); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '삭제하지 못했어요.' }); }
  };

  if (post.isLoading) return <div className={styles.panel}><div className={styles.skeleton} style={{ height: 240 }} /></div>;
  if (!post.data) return <div className={styles.panel}><p className={styles.empty}>글을 찾을 수 없어요.</p><button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} />목록으로</button></div>;
  const data = post.data;
  return (
    <article className={styles.panel}>
      <button type="button" className={styles.back} onClick={back}><ArrowLeft size={16} />목록으로</button>
      <header className={styles.postHead}>
        <BoardTag board={data.board} />
        <h1>{data.title}</h1>
        <div className={styles.postMeta}><span>{data.author.username}</span><span>{formatDate(data.createdAt)}</span><span><Eye size={14} />{data.views}</span><span><MessageCircle size={14} />{data.commentCount}</span></div>
      </header>
      <div className={styles.postBody}>{data.body}</div>
      <div className={styles.postActions}>
        <button type="button" className={styles.likeButton} aria-pressed={data.likedByMe} onClick={() => void like()}><Heart size={18} fill={data.likedByMe ? 'currentColor' : 'none'} />추천 {data.likeCount}</button>
        {data.canEdit && <button type="button" className={styles.ghost} onClick={() => void remove()}><Trash2 size={16} />삭제</button>}
      </div>
      <section className={styles.comments} aria-label="댓글">
        <h2>댓글 {comments.data?.length ?? 0}</h2>
        <ul>{comments.data?.map((comment) => (
          <li key={comment.id}><div><strong>{comment.user.username}</strong><span>{formatDate(comment.createdAt)}</span></div><p>{comment.body}</p></li>
        ))}</ul>
        <form onSubmit={(event) => void send(event)} className={styles.commentForm}>
          <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={1000} rows={3} placeholder={data.board === 'qna' ? '알고 계신 방법을 알려 주세요.' : '따뜻한 댓글을 남겨 주세요.'} aria-label="댓글" />
          <button type="submit" className={styles.primary} disabled={sending || !reply.trim()}>댓글 등록</button>
        </form>
      </section>
    </article>
  );
}

// ── write ───────────────────────────────────────────────────────────────

function PostEditor({ initialBoard, done, cancel }: { initialBoard: BoardId; done: (id: string) => void; cancel: () => void }) {
  const session = useAppStore((s) => s.session);
  const client = useQueryClient();
  const boards = BOARDS.filter((board) => !board.adminOnly || session?.role === 'admin');
  const [board, setBoard] = useState<BoardId>(boards.some((item) => item.id === initialBoard) ? initialBoard : 'free');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { const post = await api.post<BoardPostDTO>('/api/community/posts', { board, title, body }); void client.invalidateQueries({ queryKey: ['board'] }); done(post.id); }
    catch (error) { toast({ title: error instanceof Error ? error.message : '글을 올리지 못했어요.' }); }
    finally { setSaving(false); }
  };
  return (
    <form className={styles.panel} onSubmit={(event) => void submit(event)}>
      <button type="button" className={styles.back} onClick={cancel}><ArrowLeft size={16} />목록으로</button>
      <h1 className={styles.editorTitle}>글쓰기</h1>
      <div className={styles.boardPick} role="radiogroup" aria-label="게시판">
        {boards.map((item) => <button key={item.id} type="button" role="radio" aria-checked={board === item.id} onClick={() => setBoard(item.id)}><span className={styles.tag} data-tone={item.tone}>{item.label}</span><small>{item.hint}</small></button>)}
      </div>
      <label className={styles.field}>제목<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={POST_TITLE_MAX} placeholder="제목을 입력해 주세요" required /></label>
      <label className={styles.field}>내용<textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={POST_BODY_MAX} rows={12} placeholder={board === 'qna' ? '어떤 상황에서 무엇이 막혔는지 적어 주시면 답을 받기 쉬워요.' : board === 'study' ? '오늘 배운 것, 해 본 것, 다음에 해 볼 것을 적어 보세요.' : '자유롭게 이야기해 주세요.'} required /></label>
      <div className={styles.formActions}>
        <button type="button" className={styles.ghost} onClick={cancel}>취소</button>
        <button type="submit" className={styles.primary} disabled={saving || !title.trim() || !body.trim()}>{saving ? '올리는 중…' : '등록'}</button>
      </div>
    </form>
  );
}

/** COAI 커뮤니티: board tabs (전체·자유·질문·학습일지·공지) + member gallery. */
export default function CommunityBoard() {
  const params = useAppStore((s) => s.params);
  const navigate = useAppStore((s) => s.navigate);
  const requireLogin = useAppStore((s) => s.requireLogin);
  const tab: BoardTab = BOARD_TABS.some((item) => item.id === params.tab) ? (params.tab as BoardTab) : 'all';
  const go = (next: Record<string, string>) => navigate('community', next);
  const open = (id: string) => go({ tab, id });
  const write = () => { if (requireLogin()) go({ tab, write: '1' }); };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div><p className={styles.eyebrow}>커뮤니티</p><h1>같이 묻고, 같이 배워요</h1><p>궁금한 건 질문 게시판에, 배운 건 학습일지에. 만든 작품은 갤러리에서 자랑해 주세요.</p></div>
        {tab !== 'gallery' && !params.write && <button type="button" className={styles.primary} onClick={write}><PenLine size={16} />글쓰기</button>}
      </header>
      <nav className={styles.tabs} aria-label="게시판">
        {BOARD_TABS.map((item) => <button key={item.id} type="button" aria-current={tab === item.id ? 'page' : undefined} onClick={() => go(item.id === 'all' ? {} : { tab: item.id })}>{item.label}</button>)}
      </nav>
      {params.write ? <PostEditor initialBoard={isBoardId(tab) ? tab : 'free'} done={(id) => go({ tab, id })} cancel={() => go(tab === 'all' ? {} : { tab })} />
        : params.id ? <div className={styles.layout}><PostDetail key={params.id} id={params.id} back={() => go(tab === 'all' ? {} : { tab })} /><PopularSide open={open} /></div>
        : tab === 'gallery' ? <Gallery />
        : <div className={styles.layout}><BoardList key={tab} tab={tab} open={open} write={write} /><PopularSide open={open} /></div>}
    </div>
  );
}
