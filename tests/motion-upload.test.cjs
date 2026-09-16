const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exported = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/motion-upload.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: exported, require, TextDecoder });
const valid = { hash: 'a'.repeat(64), name: '걷기 동작.FBX', size: 1000, category: 'Walk' };
test('Unicode names and uppercase FBX accepted; storage key is separate hash', () => assert.equal(exported.motionUploadSchema.safeParse(valid).success, true));
test('oversize and non-FBX rejected', () => {
  for (const change of [{ size: 28000001 }, { size: 0 }, { name: 'test.exe' }, { hash: '../path' }, { category: 'unknown' }]) assert.equal(exported.motionUploadSchema.safeParse({ ...valid, ...change }).success, false);
});
test('binary and ASCII FBX header accepted; renamed other content rejected', () => {
  assert.equal(exported.looksLikeFbx(Buffer.from('Kaydara FBX Binary  \0\x1a\0more')), true);
  assert.equal(exported.looksLikeFbx(Buffer.from('; FBX 7.4.0 project file')), true);
  assert.equal(exported.looksLikeFbx(Buffer.from('<html>wrong file</html>')), false);
});
