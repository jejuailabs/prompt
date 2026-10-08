const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const exports = {};
  const requireModule = name => {
    if (name in mocks) return mocks[name];
    if (!name.startsWith('@/')) return require(name);
    return load(path.resolve('src', name.slice(2)) + '.ts', mocks);
  };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(js, { exports, require: requireModule, process, URL, Response, Date });
  return exports;
}

test('homepage game artwork and title destinations launch games, including unregistered IDs', () => {
  const { artifactWork } = load('public/design/streaming-v1/live-home.js');
  for (const id of ['builtin-skybloom-pinball', 'builtin-luna-pinball', 'builtin-hamster-pinball', 'builtin-penguin-ice', 'builtin-donut-pop', 'builtin-cat-bridge', 'builtin-jelly-garden', 'builtin-macaron-tower', 'registered-game']) {
    const work = artifactWork({ id, type: 'game', status: 'published', visibility: 'public' });
    assert.equal(work.href, '/app#game-play?id=' + id);
    assert.equal(work.href, work.playHref);
  }
  const image = artifactWork({ id: 'image-id', type: 'image', status: 'published', visibility: 'public' });
  assert.equal(image.href, '/app#project?id=image-id');
});

function listingFixture(stored = []) {
  const db = {
    artifact: { findMany: async ({ where }) => where.contentUrl ? stored : stored.filter(g => g.status === 'published' && g.visibility === 'public') },
    gamePlay: { groupBy: async () => [] }, profile: { findMany: async () => [] },
  };
  return load('src/app/api/game-room/route.ts', { '@/lib/db': { db }, '@/lib/auth': { requireAdmin: async () => {} } });
}
const request = sort => ({ url: 'https://playlab.test/api/game-room' + (sort ? '?sort=' + sort : '') });
const games = async response => (await response.json()).data.games;

test('new games precede older shipped games in the default and recent public lists', async () => {
  const api = listingFixture();
  for (const sort of ['', 'recent']) {
    const rows = await games(await api.GET(request(sort)));
    assert.deepEqual(rows.slice(0, 4).map(g => g.id), ['builtin-skybloom-pinball', 'builtin-luna-pinball', 'builtin-hamster-pinball', 'builtin-penguin-ice']);
    assert.ok(rows[0].createdAt > rows.find(g => g.id === 'builtin-fruit-atelier').createdAt);
  }
});

test('saving an old game score does not make its publication newer or duplicate its ID', async () => {
  const stored = { id: 'legacy-fruit', title: '과일 아틀리에', type: 'game', contentUrl: '/games/fruit-atelier.html',
    fileUrl: null, description: '', status: 'published', visibility: 'public', owner: { id: 'admin', username: 'PLAYLAB' },
    _count: { gamePlays: 0 }, likeCount: 99, createdAt: new Date('2026-10-09T00:00:00Z'), metadata: '{}' };
  const api = listingFixture([stored]);
  const rows = await games(await api.GET(request('recent')));
  assert.equal(rows[0].id, 'builtin-skybloom-pinball');
  assert.equal(rows.filter(g => g.contentUrl === stored.contentUrl).length, 1);
  assert.equal(rows.find(g => g.contentUrl === stored.contentUrl).id, 'legacy-fruit');
  assert.equal((await games(await api.GET(request('popular'))))[0].id, 'legacy-fruit');
  stored.status = 'hidden';
  assert.ok(!(await games(await api.GET(request('recent')))).some(g => g.contentUrl === stored.contentUrl));
});
