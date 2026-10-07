// Public homepage. All artwork and destinations come from the existing public APIs.
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mediaUrl(value) {
  if (typeof value !== 'string' || /[\\\u0000-\u0020]/.test(value) || !/^(https?:\/\/|\/[^/])/.test(value)) return '';
  try { const url = new URL(value, 'https://playlab.invalid'); return ['http:', 'https:'].includes(url.protocol) ? value : ''; } catch { return ''; }
}
const labels = { image:'이미지', video:'영상', game:'게임', audio:'음악', '3d':'3D', app:'앱', landing_page:'웹사이트', prompt:'프롬프트' };
const movie = value => /\.(mp4|webm|mov)(?:[?#]|$)/i.test(value || '');
const nonImage = value => /\.(mp4|webm|mov|mp3|wav|ogg|glb|gltf|html)(?:[?#]|$)/i.test(value || '');

export function artifactWork(a) {
  if (!a?.id || a.status !== 'published' || a.visibility !== 'public') return null;
  const meta = a.metadata || {};
  const video = a.type === 'video' ? mediaUrl(meta.render?.videoUrl || meta.videoUrl || (movie(a.fileUrl) ? a.fileUrl : a.contentUrl)) : '';
  let image = mediaUrl(meta.previewUrl) || mediaUrl(meta.frames?.[0]) || (!nonImage(a.fileUrl) ? mediaUrl(a.fileUrl) : '');
  const gameSlug = a.type === 'game' && a.contentUrl?.match(/^\/games\/([a-z0-9-]+)\.html$/)?.[1];
  if (gameSlug && (!image || image.startsWith('/uploads/seed/thumb-'))) image = `/games/thumbs/${gameSlug}.png`;
  return { id:a.id, key:`artifact:${a.id}`, type:a.type, title:a.title || '제목 없는 작품', description:a.description || '', by:a.owner?.username || '크리에이터', image, video,
    href:`/app#project?id=${encodeURIComponent(a.id)}`, playHref:a.type === 'game' ? `/app#game-play?id=${encodeURIComponent(a.id)}` : '',
    promptHref:a.sourcePromptId ? `/app#prompt?id=${encodeURIComponent(a.sourcePromptId)}` : '', createdAt:a.createdAt || '', category:meta.categoryLabel || labels[a.type] || '작품' };
}
export function promptWork(p) {
  if (!p?.id || p.status !== 'active') return null;
  return { id:p.id, key:`prompt:${p.id}`, type:'prompt', title:p.title || '제목 없는 프롬프트', description:p.body || '', by:p.owner?.username || '크리에이터', image:mediaUrl(p.thumbnailUrl), video:'', href:`/app#prompt?id=${encodeURIComponent(p.id)}`, createdAt:p.createdAt || '', category:p.category || '프롬프트' };
}
const unique = rows => [...new Map(rows.filter(Boolean).map(row => [row.key, row])).values()];
const newest = rows => rows.sort((a,b) => b.createdAt.localeCompare(a.createdAt));

export function mountHomepage(root, { icon }) {
  const esc = escapeHtml;
  let artifacts = [], prompts = [], games = [], loading = true, busy = false, failed = [], filter = '전체', slide = 0, lastLoad = 0;
  const filters = ['전체','이미지','영상','게임','음악','3D','앱'];
  const all = () => newest(unique([...artifacts, ...games]));
  const kind = w => labels[w.type] || '작품';
  const fallback = w => `<span class="live-art-fallback" aria-hidden="true"><small>${esc(kind(w))}</small><strong>${esc(w.title.slice(0,80))}</strong><i>MADE IN PLAYLAB</i></span>`;
  function media(w, hero = false) {
    const picture = w.image ? `<img ${hero ? 'class="hero-image" fetchpriority="high"' : 'loading="lazy"'} src="${esc(w.image)}" alt="${esc(w.title)}"/>` : '';
    const video = w.video && !w.image ? `<video ${hero ? 'class="hero-image"' : ''} src="${esc(w.video)}" muted playsinline preload="metadata" aria-label="${esc(w.title)} 영상 미리보기"></video>` : '';
    return fallback(w) + (picture || video);
  }
  function card(w, poster = false) {
    return `<article class="work-card ${poster ? 'poster' : ''}" data-live-work="${esc(w.key)}"><a class="card-art" href="${esc(w.href)}" aria-label="${esc(w.title)} 상세 보기">${media(w)}<span class="card-label">${esc(kind(w))}</span>${w.video ? `<span class="card-play">${icon('play')}</span>` : ''}</a>${w.playHref ? `<a class="game-launch" href="${esc(w.playHref)}" aria-label="${esc(w.title)} 바로 플레이">${icon('play')}</a>` : ''}<div class="card-info"><a class="card-title" href="${esc(w.href)}">${esc(w.title)}</a><p class="card-caption"><span>by ${esc(w.by)}</span><span class="card-type">${esc(w.category)}</span></p>${w.promptHref ? `<a class="live-prompt-link" href="${esc(w.promptHref)}">원본 프롬프트 ↗</a>` : ''}</div></article>`;
  }
  function shelf(id, title, subtitle, rows, href, poster = false) {
    if (!rows.length) return '';
    return `<section class="shelf ${poster ? 'compact-shelf' : ''}"><div class="shelf-head"><div class="shelf-heading"><h2>${title}</h2><span>${subtitle}</span></div><div class="shelf-controls"><a href="${href}">모두 보기 ${icon('right')}</a><button class="icon-button" data-live-scroll="${id}" data-direction="-1" aria-label="${title} 이전 작품">${icon('left')}</button><button class="icon-button" data-live-scroll="${id}" data-direction="1" aria-label="${title} 다음 작품">${icon('right')}</button></div></div><div class="rail" id="${id}">${rows.slice(0,16).map(w=>card(w,poster)).join('')}</div></section>`;
  }
  function hero(rows) {
    if (!rows.length) return `<section class="live-welcome"><div class="eyebrow">MADE BY OUR COMMUNITY</div><h1>만들었으면,<br>같이 놀자.</h1><p>${loading ? '새로운 작품을 불러오고 있어요.' : failed.length ? '작품을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' : '첫 번째 공개 작품을 기다리고 있어요.'}</p><a class="btn btn-primary" href="/app#my-projects">내 작업 올리기 ${icon('arrow')}</a></section>`;
    slide = slide % rows.length;
    const w = rows[slide];
    return `<section class="hero live-hero">${media(w,true)}<div class="hero-copy"><div class="eyebrow"><span class="small-mark">P</span> PLAYLAB COMMUNITY <span class="editorial-tag">지금 올라온 작품</span></div><h1>${esc(w.title)}</h1><div class="hero-meta"><strong>${esc(kind(w))}</strong><span>by ${esc(w.by)}</span></div><p class="hero-description">${esc(w.description.slice(0,180))}</p><div class="hero-actions"><a class="btn btn-primary" href="${esc(w.playHref || w.href)}">${icon(w.playHref || w.video ? 'play' : 'arrow')}${w.playHref ? '바로 플레이' : w.type==='video' ? '영상 보기' : '작품 살펴보기'}</a>${w.promptHref ? `<a class="btn btn-secondary" href="${esc(w.promptHref)}">원본 프롬프트 ${icon('arrow')}</a>` : ''}</div></div><div class="hero-bottom"><div class="hero-caption">보고, 만들고, 같이 놀자.</div><div class="hero-pagination" aria-label="추천 작품 선택">${rows.map((r,i)=>`<button class="${slide===i?'active':''}" data-live-slide="${i}" aria-label="추천 작품 ${i+1}: ${esc(r.title)}" aria-pressed="${slide===i}"></button>`).join('')}<span><b>${String(slide+1).padStart(2,'0')}</b> / ${String(rows.length).padStart(2,'0')}</span></div></div></section>`;
  }
  function render() {
    if (!['','home','content'].includes(location.hash.slice(1).split('?')[0])) return;
    const works = all();
    const visual = works.filter(w=>w.image || w.video);
    const seenTypes = new Set();
    const varied = visual.filter(w=>!seenTypes.has(w.type) && seenTypes.add(w.type));
    const featured = unique([...varied,...visual]).slice(0,5);
    if (!featured.length) featured.push(...prompts.filter(w=>w.image).slice(0,5));
    const selected = filter === '전체' ? works : works.filter(w=>kind(w)===filter);
    const status = failed.length ? `<div class="live-feed-notice" role="status">${esc(failed.join(' · '))} 목록을 불러오지 못했어요. <button data-live-reload>다시 불러오기</button></div>` : '';
    root.innerHTML = hero(featured) + `<div class="browse-top" aria-label="작품 분류">${filters.map(label=>`<button class="filter-chip ${filter===label?'active':''}" data-live-filter="${label}" aria-pressed="${filter===label}">${label}</button>`).join('')}<button class="live-refresh" data-live-reload ${busy?'disabled':''}>${busy?'불러오는 중…':'새로고침 ↻'}</button></div>` + status
      + (selected.length ? shelf('live-latest',filter==='전체'?'지금, 사람들이 만든 것들':`${filter}, 새로운 발견`,'등록된 공개 결과물 · 최신순',selected,filter==='게임'?'/app#game-room':`/app#gallery${filter==='전체'?'':`?type=${encodeURIComponent(selected[0].type)}`}`) : !loading ? `<section class="live-empty"><h2>아직 공개된 ${filter==='전체'?'작품':filter}이 없어요.</h2><a href="/app#my-projects">첫 작품 올리기 ↗</a></section>` : '')
      + (filter === '전체' ? shelf('live-prompts','한 장에서 시작된 프롬프트','등록된 프롬프트와 사용 방법',prompts,'/app#prompt-wiki',true)
        + shelf('live-videos','지금 상영 중','움직이는 상상과 제작 이야기',works.filter(w=>w.type==='video'),'/app#gallery?type=video')
        + shelf('live-images','이미지로 남긴 아이디어','프롬프트에서 시작된 새로운 장면',works.filter(w=>w.type==='image'),'/app#gallery?type=image',true)
        + shelf('live-games','보기만 하기엔 아까운 게임','게임룸에 공개된 게임을 바로 플레이',games,'/app#game-room') : '');
    root.querySelectorAll('img,video').forEach(el=>el.addEventListener('error',()=>el.remove(),{once:true}));
  }
  async function request(path) {
    const response = await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Unable to load public feed');
    const result = await response.json();
    if (!result.ok) throw new Error('Unable to load public feed');
    return result.data;
  }
  async function refresh() {
    if (busy) return;
    busy = true; render();
    const results = await Promise.allSettled([
      request('/api/artifacts?scope=feed&sort=new&limit=64'), request('/api/prompts?scope=all&sort=new&limit=24'),
      request('/api/game-room?scope=public&sort=recent&limit=24'), request('/api/artifacts?scope=feed&type=video&sort=new&limit=16'),
    ]);
    failed = [];
    const [a,p,g,v] = results;
    if (a.status==='fulfilled' && Array.isArray(a.value)) artifacts = a.value.map(artifactWork).filter(Boolean); else failed.push('결과물');
    if (v.status==='fulfilled' && Array.isArray(v.value)) artifacts = unique([...artifacts,...v.value.map(artifactWork)]); else failed.push('영상');
    if (p.status==='fulfilled' && Array.isArray(p.value)) prompts = p.value.map(promptWork).filter(Boolean); else failed.push('프롬프트');
    if (g.status==='fulfilled' && Array.isArray(g.value?.games)) games = g.value.games.map(item=>artifactWork({...item,type:'game',status:'published',visibility:'public',owner:{username:item.ownerName}})).filter(Boolean); else failed.push('게임');
    loading = false; busy = false; lastLoad = Date.now(); render();
  }
  root.addEventListener('click',event=>{
    const button = event.target.closest('button'); if (!button) return;
    if (button.hasAttribute('data-live-filter')) { filter=button.dataset.liveFilter; render(); }
    if (button.hasAttribute('data-live-slide')) { slide=Number(button.dataset.liveSlide); render(); }
    if (button.hasAttribute('data-live-reload')) void refresh();
    if (button.dataset.liveScroll) root.querySelector(`#${button.dataset.liveScroll}`)?.scrollBy({left:root.querySelector(`#${button.dataset.liveScroll}`).clientWidth*.75*Number(button.dataset.direction),behavior:'smooth'});
  });
  window.addEventListener('pageshow',event=>{ if(event.persisted) void refresh(); });
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible' && Date.now()-lastLoad>60000) void refresh(); });
  render(); void refresh();
  return {render,refresh};
}
