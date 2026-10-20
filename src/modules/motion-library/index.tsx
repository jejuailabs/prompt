'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowUpRight, Play, Search } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { MOTION_CATEGORIES, MOTION_ITEMS, MOTION_SOURCE, filterMotionItems, type MotionItem } from './catalogue';
import { MotionCover } from './motion-cover';
import { CodeBlock } from './code-block';
import { webSceneById } from './no-remotion/scenes';
import { WebPlayer } from './no-remotion/player';
import styles from './motion.module.css';

const indexOf = (item: MotionItem) => MOTION_ITEMS.indexOf(item);
const WEB_ITEMS = MOTION_ITEMS.filter(item => webSceneById(item.id));
type Mode = 'remotion' | 'web';

function SourceNote() {
  return <p className={styles.sourceNote}>예제 코드 원본: <a href={MOTION_SOURCE.url} target="_blank" rel="noopener noreferrer">{MOTION_SOURCE.name}</a> 리모션 실습 갤러리. 코드는 원본 그대로이고, 이름·설명·커버는 PLAYLAB이 따로 만들었어요.</p>;
}

function SetupFiles() {
  return <section className={styles.setup}>
    <span className={styles.eyebrow}>FIRST TIME ONLY</span>
    <h2>처음 한 번만: 리모션 프로젝트에 파일 2개 만들기</h2>
    <p>리모션 프로젝트의 <code>src/Root.tsx</code>와 <code>src/font.ts</code>를 아래 코드로 바꿔 두세요. 그다음 예제 코드를 <code>src/Scene.tsx</code>에 붙여넣고 저장하면 미리보기에 영상이 나와요.</p>
    <div className={styles.setupGrid}>
      <CodeBlock src="/motion-library/setup/Root.tsx" fileName="Root.tsx" label="src/Root.tsx" />
      <CodeBlock src="/motion-library/setup/font.ts" fileName="font.ts" label="src/font.ts" />
    </div>
  </section>;
}

function WebRuntimeFile() {
  return <section className={styles.setup}>
    <span className={styles.eyebrow}>NO REMOTION RUNTIME</span>
    <h2>리모션 대신 쓰는 파일 1개: runtime.tsx</h2>
    <p>리모션을 설치하지 않고 React 프로젝트에서 그대로 돌리려면 이 파일을 장면 파일 옆에 <code>runtime.tsx</code>로 저장하고, 장면 파일의 <code>from &apos;../runtime&apos;</code>을 저장한 위치로 맞춰 주세요. 화면에 띄울 때는 <code>&lt;TimelineProvider frame={'{'}프레임{'}'} config={'{'}설정{'}'}&gt;</code>로 장면을 감싸면 돼요.</p>
    <CodeBlock src="/motion-library/web/runtime.tsx" fileName="runtime.tsx" label="runtime.tsx (Motion Lite)" />
  </section>;
}

