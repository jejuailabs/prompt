const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, extras = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { exports, require: (name) => name in mocks ? mocks[name] : require(name), console, Buffer, Date, process, AbortSignal, URL, ...extras });
  return exports;
}

test('API access defaults closed; only explicit server grants and active admins pass', async () => {
  let raw = null;
  const access = load('src/lib/server/api-access.ts', { '@/lib/db': { db: { setting: { findUnique: async () => raw === null ? null : { value: raw } } } } });
  const member = { id: 'member', role: 'user', banned: false };
  assert.equal(await access.canUsePaidApi(member), false);
  for (raw of ['{}', '{', 'true', '{"enabled":"true","grantedBy":"admin"}', '{"enabled":true}', '{"enabled":false,"grantedBy":"admin"}']) assert.equal(await access.canUsePaidApi(member), false);
  raw = '{"enabled":true,"grantedBy":"admin"}';
  assert.equal(await access.canUsePaidApi(member), true);
  assert.equal(await access.canUsePaidApi({ ...member, banned: true }), false);
  assert.equal(await access.canUsePaidApi({ ...member, role: 'admin' }), true);
  raw = '{"enabled":false,"grantedBy":"admin"}';
  assert.equal(await access.canUsePaidApi(member), false, 'revocation applies on the next request');
});

test('unauthorized metered operations never create jobs or charge credits', async () => {
  let writes = 0;
  const ledger = load('src/lib/server/operation-ledger.ts', {
    '@/lib/auth': { assertApiAccessForUserId: async () => { throw new Error('denied'); } },
    '@/lib/db': { db: new Proxy({}, { get() { writes++; throw new Error('unexpected DB write'); } }) },
    '@/lib/events': { logEvent: async () => {} }, '@/lib/server/credits': { chargeCredits: async () => { writes++; } },
  });
  await assert.rejects(() => ledger.beginMeteredOperation({ userId: 'member', engine: 'qwen3_tts', prompt: 'hello' }), /denied/);
  assert.equal(writes, 0);
});

test('RunPod rejects unauthorized requests before provider contact and caps TTS lifetime', async () => {
  let allowed = false; const requests = []; let onDemandChecked = false;
  const runpod = load('src/lib/server/runpod.ts', {
    '@/lib/auth': { requireApiUser: async () => { if (!allowed) throw new Error('denied'); } },
    '@/lib/server/runpod-admin': { assertRunpodEngineEnabled: async () => {}, resolveManagedRunpodEndpointId: async () => 'tts-endpoint', assertRunpodOnDemand: async () => { onDemandChecked = true; } },
  }, { fetch: async (url, init) => { requests.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ id: 'job', status: 'IN_QUEUE' }) }; }, process: { env: { RUNPOD_API_KEY: 'test-only' } } });
  await assert.rejects(() => runpod.queueRunpodJob('qwen3_tts', { text: 'hello' }), /denied/);
  assert.equal(requests.length, 0);
  allowed = true;
  await runpod.queueRunpodJob('qwen3_tts', { text: 'hello' }, { policy: { executionTimeout: 9_000_000, ttl: 9_000_000 } });
  assert.equal(onDemandChecked, true);
  assert.equal(requests[0].body.policy.executionTimeout, 600_000);
  assert.equal(requests[0].body.policy.ttl, 900_000);
});

test('TTS refuses an always-on worker configuration', async () => {
  let minimum = 1;
  const admin = load('src/lib/server/runpod-admin.ts', { '@/lib/db': { db: {} } }, {
    fetch: async () => ({ ok: true, json: async () => ({ workersMin: minimum, workersMax: 1 }) }), process: { env: { RUNPOD_API_KEY: 'test-only' } },
  });
  await assert.rejects(() => admin.assertRunpodOnDemand('tts'), /최소 0개/);
  minimum = 0;
  await admin.assertRunpodOnDemand('tts');
});

test('concurrent failure/cancellation refunds a metered job exactly once', async () => {
  let status = 'queued', credits = 0, transactions = 0;
  const tx = {
    generationJob: { findUnique: async () => ({ id: 'job', userId: 'member', status, creditCharged: 15 }), updateMany: async () => { if (status === 'failed') return { count: 0 }; status = 'failed'; return { count: 1 }; } },
    creditTransaction: { create: async () => { transactions++; } }, credits: { upsert: async ({ update }) => { credits += update.balance.increment; } },
  };
  const ledger = load('src/lib/server/operation-ledger.ts', { '@/lib/db': { db: { $transaction: async (fn) => fn(tx) } }, '@/lib/events': { logEvent: async () => {} }, '@/lib/server/credits': {}, '@/lib/auth': {} });
  await Promise.all([ledger.failMeteredOperation('job', 'cancel'), ledger.failMeteredOperation('job', 'timeout')]);
  assert.equal(transactions, 1); assert.equal(credits, 15);
});

test('expired TTS records are failed and refunded even if provider status has disappeared', async () => {
  let cancelled = 0, refunded = 0;
  const artifact = { id: 'audio', metadata: JSON.stringify({ provider: 'qwen', jobId: 'job', operationId: 'op', status: 'QUEUED', queuedAt: new Date(Date.now() - 960_000).toISOString() }) };
  const route = load('src/app/api/tools/tts/route.ts', {
    '@/lib/auth': { requireUser: async () => ({ id: 'member' }) },
    '@/lib/db': { db: { artifact: { findFirst: async () => artifact, update: async ({ data }) => ({ ...artifact, ...data }) } } },
    '@/lib/server/handler': { ok: (data) => data, fail: (error) => { throw error; } },
    '@/lib/server/operation-ledger': { failMeteredOperation: async () => { refunded++; } },
    '@/lib/server/tts': { ttsProvider: () => ({ check: async () => { throw new Error('status not found'); }, cancel: async () => { cancelled++; } }) },
    '@/lib/server/voice-reference-storage': {}, '@/lib/tts-voices': { TTS_LANGUAGES: [{ id: 'Korean' }] },
  });
  const result = await route.GET({ url: 'https://example.test/api/tools/tts?id=audio' });
  assert.equal(result.status, 'FAILED'); assert.equal(cancelled, 1); assert.equal(refunded, 1);
});
