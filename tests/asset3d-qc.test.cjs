const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsForTest = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server/asset3d-qc.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exportsForTest, Buffer });
const { inspectTrellisGlb } = exportsForTest;

function fixture(depth = 0.3) {
  const positions = Buffer.alloc(300 * 12);
  for (let i = 0; i < 300; i++) {
    positions.writeFloatLE((i % 2) * .5, i * 12);
    positions.writeFloatLE((i % 3) * 1.7 / 2, i * 12 + 4);
    positions.writeFloatLE((i % 5) * depth / 4, i * 12 + 8);
  }
  let json = JSON.stringify({ asset: { version: '2.0' }, nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    accessors: [{ bufferView: 0, componentType: 5126, type: 'VEC3', count: 300 }], bufferViews: [{ buffer: 0, byteLength: positions.length }] });
  json = json.padEnd(Math.ceil(Buffer.byteLength(json) / 4) * 4, ' ');
  const buffer = Buffer.alloc(28 + Buffer.byteLength(json) + positions.length);
  buffer.write('glTF'); buffer.writeUInt32LE(2, 4); buffer.writeUInt32LE(buffer.length, 8);
  buffer.writeUInt32LE(Buffer.byteLength(json), 12); buffer.write('JSON', 16); buffer.write(json, 20);
  const header = 20 + Buffer.byteLength(json);
  buffer.writeUInt32LE(positions.length, header); buffer.writeUInt32LE(0x004e4942, header + 4); positions.copy(buffer, header + 8);
  return buffer;
}

test('volumetric mesh remains review-needed, never certified Unity Ready', () => {
  const result = inspectTrellisGlb(fixture());
  assert.equal(result.status, 'needs_review'); assert.equal(result.unityReady, false);
  assert.equal(result.triangles, 100); assert.ok(result.pending.includes('rigging_and_weights'));
});
test('flat mesh rejected using actual vertex bytes, not declared accessor bounds', () => {
  assert.ok(inspectTrellisGlb(fixture(.001)).errors.includes('flat_geometry'));
});
test('malformed/truncated files fail closed', () => {
  assert.throws(() => inspectTrellisGlb(Buffer.from('not glb')));
  const file = fixture(); file.writeUInt32LE(0xffffffff, 12);
  assert.throws(() => inspectTrellisGlb(file));
});
test('nonfinite vertex rejected', () => {
  const file = fixture(); file.writeFloatLE(NaN, file.length - 4);
  assert.throws(() => inspectTrellisGlb(file));
});
test('previous paid TRELLIS output is correctly rejected when locally available', { skip: !fs.existsSync('tmp/trellis-c88bfe16-8da2-4f22-acf3-68632de5e848-e2.glb') }, () => {
  const result = inspectTrellisGlb(fs.readFileSync('tmp/trellis-c88bfe16-8da2-4f22-acf3-68632de5e848-e2.glb'));
  assert.equal(result.status, 'rejected'); assert.ok(result.errors.includes('flat_geometry'));
  console.log('Prior TRELLIS result:', JSON.stringify(result));
});
