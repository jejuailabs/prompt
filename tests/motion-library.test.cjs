const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server/motion-library.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: output, require: name => name === 'server-only' || name === '@/lib/db' ? {} : name === '@/lib/auth' ? { HttpError: Error } : require(name), process });
const parse = motions => output.motionManifest.safeParse({ version: 1, motions }).success;
const motion = { id: 'walk', name: 'Walk', category: 'Walk', file: 'fbx/walk.fbx' };
test('empty real library is valid, no invented clips', () => assert.equal(parse([]), true));
test('registered FBX accepted', () => assert.equal(parse([motion]), true));
test('duplicate ids rejected', () => assert.equal(parse([motion, motion]), false));
test('external URL and traversal rejected', () => {
  for (const file of ['../secret.fbx', '/walk.fbx', 'https://example.com/walk.fbx', 'walk.glb']) assert.equal(parse([{ ...motion, file }]), false);
});
test('admin-uploaded rows remain visible without a legacy manifest', () => {
  const result = output.mergeMotionCatalog([], [motion]);
  assert.equal(JSON.stringify(result), JSON.stringify([motion]));
});
test('an uploaded row overrides its legacy entry by id', () => {
  const result = output.mergeMotionCatalog([motion], [{ ...motion, name: 'Walk updated' }]);
  assert.equal(JSON.stringify(result), JSON.stringify([{ ...motion, name: 'Walk updated' }]));
});
