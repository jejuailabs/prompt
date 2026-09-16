"""CPU Blender preparation and inspection, NOT automatic rigging/retopology.

Run: python process.py input.glb output-directory [settings.json]
Original GLB stays untouched. FBX is for geometry/rig interchange; GLB preserves
PBR materials. Neither is labelled Unity Ready without an external Unity test.
"""
import json
import math
import sys
import time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy
from mathutils import Vector
from policy import plan, geometry_errors, rig_errors


def measure(meshes):
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    if not points:
        raise ValueError("no_mesh")
    low = [min(p[i] for p in points) for i in range(3)]
    high = [max(p[i] for p in points) for i in range(3)]
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    return {"dimensions": [high[i] - low[i] for i in range(3)], "min": low, "max": high,
            "triangles": triangles, "vertices": sum(len(o.data.vertices) for o in meshes)}


def inspect_rig(meshes):
    armatures = {m.object for o in meshes for m in o.modifiers if m.type == "ARMATURE" and m.object}
    bones = {b.name for armature in armatures for b in armature.data.bones if b.use_deform}
    unweighted = invalid = 0
    for obj in meshes:
        attached = {b.name for m in obj.modifiers if m.type == "ARMATURE" and m.object
                    for b in m.object.data.bones if b.use_deform}
        groups = {g.index for g in obj.vertex_groups if g.name in attached}
        for vertex in obj.data.vertices:
            weights = [g.weight for g in vertex.groups if g.group in groups and g.weight > 0]
            if not weights:
                unweighted += 1
            elif len(weights) > 4 or any(not math.isfinite(w) for w in weights) or abs(sum(weights) - 1) > 0.02:
                invalid += 1
    return {"bones": len(bones), "unweighted_vertices": unweighted, "invalid_weights": invalid}


def process(source, destination, settings=None):
    start = time.perf_counter()
    config = plan(settings)
    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    # Ignore startup files and disable embedded Python execution.
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(Path(source).resolve()))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    before = measure(meshes)
    errors = geometry_errors(before["dimensions"], before["triangles"])
    report = {"schema_version": 1, "unity_ready": False, "stage": "geometry_qc", "settings": config,
              "before": before, "errors": errors, "timings_ms": {"import_and_qc": round((time.perf_counter()-start)*1000)}}
    if errors:
        report["status"] = "rejected"
        (destination / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        return report

    prepared = time.perf_counter()
    # Use one parent transform for all roots, including existing armatures.
    # Never normalize each mesh separately (destroys multipart alignment).
    root = bpy.data.objects.new("PLAYLAB_Asset", None)
    bpy.context.collection.objects.link(root)
    for obj in list(bpy.context.scene.objects):
        if obj != root and obj.parent is None:
            obj.parent = root
    factor = config["height_m"] / before["dimensions"][2]
    root.scale = (factor,) * 3
    root.location = (-factor*(before["min"][0]+before["max"][0])/2,
                     -factor*(before["min"][1]+before["max"][1])/2,
                     -factor*before["min"][2])
    bpy.context.view_layer.update()
    # Decimation is an optional preview budget, not deformation-ready retopology.
    # Preserve imported rigs; changing their topology requires a separate bake.
    rigged = any(m.type == "ARMATURE" for o in meshes for m in o.modifiers)
    if not rigged and before["triangles"] > config["triangles"]:
        ratio = config["triangles"] / before["triangles"]
        for obj in meshes:
            bpy.context.view_layer.objects.active = obj
            modifier = obj.modifiers.new("Preview triangle budget", "DECIMATE")
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    for image in bpy.data.images:
        width, height = image.size
        if max(width, height) > config["texture_size"]:
            scale = config["texture_size"] / max(width, height)
            image.scale(max(1, round(width*scale)), max(1, round(height*scale)))
    bpy.context.view_layer.update()
    after = measure(meshes)
    rig = inspect_rig(meshes)
    report.update({"after": after, "rig": rig, "stage": "prepared_mesh",
                   "status": "needs_review", "errors": rig_errors(rig),
                   "warnings": ["Decimation is not animation retopology.",
                                "Unity material, avatar and motion validation are still required."]})
    report["timings_ms"]["prepare"] = round((time.perf_counter()-prepared)*1000)
    export_start = time.perf_counter()
    bpy.ops.export_scene.gltf(filepath=str(destination / "prepared.glb"), export_format="GLB",
                             export_skins=True, export_animations=True, export_influence_nb=4)
    bpy.ops.export_scene.fbx(filepath=str(destination / "prepared.fbx"), object_types={"MESH", "ARMATURE", "EMPTY"},
                            add_leaf_bones=False, axis_forward="-Z", axis_up="Y", path_mode="COPY", embed_textures=True)
    report["timings_ms"]["export"] = round((time.perf_counter()-export_start)*1000)
    report["timings_ms"]["total"] = round((time.perf_counter()-start)*1000)
    (destination / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


if __name__ == "__main__":
    args = sys.argv[sys.argv.index("--") + 1:]
    settings = json.loads(Path(args[2]).read_text(encoding="utf-8")) if len(args) > 2 else {}
    print(json.dumps(process(args[0], args[1], settings)))
