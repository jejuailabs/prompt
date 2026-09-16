// Run with: node --env-file=.env.local scripts/verify-trellis-result.cjs JOB_ID
// Read an existing job only; never queues another GPU job or charges credits.
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const jobId = process.argv[2];
  if (!/^[a-z0-9-]+$/i.test(jobId || '')) throw Error('A job ID is required');
  const endpoint = process.env.RUNPOD_TRELLIS_ENDPOINT_ID;
  if (!endpoint) throw Error('RUNPOD_TRELLIS_ENDPOINT_ID is missing');
  const response = await fetch(`https://api.runpod.ai/v2/${endpoint}/status/${jobId}`, {
    headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` },
  });
  if (!response.ok) throw Error(`RunPod HTTP ${response.status}`);
  const job = await response.json();
  if (job.status !== 'COMPLETED' || typeof job.output?.model !== 'string') {
    console.log(JSON.stringify({ status: job.status, error: job.error || job.output?.error }));
    return;
  }
  const model = Buffer.from(job.output.model, 'base64');
  if (model.length < 20 || model.length > 50 * 1024 * 1024 || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(4) !== 2 || model.readUInt32LE(8) !== model.length) throw Error('Invalid GLB 2.0');
  const jsonLength = model.readUInt32LE(12);
  if (model.toString('ascii', 16, 20) !== 'JSON' || 20 + jsonLength > model.length) throw Error('Invalid GLB JSON chunk');
  const scene = JSON.parse(model.toString('utf8', 20, 20 + jsonLength));
  if (!scene.meshes?.length || !scene.meshes.some(m => m.primitives?.length)) throw Error('GLB has no mesh');
  const outputPath = path.resolve('tmp', `trellis-${jobId}.glb`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, model);
  const result = { status: job.status, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime, metadata: job.output.metadata, bytes: model.length, meshes: scene.meshes.length, materials: scene.materials?.length, images: scene.images?.length, outputPath };
  if (!process.argv.includes('--upload')) {
    console.log(JSON.stringify(result));
    return;
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const storagePath = `3d/verification/${jobId}.glb`;
  const { error } = await supabase.storage.from('uploads').upload(storagePath, model, { contentType: 'model/gltf-binary', upsert: true });
  if (error) throw Error(`Storage: ${error.message}`);
  const { data } = supabase.storage.from('uploads').getPublicUrl(storagePath);
  const stored = await fetch(data.publicUrl);
  if (!stored.ok) throw Error(`Stored GLB HTTP ${stored.status}`);
  const downloaded = Buffer.from(await stored.arrayBuffer());
  if (!downloaded.equals(model)) throw Error('Stored GLB content mismatch');
  console.log(JSON.stringify({ status: job.status, delayTimeMs: job.delayTime, executionTimeMs: job.executionTime, metadata: job.output.metadata, bytes: model.length, meshes: scene.meshes.length, materials: scene.materials?.length, images: scene.images?.length, outputPath, url: data.publicUrl }));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
