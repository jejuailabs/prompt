'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, ListVideo, Play, Search } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api } from '@/lib/api-client';
import { useAppStore } from '@/lib/store';
import type { AcademyLessonDTO, AcademyLibraryDTO, AcademyPlaylistDTO } from '@/lib/types';
import { useRuntime } from '@/components/runtime-context';
import { Button } from '@/components/ui/button';
import { CourseManager } from '@/modules/academy/course-manager';
import { readCourseProgress, timestampSeconds, type CourseProgress } from '@/modules/academy/curriculum';
import styles from '@/modules/academy/academy.module.css';

const progressKey = (course: AcademyPlaylistDTO, user: string) => `playlab-academy-${course.isExample ? 'preview' : 'course'}:${user}:${course.id}`;

export default function AcademyView() {
  const { previewMode } = useRuntime();
  const session = useAppStore(s => s.session);
  const params = useAppStore(s => s.params);
  const navigate = useAppStore(s => s.navigate);
  const [search, setSearch] = useState('');
  const library = useQuery({ queryKey: ['academy', 'library'], queryFn: () => api.get<AcademyLibraryDTO>('/api/academy/library') });
  const lessons = library.data?.lessons ?? [];
  const courses = library.data?.courses ?? [];
  const selected = courses.find(p => p.id === params.course);
  // Legacy links to one-video collections open the independent lesson.
  const standalone = !selected ? lessons.find(v => params.course ? v.collectionId === params.course : v.id === params.lesson) : undefined;
  const currentVideo = selected?.videos.find(v => v.id === params.lesson) ?? selected?.videos[0];
  const selectedLesson = standalone ?? lessons.find(v => v.videoId ? v.videoId === currentVideo?.videoId : v.id === currentVideo?.id);
  const featured = lessons[0];
  function openCourse(course: AcademyPlaylistDTO) {
    let lesson = [...course.videos].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id;
    try { lesson = readCourseProgress(localStorage.getItem(progressKey(course, session?.id ?? 'guest')), course.videos.map(v => v.id)).lastLesson ?? lesson; } catch { /* storage unavailable */ }
    navigate('academy', { course: course.id, ...(lesson ? { lesson } : {}) });
  }
  const matches = (item: { title: string; description: string }) => `${item.title} ${item.description}`.toLowerCase().includes(search.toLowerCase().trim());
  const filteredLessons = lessons.filter(matches);
  const filteredCourses = courses.filter(matches);
  return <div className={styles.academy}>
    {selected || standalone ? <Classroom key={`${selected?.id ?? standalone?.id}:${session?.id ?? 'guest'}`} course={selected} standalone={standalone} user={session?.id ?? 'guest'} lessonId={selected ? params.lesson : standalone?.id} /> : <>
      <header className={styles.intro}>
        <img className={styles.heroBackground} src="/uploads/seed/thumb-fantasy.png" alt="" fetchPriority="high" />
        <div className={styles.introCopy}><span className={styles.eyebrow}>P / PLAYLAB LEARNING CLUB</span><h1>보고, 만들고.<br /><em>내 것으로.</em></h1><p>영상 하나로 배우고, 여러 영상을 순서대로.<br />영상과 함께 정리된 학습내용으로 나만의 결과물을 만드세요.</p>
          {featured && <button className={styles.startLearning} onClick={() => navigate('academy', { lesson: featured.id })}><Play size={15} fill="currentColor" />영상 강의 보기</button>}
          <span className={styles.heroCaption}>WATCH. MAKE. REPEAT.</span>
        </div>
        {featured && <button className={styles.featureNote} onClick={() => navigate('academy', { lesson: featured.id })}><span>하나의 영상으로 시작하기</span><strong>{featured.title}</strong><small>단독 영상 · 학습내용 <ArrowUpRight size={16} /></small></button>}
      </header>
      {previewMode && <p className={styles.notice}>강의 구조 미리보기 · 아래 영상과 강의는 구성 예시입니다. 실제 YouTube 영상이나 분석 결과가 아닙니다.</p>}
      <div className={styles.catalogueHeading}><div><span className={styles.eyebrow}>ONE VIDEO, ONE LESSON</span><h2>영상 강의 <small>{lessons.length}</small></h2></div><label className={styles.search}><Search size={17} /><input aria-label="강의 검색" placeholder="영상 또는 강의 찾기" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
      {library.isLoading && <p className={styles.state} role="status">영상과 강의를 불러오고 있어요…</p>}
      {library.isError && <div className={styles.state}><h3>강의 목록을 불러오지 못했어요.</h3><Button variant="outline" onClick={() => void library.refetch()}>다시 불러오기</Button></div>}
      {(params.course || params.lesson) && library.isSuccess && <p role="alert" className={styles.notice}>해당 영상 또는 강의를 찾을 수 없어요. 목록에서 다시 선택해주세요.</p>}
      <div className={styles.lessonCards}>{filteredLessons.map(lesson => <button className={styles.lessonCard} key={lesson.id} onClick={() => navigate('academy', { lesson: lesson.id })}>
        <div className={styles.lessonCover}>{lesson.thumbnailUrl ? <img alt="" src={lesson.thumbnailUrl} /> : <div className={styles.lessonCoverArt}><Play size={36} /><span>WATCH & MAKE</span></div>}<span className={styles.coverLabel}>{lesson.isExample ? '단독 영상 구성 예시' : '영상 강의'}</span></div>
        <div className={styles.lessonCopy}><h3>{lesson.title}</h3><p>{lesson.description}</p><span>{lesson.isExample ? '예시 학습내용' : lesson.analysis?.status === 'done' ? '영상 + 학습내용' : '영상 · 학습내용 준비 중'}{lesson.courseIds.length > 0 && ` · ${lesson.courseIds.length}개 강의에 포함`}</span><strong>영상 강의 보기 <ArrowRight size={16} /></strong></div>
      </button>)}</div>
      {library.isSuccess && !filteredLessons.length && <div className={styles.state}><h3>{search ? '검색에 맞는 영상이 없어요.' : '첫 번째 영상 강의를 준비하고 있어요.'}</h3><p>{search ? '다른 검색어로 찾아보세요.' : '영상 URL 하나를 등록하면 영상과 학습내용을 함께 볼 수 있어요.'}</p></div>}
      <div className={styles.catalogueHeading}><div><span className={styles.eyebrow}>LEARN IN YOUR OWN ORDER</span><h2>여러 영상을 묶은 강의 <small>{courses.length}</small></h2><p className={styles.small}>등록한 영상들을 순서대로 묶은 커리큘럼입니다.</p></div></div>
      <div className={styles.courses}>{filteredCourses.map((course, i) => <button className={styles.courseCard} key={course.id} onClick={() => openCourse(course)}>
        <div className={styles.courseCover}>{course.thumbnailUrl || course.videos[0]?.thumbnailUrl ? <img alt="" src={course.thumbnailUrl || course.videos[0]?.thumbnailUrl || ''} /> : <div className={styles.coverArt} aria-hidden="true"><span>FROM<br />IDEA<br /><i>TO REAL.</i></span><ArrowUpRight /></div>}<span className={styles.coverLabel}>{course.isExample ? '묶음 강의 구성 예시' : `${course.videos.length}개 차시`}</span><span className={styles.cardPlay}><Play size={17} fill="currentColor" /></span></div>
        <div className={styles.courseCopy}><span className={styles.eyebrow}>COURSE {String(i + 1).padStart(2, '0')} / {course.videos.length} LESSONS</span><h3>{course.title}</h3><p>{course.description}</p><div><span><ListVideo size={15} />순서대로 배우기</span><span><BookOpen size={15} />학습노트</span></div><strong>{course.isExample ? '강의 화면 살펴보기' : '이어서 배우기'} <ArrowRight size={19} /></strong></div>
      </button>)}</div>
      {library.isSuccess && !filteredCourses.length && <div className={styles.state}><h3>{search ? '검색에 맞는 묶음 강의가 없어요.' : '아직 묶인 강의가 없어요.'}</h3><p>영상 강의는 각각 볼 수 있고, 두 개 이상을 묶으면 차시와 커리큘럼이 생겨요.</p></div>}
    </>}
    {(session?.role === 'admin' || previewMode) && <CourseManager key={selected?.id ?? standalone?.id ?? 'library'} lessons={lessons} courses={courses} selected={selected} selectedLesson={selectedLesson} preview={previewMode} onCreated={id => navigate('academy', { course: id })} onLessonCreated={id => navigate('academy', { lesson: id })} onRemoved={() => navigate('academy')} />}
  </div>;
}

