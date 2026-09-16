/** TRELLIS contract checks before storage/billing completion. Not Unity certification. */
export interface GeometryReport {
  version: 1;
  unityReady: false;
  status: 'rejected' | 'needs_review';
  triangles: number;
  vertices: number;
  dimensions: { width: number; height: number; depth: number };
  errors: string[];
  pending: string[];
}

export function inspectTrellisGlb(model: Buffer): GeometryReport {
  if (model.length < 20 || model.length > 50 * 1024 * 1024 || model.toString('ascii', 0, 4) !== 'glTF' || model.readUInt32LE(4) !== 2 || model.readUInt32LE(8) !== model.length) throw new Error('유효한 GLB 2.0 파일이 아닙니다.');
  const jsonLength = model.readUInt32LE(12);
  if (model.toString('ascii', 16, 20) !== 'JSON' || jsonLength % 4 || 20 + jsonLength + 8 > model.length) throw new Error('GLB JSON 청크가 유효하지 않습니다.');
  const scene = JSON.parse(model.toString('utf8', 20, 20 + jsonLength));
  const binaryHeader = 20 + jsonLength;
  const binaryStart = binaryHeader + 8;
  const binaryLength = model.readUInt32LE(binaryHeader);
  if (model.readUInt32LE(binaryHeader + 4) !== 0x004e4942 || binaryStart + binaryLength !== model.length) throw new Error('GLB 바이너리 청크가 유효하지 않습니다.');
  // The TRELLIS output contract is one untransformed mesh. Reject unsupported
  // layouts instead of guessing dimensions from accessor metadata or node IDs.
  const meshNodes = (scene.nodes ?? []).filter((n: { mesh?: number }) => n.mesh !== undefined);
  if (scene.meshes?.length !== 1 || meshNodes.length !== 1 || meshNodes[0].mesh !== 0) throw new Error('지원하지 않는 TRELLIS 다중 메시 출력입니다.');
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  for (const node of scene.nodes ?? []) {
    if ((node.matrix && node.matrix.some((n: number, i: number) => n !== identity[i])) ||
        (node.scale && node.scale.some((n: number) => n !== 1)) ||
        (node.rotation && node.rotation.some((n: number, i: number) => n !== (i === 3 ? 1 : 0)))) throw new Error('변환된 메시의 형상 검증이 필요합니다.');
  }
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  let vertices = 0, triangles = 0;
  for (const primitive of scene.meshes[0].primitives ?? []) {
    if ((primitive.mode ?? 4) !== 4 || primitive.extensions?.KHR_draco_mesh_compression) throw new Error('지원하지 않는 메시 압축 또는 토폴로지입니다.');
    const accessor = scene.accessors?.[primitive.attributes?.POSITION];
    const view = scene.bufferViews?.[accessor?.bufferView];
    if (!accessor || !view || accessor.type !== 'VEC3' || accessor.componentType !== 5126 || accessor.sparse || (view.buffer ?? 0) !== 0 || !Number.isInteger(accessor.count) || accessor.count < 1 || accessor.count > 2_000_000) throw new Error('메시 정점 데이터가 유효하지 않습니다.');
    const stride = view.byteStride ?? 12;
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const end = offset + (accessor.count - 1) * stride + 12;
    if (![stride, offset, view.byteLength].every(Number.isInteger) || stride < 12 || stride % 4 || offset < 0 || end > binaryLength || end > (view.byteOffset ?? 0) + view.byteLength) throw new Error('메시 정점 범위를 벗어났습니다.');
    for (let i = 0; i < accessor.count; i++) {
      for (let axis = 0; axis < 3; axis++) {
        const value = model.readFloatLE(binaryStart + offset + i * stride + axis * 4);
        if (!Number.isFinite(value)) throw new Error('메시에 잘못된 좌표가 포함되어 있습니다.');
        low[axis] = Math.min(low[axis], value); high[axis] = Math.max(high[axis], value);
      }
    }
    vertices += accessor.count;
    const count = primitive.indices === undefined ? accessor.count : scene.accessors?.[primitive.indices]?.count;
    if (!Number.isInteger(count) || count < 3 || count % 3) throw new Error('메시 삼각형 데이터가 유효하지 않습니다.');
    if (primitive.indices !== undefined) {
      const indices = scene.accessors[primitive.indices];
      const indexView = scene.bufferViews?.[indices.bufferView];
      const bytes = ({ 5121: 1, 5123: 2, 5125: 4 } as Record<number, number>)[indices.componentType];
      const start = (indexView?.byteOffset ?? 0) + (indices.byteOffset ?? 0);
      if (!bytes || indices.type !== 'SCALAR' || indices.sparse || !indexView || (indexView.buffer ?? 0) !== 0 || indexView.byteStride || !Number.isInteger(start) || start < 0 || start + count * bytes > binaryLength || start + count * bytes > (indexView.byteOffset ?? 0) + indexView.byteLength) throw new Error('삼각형 인덱스 범위가 잘못되었습니다.');
      for (let i = 0; i < count; i++) {
        if (model.readUIntLE(binaryStart + start + i * bytes, bytes) >= accessor.count) throw new Error('삼각형이 존재하지 않는 정점을 참조합니다.');
      }
    }
    triangles += count / 3;
  }
  const dimensions = high.map((value, axis) => value - low[axis]);
  const errors: string[] = [];
  if (!vertices || dimensions.some(value => !Number.isFinite(value) || value <= 0)) errors.push('invalid_geometry');
  else if (Math.min(...dimensions) / Math.max(...dimensions) < 0.02) errors.push('flat_geometry');
  if (triangles < 100) errors.push('insufficient_geometry');
  return { version: 1, unityReady: false, status: errors.length ? 'rejected' : 'needs_review',
    triangles, vertices, dimensions: { width: dimensions[0], height: dimensions[1], depth: dimensions[2] }, errors,
    pending: ['shape_review', 'blender_preparation', 'rigging_and_weights', 'motion_review', 'unity_import'] };
}
