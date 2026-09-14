import { loadEnvConfig } from '@next/env';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
loadEnvConfig(process.cwd());
async function main() {
  const { uploadBuffer } = await import('../src/lib/server/storage');
  for (const [file, type] of [
    ['flux-79930492-5e8a-4a8f-b5a4-057402fa906e-e1.png', 'image/png'],
    ['ltx-2a2dda07-712d-49e7-8e8e-2cb5852eb38d-e1.mp4', 'video/mp4'],
    ['wan-5fe92b27-c02a-4bcc-9490-40fec23f8b3c-e2.mp4', 'video/mp4'],
  ]) {
    const source = readFileSync(`tmp/engine-verification/${file}`);
    const url = await uploadBuffer(`pipeline-verification/${file}`, source, type);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Stored media GET ${response.status}`);
    const downloaded = Buffer.from(await response.arrayBuffer());
    const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');
    if (hash(source) !== hash(downloaded)) throw new Error('Storage bytes differ');
    console.log(JSON.stringify({ file, url, bytes: source.length, verified: true, contentType: response.headers.get('content-type') }));
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
