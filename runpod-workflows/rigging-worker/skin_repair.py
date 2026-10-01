"""Bounded surface-based cleanup of generated skin weights.

Geometry, UVs and the skeleton are preserved. Nearby surface vertices receive
continuous weights, while disconnected surfaces never diffuse into each other.
"""
import numpy as np
from scipy.sparse import coo_matrix, diags

VERSION = 1


def regularize_weights(vertices, edges, weights, heads, tails):
    size = float(np.ptp(vertices, axis=0).max())
    if size <= 1e-8 or not np.isfinite(weights).all():
        raise ValueError('Invalid geometry or skin weights')
    original = weights.copy()
    distance = np.empty_like(weights)
    for index, (head, tail) in enumerate(zip(heads, tails)):
        segment = tail - head
        along = np.clip(((vertices-head)*segment).sum(1) / max(float(segment@segment), 1e-10), 0, 1)
        distance[:, index] = np.linalg.norm(vertices-head-along[:, None]*segment, axis=1)
    weights = weights * np.exp(-np.square(np.maximum(distance-distance.min(1)[:, None]-.02*size, 0)/(.055*size)))
    empty = weights.sum(1) < 1e-12
    weights[empty] = original[empty]
    empty = weights.sum(1) < 1e-12
    weights[empty, distance[empty].argmin(1)] = 1
    weights /= weights.sum(1)[:, None]

    # Weld for the weight solve only, keeping UV seam vertices in the mesh.
    _, inverse = np.unique(np.round(vertices/(size*1e-6)).astype(np.int64), axis=0, return_inverse=True)
    counts = np.bincount(inverse)
    surface = np.zeros((len(counts), weights.shape[1]), np.float32)
    np.add.at(surface, inverse, weights)
    surface /= counts[:, None]
    pairs = inverse[edges]
    row = np.r_[pairs[:, 0], pairs[:, 1], np.arange(len(counts))]
    col = np.r_[pairs[:, 1], pairs[:, 0], np.arange(len(counts))]
    adjacency = coo_matrix((np.ones(len(row)), (row, col)), shape=(len(counts), len(counts))).tocsr()
    adjacency = diags(1/np.asarray(adjacency.sum(1)).ravel()) @ adjacency
    anchor = surface.copy()
    for _ in range(40):
        surface = .04*anchor + .96*(adjacency @ surface)
    result = surface[inverse]
    influences = min(4, result.shape[1])
    selected = np.argpartition(result, -influences, axis=1)[:, -influences:]
    sparse = np.zeros_like(result)
    np.put_along_axis(sparse, selected, np.take_along_axis(result, selected, axis=1), axis=1)
    sparse /= sparse.sum(1)[:, None]
    return sparse


def repair_weights(target):
    import bpy
    reports = []
    bones = [bone for bone in target.data.bones if bone.use_deform]
    names = {bone.name: index for index, bone in enumerate(bones)}
    heads = np.array([tuple(target.matrix_world @ bone.head_local) for bone in bones])
    tails = np.array([tuple(target.matrix_world @ bone.tail_local) for bone in bones])
    for obj in bpy.context.scene.objects:
        if obj.type != 'MESH' or not any(m.type == 'ARMATURE' and m.object == target for m in obj.modifiers):
            continue
        if obj.get('playlab_skin_repair_version') == VERSION:
            reports.append({'mesh': obj.name, 'already_repaired': True})
            continue
        vertices = np.array([tuple(obj.matrix_world @ vertex.co) for vertex in obj.data.vertices])
        if len(vertices)*len(bones) > 60_000_000 or not len(vertices) or not bones:
            raise ValueError('Skin repair exceeds the supported mesh/skeleton budget')
        weights = np.zeros((len(vertices), len(bones)), np.float32)
        groups = {group.index: names[group.name] for group in obj.vertex_groups if group.name in names}
        for vertex in obj.data.vertices:
            for group in vertex.groups:
                if group.group in groups:
                    weights[vertex.index, groups[group.group]] = group.weight
        edges = np.array([tuple(edge.vertices) for edge in obj.data.edges], dtype=np.int64).reshape(-1, 2)
        repaired = regularize_weights(vertices, edges, weights, heads, tails)
        # Preserve non-skeleton vertex groups used by other modifiers.
        for group in list(obj.vertex_groups):
            if group.name in names:
                obj.vertex_groups.remove(group)
        output_groups = [obj.vertex_groups.new(name=bone.name) for bone in bones]
        rows, columns = np.nonzero(repaired > 1e-7)
        for row, column in zip(rows, columns):
            output_groups[column].add([int(row)], float(repaired[row, column]), 'REPLACE')
        obj['playlab_skin_repair_version'] = VERSION
        reports.append({'mesh': obj.name, 'vertices': len(vertices), 'version': VERSION})
    return reports


def inspect_deformation(target, start, end):
    """Reject obvious tears instead of labelling every exported file successful."""
    import bpy
    scene = bpy.context.scene
    meshes = []
    for obj in scene.objects:
        if obj.type != 'MESH' or not any(m.type == 'ARMATURE' and m.object == target for m in obj.modifiers):
            continue
        vertices = np.array([tuple(vertex.co) for vertex in obj.data.vertices])
        edges = np.array([tuple(edge.vertices) for edge in obj.data.edges], dtype=np.int64).reshape(-1, 2)
        lengths = np.linalg.norm(vertices[edges[:, 0]]-vertices[edges[:, 1]], axis=1)
        valid = lengths > max(float(np.ptp(vertices, axis=0).max())*1e-5, 1e-8)
        meshes.append((obj, edges[valid], lengths[valid]))
    worst = 1.0
    stretched = 0.0
    for frame in sorted(set(np.linspace(start, end, min(end-start+1, 17)).astype(int))):
        scene.frame_set(int(frame))
        graph = bpy.context.evaluated_depsgraph_get()
        for obj, edges, lengths in meshes:
            evaluated = obj.evaluated_get(graph)
            mesh = evaluated.to_mesh()
            try:
                coordinates = np.empty(len(mesh.vertices)*3, dtype=np.float32)
                mesh.vertices.foreach_get('co', coordinates)
                coordinates = coordinates.reshape(-1, 3)
                if len(coordinates) != len(obj.data.vertices) or not np.isfinite(coordinates).all():
                    raise ValueError('Animation produced invalid geometry')
                if not len(edges):
                    continue
                ratio = np.linalg.norm(coordinates[edges[:, 0]]-coordinates[edges[:, 1]], axis=1)/lengths
                worst = max(worst, float(np.quantile(ratio, .99)))
                stretched = max(stretched, float(np.mean(ratio > 3)))
            finally:
                evaluated.to_mesh_clear()
    scene.frame_set(start)
    report = {'sampled_frames': min(end-start+1, 17), 'edge_stretch_p99': round(worst, 3),
              'edges_over_3x_fraction': round(stretched, 5)}
    if worst > 5 or stretched > .05:
        raise ValueError(f'관절 변형 검사에서 과도한 표면 늘어남이 발견됐습니다. 리깅 보정이 필요합니다. ({worst:.1f}x)')
    return report
