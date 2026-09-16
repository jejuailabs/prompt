const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('H3 selected GPU routes queue and polling, preserving legacy jobs', async () => {
  const calls = [];
  const exports = {};
  const source = fs.readFileSync('src/lib/server/runpod.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(js, { exports, process: { env: { RUNPOD_API_KEY: 'test', RUNPOD_H3_ENDPOINT_ID: 'legacy', RUNPOD_H3_BLACKWELL_ENDPOINT_ID: 'blackwell', RUNPOD_WAN_ENDPOINT_ID: 'wan' } }, fetch: async (url) => { calls.push(url); return { ok: true, json: async () => ({ id: 'job', status: 'IN_QUEUE' }) }; } });
  assert.equal(exports.getRunpodEndpointId('h3'), 'legacy');
  assert.equal(exports.getRunpodEndpointId('h3', '5090'), 'legacy');
  assert.equal(exports.getRunpodEndpointId('h3', 'blackwell'), 'blackwell');
  assert.equal(exports.getRunpodEndpointId('wan', 'blackwell'), 'wan');
  await exports.queueRunpodWorkflow('h3', {}, undefined, 'blackwell');
  await exports.getRunpodJobStatus('h3', 'job', 'blackwell');
  await exports.getRunpodJobStatus('h3', 'old-job');
  assert.deepEqual(calls, ['https://api.runpod.ai/v2/blackwell/run', 'https://api.runpod.ai/v2/blackwell/status/job', 'https://api.runpod.ai/v2/legacy/status/old-job']);
  for (const action of ['status', 'cancel']) {
    const route = fs.readFileSync(`src/app/api/video-studio/projects/[id]/render/${action}/route.ts`, 'utf8');
    assert.match(route, /render\.h3Gpu/);
  }
});
