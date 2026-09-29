const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const output = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/asset3d-bone-mapping.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: output, require });

function mascot() {
  const children = [[1, 8, 11], [2, 3, 5], [], [4], [], [6], [7], [], [9], [10], [], [12], [13], []];
  const positions = [[0,.6,0], [0,.1,0], [0,.2,0], [.25,.05,0], [.03,-.02,.05], [-.25,.05,0], [-.03,-.02,.05], [0,-.05,.05], [.1,-.05,0], [0,-.06,0], [0,-.06,0], [-.1,-.05,0], [0,-.06,0], [0,-.06,0]];
  return { nodes: children.map((c,i) => ({ name: `bone_${i}`, children:c, translation:positions[i] })), skins: [{ joints: children.map((_,i) => i) }] };
}
test('compact mascot with one head bone and no left hand gets all eleven core roles', () => {
  const mapping = output.suggestBoneMapping(mascot());
  assert.equal(mapping.Head, 'bone_2');
  assert.equal(mapping.LeftUpperArm, 'bone_3');
  assert.equal(mapping.LeftLowerArm, 'bone_4');
  assert.equal(mapping.LeftHand, undefined);
  assert.equal(mapping.RightUpperArm, 'bone_5');
  assert.equal(mapping.RightHand, 'bone_7');
  assert.equal(mapping.LeftUpperLeg, 'bone_8');
  assert.equal(mapping.RightUpperLeg, 'bone_11');
  assert.equal(Object.keys(mapping).length, 14);
  assert.equal(new Set(Object.values(mapping)).size, 14);
});
test('missing arm branch does not fabricate a complete mapping', () => {
  const scene = mascot(); scene.nodes[1].children = [2,3];
  assert.equal(Object.keys(output.suggestBoneMapping(scene)).length, 0);
});
