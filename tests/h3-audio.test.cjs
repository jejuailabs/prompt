const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}, env = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: id => dependencies[id] ?? {}, process: { env }, Math, Date, console });
  return exports;
}
const presets = load('src/lib/h3-presets.ts');
const { buildH3TextToVideoWorkflow } = load('src/lib/server/video-workflows.ts', { '@/lib/h3-presets': presets });
const intentFile = 'src/lib/server/video-intent.ts';
const input = { prompt: 'A seaside scene', durationSec: 6, aspectRatio: '16:9' };

test('H3 muxes decoded audio for text and image inputs, across presets; mute removes the audio edge', () => {
  for (const h3Preset of Object.keys(presets.H3_PRESETS)) {
    for (const firstFrameName of [undefined, 'first.png']) {
      for (const audioEnabled of [undefined, true, false]) {
        const workflow = buildH3TextToVideoWorkflow({ ...input, h3Preset, firstFrameName, audioEnabled });
        const video = workflow[workflow['92'].inputs.video[0]];
        assert.equal(Boolean(video.inputs.audio), audioEnabled !== false);
        if (audioEnabled !== false) {
          const decoder = workflow[video.inputs.audio[0]];
          assert.equal(decoder.class_type, 'VAEDecodeAudio');
          assert.equal(workflow[decoder.inputs.vae[0]].inputs.vae_name, 'minimax_h3_audio_vae_fp32.safetensors');
          assert.equal(decoder.inputs.samples[0], workflow['144'].inputs.samples[0]);
        }
      }
    }
  }
});

test('missing or failed compiler preserves original speech and music for image and text generation', async () => {
  const prompt = '여성이 “오늘 참 좋다”라고 말한다. 파도 소리와 잔잔한 피아노 배경음악.';
  for (const env of [{}, { GEMINI_API_KEY: 'test' }]) {
    const api = load(intentFile, { '@/lib/server/ai': { chatJson: async () => { throw Error('offline'); } } }, env);
    for (const hasReferenceImage of [false, true]) {
      const intent = await api.compileVideoIntent(prompt, { hasReferenceImage, durationSec: 6, audioEnabled: true });
      const compiled = api.buildVideoModelPrompt(intent, hasReferenceImage);
      assert.ok(compiled.includes(prompt));
      assert.notEqual(intent.nonDiegeticMusic, 'N/A');
      assert.notEqual(intent.overallSoundscape, 'N/A');
    }
  }
});

test('compiler requests original-language speech and retains structured voice/music/silence results', async () => {
  for (const [overallSoundscape, nonDiegeticMusic, actionProgression] of [
    ['Waves', 'Soft piano beneath speech', 'She says “오늘 참 좋다”.'],
    ['N/A', 'Soft piano', 'She walks silently.'],
    ['Waves', 'N/A', 'She says “오늘 참 좋다”.'],
    ['N/A', 'N/A', 'She walks silently.'],
  ]) {
    const api = load(intentFile, { '@/lib/server/ai': { chatJson: async (system, user) => {
      assert.match(system, /Never translate spoken words/);
      assert.equal(JSON.parse(user).audioEnabled, true);
      return { overallSoundscape, nonDiegeticMusic, actionProgression };
    } } }, { GEMINI_API_KEY: 'test' });
    const intent = await api.compileVideoIntent('A seaside scene', { hasReferenceImage: false, durationSec: 6, audioEnabled: true });
    const compiled = api.buildVideoModelPrompt(intent, false);
    assert.ok(compiled.includes(actionProgression));
    assert.ok(compiled.includes(`overall_soundscape: ${overallSoundscape}`));
    assert.ok(compiled.endsWith(`non_diegetic_music: ${nonDiegeticMusic}`));
  }
});