export default function MotionLibraryView() {
  const navigate = useAppStore(s => s.navigate), params = useAppStore(s => s.params);
  const [category, setCategory] = useState(''), [query, setQuery] = useState('');
  const mode: Mode = params.mode === 'web' ? 'web' : 'remotion';
  const go = (next: { mode?: Mode; id?: string }) => navigate('motion-library', { ...((next.mode ?? mode) === 'web' ? { mode: 'web' } : {}), ...(next.id ? { id: next.id } : {}) });
  const pool = mode === 'web' ? WEB_ITEMS : MOTION_ITEMS;
  const selected = pool.find(item => item.id === params.id);
  const items = filterMotionItems(pool, category, query);
  const categories = MOTION_CATEGORIES.filter(name => pool.some(item => item.category === name));

  const tabs = <div className={styles.modeTabs} role="tablist" aria-label="모션 라이브러리 종류">
    <button role="tab" aria-selected={mode === 'remotion'} onClick={() => { setCategory(''); go({ mode: 'remotion' }); }}>Remotion 코드 <small>{MOTION_ITEMS.length}</small></button>
    <button role="tab" aria-selected={mode === 'web'} onClick={() => { setCategory(''); go({ mode: 'web' }); }}>No Remotion · 바로 영상 만들기 <small>{WEB_ITEMS.length}</small></button>
  </div>;

  if (selected && mode === 'web') {
    const scene = webSceneById(selected.id)!;
    return <div className={styles.page}>
      <button className={styles.back} onClick={() => go({})}><ArrowLeft size={16} />No Remotion 목록</button>
      <div className={styles.webDetail}>
        <WebPlayer key={selected.id} scene={scene} fileName={`motion-${selected.id}.mp4`} />
        <section className={styles.detailCopy}>
          <span className={styles.eyebrow}>NO REMOTION / {selected.category}</span>
          <h1>{selected.title}</h1>
          <p className={styles.titleEn}>{selected.titleEn}</p>
          <p className={styles.description}>{selected.description}</p>
          <dl>{[['재생', '브라우저에서 바로 (설치 없음)'], ['영상', `MP4 · ${scene.config.width}×${scene.config.height} · ${scene.config.fps}fps · ${(scene.config.durationInFrames / scene.config.fps).toFixed(0)}초`], ['원본 예제', `${selected.sourceTitle} (#${selected.id})`]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <p className={styles.webHint}>MP4 만들기는 프레임을 한 장씩 그려서 묶기 때문에 6초 영상 기준 1~2분 걸려요. 만드는 동안 이 탭을 열어 두세요. 최신 Chrome이나 Edge에서 가장 잘 돼요.</p>
          <button className={styles.textLink} onClick={() => go({ mode: 'remotion', id: selected.id })}>같은 예제의 Remotion 원본 코드 보기 →</button>
        </section>
      </div>
      <section className={styles.codeSection}>
        <span className={styles.eyebrow}>CODE</span>
        <h2>위 영상을 만드는 코드 (리모션 없이)</h2>
        <p className={styles.webHint}>원본 장면 코드에서 <code>import</code> 줄만 리모션 대신 runtime 파일을 쓰도록 바꿨어요. 나머지는 원본과 같아요.</p>
        <CodeBlock key={selected.id} src={`/motion-library/web/${selected.id}.tsx`} fileName="Scene.tsx" label="Scene.tsx (No Remotion)" />
        <SourceNote />
      </section>
      <WebRuntimeFile />
    </div>;
  }

  if (selected) return <div className={styles.page}>
    <button className={styles.back} onClick={() => go({})}><ArrowLeft size={16} />모션 라이브러리</button>
    <div className={styles.detail}>
      <div className={styles.detailCover}><MotionCover item={selected} index={indexOf(selected)} large /></div>
      <section className={styles.detailCopy}>
        <span className={styles.eyebrow}>MOTION LIBRARY / {selected.category}</span>
        <h1>{selected.title}</h1>
        <p className={styles.titleEn}>{selected.titleEn}</p>
        <p className={styles.description}>{selected.description}</p>
        <dl>{[['원본 예제', selected.sourceTitle], ['소스 묶음', selected.package], ['예제 번호', '#' + selected.id]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        <div className={styles.tags}>{selected.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
        <a className={styles.sourceLink} href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">원본 사이트에서 결과 영상 보기 <ArrowUpRight size={18} /></a>
        {webSceneById(selected.id) && <button className={styles.textLink} onClick={() => go({ mode: 'web', id: selected.id })}><Play size={13} /> 리모션 없이 바로 재생하고 MP4 만들기 →</button>}
      </section>
    </div>
    <section className={styles.codeSection}>
      <span className={styles.eyebrow}>CODE</span>
      <h2>{selected.codeLanguage === 'mjs' ? 'Node.js 스크립트로 저장해 실행하세요' : 'src/Scene.tsx에 붙여넣으세요'}</h2>
      <CodeBlock key={selected.id} src={selected.codeFile} fileName={selected.codeLanguage === 'mjs' ? `motion-${selected.id}.mjs` : 'Scene.tsx'} label={selected.codeLanguage === 'mjs' ? `motion-${selected.id}.mjs` : 'src/Scene.tsx'} />
      <SourceNote />
    </section>
    <SetupFiles />
  </div>;

  return <div className={styles.page}>
    <header className={styles.hero}>
      <div>
        <span className={styles.eyebrow}>{mode === 'web' ? 'PLAYLAB / NO REMOTION' : 'PLAYLAB / REMOTION MOTION REFERENCES'}</span>
        {mode === 'web'
          ? <><h1>설치 없이,<br /><em>바로 영상.</em></h1><p>리모션 없이 브라우저에서 바로 재생하고 MP4로 받는 모션그래픽이에요.<br />같은 장면 코드를 작은 runtime 파일 하나로 돌려요. 지금 {WEB_ITEMS.length}개, 계속 늘어나요.</p></>
          : <><h1>코드로 만드는<br /><em>모션그래픽.</em></h1><p>제품 광고, 캐릭터, 자막, 전환 효과까지 44가지 리모션 예제를 모았어요.<br />마음에 드는 장면을 고르고 코드를 복사해 이미지 주소와 글자만 바꿔 보세요.</p></>}
      </div>
      <div className={styles.heroMark} aria-hidden="true"><span>{pool.length}</span><small>{mode === 'web' ? 'PLAY · RECORD · MP4' : 'REMOTION EXAMPLES'}</small></div>
    </header>
    {tabs}
    {params.id && !selected && <p role="alert" className={styles.sourceNote}>이 예제를 찾을 수 없어요. 아래 목록에서 다시 골라 주세요.</p>}
    <div className={styles.collectionHead}>
      <div><span className={styles.eyebrow}>{mode === 'web' ? 'PLAY IN THE BROWSER' : 'THE MOTION SHELF'}</span><h2>{mode === 'web' ? '눌러서 재생하고, MP4로 받기' : '장면을 고르고, 바로 만들기'} <small>{pool.length}</small></h2></div>
      <label className={styles.search}><Search size={17} /><input value={query} onChange={e => setQuery(e.target.value)} aria-label="모션 예제 검색" placeholder="효과, 태그, 원본 제목 검색" /></label>
    </div>
    <div className={styles.filters} role="group" aria-label="모션 종류">
      <button aria-pressed={!category} onClick={() => setCategory('')}>전체 <small>{pool.length}</small></button>
      {categories.map(name => <button key={name} aria-pressed={category === name} onClick={() => setCategory(name)}>{name} <small>{pool.filter(item => item.category === name).length}</small></button>)}
    </div>
    <p className={styles.result} role="status">{items.length}개 예제</p>
    <div className={styles.grid}>{items.map(item => <article key={item.id} className={styles.card}>
      <button className={styles.coverButton} aria-label={item.title + ' 자세히 보기'} onClick={() => go({ id: item.id })}><MotionCover item={item} index={indexOf(item)} /></button>
      <div className={styles.cardInfo}>
        <span className={styles.category}>{item.category}{mode === 'remotion' && webSceneById(item.id) && <b className={styles.webBadge}>NO REMOTION</b>}</span>
        <h3><button onClick={() => go({ id: item.id })}>{item.title}</button></h3>
        <p>{item.description}</p>
      </div>
    </article>)}</div>
    {!items.length && <div className={styles.empty}><h3>검색 조건에 맞는 예제가 없어요.</h3><button onClick={() => { setCategory(''); setQuery(''); }}>전체 예제 보기</button></div>}
    {mode === 'web' ? <WebRuntimeFile /> : <SetupFiles />}
    <footer className={styles.foot}><SourceNote /><a href={MOTION_SOURCE.url} target="_blank" rel="noopener noreferrer">리모션 실습 갤러리 원본 <ArrowUpRight size={16} /></a></footer>
  </div>;
}
