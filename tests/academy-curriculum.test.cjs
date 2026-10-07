const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const absolute = path.resolve(file);
  const requireModule = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
    return load(`${target}.ts`, mocks, globals);
  };
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule, URL, URLSearchParams, Response, AbortSignal, ...globals });
  return exports;
}

const curriculum = load('src/modules/academy/curriculum.ts');
class HttpError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const handler = { readJson: req => req.json(), ok: (data, status = 200) => Response.json({ ok: true, data }, { status }), fail: e => Response.json({ ok: false, error: e.message }, { status: e.status ?? 500 }) };
const plain = value => JSON.parse(JSON.stringify(value));
const params = (id = 'course', videoId = 'member-a') => ({ params: Promise.resolve({ id, videoId, lessonId: videoId }) });
const body = data => ({ json: async () => data });
const video = (id, videoId, playlistId, sortOrder = 0) => ({ id, videoId, playlistId, sortOrder, title: id, description: '', thumbnailUrl: null, analysisId: 'analysis-' + videoId, analysis: { id: 'analysis-' + videoId, status: 'done', studyContent: 'shared notes' } });
const collection = (id, videos, published = true) => ({ id, title: id, description: 'original description', thumbnailUrl: null, sortOrder: 3, published, videos });
const baseCollections = () => [collection('single-a', [video('a', 'aaaaaaaaaaa', 'single-a')]), collection('single-b', [video('b', 'bbbbbbbbbbb', 'single-b')]), collection('single-c', [video('c', 'ccccccccccc', 'single-c')]), collection('course', [video('member-a', 'aaaaaaaaaaa', 'course'), video('member-b', 'bbbbbbbbbbb', 'course', 1)])];

// In-memory persistence double. Transactions roll back, while route outcomes are
// asserted through publicly readable lessons/courses, not call snapshots alone.
function fixture(initial = baseCollections()) {
  let rows = structuredClone(initial), serial = 0, analysisCalls = 0;
  const all = () => rows.flatMap(c => c.videos);
  const match = (v, w = {}) => (!w.id || (typeof w.id === 'string' ? v.id === w.id : w.id.in.includes(v.id))) && (!w.videoId || (typeof w.videoId === 'string' ? v.videoId === w.videoId : w.videoId.in.includes(v.videoId))) && (!w.playlistId || v.playlistId === w.playlistId) && (!w.playlist || rows.some(c => c.id === v.playlistId && c.published === w.playlist.published));
  const db = {
    academyPlaylist: {
      findMany: async ({ where = {} } = {}) => rows.filter(c => (where.published === undefined || c.published === where.published) && (!where.videos || c.videos.some(v => match(v, where.videos.some)))),
      findUnique: async ({ where }) => structuredClone(rows.find(c => c.id === where.id) ?? null),
      create: async ({ data }) => {
        const id = 'new-' + ++serial;
        const c = collection(id, [], data.published); Object.assign(c, data, { id, videos: [] }); rows.push(c);
        for (const v of data.videos?.create ?? []) await db.academyVideo.create({ data: { ...v, playlistId: id } });
        if (data.videos?.connect) { const existing = all().find(v => v.id === data.videos.connect.id); const old = rows.find(r => r.id === existing.playlistId); old.videos = old.videos.filter(v => v.id !== existing.id); existing.playlistId = id; c.videos.push(existing); }
        return structuredClone(c);
      },
      update: async ({ where, data }) => { const c = rows.find(c => c.id === where.id); Object.assign(c, data); c.videos.sort((a,b) => a.sortOrder-b.sortOrder); return structuredClone(c); },
      delete: async ({ where }) => { rows = rows.filter(c => c.id !== where.id); },
    },
    academyVideo: {
      findMany: async ({ where }) => structuredClone(all().filter(v => match(v, where))),
      findFirst: async ({ where }) => structuredClone(all().find(v => match(v, where)) ?? null),
      findUnique: async ({ where }) => structuredClone(all().find(v => match(v, where)) ?? null),
      create: async ({ data }) => { const c = rows.find(c => c.id === data.playlistId); if (c.videos.some(v => v.videoId === data.videoId)) throw Error('duplicate membership'); const v = { ...data, id: 'video-' + ++serial, analysis: { id: data.analysisId, status: 'done', studyContent: 'shared notes' } }; c.videos.push(v); return structuredClone(v); },
      update: async ({ where, data }) => { const v = all().find(v => match(v, where)); Object.assign(v, data); return structuredClone(v); },
      updateMany: async ({ where, data }) => { all().filter(v => match(v, where)).forEach(v => Object.assign(v, data)); },
      deleteMany: async ({ where }) => { rows.forEach(c => { c.videos = c.videos.filter(v => !match(v, where)); }); },
      delete: async ({ where }) => db.academyVideo.deleteMany({ where }),
    },
    youtubeAnalysis: {
      upsert: async ({ where }) => ({ id: 'analysis-' + where.videoId, status: 'done', title: 'Cached video', thumbnailUrl: null }),
      update: async ({ where, data }) => { all().filter(v => v.analysisId === where.id).forEach(v => Object.assign(v.analysis, data)); },
      findUnique: async () => ({ status: 'done' }),
    },
    $transaction: async cb => { const before = structuredClone(rows); try { return await cb(db); } catch (e) { rows = before; throw e; } },
  };
  const mocks = { '@/lib/db': { db }, '@/lib/auth': { HttpError, requireAdmin: async () => ({ id: 'admin' }) }, '@/lib/server/handler': handler, '@/lib/server/youtube-analysis': { toYoutubeAnalysisDTO: a => a }, '@/lib/server/academy': { analyzeAcademyVideo: async () => { analysisCalls++; return { status: 'done' }; } } };
  return { db, mocks, rows: () => rows, analysisCalls: () => analysisCalls, route: file => load('src/app/api/academy/' + file + '/route.ts', mocks) };
}

