#!/usr/bin/env node
// Local stdio MCP bridge. All generation and ownership checks remain in PLAYLAB's API.
import readline from 'node:readline';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join, basename, extname } from 'node:path';

const origin = (process.env.PLAYLAB_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const token = process.env.PLAYLAB_MCP_TOKEN || '';
const outputDir = resolve(process.env.PLAYLAB_OUTPUT_DIR || './playlab-outputs');
const object = { type: 'object', additionalProperties: false };
const str = (description) => ({ type: 'string', description });
const tools = [
  { name: 'playlab_upload_image', description: 'Upload a local PNG/JPEG/WebP image (up to 5 MB) to PLAYLAB for image-to-3D generation. Returns an imageUrl to pass to playlab_create_3d_asset.', inputSchema: { ...object, properties: { path: str('Absolute local image file path') }, required: ['path'] } },
  { name: 'playlab_create_video', description: 'Create a PLAYLAB video project and start a credit-charging render. Returns project and job IDs.', inputSchema: { ...object, properties: { prompt: str('Video scene description, at least 3 characters'), title: str('Optional project title'), durationSec: { type: 'integer', minimum: 4, maximum: 15 }, aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1'] }, quality: { type: 'string', enum: ['draft', 'standard', 'hero'] }, audioEnabled: { type: 'boolean' } }, required: ['prompt'] } },
  { name: 'playlab_video_status', description: 'Poll a video render and receive the finished MP4 URL or failure reason.', inputSchema: { ...object, properties: { projectId: str('PLAYLAB video project ID') }, required: ['projectId'] } },
  { name: 'playlab_create_3d_asset', description: 'Start credit-charging image-to-3D generation. The input must be one image already uploaded to PLAYLAB Supabase Storage. Public generation may be gated during quality verification.', inputSchema: { ...object, properties: { imageUrl: str('Public PLAYLAB uploads storage URL'), title: str('Asset title'), subtrack: { type: 'string', enum: ['character', 'product'] }, workflowMode: { type: 'string', enum: ['automatic', 'guided'] } }, required: ['imageUrl', 'subtrack'] } },
  { name: 'playlab_3d_status', description: 'Poll a 3D project and receive GLB/FBX/texture output URLs and stage progress.', inputSchema: { ...object, properties: { projectId: str('PLAYLAB 3D project ID') }, required: ['projectId'] } },
  { name: 'playlab_generate_music', description: 'Start credit-charging ACE-Step music generation; returns a music artifact ID.', inputSchema: { ...object, properties: { prompt: str('Music description'), title: str('Optional song title'), lyrics: str('Optional lyrics'), instrumental: { type: 'boolean' }, durationSec: { type: 'integer', minimum: 10, maximum: 240 }, quality: { type: 'string', enum: ['standard', 'high'] }, vocalLanguage: { type: 'string', enum: ['ko', 'en', 'ja', 'zh', 'unknown'] } }, required: ['prompt'] } },
  { name: 'playlab_music_status', description: 'Poll a music job and receive completed MP3 URLs or failure reason.', inputSchema: { ...object, properties: { artifactId: str('PLAYLAB music artifact ID') }, required: ['artifactId'] } },
  { name: 'playlab_save_result', description: 'Download a completed video, music take, or 3D GLB/FBX to PLAYLAB_OUTPUT_DIR and return the local file path.', inputSchema: { ...object, properties: { kind: { type: 'string', enum: ['video', 'music', '3d'] }, id: str('Project or artifact ID'), format: { type: 'string', enum: ['primary', 'alternate', 'glb', 'fbx'] } }, required: ['kind', 'id'] } },
];

function id(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new Error('Invalid project ID');
  return value;
}
async function api(path, body) {
  if (!token) throw new Error('PLAYLAB_MCP_TOKEN is missing. Create one at /mcp-connect.');
  const response = await fetch(`${origin}${path}`, { method: body === undefined ? 'GET' : 'POST', headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(120000) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `PLAYLAB API error ${response.status}`);
  return result.data;
}
async function status(kind, value) {
  const key = id(value);
  if (kind === 'video') {
    const render = await api(`/api/video-studio/projects/${key}/render/status`);
    return { projectId: key, ...render };
  }
  if (kind === '3d') return api(`/api/3d-studio/projects/${key}`);
  return api(`/api/tools/ace-music?id=${encodeURIComponent(key)}`);
}
async function uploadImage(path) {
  if (typeof path !== 'string' || !path.trim()) throw new Error('Image path is required');
  const extension = extname(path).toLowerCase();
  const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extension];
  if (!mime) throw new Error('Only PNG, JPEG, and WebP images are supported');
  const bytes = await readFile(path);
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw new Error('Image must be 5 MB or smaller');
  if (!token) throw new Error('PLAYLAB_MCP_TOKEN is missing. Create one at /mcp-connect.');
  const form = new FormData();
  form.set('file', new Blob([bytes], { type: mime }), basename(path));
  const response = await fetch(`${origin}/api/upload`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form, signal: AbortSignal.timeout(120000) });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `PLAYLAB upload error ${response.status}`);
  return { imageUrl: result.data.url };
}
async function saveResult(args) {
  const kind = args.kind;
  if (!['video', 'music', '3d'].includes(kind)) throw new Error('Invalid result kind');
  const record = await status(kind, args.id);
  const variant = args.format || 'primary';
  let url;
  if (kind === 'video') url = record.status === 'COMPLETED' ? record.videoUrl : null;
  if (kind === 'music') url = record.status === 'COMPLETED' ? (variant === 'alternate' ? record.alternateAudioUrl : record.audioUrl) : null;
  if (kind === '3d') {
    const output = record.outputs?.[0];
    url = variant === 'fbx' ? output?.riggedFbxUrl : output?.riggedGlbUrl || output?.glbUrl;
  }
  if (!url) throw new Error('Requested result is not ready or this variant is unavailable. Check status first.');
  const source = new URL(url);
  const storage = process.env.PLAYLAB_STORAGE_ORIGIN;
  const publicUpload = storage && source.origin === new URL(storage).origin && source.pathname.startsWith('/storage/v1/object/public/uploads/');
  const extraOrigins = (process.env.PLAYLAB_VIDEO_RESULT_ORIGINS || '').split(',').map(part => part.trim()).filter(Boolean);
  const approvedVideoHost = kind === 'video' && source.protocol === 'https:' && extraOrigins.some(entry => { try { return new URL(entry).origin === source.origin; } catch { return false; } });
  if (!publicUpload && !approvedVideoHost) throw new Error('Output URL is outside approved storage origins. Add the exact provider origin to PLAYLAB_VIDEO_RESULT_ORIGINS if this is a trusted video worker.');
  const response = await fetch(source, { redirect: 'error', signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  const size = Number(response.headers.get('content-length') || 0);
  if (size > 250 * 1024 * 1024) throw new Error('Result exceeds the 250 MB download limit.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 250 * 1024 * 1024) throw new Error('Result exceeds the 250 MB download limit.');
  const videoExtension = ['.mp4', '.webm', '.mov'].includes(extname(source.pathname).toLowerCase()) ? extname(source.pathname).toLowerCase() : '.mp4';
  const ext = kind === 'video' ? videoExtension : kind === 'music' ? '.mp3' : variant === 'fbx' ? '.fbx' : '.glb';
  const filename = basename(`playlab-${kind}-${id(args.id)}-${variant}${ext}`);
  await mkdir(outputDir, { recursive: true });
  const path = join(outputDir, filename);
  await writeFile(path, bytes, { flag: 'w' });
  return { path, bytes: bytes.length, sourceUrl: url };
}
async function call(name, args) {
  switch (name) {
    case 'playlab_upload_image': return uploadImage(args.path);
    case 'playlab_create_video': {
      if (typeof args.prompt !== 'string' || args.prompt.trim().length < 3) throw new Error('prompt must have at least 3 characters');
      const project = await api('/api/video-studio/projects', { prompt: args.prompt, title: args.title, targetDurationSec: args.durationSec, aspectRatio: args.aspectRatio, quality: args.quality, audioEnabled: args.audioEnabled });
      try { const render = await api(`/api/video-studio/projects/${id(project.id)}/render`, {}); return { projectId: project.id, render }; }
      catch (error) { return { projectId: project.id, renderError: error.message, instruction: 'The project was created. Inspect or retry its render in PLAYLAB.' }; }
    }
    case 'playlab_video_status': return status('video', args.projectId);
    case 'playlab_create_3d_asset': return api('/api/3d-studio/projects', { inputImageUrls: [args.imageUrl], title: args.title, subtrack: args.subtrack, workflowMode: args.workflowMode });
    case 'playlab_3d_status': return status('3d', args.projectId);
    case 'playlab_generate_music': return api('/api/tools/ace-music', { prompt: args.prompt, title: args.title, lyrics: args.lyrics, instrumental: args.instrumental, durationSec: args.durationSec, quality: args.quality, vocalLanguage: args.vocalLanguage });
    case 'playlab_music_status': return status('music', args.artifactId);
    case 'playlab_save_result': return saveResult(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}
function send(message) { process.stdout.write(`${JSON.stringify(message)}\n`); }
const lines = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of lines) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
    if (request.id === undefined) continue;
    let result;
    if (request.method === 'initialize') result = { protocolVersion: request.params?.protocolVersion || '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'playlab-pipelines', version: '1.0.0' } };
    else if (request.method === 'ping') result = {};
    else if (request.method === 'tools/list') result = { tools };
    else if (request.method === 'tools/call') {
      try { result = { content: [{ type: 'text', text: JSON.stringify(await call(request.params?.name, request.params?.arguments || {})) }] }; }
      catch (error) { result = { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] }; }
    } else { send({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } }); continue; }
    send({ jsonrpc: '2.0', id: request.id, result });
  } catch (error) {
    if (request?.id !== undefined) send({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: error instanceof Error ? error.message : 'Internal error' } });
  }
}
