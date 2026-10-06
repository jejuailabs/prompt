const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');

function load(file, mocks = {}, globals = {}) {
  const exports = {};
  const absolute = path.resolve(file);
  const requireModule = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
    const target = name.startsWith('@/') ? path.resolve('src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
    if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(target, 'utf8'));
    return load(target.endsWith('.ts') ? target : `${target}.ts`, mocks, globals);
  };
  const js = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { exports, require: requireModule, process, URL, URLSearchParams, Response, ...globals });
  return exports;
}

test('every routed screen survives a copied URL and reload', () => {
  const window = { location: { hash: '', pathname: '/' } };
  const { parseHash, encodeHash } = load('src/lib/store.ts', { zustand: { create: () => ({}) } }, { window });
  const views = [...fs.readFileSync('src/components/views/view-router.tsx', 'utf8').matchAll(/case '([^']+)'/g)].map(match => match[1]);
  for (const view of views) {
    window.location.hash = encodeHash(view, { q: '제주 & 게임?', id: 'a' });
    assert.equal(parseHash().view, view);
    assert.equal(parseHash().params.q, '제주 & 게임?');
  }
  window.location = { hash: '', pathname: '/tools/tts' };
  assert.equal(parseHash().params.slug, 'tts');
});

test('each individual tool menu opens that tool, and pipeline menus include their id', () => {
  const { moduleDestination } = load('src/lib/module-navigation.ts');
  const { AI_STUDIO_TOOLS } = load('src/lib/ai-studio-tools.ts');
  for (const tool of AI_STUDIO_TOOLS) {
    const result = moduleDestination({ id: tool.id, entryView: 'ai-tools' });
    assert.equal(result.view, 'tool');
    assert.equal(result.params.slug, tool.id.replace('tool-', ''));
  }
  assert.equal(moduleDestination({ id: 'tool-game', entryView: 'pipeline-run' }).params.id, 'pipeline-game');
});

test('every public preview list entry opens a matching detail, including linked prompt works', async () => {
  const { previewResponse } = load('src/lib/preview.ts');
  const get = async url => {
    const response = previewResponse(new NextRequest(`http://localhost${url}`));
    assert.equal(response.status, 200, url);
    return (await response.json()).data;
  };
  const prompts = await get('/api/prompts');
  const artifacts = await get('/api/artifacts');
  for (const prompt of prompts) {
    const detail = await get(`/api/prompts/${prompt.id}`);
    assert.equal(detail.body, prompt.body);
    assert.ok(Array.isArray(detail.versions));
    assert.deepEqual(detail.artifacts.map(a => a.id).sort(), artifacts.filter(a => a.sourcePromptId === prompt.id).map(a => a.id).sort());
  }
  for (const artifact of artifacts) assert.equal((await get(`/api/artifacts/${artifact.id}`)).id, artifact.id);
  const games = (await get('/api/game-room')).games;
  assert.deepEqual(games.map(g => g.id).sort(), artifacts.filter(a => a.type === 'game').map(a => a.id).sort());
  for (const game of games) {
    const detail = await get(`/api/game-room/${game.id}`);
    assert.equal(detail.contentUrl, game.contentUrl);
    assert.ok(fs.existsSync(`public${game.contentUrl}`));
    assert.ok(fs.existsSync(`public${game.fileUrl}`));
  }
  assert.ok((await get('/api/ranking')).prompts.length);
  assert.equal(previewResponse(new NextRequest('http://localhost/api/prompts/not-real')).status, 404);
  assert.equal(previewResponse(new NextRequest('http://localhost/api/prompts', { method: 'POST' })).status, 503);
});

test('anonymous AI requests stop before input parsing or provider calls', async () => {
  const denied = Response.json({ error: '로그인이 필요합니다' }, { status: 401 });
  const names = ['tts', 'creative-plan', 'image', 'lyrics-gen', 'lyrics-analyze', 'metaprompt', 'metaprompt-quick', 'detail2', 'thumbnail', 'suno', 'transcribe'];
  for (const name of names) {
    const route = load(`src/app/api/tools/${name}/route.ts`, {
      '@/lib/server/tool-access': { checkToolAccess: async () => denied },
      '@/lib/server/ai': {}, '@/lib/auth': {}, '@/lib/server/gemini-image': {},
    });
    const request = { json: () => { throw Error('Must authenticate before parsing'); }, formData: () => { throw Error('Must authenticate before uploads'); } };
    assert.equal((await route.POST(request)).status, 401, name);
  }
});

test('subtitle timecodes carry rounded milliseconds into minutes and hours', () => {
  const { srtTimestamp } = load('src/lib/subtitles.ts');
  assert.equal(srtTimestamp(59.9996), '00:01:00,000');
  assert.equal(srtTimestamp(3599.9996), '01:00:00,000');
  assert.equal(srtTimestamp(-2), '00:00:00,000');
  assert.equal(srtTimestamp(3.25), '00:00:03,250');
});

test('read routes use a verified Auth identity and reject an invalid cookie identity', async () => {
  let verifiedUser = null;
  let verifiedCalls = 0;
  const auth = load('src/lib/auth.ts', {
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      getUser: async () => { verifiedCalls++; return { data: { user: verifiedUser }, error: verifiedUser ? null : Error('Invalid token') }; },
      getSession: async () => { throw Error('Unverified session must not authorize access'); },
    } }) },
    '@/lib/db': { db: {} },
    'next/headers': { headers: async () => ({ get: () => null }) },
  });
  assert.equal(await auth.getSessionUserFast(), null);
  verifiedUser = { id: 'verified-user', user_metadata: {}, email: 'check@example.com' };
  assert.equal((await auth.getSessionUserFast()).id, 'verified-user');
  assert.equal(verifiedCalls, 2);
});
