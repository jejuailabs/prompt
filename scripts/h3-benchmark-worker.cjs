// Isolated, scale-to-zero diagnostic worker. Never changes production endpoints.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const stateFile = path.join(root, 'tmp/h3-benchmark/worker-cu130.json');
const name = 'playlab-h3-benchmark-cu130-20260916';
async function api(route, method = 'GET', body) {
  const r = await fetch(`https://rest.runpod.io/v1${route}`, { method, headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`RunPod ${route}: HTTP ${r.status} ${(await r.text()).slice(0,200)}`);
  return r.json();
}
async function main() {
  if (!process.env.RUNPOD_API_KEY) throw Error('API key missing');
  const mode = process.argv[2];
  if (mode === 'pause') {
    const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const e = await api(`/endpoints/${s.endpointId}`);
    if (e.name !== name) throw Error('Refusing to modify a different endpoint');
    await api(`/endpoints/${s.endpointId}`, 'PATCH', { workersMax: 0, workersMin: 0 });
    console.log(JSON.stringify({ endpointId: s.endpointId, paused: true }));
    return;
  }
  if (mode !== 'create') throw Error('Use create or pause');
  const endpoints = await api('/endpoints');
  const existing = endpoints.find(e => e.name === name);
  if (existing) { console.log(JSON.stringify({ endpointId: existing.id, alreadyExists: true })); return; }
  const source = fs.readFileSync(path.join(root, 'runpod-workflows/h3-benchmark-bootstrap.py'));
  const template = await api('/templates', 'POST', {
    name, imageName: 'runpod/comfyui-wizard:kd77jbt8qjzp3h1zzdae7b0yz98ebrww',
    isServerless: true, isPublic: false, containerDiskInGb: 40,
    dockerStartCmd: ['python', '-u', '-c', `import base64;exec(compile(base64.b64decode('${source.toString('base64')}'),'h3-benchmark-bootstrap.py','exec'))`],
  });
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify({ templateId: template.id }, null, 2));
  const endpoint = await api('/endpoints', 'POST', {
    name, templateId: template.id, gpuTypeIds: ['NVIDIA RTX PRO 6000 Blackwell Server Edition'],
    gpuCount: 1, workersMin: 0, workersMax: 1, idleTimeout: 5,
    executionTimeoutMs: 600000, flashboot: false, scalerType: 'QUEUE_DELAY', scalerValue: 4,
    minCudaVersion: '13.0',
  });
  fs.writeFileSync(stateFile, JSON.stringify({ templateId: template.id, endpointId: endpoint.id }, null, 2));
  console.log(JSON.stringify({ templateId: template.id, endpointId: endpoint.id }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
