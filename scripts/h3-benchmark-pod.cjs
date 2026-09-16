const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const stateFile = path.join(root, 'local-h3-benchmark/pod.json');
const name = 'playlab-h3-controlled-benchmark-20260916';
async function api(route, method = 'GET', body) {
  const r = await fetch(`https://rest.runpod.io/v1${route}`, { method, headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`HTTP ${r.status}: ${(await r.text()).slice(0,500)}`);
  return r.status === 204 ? {} : r.json();
}
async function main() {
  const mode = process.argv[2];
  if (mode === 'create') {
    const existing = (await api('/pods')).find(x => x.name === name);
    if (existing) throw Error(`Benchmark Pod already exists: ${existing.id}`);
    const key = fs.readFileSync(path.join(root, 'local-h3-benchmark/id_ed25519.pub'), 'utf8').trim();
    const boot = 'set -eu\nexport DEBIAN_FRONTEND=noninteractive\napt-get update\napt-get install -y --no-install-recommends openssh-server python3 python3-venv git curl ca-certificates ffmpeg libgl1 libglib2.0-0\nmkdir -p /root/.ssh /run/sshd /benchmark\nchmod 700 /root/.ssh\nprintf "%s\\n" "$PUBLIC_KEY" > /root/.ssh/authorized_keys\nchmod 600 /root/.ssh/authorized_keys\nssh-keygen -A\n/usr/sbin/sshd\necho H3_DIAGNOSTIC_SSH_READY\nsleep 7200';
    const p = await api('/pods', 'POST', {
      name, imageName: 'ubuntu:24.04',
      cloudType: 'SECURE', computeType: 'GPU', gpuCount: 1,
      gpuTypeIds: ['NVIDIA RTX PRO 6000 Blackwell Server Edition'],
      containerDiskInGb: 150, volumeInGb: 0, minVCPUPerGPU: 8,
      minRAMPerGPU: 32, supportPublicIp: true, ports: ['22/tcp'],
      env: { PUBLIC_KEY: key, NVIDIA_VISIBLE_DEVICES:'all', NVIDIA_DRIVER_CAPABILITIES:'compute,utility' },
      dockerStartCmd: ['bash', '-lc', boot],
    });
    fs.writeFileSync(stateFile, JSON.stringify({ id: p.id, name, createdAt: new Date().toISOString() }, null, 2));
    console.log(JSON.stringify({ id: p.id, desiredStatus: p.desiredStatus, costPerHr: p.costPerHr }));
    return;
  }
  const s = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  const p = await api(`/pods/${s.id}`);
  if (p.name !== name) throw Error('Pod identity mismatch');
  if (mode === 'reimage') {
    const key = fs.readFileSync(path.join(root, 'local-h3-benchmark/id_ed25519.pub'), 'utf8').trim();
    const boot = 'set -eu\nexport DEBIAN_FRONTEND=noninteractive\napt-get update\napt-get install -y openssh-server python3 python3-venv git curl ca-certificates ffmpeg libgl1 libglib2.0-0\nmkdir -p /root/.ssh /run/sshd /benchmark\nchmod 700 /root/.ssh\nprintf "%s\\n" "$PUBLIC_KEY" > /root/.ssh/authorized_keys\nchmod 600 /root/.ssh/authorized_keys\nssh-keygen -A\n/usr/sbin/sshd\necho H3_DIAGNOSTIC_SSH_READY\nsleep 3600';
    await api(`/pods/${s.id}`, 'PATCH', { imageName: 'ubuntu:24.04', dockerEntrypoint: [], dockerStartCmd: ['bash', '-lc', boot], env: { PUBLIC_KEY:key, NVIDIA_VISIBLE_DEVICES:'all', NVIDIA_DRIVER_CAPABILITIES:'compute,utility' } });
    console.log('Diagnostic Pod switched to minimal Ubuntu image'); return;
  }
  if (mode === 'delete') { await api(`/pods/${s.id}`, 'DELETE'); console.log('Diagnostic Pod deleted'); return; }
  if (mode !== 'status') throw Error('Use create, status, delete');
  console.log(JSON.stringify({ id:p.id, desiredStatus:p.desiredStatus, publicIp:p.publicIp, portMappings:p.portMappings, costPerHr:p.costPerHr, gpu:p.gpuTypeId, machine:p.machine && {dataCenterId:p.machine.dataCenterId}, runtime:p.runtime }));
}
main().catch(e => { console.error(e.message); process.exitCode=1; });
