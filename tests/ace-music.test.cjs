const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const route = fs.readFileSync('src/app/api/tools/ace-music/route.ts', 'utf8');
const worker = fs.readFileSync('runpod-workflows/ace-step-worker/handler.py', 'utf8');
const dockerfile = fs.readFileSync('runpod-workflows/ace-step-worker/Dockerfile', 'utf8');

test('ACE music endpoint is authenticated, metered, persistent, and cancellable', () => {
  assert.match(route, /requireUser\(\)/);
  assert.match(route, /beginMeteredOperation/);
  assert.match(route, /finishMeteredOperation/);
  assert.match(route, /cancelRunpodJob\('ace_music'/);
  assert.match(route, /uploadBuffer\(`music-renders/);
  assert.match(route, /ownerId: user\.id/);
});

test('ACE worker uses the official XL-Turbo API contract on loopback only', () => {
  assert.match(worker, /BASE_URL = 'http:\/\/127\.0\.0\.1:8001'/);
  assert.match(worker, /'model': 'acestep-v15-xl-turbo'/);
  assert.match(worker, /'inference_steps': 8/);
  assert.match(worker, /'lm_model_path': 'acestep-5Hz-lm-1\.7B'/);
  assert.match(worker, /\/release_task/);
  assert.match(worker, /\/query_result/);
  assert.match(worker, /\/v1\/audio/);
});

test('ACE image is CUDA 12.8 and bakes the requested XL-Turbo model', () => {
  assert.match(dockerfile, /nvidia\/cuda:12\.8\.1-cudnn-devel-ubuntu24\.04/);
  assert.match(dockerfile, /ACESTEP_CONFIG_PATH=acestep-v15-xl-turbo/);
  assert.match(dockerfile, /acestep-download --model acestep-v15-xl-turbo/);
});
