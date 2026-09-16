const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(path, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require: id => dependencies[id] ?? {}, Math });
  return exports;
}
const presets = load('src/lib/h3-presets.ts');
const workflow = load('src/lib/server/video-workflows.ts', { '@/lib/h3-presets': presets });
test('three presets produce correct sampler steps and LoRA switches', () => {
  for (const [preset, steps, turbo] of [['turbo8', 8, true], ['standard20', 20, false], ['standard30', 30, false]]) {
    const w = workflow.buildH3TextToVideoWorkflow({ prompt: 'test', durationSec: 6, aspectRatio: '16:9', h3Preset: preset, seed: 12345 });
    assert.equal(w['161'].inputs.value, turbo);
    assert.equal(w[turbo ? '160' : '159'].inputs.value, steps);
    assert.equal(w['151'].inputs.noise_seed, 12345);
  }
});
test('preview is approximately half pixels and retains compatible dimensions', () => {
  for (const aspect of ['16:9', '9:16', '1:1']) {
    const a = presets.h3Size(aspect), b = presets.h3Size(aspect, true);
    const ratio = b.width * b.height / (a.width * a.height);
    assert.ok(ratio >= .45 && ratio <= .51);
    assert.equal(b.width % 32, 0); assert.equal(b.height % 32, 0);
  }
  assert.equal(presets.isH3Preset('toString'), false);
});
test('preview charges half only for H3; other engines unaffected', async () => {
  const charges = [];
  const db = { modelProvider: { upsert: async () => ({ id: 'provider' }) }, generationJob: { create: async () => ({ id: 'op' }), update: async () => ({}), delete: async () => ({}) } };
  const ledger = load('src/lib/server/operation-ledger.ts', { '@/lib/db': { db }, '@/lib/events': { logEvent: async () => {} }, '@/lib/server/credits': { chargeCredits: async (_, amount) => charges.push(amount) } });
  await ledger.beginMeteredOperation({ userId: 'u', engine: 'h3', prompt: 'x', preview: true });
  await ledger.beginMeteredOperation({ userId: 'u', engine: 'h3', prompt: 'x', preview: false });
  await ledger.beginMeteredOperation({ userId: 'u', engine: 'wan', prompt: 'x', preview: true });
  assert.deepEqual(charges, [40, 80, 55]);
});
