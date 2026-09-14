import { loadEnvConfig } from '@next/env';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildWanWorkflow } from '../src/lib/server/wan-workflow';
import { buildLtx2bWorkflow } from '../src/lib/server/ltx-2b-workflow';
import { buildFluxWorkflow } from '../src/lib/server/flux-workflow';
import { buildH3TextToVideoWorkflow } from '../src/lib/server/video-workflows';
import { getRunpodJobStatus, queueRunpodWorkflow } from '../src/lib/server/runpod';

loadEnvConfig(process.cwd());
async function main() {
  const jobId = process.argv[2];
  const engine = process.argv[3] === 'h3' ? 'h3' : process.argv[3] === 'flux' ? 'flux' : process.argv[3] === 'ltx' ? 'ltx' : 'wan';
  if (jobId && jobId !== 'submit') {
    const result = await getRunpodJobStatus(engine, jobId);
    const output = result.output as { images?: { data?: string }[] } | undefined;
    if (result.status === 'COMPLETED' && output?.images?.[0]?.data) {
      const directory = resolve('tmp', 'engine-verification');
      mkdirSync(directory, { recursive: true });
      const path = resolve(directory, `${engine}-${jobId}.${engine === 'flux' ? 'png' : 'mp4'}`);
      writeFileSync(path, Buffer.from(output.images[0].data, 'base64'));
      console.log(JSON.stringify({ ...result, output: { path } }));
    } else {
      console.log(JSON.stringify({ ...result, output: result.output ? JSON.stringify(result.output).slice(0, 1500) : undefined }));
    }
    return;
  }
  const build = engine === 'h3' ? buildH3TextToVideoWorkflow : engine === 'ltx' ? buildLtx2bWorkflow : buildWanWorkflow;
  const imagePath = process.argv[4];
  const images = imagePath ? [{ name: 'verification.png', image: readFileSync(imagePath).toString('base64') }] : undefined;
  const job = await queueRunpodWorkflow(engine, engine === 'flux' ? buildFluxWorkflow('A red toy boat on calm blue water, soft daylight.') : build({
    prompt: 'A red toy boat gently floating on calm blue water, soft daylight, slow camera movement.',
    durationSec: 6,
    aspectRatio: '16:9',
    ...(images ? { firstFrameName: 'verification.png' } : {}),
  }), images);
  console.log(JSON.stringify(job));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