test('project creation persists audio settings and rejects non-boolean input before writing', async () => {
  for (const audioEnabled of [undefined, true, false, 'false', null]) {
    let saved;
    class HttpError extends Error { constructor(message, status) { super(message); this.status = status; } }
    const route = load('src/app/api/video-studio/projects/route.ts', {
      '@/lib/auth': { requireUser: async () => ({ id: 'owner' }), HttpError },
      '@/lib/server/handler': { readJson: async () => ({ prompt: 'A seaside scene', audioEnabled }), ok: value => value, fail: error => ({ status: error.status }) },
      '@/lib/db': { db: { artifact: { create: async ({ data }) => { saved = JSON.parse(data.metadata); return data; } } } },
      '@/lib/server/serialize': { serializeArtifactSingle: value => value },
    });
    const result = await route.POST({});
    if (audioEnabled === 'false' || audioEnabled === null) {
      assert.equal(result.status, 400);
      assert.equal(saved, undefined);
    } else {
      assert.equal(saved.audioEnabled, audioEnabled !== false);
    }
  }
});

test('long visual descriptions cannot truncate sound fields', () => {
  const api = load(intentFile);
  const intent = { openingFrame: 'x'.repeat(4000), actionProgression: 'walking', cameraDirection: 'tracking', endingFrame: 'stop', continuity: [], overallSoundscape: 'Waves', nonDiegeticMusic: 'Soft piano' };
  const prompt = api.buildVideoModelPrompt(intent, true);
  assert.ok(prompt.length <= 4000);
  const workflow = buildH3TextToVideoWorkflow({ ...input, prompt });
  assert.ok(workflow['153'].inputs.prompt.endsWith('non_diegetic_music: Soft piano'));
});

test('render API carries persisted audio choice to compiler, workflow and saved render; comparisons stay silent', async () => {
  for (const [engine, audioEnabled, comparison] of [['h3', undefined, undefined], ['h3', true, undefined], ['h3', false, undefined], ['wan', true, undefined], ['h3', true, { compiledPrompt: 'comparison', preset: 'standard20', seed: 1 }]]) {
    let compiledOptions, renderInput, saved;
    const expected = engine === 'h3' && !comparison && audioEnabled !== false;
    const meta = { engine, audioEnabled, comparison, shots: [{ id: 'shot-1', prompt: 'A seaside scene', duration: 6 }] };
    const route = load('src/app/api/video-studio/projects/[id]/render/route.ts', {
      '@/lib/server/h3-config': { getH3Config: async () => ({ quality: 'standard20', speed: 'turbo8', gpu: 'blackwell' }) },
      '@/lib/h3-presets': presets,
      '@/lib/auth': { requireUser: async () => ({ id: 'owner', role: 'admin' }) },
      '@/lib/db': { db: { artifact: { findFirst: async () => ({ id: 'p', metadata: JSON.stringify(meta) }), update: async ({ data }) => { saved = JSON.parse(data.metadata); } } } },
      '@/lib/server/handler': { readJson: async () => ({}), ok: value => value, fail: error => { throw error; } },
      '@/lib/server/operation-ledger': { beginMeteredOperation: async () => ({ operationId: 'op', creditCharged: 80 }) },
      '@/lib/server/runpod': { queueRunpodWorkflow: async () => ({ id: 'job', status: 'IN_QUEUE' }) },
      '@/lib/server/video-intent': { compileVideoIntent: async (_, options) => { compiledOptions = options; return {}; }, createH3ContextIR: () => ({ schemaVersion: 'test' }), buildVideoModelPrompt: () => 'compiled' },
      '@/lib/server/video-workflows': { buildH3TextToVideoWorkflow: value => { renderInput = value; return {}; } },
      '@/lib/server/wan-workflow': { buildWanWorkflow: value => { renderInput = value; return {}; } },
    });
    await route.POST({}, { params: Promise.resolve({ id: 'p' }) });
    if (!comparison) assert.equal(compiledOptions.audioEnabled, expected);
    assert.equal(renderInput.audioEnabled, Boolean(expected));
    assert.equal(saved.render.audioEnabled, Boolean(expected));
    assert.equal(saved.shots[0].render.audioEnabled, Boolean(expected));
  }
});
