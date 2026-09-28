/** Suggest a humanoid mapping from a generated tree. The user can edit it. */
export function suggestBoneMapping(scene: { nodes?: Array<{ name?: string; children?: number[]; translation?: number[] }>; skins?: Array<{ joints?: number[] }> }): Record<string, string> {
  const nodes = scene.nodes ?? [];
  const joints = new Set((scene.skins ?? []).flatMap(skin => skin.joints ?? []));
  const children = (index: number) => (nodes[index]?.children ?? []).filter(child => joints.has(child));
  const parents = new Set([...joints].flatMap(index => children(index)));
  const roots = [...joints].filter(index => !parents.has(index));
  if (roots.length !== 1) return {};
  const length = (index: number): number => 1 + children(index).reduce((sum, child) => sum + length(child), 0);
  const x = (index: number) => nodes[index]?.translation?.[0] ?? 0;
  const name = (index: number) => nodes[index]?.name ?? '';
  const hips = roots[0];
  const hipsBranches = children(hips).sort((a, b) => length(b) - length(a));
  if (hipsBranches.length !== 3) return {};
  const spine = hipsBranches[0];
  const legBranches = hipsBranches.slice(1).sort((a, b) => x(a) - x(b));
  let chest = spine;
  while (children(chest).length === 1) chest = children(chest)[0];
  const chestBranches = children(chest);
  if (chestBranches.length !== 3) return {};
  const head = [...chestBranches].sort((a, b) => Math.abs(x(a)) - Math.abs(x(b)))[0];
  const arms = chestBranches.filter(index => index !== head).sort((a, b) => x(a) - x(b));
  const chain = (index: number) => {
    const result = [index];
    while (children(result.at(-1)!).length === 1 && result.length < 3) result.push(children(result.at(-1)!)[0]);
    return result;
  };
  const leftArm = chain(arms[0]); const rightArm = chain(arms[1]);
  const leftLeg = chain(legBranches[0]); const rightLeg = chain(legBranches[1]);
  if ([leftArm, rightArm, leftLeg, rightLeg].some(branch => branch.length < 2)) return {};
  const mapping: Record<string, string> = {
    Hips: name(hips), Spine: name(spine), Head: name(head),
    LeftUpperArm: name(leftArm[0]), LeftLowerArm: name(leftArm[1]),
    RightUpperArm: name(rightArm[0]), RightLowerArm: name(rightArm[1]),
    LeftUpperLeg: name(leftLeg[0]), LeftLowerLeg: name(leftLeg[1]),
    RightUpperLeg: name(rightLeg[0]), RightLowerLeg: name(rightLeg[1]),
  };
  if (leftArm[2] !== undefined) mapping.LeftHand = name(leftArm[2]);
  if (rightArm[2] !== undefined) mapping.RightHand = name(rightArm[2]);
  if (leftLeg[2] !== undefined) mapping.LeftFoot = name(leftLeg[2]);
  if (rightLeg[2] !== undefined) mapping.RightFoot = name(rightLeg[2]);
  return Object.values(mapping).every(Boolean) && new Set(Object.values(mapping)).size === Object.values(mapping).length ? mapping : {};
}
