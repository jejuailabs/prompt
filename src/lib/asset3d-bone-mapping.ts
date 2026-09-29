import { Matrix4, Quaternion, Vector3 } from 'three';

interface RigNode { name?: string; children?: number[]; translation?: number[]; rotation?: number[]; scale?: number[]; matrix?: number[] }
interface RigScene { nodes?: RigNode[]; skins?: Array<{ joints?: number[] }> }

/** Suggest an editable Humanoid mapping from a generated skeleton. */
export function suggestBoneMapping(scene: RigScene): Record<string, string> {
  const nodes = scene.nodes ?? [];
  const joints = new Set((scene.skins ?? []).flatMap(skin => skin.joints ?? []));
  const children = (index: number) => (nodes[index]?.children ?? []).filter(child => joints.has(child));
  const parent = new Map<number, number>();
  for (const index of joints) for (const child of children(index)) parent.set(child, index);
  const roots = [...joints].filter(index => !parent.has(index));
  if (roots.length !== 1) return {};
  const sizes = new Map<number, number>();
  const size = (index: number): number => {
    if (sizes.has(index)) return sizes.get(index)!;
    const count = 1 + children(index).reduce((sum, child) => sum + size(child), 0);
    sizes.set(index, count);
    return count;
  };
  const worlds = new Map<number, Matrix4>();
  const world = (index: number): Matrix4 => {
    if (worlds.has(index)) return worlds.get(index)!;
    const node = nodes[index] ?? {};
    const local = node.matrix?.length === 16 ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3().fromArray(node.translation?.length === 3 ? node.translation : [0, 0, 0]),
      new Quaternion().fromArray(node.rotation?.length === 4 ? node.rotation : [0, 0, 0, 1]),
      new Vector3().fromArray(node.scale?.length === 3 ? node.scale : [1, 1, 1]),
    );
    const matrix = parent.has(index) ? world(parent.get(index)!).clone().multiply(local) : local;
    worlds.set(index, matrix);
    return matrix;
  };
  const position = (index: number) => new Vector3().setFromMatrixPosition(world(index));
  const name = (index: number) => nodes[index]?.name ?? '';
  const hips = roots[0];
  const hipsBranches = children(hips).sort((a, b) => size(b) - size(a));
  if (hipsBranches.length < 3) return {};
  const spine = hipsBranches[0];
  // The studio uses +Z as the character's forward direction: its left is +X.
  const legBranches = hipsBranches.slice(1).filter(index => size(index) >= 2).sort((a, b) => position(b).x - position(a).x);
  if (legBranches.length !== 2) return {};

  // Generated chests can have extra face, wing, or accessory bones. The three
  // substantial branches are the head and two arms; ignore tiny leaves.
  let chest = spine;
  for (let depth = 0; depth < 8; depth++) {
    const substantial = children(chest).filter(index => size(index) >= 3);
    if (substantial.length >= 3) break;
    if (substantial.length !== 1) return {};
    chest = substantial[0];
  }
  const branches = children(chest).filter(index => size(index) >= 3).sort((a, b) => size(b) - size(a)).slice(0, 3);
  if (branches.length !== 3) return {};
  const centerX = position(hips).x;
  const headStem = [...branches].sort((a, b) => Math.abs(position(a).x - centerX) - Math.abs(position(b).x - centerX))[0];
  const arms = branches.filter(index => index !== headStem).sort((a, b) => position(b).x - position(a).x);
  const headNext = children(headStem).filter(index => size(index) >= 3).sort((a, b) => size(b) - size(a));
  const head = headNext.length === 1 ? headNext[0] : headStem;
  const chain = (start: number) => {
    const result = [start];
    while (result.length < 8 && children(result.at(-1)!).length === 1) result.push(children(result.at(-1)!)[0]);
    return result;
  };
  const arm = (start: number) => {
    const bones = chain(start);
    // A short first link beside the chest is a clavicle, not the upper arm.
    const clavicle = bones.length >= 4 && position(bones[0]).distanceTo(position(bones[1])) <
      0.7 * position(bones[1]).distanceTo(position(bones[2]));
    return bones.slice(clavicle ? 1 : 0);
  };
  const leftArm = arm(arms[0]); const rightArm = arm(arms[1]);
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