function Classroom({ course: groupedCourse, standalone, user, lessonId }: { course?: AcademyPlaylistDTO; standalone?: AcademyLessonDTO; user: string; lessonId?: string }) {
  const grouped = !!groupedCourse;
  const course = useMemo<AcademyPlaylistDTO>(() => groupedCourse ?? { id: 'lesson:' + standalone!.id, title: standalone!.title, description: standalone!.description, sortOrder: 0, isExample: standalone!.isExample, videos: [standalone!] }, [groupedCourse, standalone]);
  const navigate = useAppStore(s => s.navigate);
  const videos = [...course.videos].sort((a, b) => a.sortOrder - b.sortOrder);
  const lesson = videos.find(v => v.id === lessonId) ?? videos[0];
  const index = videos.findIndex(v => v.id === lesson?.id);
  const storageKey = progressKey(course, user);
  const [progress, setProgress] = useState<CourseProgress>({ completed: [], notes: {} });
  const [storageError, setStorageError] = useState(false);
  const [tab, setTab] = useState('study');
  const [startAt, setStartAt] = useState(0);
  const [seekVersion, setSeekVersion] = useState(0);
  const [feedback, setFeedback] = useState('');
  useEffect(() => {
    try {
      const state = readCourseProgress(localStorage.getItem(storageKey), course.videos.map(v => v.id));
      const next = { ...state, lastLesson: lesson?.id };
      setProgress(next); localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { setStorageError(true); }
    setStartAt(0); setTab('study'); setFeedback('');
  }, [storageKey, lesson?.id, course.videos]);
  function save(next: CourseProgress) {
    setProgress(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  }
  function go(id: string) { navigate('academy', { course: course.id, lesson: id }); }
  const done = progress.completed.includes(lesson?.id ?? '');
  const percent = videos.length ? Math.round(progress.completed.length / videos.length * 100) : 0;
  const analysis = lesson?.analysis;
  const notes = course.isExample ? lesson?.sampleNote ?? '' : analysis?.status === 'done' ? analysis.studyContent || analysis.reportSummary : '';
  const text = tab === 'transcript' ? analysis?.transcript ?? '' : notes;
  async function copyNotes() { try { await navigator.clipboard.writeText(text); setFeedback('복사했어요.'); } catch { setFeedback('복사하지 못했어요. 텍스트 저장을 이용해주세요.'); } }
  function downloadNotes() {
    if (!lesson) return;
    const url = URL.createObjectURL(new Blob([`${lesson.title}\n\n${text}`], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${lesson.title.replace(/[<>:"/\\|?*]/g, '_')}-학습노트.txt`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <button className={styles.back} onClick={() => navigate('academy')}><ArrowLeft size={16} />영상·강의 목록</button>
    <header className={styles.courseHeading}><div><span className={styles.eyebrow}>{course.isExample ? '구성 예시' : 'PLAYLAB CLASSROOM'} / {grouped ? `${videos.length} LESSONS` : '영상 강의'}</span><h1>{course.title}</h1><p>{course.description}</p></div><span className={styles.headingMark} aria-hidden="true">↗</span></header>
    {course.isExample && <p className={styles.notice}>{grouped ? '묶음 강의 구성 예시입니다. 차시 이동·완료 표시·메모를 체험할 수 있어요.' : '단독 영상 구성 예시입니다. 영상과 학습내용을 함께 보는 화면이에요.'} 실제 영상과 분석 결과는 연결하지 않았습니다.</p>}
    {lessonId && !videos.some(v => v.id === lessonId) && <p role="status" className={styles.notice}>해당 차시가 없어 첫 번째 차시를 보여드려요.</p>}
    {!lesson ? <div className={styles.state}><ListVideo /><h2>아직 등록된 차시가 없어요.</h2><p>등록한 영상을 선택하면 강의를 시작할 수 있어요.</p></div> : <div className={`${styles.classroom} ${!grouped ? styles.standalone : ''}`}>
      <div className={styles.lessonMain}>
        <div id="academy-player-anchor" className={styles.player}>{/^[\w-]{11}$/.test(lesson.videoId) && !course.isExample ? <iframe key={`${lesson.id}:${seekVersion}`} src={`https://www.youtube-nocookie.com/embed/${lesson.videoId}?rel=0&playsinline=1&start=${startAt}`} title={grouped ? `${index + 1}차시: ${lesson.title}` : lesson.title} referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <div className={styles.playerPreview}><span className={styles.eyebrow}>{grouped ? `YOUR NEXT CHAPTER / ${String(index + 1).padStart(2, '0')}` : 'VIDEO LESSON'}</span><strong>{lesson.title}</strong><span className={styles.previewPlay} aria-hidden="true"><Play fill="currentColor" size={28} /></span><p>{course.isExample ? '개별 영상 URL을 등록하면 이곳에서 재생돼요.' : '이 차시의 영상 주소를 확인해주세요.'}</p><span className={styles.fakeTimeline} aria-hidden="true" /></div>}</div>
        <div className={styles.lessonHeading}><div><span className={styles.eyebrow}>{grouped ? `LESSON ${String(index + 1).padStart(2, '0')}` : '영상과 학습내용'}</span>{grouped && <h2>{lesson.title}</h2>}{analysis?.channelTitle && <p>{analysis.channelTitle}</p>}<p>{lesson.description}</p></div>{grouped && <Button variant={done ? 'outline' : 'default'} aria-pressed={done} onClick={() => save({ ...progress, completed: done ? progress.completed.filter(id => id !== lesson.id) : [...progress.completed, lesson.id] })}>{done ? <CheckCircle2 size={16} /> : <Check size={16} />}{done ? '학습 완료됨' : '학습 완료 표시'}</Button>}</div>
        <div className={styles.lessonNav}>{grouped && <Button variant="ghost" disabled={index === 0} onClick={() => go(videos[index - 1].id)}><ChevronLeft size={16} />이전 차시</Button>}{!course.isExample && /^[\w-]{11}$/.test(lesson.videoId) && <a href={`https://www.youtube.com/watch?v=${lesson.videoId}`} target="_blank" rel="noopener noreferrer">YouTube에서 보기 <ExternalLink size={13} /></a>}{grouped && <Button variant="ghost" disabled={index === videos.length - 1} onClick={() => go(videos[index + 1].id)}>다음 차시<ChevronRight size={16} /></Button>}</div>
        <section className={styles.materials} aria-label="영상 학습 자료">
          <div className={styles.tabs} role="tablist" aria-label="학습 자료 선택">{[['study', '학습노트'], ['chapters', '주요 구간'], ['transcript', '자막'], ['memo', '내 메모']].map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} id={`academy-tab-${id}`} aria-controls="academy-material" onKeyDown={e => { const ids = ['study', 'chapters', 'transcript', 'memo']; const position = ids.indexOf(id); const next = e.key === 'ArrowRight' ? ids[(position + 1) % ids.length] : e.key === 'ArrowLeft' ? ids[(position + ids.length - 1) % ids.length] : e.key === 'Home' ? ids[0] : e.key === 'End' ? ids[ids.length - 1] : null; if (next) { e.preventDefault(); setTab(next); document.getElementById(`academy-tab-${next}`)?.focus(); } }} tabIndex={tab === id ? 0 : -1} onClick={() => { setTab(id); setFeedback(''); }}>{label}</button>)}</div>
          <div id="academy-material" role="tabpanel" aria-labelledby={`academy-tab-${tab}`} className={styles.materialBody}>
            {tab === 'memo' ? <><div className={styles.noteHeading}><h3>내가 배운 것, 다음에 만들 것.</h3><span>{storageError ? '저장 불가' : '이 브라우저에 자동 저장'}</span></div><textarea aria-label="내 학습 메모" placeholder="직접 해본 내용, 기억할 프롬프트, 다음 아이디어를 남겨보세요." maxLength={20000} value={progress.notes[lesson.id] ?? ''} onChange={e => save({ ...progress, notes: { ...progress.notes, [lesson.id]: e.target.value } })} /></> : <>
              {course.isExample && <p className={styles.small}>구성 예시 · 실제 영상의 분석 결과가 아닙니다.</p>}
              {analysis?.status === 'failed' && <p role="status" className={styles.notice}>{analysis.transcript ? '영상 자막은 저장되어 자막 탭에서 볼 수 있어요. 학습노트 생성은 아직 완료되지 않았어요.' : '자막·학습노트를 가져오지 못했어요. 관리자에게 다시 생성을 요청해주세요.'}</p>}
              {analysis?.qualityWarning && <p className={styles.notice}>{analysis.qualityWarning}</p>}
              {tab === 'study' && <>{analysis?.status === 'done' && analysis.summary && <div className={styles.summary}><span className={styles.eyebrow}>IN A NUTSHELL</span><h3>이번 영상, 한눈에.</h3><p>{analysis.summary}</p>{analysis.keywords?.length > 0 && <div className={styles.keywords}>{analysis.keywords.map((word, i) => <span key={`${word}-${i}`}>{word}</span>)}</div>}</div>}{notes ? <div className={styles.markdown}><ReactMarkdown>{notes}</ReactMarkdown></div> : <div className={styles.noteEmpty}><BookOpen /><h3>{analysis?.status === 'failed' ? '학습노트를 준비하지 못했어요.' : analysis?.status === 'running' ? '학습노트를 만들고 있어요.' : '학습노트를 준비하고 있어요.'}</h3><p>영상은 먼저 시청할 수 있어요. 자막과 학습노트가 등록되면 여기에 표시됩니다.</p></div>}</>}
              {tab === 'transcript' && (analysis?.transcript ? <p className={styles.transcript}>{analysis.transcript}</p> : <div className={styles.noteEmpty}><h3>{course.isExample ? '영상의 자막이 이곳에 표시돼요.' : '아직 가져온 자막이 없어요.'}</h3><p>자막이 없는 영상은 영상 시청과 내 메모를 이용해주세요.</p></div>)}
              {tab === 'chapters' && (analysis?.status === 'done' && analysis.chapters.length ? <div className={styles.chapters}>{analysis.chapters.map((chapter, i) => <div key={i}><button disabled={timestampSeconds(chapter.timestamp) === null} onClick={() => { setStartAt(timestampSeconds(chapter.timestamp) ?? 0); setSeekVersion(n => n + 1); document.getElementById('academy-player-anchor')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); }}><Play size={13} />{chapter.timestamp || '시간 없음'}</button><div><h3>{chapter.title}</h3><p>{chapter.summary}</p></div></div>)}</div> : <div className={styles.noteEmpty}><ListVideo /><h3>{course.isExample ? '주요 구간을 눌러 바로 복습하기.' : '아직 정리된 주요 구간이 없어요.'}</h3><p>자막에서 정리한 시간과 주제가 표시되고, 시간을 누르면 해당 장면으로 이동해요.</p></div>)}
              {!!text && (tab === 'study' || tab === 'transcript') && <div className={styles.noteActions}><Button size="sm" variant="outline" onClick={() => void copyNotes()}><Copy size={14} />내용 복사</Button><Button size="sm" variant="ghost" onClick={downloadNotes}><Download size={14} />텍스트 저장</Button><span role="status">{feedback}</span></div>}
            </>}
          </div>
        </section>
      </div>
      {grouped && <aside className={styles.curriculum} aria-label="강의 커리큘럼"><div className={styles.curriculumTop}><span className={styles.eyebrow}>YOUR LEARNING PATH</span><h2>강의 커리큘럼 <span>{videos.length}</span></h2><div className={styles.progressLabel}><span>{progress.completed.length} / {videos.length} 차시 완료</span><strong>{percent}%</strong></div><progress aria-label="강의 학습 진도" value={progress.completed.length} max={videos.length} /><p>{storageError ? '브라우저 저장 공간을 사용할 수 없어요. 진도와 메모는 페이지를 벗어나면 사라질 수 있어요.' : '진도와 메모는 이 브라우저에 저장돼요.'}</p></div><ol>{videos.map((v, i) => <li key={v.id}><button aria-current={lesson.id === v.id ? 'step' : undefined} onClick={() => go(v.id)}><span className={styles.lessonNumber}>{progress.completed.includes(v.id) ? <Check size={16} /> : String(i + 1).padStart(2, '0')}</span><span><strong>{v.title}</strong><small>{lesson.id === v.id ? '지금 학습 중' : progress.completed.includes(v.id) ? '학습 완료' : v.analysis?.status === 'done' ? '영상 · 학습노트' : '영상 강의'}</small></span>{lesson.id === v.id && <Play size={13} fill="currentColor" />}</button></li>)}</ol>{percent === 100 && <p className={styles.finished}><CheckCircle2 size={17} />모든 차시를 완료했어요.</p>}<div className={styles.curriculumFoot}><BookOpen size={20} /><p>배운 것을 직접 만들어보세요.<br />작은 실험이, 나의 다음 작품으로.</p></div></aside>}
    </div>}
  </>;
}
