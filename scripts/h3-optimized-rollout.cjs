// Explicit H3-only rollout stages. Does not submit jobs or change other engines.
const fs = require('node:fs');
const path = require('node:path');
const file = path.join(__dirname, '../local-h3-benchmark/rollout-cu130.json');
const production = ['yuusogvb9kbzzb', 'pnskne8mgep2vw'];
const canary = 'xb29don34opcv1';
const gpu = 'NVIDIA RTX PRO 6000 Blackwell Server Edition';
const headers = { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' };
async function api(route, method = 'GET', body) {
  const r = await fetch(`https://rest.runpod.io/v1${route}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`RunPod HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
async function idle(id) {
  const r = await fetch(`https://api.runpod.ai/v2/${id}/health`, { headers, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`Health HTTP ${r.status}`);
  const h = await r.json();
  if (h.jobs.inProgress || h.jobs.inQueue) throw Error(`${id}: active jobs; retry after they finish`);
}
async function main() {
  if (!process.env.RUNPOD_API_KEY) throw Error('Missing RunPod key');
  const mode = process.argv[2];
  if (mode === 'prepare') {
    const imageName = process.argv[3];
    if (!/^ghcr\.io\/jejuailabs\/playlab-h3-cu130@sha256:[a-f0-9]{64}$/.test(imageName || '')) throw Error('Use an immutable approved H3 image digest');
    if (fs.existsSync(file)) throw Error('Rollout state exists; inspect before starting another rollout');
    const snapshots = [];
    for (const id of [...production, canary]) {
      const e = await api(`/endpoints/${id}`);
      if (!e.name.startsWith('playlab-h3-')) throw Error('Endpoint identity mismatch');
      await idle(id);
      snapshots.push({ id, templateId: e.templateId, workersMin: e.workersMin, workersMax: e.workersMax, gpuTypeIds: e.gpuTypeIds, gpuCount: e.gpuCount, minCudaVersion: e.minCudaVersion });
    }
    const template = await api('/templates', 'POST', { name: 'playlab-h3-cu130-sage-highvram', imageName, isServerless: true, isPublic: false, containerDiskInGb: 30 });
    const state = { templateId: template.id, imageName, snapshots, phase: 'prepared' };
    fs.writeFileSync(file, JSON.stringify(state, null, 2));
    // Account has 10 slots: temporarily borrow one from H3, never another model.
    await api(`/endpoints/${production[1]}`, 'PATCH', { workersMax: 1, workersMin: 0 });
    await api(`/endpoints/${canary}`, 'PATCH', { templateId: template.id, gpuTypeIds: [gpu], gpuCount: 1, workersMin: 0, workersMax: 1, minCudaVersion: '13.0', idleTimeout: 5, executionTimeoutMs: 900000 });
    console.log(JSON.stringify({ canary, templateId: template.id, imageName }));
    return;
  }
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (mode === 'promote') {
    if (process.argv[3] !== '--verified-video') throw Error('Promotion requires verified canary video');
    for (const id of [...production, canary]) await idle(id);
    await api(`/endpoints/${canary}`, 'PATCH', { workersMin: 0, workersMax: 0 });
    for (const id of production) {
      await api(`/endpoints/${id}`, 'PATCH', { templateId: state.templateId, gpuTypeIds: [gpu], gpuCount: 1, workersMin: 0, workersMax: 2, minCudaVersion: '13.0', idleTimeout: 5 });
    }
    state.phase = 'promoted';
  } else if (mode === 'rollback') {
    for (const id of [...production, canary]) await idle(id);
    await api(`/endpoints/${canary}`, 'PATCH', { workersMin: 0, workersMax: 0 });
    for (const saved of state.snapshots.filter(e => production.includes(e.id))) {
      const { id, ...settings } = saved;
      await api(`/endpoints/${id}`, 'PATCH', settings);
    }
    state.phase = 'rolled-back';
  } else if (mode !== 'status') throw Error('Use prepare, promote, rollback or status');
  if (mode !== 'status') fs.writeFileSync(file, JSON.stringify(state, null, 2));
  for (const id of [...production, canary]) {
    const e = await api(`/endpoints/${id}`);
    console.log(JSON.stringify({ id, templateId: e.templateId, gpu: e.gpuTypeIds, gpuCount: e.gpuCount, min: e.workersMin, max: e.workersMax, minCudaVersion: e.minCudaVersion }));
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
