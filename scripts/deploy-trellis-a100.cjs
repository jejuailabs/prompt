// Explicit deployment only; no automatic submissions or retries.
const fs = require('node:fs');
const file = 'local-character-test/a100-serverless-deployment.json';
async function api(route, method = 'GET', body) {
  const r = await fetch('https://rest.runpod.io/v1/' + route, {
    method, headers: {Authorization: 'Bearer ' + process.env.RUNPOD_API_KEY, 'Content-Type': 'application/json'},
    ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(45000)
  });
  if (!r.ok) throw Error('RunPod HTTP ' + r.status);
  return r.json();
}
async function main() {
  const image = process.argv[2];
  if (!/^ghcr\.io\/jejuailabs\/playlab-trellis-blackwell@sha256:[a-f0-9]{64}$/.test(image || '')) throw Error('Immutable digest required');
  if (fs.existsSync(file)) throw Error('Deployment recorded; inspect before repeating');
  const endpoint = await api('endpoints/fmxxi8wa0gxkcm');
  const ltx = await api('endpoints/cc4ev49nha1sdl');
  if (endpoint.workersMax !== 0 || endpoint.workersMin !== 0 || ltx.workersMax !== 2) throw Error('Unexpected baseline');
  const old = await api('templates/' + endpoint.templateId);
  const record = {state: 'PENDING', previousTemplateId: endpoint.templateId, image};
  const save = () => fs.writeFileSync(file, JSON.stringify(record, null, 2));
  save();
  const template = await api('templates', 'POST', {
    name: 'playlab-trellis-a100-cu130', imageName: image, category: 'NVIDIA', isServerless: true, isPublic: false,
    containerDiskInGb: 100, volumeInGb: 0, volumeMountPath: '/runpod-volume',
    dockerEntrypoint: [], dockerStartCmd: ['python', '-u', '/app/handler.py'],
    env: {...old.env, EXPECTED_GPU_ARCH: '8.0', CUDA_LAUNCH_BLOCKING: '0'}
  });
  record.templateId = template.id; record.state = 'TEMPLATE_CREATED'; save();
  await api('endpoints/cc4ev49nha1sdl', 'PATCH', {workersMin: 0, workersMax: 1});
  record.state = 'LTX_ALLOCATED'; save();
  await api('endpoints/fmxxi8wa0gxkcm', 'PATCH', {
    templateId: template.id, gpuTypeIds: ['NVIDIA A100-SXM4-80GB', 'NVIDIA A100 80GB PCIe'],
    gpuCount: 1, workersMin: 0, workersMax: 1, idleTimeout: 5, executionTimeoutMs: 600000
  });
  const verified = await api('endpoints/fmxxi8wa0gxkcm');
  if (verified.templateId !== template.id || verified.workersMin !== 0 || verified.workersMax !== 1 || verified.gpuTypeIds.some(g => !g.includes('A100'))) throw Error('Verification failed');
  record.state = 'DEPLOYED'; record.verifiedAt = new Date().toISOString(); save();
  console.log(JSON.stringify(record));
}
main().catch(e => {console.error(e.message); process.exitCode = 1;});
