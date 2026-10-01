const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(dependencies = {}) {
  const source = fs.readFileSync('src/lib/server/video-intent.ts', 'utf8');
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: id => dependencies[id] ?? {} });
  return exports;
}

test('Context IR persists first-frame semantics and a bounded duration', () => {
  const { createH3ContextIR, H3_CONTEXT_IR_VERSION } = load();
  const intent = {
    openingFrame: 'The reference image establishes the exact opening composition.',
    actionProgression: 'The subject walks forward.',
    cameraDirection: 'The viewer camera makes a straight Push In.',
    endingFrame: 'The shot settles naturally.',
    continuity: ['Keep the subject and lighting consistent.'],
    overallSoundscape: 'N/A', nonDiegeticMusic: 'N/A',
  };
  const ir = createH3ContextIR('  카메라는 앞으로 전진한다  ', intent, { hasReferenceImage: true, durationSec: 99 });
  assert.equal(ir.schemaVersion, H3_CONTEXT_IR_VERSION);
  assert.equal(ir.sourcePrompt, '카메라는 앞으로 전진한다');
  assert.equal(ir.mode, 'first-frame-to-video');
  assert.equal(ir.reference.firstFrame, 'opening-frame-anchor');
  assert.equal(ir.durationSec, 15);
  assert.equal(ir.validation.passed, true);
});

test('Context IR warns about contradictory camera directions without adding a negative prompt', () => {
  const { createH3ContextIR } = load();
  const intent = { openingFrame: 'start', actionProgression: 'motion', cameraDirection: 'camera', endingFrame: 'end', continuity: [], overallSoundscape: 'N/A', nonDiegeticMusic: 'N/A' };
  const ir = createH3ContextIR('카메라는 앞으로 전진했다가 뒤로 가며 오빗 회전한다', intent, { hasReferenceImage: false, durationSec: 6 });
  assert.equal(ir.validation.passed, false);
  assert.equal(ir.validation.warnings.length, 2);
  assert.equal(ir.shot.continuity.length, 0);
});
