// Explicit, single-operation deployment/diagnostic helper. No retries or scheduler.
const fs = require('node:fs');
const path = require('node:path');
const folder = path.resolve('local-character-test/blackwell-runtime');
const file = path.join(folder, 'deployment.json');
const trellis = 'fmxxi8wa0gxkcm';
const ltx = 'cc4ev49nha1sdl';
const base = 'https://rest.runpod.io/v1/';
const jobs = `https://api.runpod.ai/v2/${trellis}/`;
const save = data => { fs.mkdirSync(folder, { recursive: true }); fs.writeFileSync(file, JSON.stringify(data, null, 2)); };
const read = () => JSON.parse(fs.readFileSync(file, 'utf8'));
async function api(url, method = 'GET', body) {
  const response = await fetch(url, { method, headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error(`RunPod ${method}: HTTP ${response.status}`);
  return response.json();
}
async function main() {
  if (!process.env.RUNPOD_API_KEY) throw Error('Missing API key');
  const action = process.argv[2];
  if (action === 'deploy') {
    const image = process.argv[3];
    if (!/^ghcr\.io\/jejuailabs\/playlab-trellis-blackwell@sha256:[0-9a-f]{64}$/.test(image || '')) throw Error('Immutable image required');
    if (fs.existsSync(file)) throw Error('Deployment already recorded. Inspect before changing it.');
    const endpoint = await api(base + 'endpoints/' + trellis);
    if (endpoint.workersMax !== 0 || endpoint.workersMin !== 0) throw Error('TRELLIS must be stopped first');
    const old = await api(base + 'templates/' + endpoint.templateId);
    const storage = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
    if (storage.protocol !== 'https:') throw Error('HTTPS storage origin required');
    const record = { oldTemplate: old.id, image, createdAt: new Date().toISOString(), state: 'TEMPLATE_PENDING' };
    save(record);
    const template = await api(base + 'templates', 'POST', {
      name: 'playlab-trellis-blackwell-cu130', imageName: image, category: 'NVIDIA', isServerless: true, isPublic: false,
      containerDiskInGb: old.containerDiskInGb, volumeInGb: 0, volumeMountPath: old.volumeMountPath || '/runpod-volume',
      dockerEntrypoint: [], dockerStartCmd: ['python', '-u', '/app/handler.py'],
      env: { ...old.env, IMAGE_STORAGE_HOST: storage.hostname, CUDA_LAUNCH_BLOCKING: '1' },
    });
    record.templateId = template.id; record.state = 'TEMPLATE_CREATED'; save(record);
    await api(base + 'endpoints/' + trellis, 'PATCH', { templateId: template.id });
    const verified = await api(base + 'endpoints/' + trellis);
    if (verified.templateId !== template.id) throw Error('Template change not confirmed');
    record.state = 'DEPLOYED'; save(record); console.log(JSON.stringify(record));
  } else if (action === 'allocate') {
    const record = read();
    const a = await api(base + 'endpoints/' + ltx), b = await api(base + 'endpoints/' + trellis);
    if (a.workersMax !== 2 || b.workersMax !== 0 || b.templateId !== record.templateId) throw Error('Allocation differs from approved baseline');
    await api(base + 'endpoints/' + ltx, 'PATCH', { workersMin: 0, workersMax: 1 });
    try { await api(base + 'endpoints/' + trellis, 'PATCH', { workersMin: 0, workersMax: 1 }); }
    catch (error) { await api(base + 'endpoints/' + ltx, 'PATCH', { workersMin: 0, workersMax: 2 }); throw error; }
    console.log('Temporary LTX=1 TRELLIS=1 allocation applied');
  } else if (action === 'restore') {
    const health = await api(jobs + 'health');
    if (health.jobs?.inProgress || health.jobs?.inQueue) throw Error('Jobs active; inspect/cancel before restoration');
    await api(base + 'endpoints/' + trellis, 'PATCH', { workersMin: 0, workersMax: 0 });
    await api(base + 'endpoints/' + ltx, 'PATCH', { workersMin: 0, workersMax: 2 });
    const a = await api(base + 'endpoints/' + ltx), b = await api(base + 'endpoints/' + trellis);
    console.log(JSON.stringify({ ltxMax: a.workersMax, trellisMax: b.workersMax }));
  } else if (action === 'diagnose') {
    const record = read();
    if (record.diagnosticSubmission) throw Error('Diagnostic already submitted; inspect status');
    record.diagnosticSubmission = new Date().toISOString(); save(record);
    const job = await api(jobs + 'run', 'POST', { input: { action: 'diagnose' }, policy: { executionTimeout: 120000, ttl: 900000 } });
    record.diagnosticJobId = job.id; save(record); console.log(JSON.stringify(job));
  } else if (action === 'status') {
    const record = read();
    if (!record.diagnosticJobId) throw Error('No diagnostic job');
    const job = await api(jobs + 'status/' + record.diagnosticJobId);
    record.diagnostic = job; save(record); console.log(JSON.stringify(job, null, 2));
  } else if (action === 'health') console.log(JSON.stringify(await api(jobs + 'health')));
  else throw Error('Use deploy|allocate|restore|diagnose|status|health');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
