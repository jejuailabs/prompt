/* Standalone design study. Sample content; no production writes or generation calls. */
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const icons = {
  play: '<path d="m8 5 11 7-11 7z" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  left: '<path d="m14 5-7 7 7 7"/>',
  right: '<path d="m10 5 7 7-7 7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  heart: '<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-9a5.2 5.2 0 0 0 0-7.4z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
};
const icon = (name) => `<svg aria-hidden="true" viewBox="0 0 24 24">${icons[name] || icons.arrow}</svg>`;
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The poster homepage shares the existing app's cookie-based account session.
async function refreshHeaderAccount() {
  const target = $('#header-auth');
  if (!target) return;
  try {
    const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    target.innerHTML = result.ok && result.data
      ? '<a class="auth-signup" href="/app#my-projects">내 계정</a>'
      : '<a class="auth-login" href="/app?auth=login#ai-tools">로그인</a><a class="auth-signup" href="/app?auth=signup#ai-tools">회원가입</a>';
  } catch { /* Keep the visible account links when the session request fails. */ }
}
window.addEventListener('pageshow', refreshHeaderAccount);
const seed = '/uploads/seed/';
const works = [
  {id:'midnight',title:'도시가 잠든 사이',en:'AFTER\nMIDNIGHT',kind:'영상',category:'시네마틱',image:'/design/streaming-v1/assets/midnight-station.png',by:'morrow',tag:'CINEMATIC FILM',line:'마지막 열차가 떠난 뒤, 비로소 시작되는 이야기.',description:'비가 내리는 도시, 마지막 열차를 기다리는 한 사람. 하나의 프롬프트에서 시작된 짧은 영화의 첫 장면.',prompt:'A cinematic wide shot of a solitary woman in a coral red coat on a rain-slick elevated train platform at blue hour. Warm amber train lights, a midnight-blue city skyline, atmospheric mist, 35mm anamorphic photography, understated film grain.'},
  {id:'garden',title:'유리 속의 작은 숲',en:'A LITTLE\nWORLD',kind:'이미지',category:'제품 · 오브제',image:'/design/streaming-v1/assets/glass-garden.png',by:'sora',tag:'OBJECT STUDY',line:'손에 잡힐 듯한, 아직 존재하지 않는 세계.',description:'투명한 유리 안에 숲과 폭포를 담았습니다. 재질과 빛을 바꿔가며 발견한 작은 세계를 나눕니다.',prompt:'An exquisite editorial photograph of a miniature lush forest and a cascading waterfall enclosed inside a sculpted transparent glass pear, on an ivory limestone plinth. Natural afternoon sunlight, delicate caustics, rich terracotta background, physically realistic refraction, fine water droplets, poetic gallery photography. No text, no logos.'},
  {id:'space',title:'스페이스 레이더',en:'SPACE\nRAIDER',kind:'게임',category:'아케이드',image:seed+'space-cover-v3.png',by:'pixelwave',tag:'PLAY IN YOUR BROWSER',line:'달빛 너머, 나만의 작은 우주.',game:'/games/space-shooter.html',description:'방향키로 움직이고 스페이스로 발사하세요. 한 판의 짧은 모험을 브라우저에서 바로 시작할 수 있어요.'},
  {id:'neon',title:'네온 너머의 얼굴',en:'NEON\nDIARY',kind:'이미지',category:'인물',image:seed+'thumb-cyberpunk.png',by:'yoon',tag:'PORTRAIT SERIES',line:'빛이 지나간 자리에 남은 표정.',prompt:'Editorial portrait photography in a rainy neon-lit street, black bob haircut, transparent glasses, cyan and muted pink reflections, 85mm lens, shallow depth of field, natural skin texture, cinematic lighting.'},
  {id:'islands',title:'이름 없는 섬으로',en:'SOMEWHERE\nELSE',kind:'영상',category:'판타지',image:seed+'thumb-fantasy.png',by:'slowframe',tag:'WORLD BUILDING',line:'지도에는 없는 곳, 상상에는 있는 곳.',prompt:'An expansive fantasy landscape of floating forest islands, delicate waterfalls falling into an azure ocean of clouds, cinematic golden hour light, painterly environmental storytelling, highly detailed natural geology.'},
  {id:'flappy',title:'플래피 네온',en:'FLAPPY\nNEON',kind:'게임',category:'아케이드',image:seed+'flappy-cover-v4.png',by:'minwoo',tag:'ONE MORE TRY',line:'한 번만 더. 이번엔 정말 마지막.',game:'/games/flappy.html',description:'화면을 누르거나 스페이스를 눌러 날아오르세요. 파이프 사이를 지나며 기록을 높이는 게임입니다.'},
  {id:'castle',title:'꿈을 닮은 성',en:'SOFT\nKINGDOM',kind:'이미지',category:'3D · 일러스트',image:seed+'thumb-isometric.png',by:'miso',tag:'3D ILLUSTRATION',line:'말랑한 색으로 지은 작은 왕국.',prompt:'An isometric pastel pink miniature castle, rounded clay trees, playful soft forms, pale lilac background, ambient occlusion, soft studio lighting, beautiful tactile 3D render, no text.'},
  {id:'sneaker',title:'빛 위를 걷다',en:'OFF THE\nGROUND',kind:'이미지',category:'제품 · 오브제',image:seed+'thumb-sneaker.png',by:'studio zero',tag:'PRODUCT EXPERIMENT',line:'한 켤레의 신발, 다른 중력.',prompt:'A black sculptural running shoe suspended above a reflective surface, deep purple studio lighting, precise material detail, minimal luxury product photography, dramatic rim lighting.'},
  {id:'city',title:'아주 작은 도시',en:'TINY\nCITY',kind:'이미지',category:'3D · 일러스트',image:seed+'thumb-city-sim.png',by:'june',tag:'WORLD BUILDING',line:'창문 하나에도 이야기가 있는 곳.',prompt:'A beautifully detailed isometric miniature city, warmly lit windows, compact streets and trees, handcrafted diorama aesthetic, cinematic dusk light, intricate architectural details.'},
  {id:'tetris',title:'테트리스',en:'FALLING\nBLOCKS',kind:'게임',category:'퍼즐',image:'/games/thumbs/tetris.png',by:'PLAYLAB',tag:'QUICK PLAY',line:'익숙한 블록, 새로운 최고 기록.',game:'/games/tetris.html',description:'방향키로 블록을 옮기고 회전해서 가로줄을 채워보세요.'},
  {id:'2048',title:'2048',en:'JUST\nONE MORE',kind:'게임',category:'퍼즐',image:'/games/thumbs/puzzle2048.png',by:'PLAYLAB',tag:'PUZZLE BREAK',line:'같은 숫자가 만나면, 다음 가능성.',game:'/games/puzzle2048.html',description:'방향키 또는 화면 조작으로 같은 숫자의 타일을 합쳐보세요.'},
  {id:'snake',title:'스네이크',en:'KEEP\nGROWING',kind:'게임',category:'아케이드',image:'/games/thumbs/snake.png',by:'PLAYLAB',tag:'ARCADE CLASSIC',line:'조금씩 길어지는 작은 도전.',game:'/games/snake.html',description:'방향키로 움직이며 먹이를 모으세요. 벽과 자신의 몸을 피해보세요.'},
  {id:'rain-film',title:'비 오는 밤의 색',en:'COLOURS\nOF RAIN',kind:'영상',category:'시네마틱',image:seed+'thumb-cyberpunk.png',by:'yoon',tag:'VISUAL POEM',line:'도시의 색을 따라 걷는 짧은 여정.',description:'네온 불빛과 빗방울을 모티브로 한 영상 작품의 화면 구성 예시입니다.',prompt:'Cinematic close-up portrait in a rainy neon city. A slow gentle camera drift, cyan and pink reflections moving across transparent glasses, shallow depth of field, restrained visual poetry.'},
  {id:'floating-film',title:'부유하는 것들',en:'LIGHT\nMOTION',kind:'영상',category:'시네마틱',image:seed+'thumb-sneaker.png',by:'studio zero',tag:'MOTION STUDY',line:'중력을 잠시 잊어버린 물건들.',description:'제품을 중심으로 빛과 움직임을 실험하는 모션 필름 구성 예시입니다.',prompt:'A black sculptural sneaker suspended in a purple studio, slow graceful rotation, soft shifting reflections, precise texture, premium product motion film.'},
  {id:'kingdom-film',title:'잠든 왕국의 아침',en:'SOFT\nMORNING',kind:'영상',category:'판타지',image:seed+'thumb-isometric.png',by:'miso',tag:'ANIMATED WORLD',line:'작은 세계에도 아침은 찾아오니까.',description:'파스텔 미니어처 세계를 배경으로 한 애니메이션 영상관 구성 예시입니다.',prompt:'A miniature pastel castle slowly awakening in soft morning light. Gentle camera movement, rounded clay trees, subtle drifting clouds, poetic stop-motion atmosphere.'},
];
const work = id => works.find(w => w.id === id) || works[1];
const navPages = ['home','prompts','films','games','detail'];
let page = 'home', activeFilter = '전체', activeSlide = 0, toastTimer;
let saved = new Set();
try { saved = new Set(JSON.parse(localStorage.getItem('playlab-streaming-study-saved') || '[]').filter(id => works.some(w => w.id === id))); } catch {}
function saveButton(w, cls = 'card-save') {return `<button class="${cls} ${saved.has(w.id)?'is-saved':''}" data-save="${w.id}" aria-label="${esc(w.title)} ${saved.has(w.id)?'보관 취소':'보관하기'}" aria-pressed="${saved.has(w.id)}">${icon(saved.has(w.id)?'check':'plus')}${cls.includes('btn')?`<span>${saved.has(w.id)?'보관했어요':'보관하기'}</span>`:''}</button>`;}
function card(w, poster = false) {
  return `<article class="work-card ${poster?'poster':''}"><a href="#detail?work=${w.id}" class="card-art" aria-label="${esc(w.title)} 상세 보기"><img src="${w.image}" alt="${esc(w.title)} 작품 포스터" loading="lazy"/><span class="card-label">${poster?'P / '+w.tag:esc(w.kind)}</span>${poster?`<div class="poster-words"><small>${w.tag}</small><strong>${w.en}</strong><i>AN IDEA BY ${w.by.toUpperCase()}</i></div>`:w.kind==='영상'?`<span class="card-play">${icon('play')}</span><span class="film-runtime">콘셉트 필름</span>`:''}</a>${saveButton(w)}${w.game?`<button class="game-launch" data-play="${w.id}" aria-label="${w.title} 바로 플레이">${icon('play')}</button>`:''}<div class="card-info"><a class="card-title" href="#detail?work=${w.id}">${esc(w.title)}</a><p class="card-caption"><span>by ${esc(w.by)}</span><span class="card-type">${esc(w.category)}</span></p></div></article>`;
}
let shelfNumber = 0;
function shelf(title, sub, items, options = {}) {
  const id = `rail-${++shelfNumber}`;
  return `<section class="shelf ${options.poster?'compact-shelf':''} ${options.games?'game-rail':''}"><div class="shelf-head"><div class="shelf-heading"><h2>${title}</h2><span>${sub}</span></div><div class="shelf-controls">${options.more?`<a href="#${options.more}">모두 보기 ${icon('right')}</a>`:''}<button class="icon-button" data-scroll="${id}" data-direction="-1" aria-label="${title} 이전 작품">${icon('left')}</button><button class="icon-button" data-scroll="${id}" data-direction="1" aria-label="${title} 다음 작품">${icon('right')}</button></div></div><div class="rail" id="${id}">${items.map(w=>card(w,options.poster)).join('')}</div></section>`;
}
function filters(labels, current='전체') {return `<div class="browse-top" aria-label="작품 분류">${labels.map(label=>`<button class="filter-chip ${label===current?'active':''}" data-filter="${label}" aria-pressed="${label===current}">${label}</button>`).join('')}<span class="quiet-label">A FEW GOOD THINGS TO GET LOST IN.</span></div>`;}
function hero(w, type='home') {
  const game=type==='games', film=type==='films';
  return `<section class="hero"><img class="hero-image" src="${w.image}" alt="${esc(w.title)} 대표 장면" fetchpriority="high"/><div class="hero-copy"><div class="eyebrow"><span class="small-mark">P</span> ${game?'PLAYLAB ARCADE':film?'PLAYLAB CINEMA':'PLAYLAB SELECTED'} <span class="editorial-tag">${game?'설치 없이 바로 플레이':film?'SHORT FILM CONCEPT':'오늘의 발견'}</span></div><h1>${game?'SPACE<br><span>RAIDER.</span>':w.id==='garden'?'유리 속의<br><span class="accent">작은 숲.</span>':'도시가<br>잠든 사이<span class="accent">.</span>'}</h1><div class="hero-meta"><strong>${game?'브라우저 게임':film?'시네마틱 · 단편':'하나의 프롬프트로 시작된 세계'}</strong><span>${game?'1인 플레이':'by '+w.by}</span><span>${game?'PC · 키보드':'2026'}</span></div><p class="hero-description">${esc(game?'달빛 아래 펼쳐지는 작은 우주. 누군가 만든 상상 속으로 들어가, 오늘의 최고 기록에 도전해보세요.':w.description)}</p><div class="hero-actions">${game?`<button class="btn btn-primary" data-play="${w.id}">${icon('play')} 바로 플레이</button>`:film?`<button class="btn btn-primary" data-film="${w.id}">${icon('play')} 필름 미리보기</button>`:`<a class="btn btn-primary" href="#detail?work=${w.id}">${icon(w.kind==='영상'?'play':'arrow')} 작품 살펴보기</a>`}${saveButton(w,'btn btn-secondary')}</div></div>${film?'<span class="film-feature-label">THE FEATURE / 001</span>':''}<div class="hero-bottom"><div class="hero-caption">${game?'SMALL GAMES. GREAT ESCAPES.':film?'A FRAME IS JUST THE BEGINNING.':'보고, 만들고, 같이 놀자.'}</div>${film?'<span class="video-notice">영상 페이지 구성 예시 · 포스터 미리보기</span>':game?'<a class="text-link" href="#detail?work=space">이 게임의 이야기 '+icon('arrow')+'</a>':`<div class="hero-pagination" aria-label="추천 작품 선택"><button data-slide="0" class="${activeSlide===0?'active':''}" aria-label="추천 작품 1: 도시가 잠든 사이"></button><button data-slide="1" class="${activeSlide===1?'active':''}" aria-label="추천 작품 2: 유리 속의 작은 숲"></button><span><b>0${activeSlide+1}</b> / 02</span></div>`}</div></section>`;
}
function home() {
  const ordered=['garden','space','neon','islands','flappy','castle','sneaker'].map(work);
  return hero(work(activeSlide?'garden':'midnight'))+filters(['전체','이미지','영상','게임'],activeFilter)+shelf(activeFilter==='전체'?'지금, 눈여겨볼 작품들':`${activeFilter}, 새로운 발견`,'작은 실험부터 완성된 작품까지',activeFilter==='전체'?ordered:works.filter(w=>w.kind===activeFilter),{more:activeFilter==='게임'?'games':activeFilter==='영상'?'films':'prompts'})+shelf('한 장에서 시작된 아이디어','마음에 드는 결과물, 프롬프트까지 가져가세요',['neon','garden','castle','sneaker','city','islands','midnight'].map(work),{poster:true,more:'prompts'})+`<div class="editorial-divider"><div><span>THE PLAYLAB WAY &nbsp; / &nbsp;</span> <b>좋은 작품은, 다음 작품의 시작이니까.</b></div><a href="#prompts">프롬프트 둘러보기 ↗</a></div>`+shelf('보기만 하기엔 아까운 게임','클릭 한 번이면 플레이',['flappy','space','tetris','2048'].map(work),{games:true,more:'games'});
}
function prompts() {
  const items=works.filter(w=>w.kind==='이미지'&&(activeFilter==='전체'||w.category===activeFilter));
  return `<section class="catalog-intro"><div><div class="eyebrow">THE PROMPT COLLECTION</div><h1>마음에 드는 장면, 내 것으로<span class="count">P / 02</span></h1></div><p>결과물부터 둘러보세요.<br>그 장면을 만든 프롬프트가 함께 있어요.</p></section><section class="collection-feature"><img src="/design/streaming-v1/assets/glass-garden.png" alt="유리 속의 작은 숲"/><div class="feature-copy"><div class="eyebrow">CURATED COLLECTION / 001</div><h2>작은 물건 속,<br>커다란 상상.</h2><p>재질과 빛으로 만들어낸<br>일상 밖의 오브제 컬렉션.</p><a class="text-link" href="#detail?work=garden">프롬프트 열어보기 ${icon('arrow')}</a></div></section>${filters(['전체','인물','제품 · 오브제','3D · 일러스트'],activeFilter)}<div class="catalog-grid">${items.map(w=>card(w,true)).join('')}</div><section class="collection-note"><span class="note-mark">“</span><p>똑같이 만들어도 좋고, 전혀 달라져도 좋아요.<span>한 줄의 프롬프트를 빌려, 나만의 다음 장면을 만들어보세요.</span></p><a class="text-link" href="#detail?work=garden">프롬프트 사용해보기 ${icon('arrow')}</a></section>`;
}
function films() {
  const items=works.filter(w=>w.kind==='영상'&&(activeFilter==='전체'||w.category===activeFilter));
  return `<div class="cinema"><section class="catalog-intro"><div><div class="eyebrow">THE SCREENING ROOM</div><h1>짧은 순간, 긴 여운.</h1></div><p>누군가의 상상에 잠깐 머물러보세요.<br>만드는 과정까지 함께 나누는 영상관.</p></section>${hero(work('midnight'),'films')}${filters(['전체','시네마틱','판타지'],activeFilter)}${shelf('다음으로 만나볼 이야기','영상 작품과 제작 프롬프트',items)}<div class="editorial-divider"><div><span>BEHIND THE SCENES &nbsp; / &nbsp;</span><b>어떻게 만든 장면인지 궁금하다면.</b></div><a href="#detail?work=midnight">제작 이야기 보기 ↗</a></div>${shelf('영상의 시작이 된 한 장','이미지에서 움직이는 이야기로',['neon','islands','garden','city','sneaker'].map(work),{poster:true,more:'prompts'})}</div>`;
}
function games() {
  const all=works.filter(w=>w.kind==='게임');
  return `<div class="arcade">${hero(work('space'),'games')}<div class="game-tagline"><span class="eyebrow">설치도, 다운로드도 없이. 그냥 플레이.</span><p>직접 만든 게임이 모이는 작은 아케이드</p></div>${filters(['전체','아케이드','퍼즐'],activeFilter)}${shelf('오늘은 이 게임 한 판','바로 실행되는 브라우저 게임',all.filter(w=>activeFilter==='전체'||w.category===activeFilter),{games:true})}<section class="sponsor-strip"><span class="ad-label">AD</span><div><p>플레이 사이, 잠깐의 쉬는 시간.</p><small>광고 배치 예시 · 실제 광고는 송출하지 않습니다.</small></div><span class="text-link">COMMUNITY PARTNER ↗</span></section>${shelf('짧게 즐기는 클래식','단순한 규칙, 멈추기 어려운 재미',['tetris','2048','snake','flappy'].map(work),{games:true})}</div>`;
}
function detail() {
  const id=new URLSearchParams(location.hash.split('?')[1]||'').get('work')||'garden';
  const w=work(id);
  return `<div class="detail-page"><div class="breadcrumbs"><a href="#${w.game?'games':w.kind==='영상'?'films':'prompts'}">${w.game?'게임':w.kind==='영상'?'영상':'프롬프트'}</a><span>/</span><span>${esc(w.category)}</span><span>/</span><span>${esc(w.title)}</span></div><div class="detail-layout"><div class="detail-art"><img src="${w.image}" alt="${esc(w.title)} 작품 원본"/><div class="art-credit"><span>P / ${w.tag}</span><span>AN IDEA BY ${w.by.toUpperCase()}</span></div></div><section class="detail-info"><div class="eyebrow">${w.tag} <span>·</span> DESIGN SAMPLE</div><h1>${esc(w.title)}</h1><p class="detail-subtitle">${esc(w.description||w.line)}</p><div class="creator-row"><img class="avatar" src="${w.image}" alt=""/><div><strong>${esc(w.by)}</strong><small>PLAYLAB 크리에이터 · 구성 예시</small></div><button data-creator="${w.id}">작가의 작품 ↗</button></div><div class="detail-stats"><span>${icon('bookmark')}<b>보관</b> 내 컬렉션에 담기</span><span><b>${esc(w.kind)}</b> ${esc(w.category)}</span></div><div class="detail-tabs" role="tablist"><button class="active" id="tab-prompt" role="tab" aria-selected="true" aria-controls="detail-tab-panel" data-tab="prompt">${w.game?'플레이':'프롬프트'}</button><button id="tab-process" role="tab" aria-selected="false" aria-controls="detail-tab-panel" data-tab="process" tabindex="-1">제작 노트</button><button id="tab-info" role="tab" aria-selected="false" aria-controls="detail-tab-panel" data-tab="info" tabindex="-1">작품 정보</button></div><div id="detail-tab-panel" class="detail-tab-panel" role="tabpanel" aria-labelledby="tab-prompt" data-work="${w.id}">${detailTab(w,'prompt')}</div></section></div></div><section class="discussion"><div><h2>이 장면에서 시작되는 대화</h2><p>결과만 나누는 대신, 어떻게 만들었는지도 함께.<br>영감이 된 부분과 궁금한 점을 나누는 공간입니다.</p></div><div class="comment"><img class="avatar" src="${seed}thumb-isometric.png" alt=""/><div><strong>커뮤니티 대화 예시</strong><small>샘플</small><p>빛의 방향만 바꿔도 완전히 다른 분위기가 나올 것 같아요.<br>제 프롬프트에도 이 질감을 한번 적용해보고 싶네요.</p></div></div></section>${shelf('이런 작품도 좋아할 거예요','영감은 이어지니까',works.filter(x=>x.kind===w.kind&&x.id!==w.id).concat(works.filter(x=>x.kind==='이미지'&&x.id!==w.id)).filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,5),{more:w.game?'games':'prompts'})}`;
}
function detailTab(w, tab) {
  if(tab==='process') return `<ol class="process-list"><li><b>01</b><div><strong>장면을 떠올리기</strong>${esc(w.line)}</div></li><li><b>02</b><div><strong>빛과 분위기 실험하기</strong>구도와 색을 바꾸며 가장 마음에 드는 장면을 찾았어요.</div></li><li><b>03</b><div><strong>다음 실험으로 이어가기</strong>제작 노트와 변형 결과물을 함께 보여주는 영역입니다. 현재 내용은 화면 구성 예시예요.</div></li></ol>`;
  if(tab==='info') return `<ol class="process-list"><li><b>i</b><div><strong>작품과 크리에이터 정보</strong>화면에 표시된 작품 설명과 작가명은 디자인 시안용 예시입니다. 이미지는 샘플 자산입니다.</div></li><li><b>↗</b><div><strong>${w.game?'실행 가능한 게임':'제작 도구와 원본 정보'}</strong>${w.game?'프로젝트에 있는 실제 HTML 게임을 실행합니다.':'실제 서비스에서는 제작 모델, 원본 링크, 프롬프트 사용 조건을 보여줍니다.'}</div></li></ol>`;
  return `<div class="prompt-box"><div class="prompt-box-label"><span>${w.game?'HOW TO PLAY':'THE STARTING POINT'}</span><span>${w.game?'BROWSER GAME':'ENGLISH PROMPT'}</span></div><p>${esc(w.game?w.description:w.prompt||'Explore the light, texture, and composition of this world.')}</p><div class="prompt-parameters"><span>${w.game?'설치 필요 없음':'빛 · 재질 · 구도'}</span><span>${w.game?'키보드 조작':'결과물과 프롬프트 함께 보기'}</span></div></div><div class="prompt-actions">${w.game?`<button class="btn btn-accent" data-play="${w.id}">${icon('play')} 지금 플레이</button>`:`<button class="btn btn-accent" data-copy="${w.id}">${icon('copy')} 프롬프트 복사</button>`}${saveButton(w,'btn btn-secondary')}</div><p class="usage-note">${w.game?'게임이 별도 플레이어에서 열립니다. Esc 또는 닫기로 돌아올 수 있어요.':'복사한 프롬프트를 내 도구에 붙여넣고, 다음 장면을 만들어보세요.'}</p>`;
}
function render() {
  const route=(location.hash.slice(1).split('?')[0]||'home');
  if(route==='content') { $('#content').focus(); return; }
  if (!navPages.includes(route)) { location.replace('/app' + location.hash); return; }
  page=route;shelfNumber=0;
  $('#content').innerHTML=({home,prompts,films,games,detail})[page]();
  $$('[data-page]').forEach(a=>{const active=a.dataset.page===page;a.classList.toggle('active',active);if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const labels={home:'홈',prompts:'프롬프트',films:'영상',games:'게임',detail:'작품 상세'};
  document.title=`${labels[page]} — PLAYLAB 디자인 시안`;
}
function toast(message) {const el=$('#toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),2700);}
function modal(html, game=false) {$('#modal-content').innerHTML=html;$('#modal').classList.toggle('game-modal',game);$('#modal').showModal();document.body.style.overflow='hidden';}
function closeModal() {$('#modal').close();}
$('#modal').addEventListener('close',()=>{$('#modal-content').innerHTML='';document.body.style.overflow='';});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal'))closeModal();});
function toggleSave(id) {
  saved.has(id)?saved.delete(id):saved.add(id);
  try{localStorage.setItem('playlab-streaming-study-saved',JSON.stringify([...saved]));}catch{}
  $$(`[data-save="${id}"]`).forEach(button=>{button.classList.toggle('is-saved',saved.has(id));button.setAttribute('aria-pressed',String(saved.has(id)));button.setAttribute('aria-label',work(id).title+' '+(saved.has(id)?'보관 취소':'보관하기'));button.innerHTML=icon(saved.has(id)?'check':'plus')+(button.classList.contains('btn')?`<span>${saved.has(id)?'보관했어요':'보관하기'}</span>`:'');});
  toast(saved.has(id)?'내 보관함에 담았어요.':'보관함에서 꺼냈어요.');
}
document.addEventListener('click',async e=>{
  const el=e.target.closest('button,a');if(!el)return;
  if(el.dataset.save){toggleSave(el.dataset.save);return;}
  if(el.dataset.scroll){const rail=$('#'+el.dataset.scroll);rail.scrollBy({left:rail.clientWidth*.75*Number(el.dataset.direction),behavior:'smooth'});return;}
  if(el.dataset.filter){activeFilter=el.dataset.filter;const top=window.scrollY;render();window.scrollTo({top,behavior:'instant'});return;}
  if(el.dataset.slide!==undefined){activeSlide=Number(el.dataset.slide);render();return;}
  if(el.dataset.tab){const current=el.dataset.tab;$$('[data-tab]').forEach(b=>{const active=b===el;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;});const panel=$('#detail-tab-panel');panel.setAttribute('aria-labelledby',el.id);panel.innerHTML=detailTab(work(panel.dataset.work),current);return;}
  if(el.dataset.copy){try{await navigator.clipboard.writeText(work(el.dataset.copy).prompt);toast('프롬프트를 복사했어요.');}catch{toast('브라우저 복사 권한을 확인해주세요.');}return;}
  if(el.dataset.play){const w=work(el.dataset.play);modal(`<div class="game-modal-head"><div><h2 id="modal-title">${esc(w.title)}</h2><p>${esc(w.description)}</p></div><span class="game-controls">ESC · 닫기</span></div><iframe class="game-frame" title="${esc(w.title)} 게임" src="${w.game}" sandbox="allow-scripts" allow="fullscreen" allowfullscreen></iframe><div class="game-modal-foot">프로젝트의 실제 게임입니다. 게임 화면을 클릭하면 키보드로 조작할 수 있어요. 기기별 조작 지원은 게임마다 다를 수 있어요.</div>`,true);return;}
  if(el.dataset.film){const w=work(el.dataset.film);modal(`<img class="modal-poster" src="${w.image}" alt="${esc(w.title)} 장면"/><div class="modal-copy"><h2 id="modal-title">${esc(w.title)}</h2><p>영상관 디자인 시안입니다. 현재는 포스터와 작품 소개를 볼 수 있으며, 실제 영상 파일은 연결되어 있지 않습니다.</p><a class="btn btn-primary" href="#detail?work=${w.id}" data-action="close">제작 프롬프트 보기 ${icon('arrow')}</a></div>`);return;}
  if(el.dataset.creator){const w=work(el.dataset.creator);modal(`<div class="modal-gallery"><h2 id="modal-title">${esc(w.by)}의 작품</h2><div class="catalog-grid">${card(w,true)}</div></div>`);return;}
  if(el.dataset.action==='close'){closeModal();return;}
  if(el.dataset.action==='library'){modal(`<div class="modal-gallery"><h2 id="modal-title">내 보관함 <span class="count">${saved.size}</span></h2>${saved.size?`<div class="catalog-grid">${[...saved].map(id=>card(work(id),true)).join('')}</div>`:'<div class="empty-state"><strong>마음에 드는 장면을 모아두세요.</strong>포스터의 + 버튼을 누르면 여기에 담겨요.<br>이 브라우저에 저장되는 샘플 보관함입니다.</div>'}</div>`);return;}
  if(el.dataset.action==='search'){const inputMarkup=`<section class="search-wrap"><div class="eyebrow">FIND YOUR NEXT INSPIRATION</div><h1>어떤 장면을 찾고 있나요?</h1><label class="search-box">${icon('search')}<input id="search-input" type="search" placeholder="작품 이름, 장르, 크리에이터" aria-label="작품 이름, 장르, 크리에이터 검색"/></label><div class="catalog-grid search-grid" id="search-results">${works.map(w=>card(w,true)).join('')}</div></section>`;$('#content').innerHTML=inputMarkup;window.scrollTo({top:0,behavior:'instant'});$('#search-input').focus();return;}
  if(el.hash?.startsWith('#')&&$('#modal').open)closeModal();
  if(el.tagName==='A'&&el.hash===location.hash&&navPages.includes(el.hash.slice(1).split('?')[0])){activeFilter='전체';render();window.scrollTo({top:0,behavior:'instant'});}
});
document.addEventListener('input',e=>{if(e.target.id!=='search-input')return;const query=e.target.value.trim().toLowerCase();const result=works.filter(w=>[w.title,w.kind,w.category,w.by,w.en].join(' ').toLowerCase().includes(query));$('#search-results').innerHTML=result.length?result.map(w=>card(w,true)).join(''):'<div class="empty-state"><strong>아직 그 장면을 찾지 못했어요.</strong>다른 이름이나 장르로 찾아보세요.</div>';});
document.addEventListener('keydown',e=>{if(!e.target.matches('[role="tab"]'))return;if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=$$('[role="tab"]');let index=tabs.indexOf(e.target);index=e.key==='Home'?0:e.key==='End'?tabs.length-1:(index+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[index].click();tabs[index].focus();});
window.addEventListener('hashchange',()=>{activeFilter='전체';render();window.scrollTo({top:0,behavior:'instant'});});
render();