test('individual video URLs and raw parser IDs are canonical; playlist-only and lookalike hosts are rejected', () => {
  for (const url of ['https://www.youtube.com/watch?v=abcdefghijk&list=PL12345', 'https://youtu.be/abcdefghijk?t=25', 'https://youtube.com/shorts/abcdefghijk', 'https://youtube.com/embed/abcdefghijk', 'https://m.youtube.com/live/abcdefghijk']) assert.equal(curriculum.youtubeVideoId(url), 'abcdefghijk');
  assert.equal(curriculum.youtubeVideoId('abcdefghijk'), 'abcdefghijk');
  for (const url of ['https://youtube.com/playlist?list=PL12345', 'https://notyoutube.com/watch?v=abcdefghijk', 'https://youtube.com.evil.test/watch?v=abcdefghijk', 'https://evil@youtube.com/watch?v=abcdefghijk', 'http://youtube.com/watch?v=abcdefghijk', 'https://youtube.com/other?v=abcdefghijk', 'https://youtu.be/bad', 'file:///abcdefghijk']) assert.equal(curriculum.youtubeVideoId(url), null);
  assert.equal(curriculum.createLessonSchema.safeParse({url:'abcdefghijk'}).success, false);
  assert.equal(curriculum.createLessonSchema.safeParse({url:'https://youtu.be/abcdefghijk'}).success, true);
});
test('course selections require 2–100 distinct IDs and partial metadata does not reset other fields', () => {
  assert.equal(curriculum.createCourseSchema.safeParse({title:'강의', lessonIds:['a','b']}).success,true);
  for (const ids of [[], ['a'], ['a','a'], Array.from({length:101},(_,i)=>'id'+i)]) assert.equal(curriculum.createCourseSchema.safeParse({title:'강의',lessonIds:ids}).success,false);
  assert.deepEqual(plain(curriculum.updateCourseSchema.parse({ title: '새 제목' })), { title: '새 제목' });
});
test('library exposes one lesson per YouTube video, prefers standalone, and retains all course memberships', () => {
  const rows=baseCollections(); rows.push(collection('second-course',[video('other-a','aaaaaaaaaaa','second-course'),video('other-c','ccccccccccc','second-course',1)]));
  const library=curriculum.buildAcademyLibrary(rows);
  assert.equal(library.lessons.length,3); assert.equal(library.courses.length,2);
  const a=library.lessons.find(l=>l.videoId==='aaaaaaaaaaa'); assert.equal(a.id,'a'); assert.deepEqual(plain(a.courseIds),['course','second-course']);
});
test('progress and timestamp parsing retain valid data and discard corruption', () => {
  const state = curriculum.readCourseProgress(JSON.stringify({ completed: ['one','one','removed'], lastLesson:'removed', notes:{one:'메모',removed:'old'} }),['one','two']);
  assert.deepEqual(plain(state),{completed:['one'],notes:{one:'메모'}});
  assert.equal(curriculum.readCourseProgress('{broken',['one']).completed.length,0);
  assert.equal(curriculum.timestampSeconds('01:02:30'),3750); assert.equal(curriculum.timestampSeconds('12:30'),750);
  for(const t of ['1:99','bad','-2:00']) assert.equal(curriculum.timestampSeconds(t),null);
});
test('all mutation routes deny non-admin users before reading bodies, database or providers', async () => {
  const routes = [['import','POST'],['lessons','POST'],['lessons/[lessonId]','PATCH'],['lessons/[lessonId]/analyze','POST'],['playlists','POST'],['playlists/[id]','PATCH'],['playlists/[id]','DELETE'],['playlists/[id]/videos','POST'],['playlists/[id]/videos/[videoId]','PATCH'],['playlists/[id]/videos/[videoId]','DELETE'],['playlists/[id]/videos/[videoId]/analyze','POST']];
  for(const [file,method] of routes) {
    const f=fixture(); f.mocks['@/lib/auth'].requireAdmin=async()=>{throw new HttpError('forbidden',403);};
    const response=await f.route(file)[method]({json:()=>{throw Error('parsed before auth');}},params());
    assert.equal(response.status,403,file+' '+method); assert.equal(f.analysisCalls(),0);
  }
});
test('retired playlist import returns 410 and never invokes an external provider',async()=>{
  const f=fixture(); const result=await f.route('import').POST(); assert.equal(result.status,410); assert.match((await result.json()).error,/개별 영상/); assert.equal(f.analysisCalls(),0);
});
test('course creation uses selected order, preserves sources and shares analysis without invoking it',async()=>{
  const f=fixture(); const response=await f.route('playlists').POST(body({title:'new course',lessonIds:['b','a']}));
  assert.equal(response.status,201); const result=(await response.json()).data;
  assert.deepEqual(result.videos.map(v=>[v.videoId,v.sortOrder]),[['bbbbbbbbbbb',0],['aaaaaaaaaaa',1]]);
  assert.equal(result.videos[0].analysis.id,'analysis-bbbbbbbbbbb'); assert.ok(f.rows().find(c=>c.id==='single-a')); assert.equal(f.analysisCalls(),0);
});
test('missing, unpublished or duplicate source video selections cannot create partial courses',async()=>{
  for(const ids of [['a','missing'],['a','private'],['a','member-a']]) {
    const f=fixture([...baseCollections(),collection('hidden',[video('private','ddddddddddd','hidden')],false)]); const before=JSON.stringify(f.rows());
    const response=await f.route('playlists').POST(body({title:'bad',lessonIds:ids})); assert.ok(response.status>=400); assert.equal(JSON.stringify(f.rows()),before);
  }
});
test('course reorder retains membership IDs and metadata-only edits preserve description and order',async()=>{
  const f=fixture(); let response=await f.route('playlists/[id]').PATCH(body({lessonIds:['b','a']}),params()); assert.equal(response.status,200);
  let course=f.rows().find(c=>c.id==='course'); assert.deepEqual(course.videos.map(v=>v.id),['member-b','member-a']);
  response=await f.route('playlists/[id]').PATCH(body({title:'renamed'}),params()); assert.equal(response.status,200);
  course=f.rows().find(c=>c.id==='course'); assert.equal(course.description,'original description'); assert.equal(course.sortOrder,3);
});
test('excluding legacy course-only videos creates standalone copies with original shared analysis',async()=>{
  const legacy=collection('course',[video('old-a','aaaaaaaaaaa','course'),video('old-b','bbbbbbbbbbb','course',1),video('old-c','ccccccccccc','course',2)]);
  const f=fixture([legacy]); const response=await f.route('playlists/[id]').PATCH(body({lessonIds:['old-c','old-a']}),params()); assert.equal(response.status,200);
  const library=curriculum.buildAcademyLibrary(f.rows()); assert.equal(library.lessons.length,3); assert.deepEqual(plain(library.courses[0].videos.map(v=>v.id)),['old-c','old-a']);
  const b=library.lessons.find(v=>v.videoId==='bbbbbbbbbbb'); assert.deepEqual(plain(b.courseIds),[]); assert.equal(b.analysisId,'analysis-bbbbbbbbbbb'); assert.equal(b.id,'old-b');
});
test('unbundling preserves all legacy standalone lessons and cannot delete standalone collections',async()=>{
  const f=fixture([baseCollections()[3]]); const response=await f.route('playlists/[id]').DELETE({},params()); assert.equal(response.status,200);
  const library=curriculum.buildAcademyLibrary(f.rows()); assert.equal(library.courses.length,0); assert.equal(library.lessons.length,2); assert.deepEqual(plain(library.lessons.map(v=>v.id).sort()),['member-a','member-b']); assert.ok(library.lessons.every(v=>v.analysis.studyContent==='shared notes'));
  const remaining=f.rows()[0]; const denied=await f.route('playlists/[id]').DELETE({},params(remaining.id)); assert.equal(denied.status,404); assert.equal(f.rows().length,2);
});
test('member mutation and analysis are scoped to the supplied course',async()=>{
  const f=fixture(); const before=JSON.stringify(f.rows());
  for(const method of ['PATCH','DELETE']) assert.equal((await f.route('playlists/[id]/videos/[videoId]')[method](body({title:'bad'}),params('course','a'))).status,404);
  assert.equal((await f.route('playlists/[id]/videos/[videoId]/analyze').POST({},params('course','a'))).status,404);
  assert.equal(f.analysisCalls(),0); assert.equal(JSON.stringify(f.rows()),before);
});
test('member deletion enforces minimum course size; registered-video addition rejects duplicates',async()=>{
  const f=fixture(); assert.equal((await f.route('playlists/[id]/videos/[videoId]').DELETE({},params())).status,400);
  assert.equal((await f.route('playlists/[id]/videos').POST(body({lessonId:'a'}),params())).status,409);
  assert.equal((await f.route('playlists/[id]/videos').POST(body({lessonId:'c'}),params())).status,201);
  assert.equal((await f.route('playlists/[id]/videos/[videoId]').DELETE({},params())).status,200);
  assert.equal(f.rows().find(c=>c.id==='course').videos.length,2); assert.ok(f.rows().find(c=>c.id==='single-a'));
});
test('individual registration reuses cached analysis, rejects duplicates and does not call providers in manual mode',async()=>{
  const f=fixture(); const response=await f.route('lessons').POST(body({url:'https://youtu.be/ddddddddddd',title:'Standalone',studyContent:'My notes'})); assert.equal(response.status,201);
  const lesson=(await response.json()).data; assert.equal(lesson.title,'Standalone'); assert.equal(lesson.courseIds.length,0); assert.equal(f.analysisCalls(),0);
  assert.equal((await f.route('lessons').POST(body({url:'https://youtu.be/ddddddddddd'}))).status,409);
});
test('editing a lesson propagates content to copies and rejects unpublished lessons',async()=>{
  const f=fixture(); const response=await f.route('lessons/[lessonId]').PATCH(body({title:'Updated',description:'Intro',studyContent:'Revised notes'}),params('ignored','a')); assert.equal(response.status,200);
  const copies=f.rows().flatMap(c=>c.videos).filter(v=>v.videoId==='aaaaaaaaaaa'); assert.ok(copies.every(v=>v.title==='Updated'&&v.analysis.studyContent==='Revised notes'));
  assert.equal((await f.route('lessons/[lessonId]').PATCH(body({title:'Updated',description:'',studyContent:''}),params('ignored','missing'))).status,404);
});

test('failed course changes roll back metadata and membership atomically',async()=>{
  const f=fixture(); const before=JSON.stringify(f.rows()); const update=f.db.academyVideo.update; let changed=0; f.db.academyVideo.update=async args=>{if(++changed===2) throw Error('simulated persistence failure'); return update(args);};
  assert.equal((await f.route('playlists/[id]').PATCH(body({title:'changed',lessonIds:['b','a']}),params())).status,500); assert.equal(JSON.stringify(f.rows()),before);
});
