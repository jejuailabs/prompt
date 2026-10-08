'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api-client';
import type { AcademyLessonDTO, AcademyPlaylistDTO } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { youtubeVideoId } from './curriculum';
import styles from './academy.module.css';

type Props = { lessons: AcademyLessonDTO[]; courses: AcademyPlaylistDTO[]; selected?: AcademyPlaylistDTO; selectedLesson?: AcademyLessonDTO; preview: boolean; onCreated: (id: string) => void; onLessonCreated: (id: string) => void; onRemoved: () => void };
export function CourseManager({ lessons, courses, selected, selectedLesson, preview, onCreated, onLessonCreated, onRemoved }: Props) {
  const qc = useQueryClient();
  const [url, setUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [studyContent, setStudyContent] = useState('');
  const [analyze, setAnalyze] = useState(true);
  const [title, setTitle] = useState(selected?.title ?? '');
  const [description, setDescription] = useState(selected?.description ?? '');
  const [courseId, setCourseId] = useState(selected?.id ?? '');
  const sourceId = (v: AcademyPlaylistDTO['videos'][number]) => lessons.find(l => v.videoId ? l.videoId === v.videoId : l.id === v.id)?.id ?? v.id;
  const [ids, setIds] = useState<string[]>(selected?.videos.map(sourceId) ?? []);
  const [editingId, setEditingId] = useState(selectedLesson?.id ?? '');
  const editing = lessons.find(l => l.id === editingId);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setEditTitle(editing?.title ?? ''); setEditDescription(editing?.description ?? ''); setEditNotes(editing?.analysis?.studyContent ?? editing?.sampleNote ?? ''); }, [editing]);
  useEffect(() => { if (selectedLesson) setEditingId(selectedLesson.id); }, [selectedLesson?.id]);
  async function run(name: string, action: () => Promise<void>) {
    if (preview || busy) return;
    setBusy(name); setError(''); setNotice('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : '요청을 처리하지 못했습니다.'); }
    finally { await qc.invalidateQueries({ queryKey: ['academy'] }); setBusy(''); }
  }
  function chooseCourse(id: string) {
    const course = courses.find(c => c.id === id);
    setCourseId(id); setTitle(course?.title ?? ''); setDescription(course?.description ?? ''); setIds(course?.videos.map(sourceId) ?? []);
  }
  function reorder(index: number, direction: number) {
    setIds(items => { const next = [...items]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; return next; });
  }
  const selectedVideos = ids.map(id => lessons.find(l => l.id === id));
  return <details className={styles.manager}>
    <summary>{preview ? '영상 등록·강의 묶기 살펴보기' : '영상 등록·강의 관리'} <Plus size={16} /></summary>
    <div className={styles.managerBody}>
      {preview && <p className={styles.notice}>등록 화면 미리보기입니다. 예시 영상 선택과 순서 변경을 체험할 수 있어요. 실제 등록·분석·저장은 운영 서비스의 관리자만 사용할 수 있습니다.</p>}
      <section className={styles.managerSection}>
        <div><span className={styles.eyebrow}>01 / ADD A VIDEO</span><h2>영상 하나로 시작하세요.</h2><p>YouTube 영상 URL 하나를 등록하면, 영상과 그 영상의 학습내용이 하나의 영상 강의가 됩니다.</p></div>
        <label>YouTube 영상 URL<Input value={url} onChange={e => setUrl(e.target.value)} maxLength={2048} placeholder="https://www.youtube.com/watch?v=…" /></label>
        {url && !youtubeVideoId(url) && <p className={styles.error}>개별 영상 주소를 입력해주세요. 재생목록 주소는 사용할 수 없어요.</p>}
        <div className={styles.formGrid}><label>영상 제목 (선택)<Input value={videoTitle} maxLength={160} onChange={e => setVideoTitle(e.target.value)} placeholder="자동 분석 시 영상 제목을 가져옵니다" /></label><label>영상 소개 (선택)<Input value={videoDescription} maxLength={500} onChange={e => setVideoDescription(e.target.value)} /></label></div>
        <label>직접 작성한 학습내용 (선택)<textarea value={studyContent} maxLength={50000} onChange={e => setStudyContent(e.target.value)} placeholder="비워두면 영상 자막을 바탕으로 학습내용을 만들 수 있어요. 마크다운을 지원합니다." /></label>
        <label className={styles.checkLabel}><input type="checkbox" checked={analyze} onChange={e => setAnalyze(e.target.checked)} disabled={!!studyContent.trim()} />등록과 함께 자막·학습내용 자동 생성</label>
        <p className={styles.small}>{studyContent.trim() ? '직접 작성한 학습내용을 저장합니다. 자동 분석은 실행하지 않아요.' : 'SocialKit으로 시간별 자막을 먼저 저장한 뒤 AI 학습노트를 만듭니다. 학습노트 생성에 실패해도 추출된 자막은 남아요. 이미 분석된 영상은 기존 결과를 재사용합니다.'}</p>
        <div><Button disabled={preview || !!busy || !url.trim().startsWith('https://') || !youtubeVideoId(url)} onClick={() => void run('register', async () => {
          const lesson = await api.post<AcademyLessonDTO>('/api/academy/lessons', { url, title: videoTitle, description: videoDescription, studyContent, analyze });
          onLessonCreated(lesson.id);
          if (lesson.analysis?.status === 'failed') setError(lesson.analysis.error || '영상은 등록됐지만 학습내용 생성에 실패했어요.');
        })}>{busy === 'register' ? '영상 등록·학습내용 준비 중…' : '영상 강의 등록'}</Button></div>
      </section>
      {!!lessons.length && <section className={styles.managerSection}>
        <div><span className={styles.eyebrow}>EDIT / VIDEO & STUDY NOTES</span><h2>영상의 학습내용 다듬기</h2><p>같은 영상을 포함한 모든 강의에 수정 내용이 함께 반영됩니다.</p></div>
        <label>편집할 영상<select value={editingId} disabled={!!busy} onChange={e => setEditingId(e.target.value)}><option value="">영상 선택</option>{lessons.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
        {editing && <>
          <div className={styles.formGrid}><label>영상 제목<Input value={editTitle} maxLength={160} onChange={e => setEditTitle(e.target.value)} /></label><label>영상 소개<Input value={editDescription} maxLength={500} onChange={e => setEditDescription(e.target.value)} /></label></div>
          <label>학습내용 편집<textarea value={editNotes} maxLength={50000} onChange={e => setEditNotes(e.target.value)} /></label>
          {editing.analysis?.status === 'failed' && <p role="alert" className={styles.error}>{editing.analysis.transcript ? '자막 추출·저장 완료. 학습노트 생성은 완료되지 않았어요.' : '영상은 등록되어 있지만 자막·학습내용 준비에 실패했어요.'} {editing.analysis.error} 다시 생성하거나 학습내용을 직접 작성해주세요.</p>}
          {editing.analysis?.transcript && <p className={styles.small}>자막 {editing.analysis.transcript.length.toLocaleString()}자 저장됨 · 영상의 자막 탭에서 확인할 수 있어요.</p>}
          <div className={styles.actions}><Button disabled={preview || !!busy || !editTitle.trim()} onClick={() => void run('save-lesson', async () => { await api.patch(`/api/academy/lessons/${editing.id}`, { title: editTitle, description: editDescription, studyContent: editNotes }); setNotice('영상과 학습내용을 저장했어요.'); })}>영상 내용 저장</Button><Button variant="outline" disabled={preview || !!busy} onClick={() => {
            if (editing.analysis?.studyContent && !window.confirm('기존 학습내용을 새 분석 결과로 교체할까요?')) return;
            void run('analyze', async () => { const result = await api.post<{ status: string; error?: string }>(`/api/academy/lessons/${editing.id}/analyze`); if (result.status === 'failed') setError(result.error || '분석에 실패했어요. 다시 시도해주세요.'); else setNotice('자막과 학습내용을 갱신했어요.'); });
          }}>{busy === 'analyze' ? '자막·학습내용 분석 중…' : '자막·학습내용 생성'}</Button></div>
        </>}
      </section>}
      <section className={styles.managerSection}>
        <div><span className={styles.eyebrow}>02 / BUILD A COURSE</span><h2>함께 배울 영상을 묶으세요.</h2><p>등록 영상 두 개 이상을 선택하고 순서를 정하면 차시와 커리큘럼이 생겨요. 하나의 영상을 여러 강의에서 사용할 수 있습니다.</p></div>
        <label>강의 구성<select value={courseId} disabled={!!busy} onChange={e => chooseCourse(e.target.value)}><option value="">새 강의 구성</option>{courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
        <div className={styles.formGrid}><label>강의 이름<Input maxLength={120} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 처음 만드는 나의 웹사이트" /></label><label>강의 소개<Input maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} /></label></div>
        {!lessons.length && <p className={styles.notice}>먼저 개별 영상 두 개 이상을 등록해주세요.</p>}
        <div className={styles.lessonPicker} role="group" aria-label="강의로 묶을 영상 선택">{lessons.map(l => <label className={styles.checkLabel} key={l.id}><input type="checkbox" checked={ids.includes(l.id)} disabled={!!busy || (!ids.includes(l.id) && ids.length >= 100)} onChange={e => setIds(items => e.target.checked ? [...items, l.id] : items.filter(id => id !== l.id))} /><span>{l.title}{l.isExample && <small> 구성 예시</small>}</span></label>)}</div>
        <h3>선택한 영상 순서 · {ids.length}개</h3>
        {ids.length < 2 && <p className={styles.small}>강의로 묶으려면 영상을 두 개 이상 선택해주세요.</p>}
        {!!ids.length && <ol className={styles.importList}>{selectedVideos.map((v, i) => <li key={ids[i]}><span>{String(i + 1).padStart(2, '0')}</span><strong className={styles.selectedTitle}>{v?.title ?? '목록에 없는 영상 · 다시 선택해주세요'}</strong><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 위로`} disabled={i === 0 || !!busy} onClick={() => reorder(i, -1)}><ArrowUp size={15} /></Button><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 아래로`} disabled={i === ids.length - 1 || !!busy} onClick={() => reorder(i, 1)}><ArrowDown size={15} /></Button><Button variant="ghost" size="icon" aria-label={`${i + 1}차시 제외`} disabled={!!busy} onClick={() => setIds(items => items.filter(id => id !== ids[i]))}><Trash2 size={15} /></Button></li>)}</ol>}
        <div className={styles.actions}><Button disabled={preview || !!busy || !title.trim() || ids.length < 2 || selectedVideos.some(v => !v)} onClick={() => void run('save-course', async () => {
          const body = { title, description, lessonIds: ids };
          const course = courseId ? await api.patch<AcademyPlaylistDTO>(`/api/academy/playlists/${courseId}`, body) : await api.post<AcademyPlaylistDTO>('/api/academy/playlists', body);
          setNotice('강의 구성을 저장했어요.'); onCreated(course.id);
        })}>{busy === 'save-course' ? '저장 중…' : courseId ? '강의 구성 저장' : '선택한 영상으로 강의 만들기'}</Button>
        {courseId && <Button variant="outline" disabled={preview || !!busy} onClick={() => { if (window.confirm('강의 묶음을 해제할까요? 개별 영상과 학습내용은 그대로 남습니다.')) void run('unlink', async () => { await api.del(`/api/academy/playlists/${courseId}`); chooseCourse(''); onRemoved(); }); }}>강의 묶음 해제</Button>}</div>
        <p className={styles.small}>강의에서 영상을 제외하거나 묶음을 해제해도 영상 강의와 학습내용은 남아요.</p>
      </section>
      {notice && <p role="status">{notice}</p>}{error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  </details>;
}
