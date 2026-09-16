const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => dependencies[id] ?? {}, Math });
  return exports;
}
const presets = load('src/lib/h3-presets.ts');
const h3 = load('src/lib/server/video-workflows.ts', { '@/lib/h3-presets': presets });
const ltx = load('src/lib/server/ltx-2b-workflow.ts');
const wan = load('src/lib/server/wan-workflow.ts');
const input = { comparison: true, prompt: 'identical prompt', seed: 12345, durationSec: 6, aspectRatio: '16:9', h3Preset: 'standard20' };
test('all three workflows use identical prompt, seed and 832x480', () => {
  const a = h3.buildH3TextToVideoWorkflow(input), b = ltx.buildLtx2bWorkflow(input), c = wan.buildWanWorkflow(input);
  for (const prompt of [a['153'].inputs.prompt, b['6'].inputs.text, c['6'].inputs.text]) assert.equal(prompt, input.prompt);
  for (const seed of [a['151'].inputs.noise_seed, b['102'].inputs.noise_seed, c['3'].inputs.seed]) assert.equal(seed, 12345);
  for (const size of [[a['162'].inputs.value, a['163'].inputs.value], [b['95'].inputs.width, b['95'].inputs.height], [c['55'].inputs.width, c['55'].inputs.height]]) assert.deepEqual(size, [832,480]);
});
test('regular LTX requests retain their original dimensions', () => {
  const workflow = ltx.buildLtx2bWorkflow({ ...input, comparison: false });
  assert.equal(workflow['95'].inputs.width, 768);
  assert.equal(workflow['95'].inputs.height, 512);
});
test('comparison endpoints require admin and cannot impersonate newer models', () => {
  const source = fs.readFileSync('src/app/api/admin/video-comparison/route.ts', 'utf8');
  assert.equal((source.match(/await requireAdmin\(\)/g) || []).length, 2);
  assert.match(source, /db\.\$transaction/);
  assert.equal((source.match(/await compileVideoIntent\(/g) || []).length, 1);
  const models = load('src/lib/video-comparison.ts').COMPARISON_MODELS;
  assert.match(models[1].label, /2B 0.9.6/);
  assert.match(models[2].label, /2.2/);
});
test('comparison render reuses stored prompt, locks seed/preset and rejects non-admin', async () => {
  const renderSource = fs.readFileSync('src/app/api/video-studio/projects/[id]/render/route.ts', 'utf8');
  let role = 'admin';
  let received;
  class HttpError extends Error { constructor(message, status) { super(message); this.status = status; } }
  const comparison = { batchId: 'test', seed: 12345, preset: 'standard20', compiledPrompt: 'shared prompt' };
  const meta = { comparison, engine: 'ltx', prompt: 'original user prompt', inputMode: 'text', aspectRatio: '16:9', targetDurationSec: 6, quality: 'standard' };
  const deps = {
    '@/lib/server/h3-config': {}, '@/lib/h3-presets': presets,
    '@/lib/auth': { requireUser: async () => ({ id: 'owner', role }), HttpError },
    '@/lib/db': { db: { artifact: { findFirst: async () => ({ id: 'project', metadata: JSON.stringify(meta) }), update: async () => ({}) } } },
    '@/lib/server/handler': { readJson: async () => ({ seed: 999 }), ok: data => ({ data }), fail: error => ({ status: error.status }) },
    '@/lib/server/operation-ledger': { beginMeteredOperation: async () => ({ operationId: 'meter', creditCharged: 50 }) },
    '@/lib/server/runpod': { queueRunpodWorkflow: async () => ({ id: 'job', status: 'IN_QUEUE' }) },
    '@/lib/server/ltx-2b-workflow': { buildLtx2bWorkflow: input => { received = input; return {}; } },
    '@/lib/server/video-intent': { compileVideoIntent: () => { throw Error('must not compile per engine'); } },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(renderSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, require: id => deps[id] ?? {}, console: { log() {} }, Math, Date });
  const result = await exports.POST({}, { params: Promise.resolve({ id: 'project' }) });
  assert.equal(result.data.status, 'IN_QUEUE');
  assert.equal(received.prompt, 'shared prompt');
  assert.equal(received.seed, 12345);
  assert.equal(received.comparison, true);
  role = 'member';
  const denied = await exports.POST({}, { params: Promise.resolve({ id: 'project' }) });
  assert.equal(denied.status, 403);
});
test('saved comparison renders three playable results and reports runtime differences', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const catalog = load('src/lib/video-comparison.ts');
  const rows = catalog.COMPARISON_MODELS.map((model, index) => ({ projectId: `p${index}`, engine: model.engine, status: 'COMPLETED', videoUrl: `https://example.com/${model.engine}.mp4`, executionTime: 60000, delayTime: 1000, comparison: { batchId: 'batch', compiledPrompt: 'same prompt', preset: 'standard20', seed: 12345, createdAt: '2026-09-16T00:00:00Z', environment: { gpu: ['Blackwell'], image: 'test-image', optimized: model.engine === 'h3' } } }));
  const dependencies = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    '@tanstack/react-query': { useQuery: options => ({ data: options.queryKey[0] === 'admin-video-comparison' ? rows : rows.find(r => r.projectId === options.queryKey[1]) }) },
    '@/lib/h3-presets': presets, '@/lib/video-comparison': catalog,
    '@/components/ui/button': { Button: ({ children, variant, size, ...props }) => React.createElement('button', props, children) },
    '@/components/shared/generation-time': { GenerationTime: () => React.createElement('span', null, 'generation timing') },
    '@/components/shared/cancel-video': { CancelVideo: () => React.createElement('button', null, 'cancel') },
  };
  const exports = {};
  const source = fs.readFileSync('src/components/views/admin/video-comparison.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { exports, require: id => dependencies[id] ?? {}, Date, Map, Object });
  const html = renderToStaticMarkup(React.createElement(exports.VideoComparison));
  assert.equal((html.match(/<video /g) || []).length, 3);
  assert.match(html, /185 크레딧/);
  assert.match(html, /LTX-Video 2B/);
  assert.match(html, /Wan 2.2/);
  assert.match(html, /런타임·스텝·프레임 수는 다릅니다/);
});
