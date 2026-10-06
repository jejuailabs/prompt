'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { AcademyPlaylistDTO, AcademyVideoDTO } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { youtubePlaylistUrl, type ImportedLesson } from './curriculum';
import { academyPreview } from './preview';
import styles from './academy.module.css';

export function CourseManager({ selected, preview, onCreated, onRemoved }: { selected?: AcademyPlaylistDTO; preview: boolean; onCreated: (id: string) => void; onRemoved: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imported, setImported] = useState<ImportedLesson[]>([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  async function run(name: string, action: () => Promise<void>) {
    if (preview || busy) return;
    setBusy(name); setError(''); setNotice('');
    try { await action(); await qc.invalidateQueries({ queryKey: ['academy'] }); }
    catch (e) { setError(e instanceof Error ? e.message : '요청을 처리하지 못했습니다.'); }
    finally { setBusy(''); }
  }
  function reorder(index: number, direction: number) {
    setImported(items => { const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  async function editLesson(video: AcademyVideoDTO) {
    if (!selected) return;
    const title = window.prompt('차시 제목', video.title); if (title === null) return;
    const url = window.prompt('YouTube 영상 주소', `https://www.youtube.com/watch?v=${video.videoId}`); if (url === null) return;
    const description = window.prompt('차시 설명', video.description); if (description === null) return;
    const order = window.prompt('차시 순서', String(video.sortOrder)); if (order === null) return;
    if (!Number.isInteger(Number(order)) || Number(order) < 0) { setError('차시 순서는 0 이상의 정수로 입력해주세요.'); return; }
    await run(video.id, async () => { await api.patch(`/api/academy/playlists/${selected.id}/videos/${video.id}`, { title, url, description, sortOrder: Number(order) }); });
  }
  return <details className={styles.manager}>
    <summary>{preview ? '커리큘럼 등록 구조 살펴보기' : '커리큘럼 관리'} <Plus size={16} /></summary>
    <div className={styles.managerBody}>
      <div><span className={styles.eyebrow}>PLAYLIST → CURRICULUM</span><h2>재생목록 하나를, 하나의 강의로.</h2><p>재생목록 가져오기 → 차시 순서 확인 → 강의 등록 → 차시별 학습노트 만들기</p></div>
      {preview && <><p className={styles.notice}>등록 화면 미리보기입니다. 실제 가져오기·저장은 운영 서비스에서 관리자로 로그인한 뒤 사용할 수 있어요.</p><div><Button variant="outline" onClick={() => {
        const sample = academyPreview[0];
        setTitle(sample.title); setDescription(sample.description);
        setImported(sample.videos.map(v => ({ videoId: v.id, title: v.title, description: v.description, channelTitle: '', durationSeconds: null })));
        setNotice('구성 예시를 불러왔어요. 차시 이름·순서를 바꿔볼 수 있으며 실제 영상이나 저장 요청은 발생하지 않아요.');
      }}>예시로 구성해보기</Button></div></>}
      <div className={styles.importRow}><label>유튜브 재생목록 주소<Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.youtube.com/playlist?list=…" /></label><Button disabled={preview || !!busy || !youtubePlaylistUrl(url)} onClick={() => void run('import', async () => {
        const result = await api.post<{ videos: ImportedLesson[]; reachedLimit: boolean }>('/api/academy/import', { url });
        setImported(result.videos); setNotice(result.reachedLimit ? '최대 100개를 가져왔습니다. 더 긴 재생목록은 과정을 나눠 등록해주세요.' : `${result.videos.length}개 영상을 가져왔습니다. 제목과 차시 순서를 확인해주세요.`);
      })}>{busy === 'import' ? <><Loader2 size={16} className="animate-spin" />가져오는 중</> : '재생목록 가져오기'}</Button></div>
      <p className={styles.small}>SocialKit으로 최대 100개 영상의 제목과 순서를 가져옵니다. 자막·학습노트는 등록 후 차시별로 생성해요.</p>
      <div className={styles.formGrid}><label>강의 이름<Input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 처음 만드는 나의 웹사이트" /></label><label>강의 소개<Input maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} placeholder="무엇을 배우고 만들게 되나요?" /></label></div>
      {!!imported.length && <ol className={styles.importList}>{imported.map((v, i) => <li key={v.videoId}><span>{String(i + 1).padStart(2, '0')}</span><Input aria-label={`${i + 1}차시 제목`} maxLength={160} value={v.title} onChange={e => setImported(items => items.map((item, index) => index === i ? { ...item, title: e.target.value } : item))} /><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 위로`} disabled={i === 0 || !!busy} onClick={() => reorder(i, -1)}><ArrowUp size={15} /></Button><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 아래로`} disabled={i === imported.length - 1 || !!busy} onClick={() => reorder(i, 1)}><ArrowDown size={15} /></Button><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 제외`} disabled={!!busy} onClick={() => setImported(items => items.filter(item => item.videoId !== v.videoId))}><Trash2 size={15} /></Button></li>)}</ol>}
      <div><Button disabled={preview || !!busy || !title.trim() || imported.some(v => !v.title.trim())} onClick={() => void run('create', async () => {
        const course = await api.post<AcademyPlaylistDTO>('/api/academy/playlists', { title, description, videos: imported });
        setTitle(''); setDescription(''); setUrl(''); setImported([]); onCreated(course.id);
      })}>{busy === 'create' ? '등록 중…' : imported.length ? `${imported.length}개 차시로 강의 등록` : '빈 강의 만들기'}</Button></div>
      {selected && !selected.isExample && <section className={styles.manageExisting}>
        <h3>{selected.title}</h3>
        <div className={styles.actions}><Button variant="outline" disabled={!!busy} onClick={() => {
          const title = window.prompt('강의 이름', selected.title); if (title === null) return;
          const description = window.prompt('강의 소개', selected.description); if (description === null) return;
          void run('edit', async () => { await api.patch(`/api/academy/playlists/${selected.id}`, { title, description }); });
        }}>강의 정보 수정</Button><Button variant="outline" disabled={!!busy} onClick={() => { if (window.confirm(`“${selected.title}” 강의와 모든 차시를 삭제할까요?`)) void run('delete', async () => { await api.del(`/api/academy/playlists/${selected.id}`); onRemoved(); }); }}>강의 삭제</Button></div>
        <div className={styles.importRow}><label>개별 영상 추가<Input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="YouTube 영상 주소" /></label><Button disabled={!!busy || !videoUrl.trim()} onClick={() => void run('add', async () => { await api.post(`/api/academy/playlists/${selected.id}/videos`, { url: videoUrl, sortOrder: Math.max(-1, ...selected.videos.map(v => v.sortOrder)) + 1 }); setVideoUrl(''); })}>{busy === 'add' ? '자막·노트 분석 중…' : '영상 추가 및 분석'}</Button></div>
        <p className={styles.small}>분석에는 수 분이 걸릴 수 있어요. 오류가 난 차시는 다시 생성할 수 있습니다.</p>
        {selected.videos.map((v, i) => <div key={v.id} className={styles.manageLesson}><span>{i + 1}. {v.title}</span><div className={styles.actions}><Button size="sm" variant="outline" disabled={!!busy} onClick={() => void run(v.id, async () => {
          const result = await api.post<{ status: string; error?: string }>(`/api/academy/playlists/${selected.id}/videos/${v.id}/analyze`);
          if (result.status === 'failed') setError(result.error || '자막·학습노트를 생성하지 못했습니다.');
          else setNotice('학습노트가 갱신되었습니다.');
        })}>{busy === v.id ? '처리 중…' : '학습노트 생성'}</Button><Button size="sm" variant="ghost" disabled={!!busy} onClick={() => void editLesson(v)}>수정</Button><Button size="sm" variant="ghost" disabled={!!busy} onClick={() => { if (window.confirm(`“${v.title}” 차시를 삭제할까요?`)) void run(v.id, async () => { await api.del(`/api/academy/playlists/${selected.id}/videos/${v.id}`); }); }}>삭제</Button></div></div>)}
      </section>}
      {notice && <p role="status">{notice}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  </details>;
}
