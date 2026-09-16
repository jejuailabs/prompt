"""Container build smoke test, synthetic geometry only, not character quality proof."""
import tempfile
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import bpy
from process import process

with tempfile.TemporaryDirectory() as folder:
    directory = Path(folder)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16)
    bpy.ops.export_scene.gltf(filepath=str(directory / "input.glb"), export_format="GLB")
    report = process(directory / "input.glb", directory / "out")
    assert report["unity_ready"] is False
    assert report["status"] == "needs_review"
    assert "missing_skeleton" in report["errors"]
    assert abs(report["after"]["dimensions"][2] - 1.7) < 0.001
    assert (directory / "out/prepared.fbx").stat().st_size > 100
    assert (directory / "out/prepared.glb").stat().st_size > 100
    print("Blender GLB/FBX smoke passed (synthetic fixture, NOT game-ready validation)")
