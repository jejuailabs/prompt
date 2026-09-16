"""Render actual GLB geometry for visual QC, never substitute a reference image.
blender -b --python-exit-code 1 --python scripts/render-character-preview.py -- input.glb output-dir
"""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, destination = Path(args[0]).resolve(), Path(args[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
low = Vector([min(p[i] for p in points) for i in range(3)])
high = Vector([max(p[i] for p in points) for i in range(3)])
center = (low + high) / 2
size = max(high - low)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 16
scene.render.resolution_x = scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.world = bpy.data.worlds.new('QC neutral world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.12, .12, .12, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .7
for x, y, z, power in [(-2, -3, 3, 500), (2, 1, 2, 350)]:
    light = bpy.data.lights.new('QC soft light', 'AREA')
    light.energy = power * size * size
    light.shape = 'DISK'
    light.size = size * 2
    obj = bpy.data.objects.new(light.name, light)
    scene.collection.objects.link(obj)
    obj.location = center + Vector((x, y, z)) * size
    obj.rotation_euler = (center - obj.location).to_track_quat('-Z', 'Y').to_euler()
camera = bpy.data.objects.new('QC camera', bpy.data.cameras.new('QC camera'))
scene.collection.objects.link(camera)
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.ortho_scale = size * 1.25
camera.data.clip_end = size * 100
for name, angle in [('front', 0), ('side', 90), ('back', 180)]:
    a = math.radians(angle)
    camera.location = center + Vector((math.sin(a)*size*3, -math.cos(a)*size*3, size*.2))
    camera.rotation_euler = (center - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(destination / (name + '.png'))
    bpy.ops.render.render(write_still=True)
