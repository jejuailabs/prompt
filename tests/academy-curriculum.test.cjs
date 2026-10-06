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
const sample = { videoId: 'abcdefghijk', title: '첫 차시', index: 2, duration: '12:30' };
test('playlist imports accept only canonical YouTube list URLs', () => {
  assert.equal(curriculum.youtubePlaylistUrl('https://www.youtube.com/watch?v=abcdefghijk&list=PL1234567890'), 'https://www.youtube.com/playlist?list=PL1234567890');
  for (const value of ['https://notyoutube.com/playlist?list=PL1234567890', 'file:///playlist?list=PL1234567890', 'https://youtube.com/playlist?list=../secret', 'https://youtu.be/abcdefghijk']) assert.equal(curriculum.youtubePlaylistUrl(value), null);
});
test('SocialKit import preserves source order, removes unavailable/duplicate videos, retains duration', () => {
  const result = curriculum.socialKitLessons({ success: true, data: { type: 'playlist', results: [sample, { ...sample, videoId: '12345678901', title: '도입', index: 1 }, sample, { videoId: 'aaaaaaaaaaa', title: '[Private video]' }, { videoId: '../bad', title: 'broken' }] } });
  assert.equal(result.length, 2);
  assert.equal(result[0].title, '도입');
  assert.equal(result[1].durationSeconds, 750);
  assert.throws(() => curriculum.socialKitLessons({ success: false, message: 'Quota exceeded' }));
  assert.throws(() => curriculum.socialKitLessons({ success: true, data: { type: 'channel', results: [sample] } }));
});
test('course saves reject duplicate, malformed and over-limit lessons', () => {
  assert.equal(curriculum.createCourseSchema.safeParse({ title: '과정', videos: [sample] }).success, true);
  for (const videos of [[sample, sample], [{ ...sample, videoId: 'bad' }], Array(101).fill(sample)]) assert.equal(curriculum.createCourseSchema.safeParse({ title: '과정', videos }).success, false);
});
test('progress survives reload but ignores removed lessons and corrupt storage', () => {
  const state = curriculum.readCourseProgress(JSON.stringify({ completed: ['one', 'one', 'removed'], lastLesson: 'removed', notes: { one: '메모\n다음 줄', removed: 'old' } }), ['one', 'two']);
  assert.equal(state.completed.length, 1);
  assert.equal(state.lastLesson, undefined);
  assert.equal(state.notes.one, '메모\n다음 줄');
  assert.equal(state.notes.removed, undefined);
  assert.equal(curriculum.readCourseProgress('{broken', ['one']).completed.length, 0);
});
test('chapter seeking handles hour timestamps and rejects invalid clocks', () => {
  assert.equal(curriculum.timestampSeconds('01:02:30'), 3750);
  assert.equal(curriculum.timestampSeconds('12:30'), 750);
  for (const value of ['1:99', '-2:00', 'bad']) assert.equal(curriculum.timestampSeconds(value), null);
});
class HttpError extends Error { constructor(message, status = 400) { super(message); this.status = status; } }
const handler = { readJson: req => req.json(), ok: data => Response.json({ ok: true, data }), fail: e => Response.json({ ok: false, error: e.message }, { status: e.status ?? 500 }) };
test('import and course creation deny non-admin callers before provider or DB work', async () => {
  for (const file of ['src/app/api/academy/import/route.ts', 'src/app/api/academy/playlists/route.ts']) {
    const route = load(file, { '@/lib/auth': { HttpError, requireAdmin: async () => { throw new HttpError('forbidden', 403); } }, '@/lib/server/handler': handler, '@/lib/db': {}, '@/lib/server/youtube-analysis': {}, '@/modules/academy/socialkit': { importSocialKitPlaylist: () => { throw Error('provider called'); } } });
    const result = await route.POST({ json: () => { throw Error('body parsed before admin gate'); } });
    assert.equal(result.status, 403);
  }
});
test('SocialKit adapter keeps key in headers and surfaces missing config without network', async () => {
  let calls = 0;
  const globals = { process: { env: {} }, fetch: async () => { calls++; throw Error('should not fetch'); } };
  const adapter = load('src/modules/academy/socialkit.ts', { 'server-only': {}, '@/lib/auth': { HttpError } }, globals);
  await assert.rejects(adapter.importSocialKitPlaylist('https://youtube.com/playlist?list=PL1234567890'), e => e.status === 503);
  assert.equal(calls, 0);
  let observed;
  const connected = load('src/modules/academy/socialkit.ts', { 'server-only': {}, '@/lib/auth': { HttpError } }, { process: { env: { SOCIALKIT_API_KEY: 'test-only-key' } }, fetch: async (url, options) => { observed = { url, options }; return Response.json({ success: true, data: { type: 'playlist', results: [sample] } }); } });
  assert.equal((await connected.importSocialKitPlaylist('https://youtube.com/playlist?list=PL1234567890')).videos.length, 1);
  assert.equal(observed.options.headers['x-access-key'], 'test-only-key');
  assert.ok(!observed.url.includes('test-only-key'));
});
test('course creation writes all lessons in one nested operation without triggering analysis', async () => {
  let query;
  const route = load('src/app/api/academy/playlists/route.ts', { '@/lib/auth': { HttpError, requireAdmin: async () => ({ id: 'admin' }) }, '@/lib/server/handler': handler, '@/lib/server/youtube-analysis': { toYoutubeAnalysisDTO: x => x }, '@/lib/db': { db: { academyPlaylist: { create: async args => { query = args; return { id: 'course', ...args.data, videos: [] }; } } } } });
  const response = await route.POST({ json: async () => ({ title: '과정', videos: [sample, { ...sample, videoId: '12345678901' }] }) });
  assert.equal(response.status, 200);
  assert.equal(query.data.videos.create.length, 2);
  assert.equal(query.data.videos.create[1].sortOrder, 1);
  assert.equal(query.data.videos.create[0].analysis.connectOrCreate.where.videoId, sample.videoId);
});
