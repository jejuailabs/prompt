const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(environment = {}) {
  const source = fs.readFileSync('src/lib/server/video-upscale.ts', 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, process: { env: environment }, URL });
  return exports;
}

test('portrait H3 output maps to delivery-sized HD and FHD targets', () => {
  const { getVideoUpscaleTarget, getVideoUpscaleCredit } = load();
  assert.equal(JSON.stringify(getVideoUpscaleTarget('9:16', 'hd')), JSON.stringify({ tier: 'hd', width: 720, height: 1280, label: 'HD 1단계', description: '720 × 1280 · 빠른 고화질' }));
  assert.equal(JSON.stringify(getVideoUpscaleTarget('9:16', 'fhd')), JSON.stringify({ tier: 'fhd', width: 1080, height: 1920, label: 'FHD 2단계', description: '1080 × 1920 · 최고 해상도' }));
  assert.equal(getVideoUpscaleCredit('hd'), 45);
  assert.equal(getVideoUpscaleCredit('fhd'), 70);
});

test('only a PLAYLAB public uploads video can be delegated to a worker', () => {
  const { isPlaylabVideoUrl } = load({ NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co' });
  assert.equal(isPlaylabVideoUrl('https://abc.supabase.co/storage/v1/object/public/uploads/video-renders/a.mp4'), true);
  assert.equal(isPlaylabVideoUrl('https://abc.supabase.co/storage/v1/object/public/other/a.mp4'), false);
  assert.equal(isPlaylabVideoUrl('https://example.com/a.mp4'), false);
});
