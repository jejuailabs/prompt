// One explicitly requested TRELLIS job; no retries, loops, scheduler or uploads.
// node --env-file=.env.local scripts/benchmark-character.cjs submit|status
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const runName = process.argv[3] || 'trellis-dwarf';
if (!/^[a-z0-9-]{1,60}$/.test(runName)) throw Error('Invalid test run name');
const directory = path.resolve('local-character-test', runName);
const manifestPath = path.join(directory, 'job.json');
const endpoint = process.env.RUNPOD_TRELLIS_ENDPOINT_ID;
const headers = { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' };
const write = value => fs.writeFileSync(manifestPath, JSON.stringify(value, null, 2));
async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw Error(`RunPod HTTP ${response.status}`);
  return response.json();
}
async function main() {
  if (!endpoint || !process.env.RUNPOD_API_KEY) throw Error('RunPod configuration missing');
  if (process.argv[2] === 'submit') {
    if (fs.existsSync(manifestPath)) throw Error('Test already recorded. Inspect status; never resubmit blindly.');
    const config = await request(`https://rest.runpod.io/v1/endpoints/${endpoint}`);
    if (config.workersMax < 1) throw Error('TRELLIS has no allocated worker. Obtain temporary capacity approval first.');
    fs.mkdirSync(directory, { recursive: true });
    const record = { endpoint, requestedAt: new Date().toISOString(), state: 'SUBMISSION_PENDING',
      input: { input_image: 'https://raw.githubusercontent.com/microsoft/TRELLIS/main/assets/example_image/typical_humanoid_dwarf.png',
        resolution: 512, texture_size: 1024, seed: 42, output_format: 'glb' } };
    write(record); // An uncertain response must not lead to a duplicate paid job.
    const job = await request(`https://api.runpod.ai/v2/${endpoint}/run`, { method: 'POST',
      body: JSON.stringify({ input: record.input, policy: { executionTimeout: 600000, ttl: 900000 } }) });
    write({ ...record, jobId: job.id, state: job.status });
    console.log(JSON.stringify({ jobId: job.id, status: job.status }));
  } else if (process.argv[2] === 'status') {
    const record = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (!record.jobId) throw Error('Uncertain submission: inspect provider queue manually, do not resubmit.');
    const job = await request(`https://api.runpod.ai/v2/${record.endpoint}/status/${record.jobId}`);
    const result = { ...record, state: job.status, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime,
      checkedAt: new Date().toISOString(), error: job.error || job.output?.error,
      stage: typeof job.output === 'string' ? job.output : job.output?.stage, traceback: job.output?.traceback, diagnostics: job.output?.diagnostics };
    if (job.status === 'COMPLETED' && typeof job.output?.model === 'string') {
      const model = Buffer.from(job.output.model, 'base64');
      if (model.length < 20 || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(8) !== model.length) throw Error('Invalid GLB');
      fs.writeFileSync(path.join(directory, 'original.glb'), model);
      result.bytes = model.length;
      result.sha256 = crypto.createHash('sha256').update(model).digest('hex');
      result.metadata = job.output.metadata;
    }
    write(result);
    console.log(JSON.stringify(result, null, 2));
  } else throw Error('Use submit or status');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
