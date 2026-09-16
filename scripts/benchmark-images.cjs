// Explicit, bounded comparison. Never automatically retries a paid generation.
// node --env-file=.env.local scripts/benchmark-images.cjs submit qwen|flux portrait|architecture
// node --env-file=.env.local scripts/benchmark-images.cjs status qwen|flux <job-id>
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'local-image-comparison');
const endpoints = { qwen: '50ix6zz1yiywxl', flux: '903tt7vd8o46yp' };
const prompts = {
  portrait: 'Cinematic close-up photograph of a 25-year-old adult Korean woman beside a swimming pool in summer shade. Natural skin pores, detailed eyelashes, tiny water droplets on her cheek, individual damp strands of dark hair. Opaque white cotton T-shirt. Soft side lighting, turquoise background bokeh. Thoughtful subtle expression, realistic anatomy, restrained natural colors, 85mm lens, shallow depth of field. No text, no watermark.',
  architecture: 'Photorealistic architectural photograph of a contemporary two-story house in Jeju, white textured stucco, dark basalt stone entrance, large black-framed windows reflecting the sky, warm wooden deck, low green shrubs, lawn and a stepping stone path. Late afternoon soft sunlight, realistic straight vertical lines, finely detailed wood grain and stone texture, natural restrained colors, professional 35mm architectural photography. No people, no text, no watermark.'
};
async function api(url, body) {
  const r = await fetch(url, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw Error(`RunPod HTTP ${r.status}: ${(await r.text()).slice(0,300)}`);
  return r.json();
}
async function main() {
  const [mode, engine, arg] = process.argv.slice(2);
  if (!process.env.RUNPOD_API_KEY || !endpoints[engine]) throw Error('Missing key or invalid engine');
  const base = `https://api.runpod.ai/v2/${endpoints[engine]}`;
  fs.mkdirSync(dir, { recursive: true });
  if (mode === 'submit') {
    if (!prompts[arg]) throw Error('Use portrait or architecture');
    const recordPath = path.join(dir, `${engine}-${arg}.json`);
    if (fs.existsSync(recordPath)) throw Error('Existing submission record: inspect it, do not duplicate');
    const health = await api(`${base}/health`);
    if (health.jobs?.inProgress || health.jobs?.inQueue) throw Error('Endpoint busy');
    const prompt = prompts[arg];
    let input = { prompt, size: '1024x1024', seed: 12345, num_inference_steps: 50, guidance_scale: 4, response_format: 'b64_json' };
    if (engine === 'flux') {
      const exports = {};
      const js = ts.transpileModule(fs.readFileSync(path.join(root,'src/lib/server/flux-workflow.ts'),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
      vm.runInNewContext(js, {exports, Math});
      const workflow = exports.buildFluxWorkflow(prompt, 1024, 1024);
      workflow['7'].inputs.noise_seed = 12345;
      input = {workflow};
    }
    const record = {engine, endpoint:endpoints[engine], subject:arg, prompt, width:1024,height:1024,seed:12345,input,submittedAt:new Date().toISOString()};
    // Record intent first: uncertain network outcomes must not cause a duplicate paid submission.
    fs.writeFileSync(recordPath, JSON.stringify(record,null,2));
    const queued = await api(`${base}/run`, {input,policy:{executionTimeout:600000,ttl:1800000}});
    record.queued = queued;
    fs.writeFileSync(recordPath, JSON.stringify(record,null,2));
    console.log(JSON.stringify({engine,subject:arg,...queued}));
  } else if (mode === 'status') {
    if (!/^[a-zA-Z0-9-]+$/.test(arg || '')) throw Error('Invalid job id');
    const result = await api(`${base}/status/${arg}`);
    const {output,...status}=result;
    fs.writeFileSync(path.join(dir,`${engine}-${arg}-status.json`),JSON.stringify(status,null,2));
    if(output!==undefined) fs.writeFileSync(path.join(dir,`${engine}-${arg}-output.json`),JSON.stringify(output));
    let saved=0;
    function collect(value){
      if(!value || typeof value!=='object')return;
      const encoded = typeof value.b64_json==='string' ? value.b64_json : value.type==='base64' && typeof value.data==='string' ? value.data : null;
      if(encoded){const b=Buffer.from(encoded.replace(/^data:image\/[^;]+;base64,/,''),'base64'); if(b.subarray(1,4).toString()==='PNG'||b[0]===255&&b[1]===216){fs.writeFileSync(path.join(dir,`${engine}-${arg}-${saved++}.png`),b);}}
      for(const v of Object.values(value))if(typeof v==='object')collect(v);
    }
    collect(output);
    console.log(JSON.stringify({...status,saved,outputKeys:output&&typeof output==='object'?Object.keys(output):[],outputSummary:typeof output==='string'?output.slice(0,200):undefined}));
  } else if(mode==='health') console.log(JSON.stringify(await api(`${base}/health`)));
  else throw Error('Use submit/status/health');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
