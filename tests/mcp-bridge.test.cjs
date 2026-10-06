const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, writeFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

test('MCP lists tools, forwards authenticated jobs, and saves a finished result', async () => {
  const seen = [];
  const api = http.createServer(async (req, res) => {
    seen.push([req.method, req.url, req.headers.authorization]);
    if (req.url.startsWith('/storage/v1/object/public/uploads/')) {
      res.setHeader('content-type', 'audio/mpeg');
      res.end(Buffer.from('fake-mp3'));
      return;
    }
    res.setHeader('content-type', 'application/json');
    let data;
    if (req.url === '/api/upload' && req.method === 'POST') data = { url: `http://127.0.0.1:${api.address().port}/storage/v1/object/public/uploads/input.png` };
    else if (req.url === '/api/video-studio/projects' && req.method === 'POST') data = { id: 'video-1' };
    else if (req.url === '/api/video-studio/projects/video-1/render') data = { jobId: 'job-1', status: 'IN_QUEUE' };
    else if (req.url === '/api/video-studio/projects/video-1/render/status') data = { status: 'COMPLETED', videoUrl: `http://127.0.0.1:${api.address().port}/storage/v1/object/public/uploads/video.mp4` };
    else if (req.url === '/api/3d-studio/projects' && req.method === 'POST') data = { id: 'asset-1', status: 'generating' };
    else if (req.url === '/api/3d-studio/projects/asset-1') data = { id: 'asset-1', outputs: [{ glbUrl: `http://127.0.0.1:${api.address().port}/storage/v1/object/public/uploads/asset.glb` }] };
    else if (req.url === '/api/tools/ace-music' && req.method === 'POST') data = { artifactId: 'music-1', status: 'IN_QUEUE' };
    else if (req.url === '/api/tools/ace-music?id=music-1') data = { artifactId: 'music-1', status: 'COMPLETED', audioUrl: `http://127.0.0.1:${api.address().port}/storage/v1/object/public/uploads/music.mp3` };
    else { res.statusCode = 404; res.end(JSON.stringify({ ok: false, error: 'missing' })); return; }
    res.end(JSON.stringify({ ok: true, data }));
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${api.address().port}`;
  const dir = await mkdtemp(join(tmpdir(), 'playlab-mcp-'));
  const child = spawn(process.execPath, [resolve(__dirname, '../mcp/server.mjs')], { env: { ...process.env, PLAYLAB_URL: root, PLAYLAB_STORAGE_ORIGIN: root, PLAYLAB_OUTPUT_DIR: dir, PLAYLAB_MCP_TOKEN: `pl_mcp_${'a'.repeat(64)}` }, stdio: ['pipe', 'pipe', 'pipe'] });
  const pending = new Map();
  let buffer = '';
  child.stdout.on('data', chunk => {
    buffer += chunk.toString();
    for (let end; (end = buffer.indexOf('\n')) >= 0;) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      const result = JSON.parse(line); pending.get(result.id)?.(result); pending.delete(result.id);
    }
  });
  let nextId = 0;
  function request(method, params) {
    const id = ++nextId;
    return new Promise(resolve => { pending.set(id, resolve); child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`); });
  }
  try {
    assert.equal((await request('initialize', { protocolVersion: '2025-06-18' })).result.serverInfo.name, 'playlab-pipelines');
    assert.equal((await request('tools/list')).result.tools.length, 8);
    const call = async (name, args) => (await request('tools/call', { name, arguments: args })).result;
    const imagePath = join(dir, 'input.png');
    await writeFile(imagePath, Buffer.from('fake-png'));
    assert.match(JSON.parse((await call('playlab_upload_image', { path: imagePath })).content[0].text).imageUrl, /input\.png$/);
    assert.equal(JSON.parse((await call('playlab_create_video', { prompt: 'moonlit sea' })).content[0].text).projectId, 'video-1');
    assert.equal(JSON.parse((await call('playlab_video_status', { projectId: 'video-1' })).content[0].text).status, 'COMPLETED');
    assert.equal(JSON.parse((await call('playlab_create_3d_asset', { imageUrl: `${root}/storage/v1/object/public/uploads/input.png`, subtrack: 'character' })).content[0].text).id, 'asset-1');
    assert.equal(JSON.parse((await call('playlab_3d_status', { projectId: 'asset-1' })).content[0].text).outputs.length, 1);
    assert.equal(JSON.parse((await call('playlab_generate_music', { prompt: 'gentle piano' })).content[0].text).artifactId, 'music-1');
    const saved = JSON.parse((await call('playlab_save_result', { kind: 'music', id: 'music-1' })).content[0].text);
    assert.equal((await readFile(saved.path)).toString(), 'fake-mp3');
    assert.ok(seen.filter(row => row[0] !== 'GET' || !row[1].startsWith('/storage/')).every(row => row[2] === `Bearer pl_mcp_${'a'.repeat(64)}`));
  } finally {
    child.kill(); api.close(); await rm(dir, { recursive: true, force: true });
  }
});
