// Bounded, explicit H3 benchmark. No automatic retries or configuration changes.
// node --env-file=.env.local scripts/benchmark-h3.cjs submit <endpoint>
// node --env-file=.env.local scripts/benchmark-h3.cjs status <endpoint> <job>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'tmp', 'h3-benchmark');
function load(file, dependencies = {}) {
  const exports = {};
  const js = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(js, { exports, require: id => dependencies[id] ?? {}, Math });
  return exports;
}
async function request(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`RunPod HTTP ${r.status}`);
  return r.json();
}
async function main() {
  const [mode, endpoint, job] = process.argv.slice(2);
  if (!process.env.RUNPOD_API_KEY || !/^[a-z0-9]+$/.test(endpoint || '')) throw Error('API key and endpoint are required');
  fs.mkdirSync(outputDir, { recursive: true });
  const base = `https://api.runpod.ai/v2/${endpoint}`;
  if (mode === 'logs') {
    if (!/^[a-z0-9]+$/.test(job || '')) throw Error('Worker id required');
    let buffer = '';
    const entries = [];
    try {
      const r = await fetch(`https://api.runpod.io/v2/serverless/${endpoint}/workers/${job}/logs?tail=5000&source=container`, { headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw Error(`Logs HTTP ${r.status}`);
      const decoder = new TextDecoder();
      for await (const chunk of r.body) {
        buffer += decoder.decode(chunk, { stream: true });
        let end;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
          if (!line.startsWith('data:')) continue;
          const event = JSON.parse(line.slice(5).trim());
          event.line = String(event.line || '').replace(/\x1b\[[0-9;]*m/g, '').replace(/hf_[A-Za-z0-9]+|rpa_[A-Za-z0-9_-]+/g, '[REDACTED]');
          // Keep only performance evidence, never full handler request payloads.
          if (/pytorch version|backend cuda|Using .*attention|CUDA operations|vram state|offloading|Model .*prepared|loaded completely|loaded partially|First sampler step|Prompt executed|s\/it|it\/s|VAE .*device|Requested to load|Sampler: model|Actual Resident VRAM|Installing|Installed|Uninstalled|error:|Traceback|ERROR/.test(event.line)) entries.push(event);
        }
      }
    } catch (e) { if (e.name !== 'TimeoutError') throw e; }
    fs.writeFileSync(path.join(outputDir, `${job}-performance.json`), JSON.stringify(entries, null, 2));
    console.log(JSON.stringify(entries.filter(e => !/Actual Resident VRAM/.test(e.line)).slice(-22), null, 2));
  } else if (mode === 'submit') {
    const health = await request(`${base}/health`);
    if (health.jobs?.inProgress || health.jobs?.inQueue) throw Error('Endpoint busy; refusing to add a benchmark');
    const presets = load('src/lib/h3-presets.ts');
    const { buildH3TextToVideoWorkflow } = load('src/lib/server/video-workflows.ts', { '@/lib/h3-presets': presets });
    const input = { prompt: 'Cinematic close-up of an adult woman aged 25 beside a swimming pool in summer shade. Natural skin texture, detailed eyelashes, tiny water droplets on her cheek, damp strands of hair. Opaque white cotton T-shirt. Soft side lighting, turquoise background bokeh. A very slow straight camera push-in, one natural blink. Stable face, no cuts, no text, no speech.', durationSec: 6, aspectRatio: '16:9', h3Preset: 'standard20', seed: 12345 };
    const workflow = buildH3TextToVideoWorkflow(input);
    const startedAt = new Date().toISOString();
    const queued = await request(`${base}/run`, { input: { workflow }, policy: { executionTimeout: 600000, ttl: 900000 } });
    if (!/^[a-zA-Z0-9-]+$/.test(queued.id || '')) throw Error('Unexpected job id; inspect endpoint before resubmitting');
    const record = { endpoint, startedAt, input, workflow, queued };
    fs.writeFileSync(path.join(outputDir, `${queued.id}.json`), JSON.stringify(record, null, 2));
    console.log(JSON.stringify({ endpoint, startedAt, ...queued }));
  } else if (mode === 'status') {
    if (!/^[a-zA-Z0-9-]+$/.test(job || '')) throw Error('Valid job id required');
    const file = path.join(outputDir, `${job}.json`);
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (record.endpoint !== endpoint) throw Error('Endpoint mismatch');
    const result = await request(`${base}/status/${job}`);
    const { output, ...status } = result;
    record.lastCheckedAt = new Date().toISOString();
    record.status = status;
    if (output !== undefined) {
      fs.writeFileSync(path.join(outputDir, `${job}-output.json`), JSON.stringify(output));
      const video = output?.images?.find(x => x.type === 'base64' && /\.mp4$/i.test(x.filename || ''));
      if (video && typeof video.data === 'string') fs.writeFileSync(path.join(outputDir, `${job}.mp4`), Buffer.from(video.data, 'base64'));
    }
    fs.writeFileSync(file, JSON.stringify(record, null, 2));
    console.log(JSON.stringify({ ...status, outputKeys: output && typeof output === 'object' ? Object.keys(output) : [], resultSaved: output !== undefined }));
  } else throw Error('Use submit or status; each submit incurs GPU cost');
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
