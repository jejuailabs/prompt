const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript');
function load(file, mocks = {}) {
  const exports = {};
  const requireModule = name => name in mocks ? mocks[name] : name.startsWith('@/') ? load(path.resolve('src', name.slice(2)) + '.ts', mocks) : require(name);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require: requireModule, URL, Response });
  return exports;
}
const embed = load('src/lib/artifact-embed.ts');
test('sharing uses canonical app links and escapes user-controlled HTML attributes', () => {
  assert.equal(embed.artifactShareUrl('https://coai.example', 'id&x=1', true), 'https://coai.example/app#game-play?id=id%26x%3D1');
  const code = embed.artifactEmbedCode('https://coai.example', 'id/test', '"><img src=x onerror=alert(1)> &');
  assert.ok(code.includes('/embed/id%2Ftest'));
  assert.ok(!code.includes('<img'));
  assert.ok(code.includes('&quot;&gt;&lt;img'));
});
test('only explicitly shipped, same-origin entrypoints bypass the untrusted code sandbox', () => {
  const origin = 'https://coai.example';
  assert.ok(embed.bundledGameForUrl('/games/prism-stack/index.html?embed=1', origin));
  for (const url of ['https://evil.example/games/prism-stack/index.html', '/uploads/game.html', '/games/prism-stack/unknown.html', '//evil.example/games/prism-stack/index.html']) assert.equal(embed.bundledGameForUrl(url, origin), undefined);
  const url = new URL(embed.gameFrameUrl('/games/prism-stack/index.html?seed=5', origin));
  assert.equal(url.searchParams.get('parentOrigin'), origin);
  assert.equal(url.searchParams.get('seed'), '5');
});
test('embed API is read-only and refuses private, hidden, draft and private landing-page artifacts', async () => {
  let row, reads = 0;
  const { GET } = load('src/app/api/embed/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    '@/lib/db': { db: { artifact: { findUnique: async () => { reads++; return row; } } } },
    '@/lib/server/serialize': { serializeArtifact: value => value },
  });
  const request = id => GET(new Request('https://coai.example/api/embed/' + id), { params: Promise.resolve({ id }) });
  assert.equal((await request('builtin-prism-stack')).status, 200);
  assert.equal(reads, 0, 'builtin embeds need no database or tracking writes');
  for (const state of [null, { status: 'draft', visibility: 'public' }, { status: 'hidden', visibility: 'public' }, { status: 'archived', visibility: 'public' }, { status: 'published', visibility: 'private' }, { status: 'published', visibility: 'unlisted' }, { status: 'published', visibility: 'public', sourceModule: 'landing-pages' }]) {
    row = state;
    assert.equal((await request('uploaded')).status, 404);
  }
  row = { id: 'uploaded', status: 'published', visibility: 'public' };
  assert.equal((await request('uploaded')).status, 200);
});
