"""Bake one Mixamo FBX onto a mapped character. No fabricated bone matching.

Mapping uses standard Humanoid roles -> target bone names. Both imports use
Blender's coordinate system. Rotation deltas are transferred in armature space,
not by copying local Euler channels between incompatible rest poses.
"""
from pathlib import Path

ROLES = {
    'Hips': 'Hips', 'Spine': 'Spine', 'Head': 'Head',
    'LeftUpperArm': 'LeftArm', 'LeftLowerArm': 'LeftForeArm', 'LeftHand': 'LeftHand',
    'RightUpperArm': 'RightArm', 'RightLowerArm': 'RightForeArm', 'RightHand': 'RightHand',
    'LeftUpperLeg': 'LeftUpLeg', 'LeftLowerLeg': 'LeftLeg', 'LeftFoot': 'LeftFoot',
    'RightUpperLeg': 'RightUpLeg', 'RightLowerLeg': 'RightLeg', 'RightFoot': 'RightFoot',
}


def validate_mapping(mapping, target_names):
    if not isinstance(mapping, dict) or set(mapping) != set(ROLES):
        raise ValueError('Humanoid mapping requires all 15 standard roles')
    if any(not isinstance(name, str) or name not in target_names for name in mapping.values()):
        raise ValueError('Mapping contains a missing target bone')
    if len(set(mapping.values())) != len(mapping):
        raise ValueError('Each Humanoid role must map to a different bone')


def bake(character, motion, destination, mapping, clip_name='Motion', in_place=True):
    import bpy
    from mathutils import Matrix
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.use_scripts_auto_execute = False
    bpy.ops.import_scene.gltf(filepath=str(character))
    targets = list(bpy.context.scene.objects)
    arms = [obj for obj in targets if obj.type == 'ARMATURE']
    if len(arms) != 1:
        raise ValueError('Exactly one character armature is required')
    target = arms[0]
    validate_mapping(mapping, set(target.data.bones.keys()))
    if not any(obj.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == target for m in obj.modifiers) for obj in targets):
        raise ValueError('Character has no skinned mesh')
    for obj in targets:
        obj.animation_data_clear()
    bpy.ops.import_scene.fbx(filepath=str(motion), automatic_bone_orientation=False)
    sources = [obj for obj in bpy.context.scene.objects if obj not in targets]
    source_arms = [obj for obj in sources if obj.type == 'ARMATURE' and obj.animation_data and obj.animation_data.action]
    if len(source_arms) != 1:
        raise ValueError('Motion FBX must contain one animated skeleton')
    source = source_arms[0]
    # Mixamo namespace may be absent, mixamorig:, or mixamorig1:.
    lookup = {bone.name.split(':')[-1].removeprefix('mixamorig'): bone.name for bone in source.data.bones}
    if any(name not in lookup for name in ROLES.values()):
        raise ValueError('Source motion is not a recognized Mixamo skeleton')
    start, end = [int(v) for v in source.animation_data.action.frame_range]
    if end <= start or end - start > 1800:
        raise ValueError('Motion must be between 2 and 1801 frames')
    scene = bpy.context.scene
    scene.frame_start, scene.frame_end = start, end
    source_rest = {role: source.matrix_world @ source.data.bones[lookup[name]].matrix_local for role, name in ROLES.items()}
    target_rest = {role: target.matrix_world @ target.data.bones[name].matrix_local for role, name in mapping.items()}
    # Scale root travel by leg length, not file units (FBX often uses centimetres).
    def leg_length(arm, upper, lower):
        return sum((arm.matrix_world.to_3x3() @ arm.data.bones[n].vector).length for n in (upper, lower))
    scale = leg_length(target, mapping['LeftUpperLeg'], mapping['LeftLowerLeg']) / max(leg_length(source, lookup['LeftUpLeg'], lookup['LeftLeg']), 1e-6)
    scene.frame_set(start)
    origin = (source.matrix_world @ source.pose.bones[lookup['Hips']].matrix).translation.copy()
    # Sort parent before child; updating pose matrices avoids local-axis mismatch.
    roles = sorted(mapping, key=lambda role: len(target.data.bones[mapping[role]].parent_recursive))
    for frame in range(start, end + 1):
        scene.frame_set(frame)
        for role in roles:
            source_pose = source.matrix_world @ source.pose.bones[lookup[ROLES[role]]].matrix
            rotation = source_pose.to_quaternion() @ source_rest[role].to_quaternion().inverted() @ target_rest[role].to_quaternion()
            bone = target.pose.bones[mapping[role]]
            # Keep target limb lengths; only Hips transfers translation.
            rest_local = bone.bone.matrix_local
            posed = bone.parent.matrix @ bone.parent.bone.matrix_local.inverted() @ rest_local if bone.parent else rest_local
            position = (target.matrix_world @ posed).translation
            if role == 'Hips':
                travel = (source_pose.translation - origin) * scale
                if in_place: travel.x = 0; travel.y = 0
                position = target_rest[role].translation + travel
            world = Matrix.LocRotScale(position, rotation, (target.matrix_world @ bone.matrix).to_scale())
            bone.rotation_mode = 'QUATERNION'
            bone.matrix = target.matrix_world.inverted() @ world
            bpy.context.view_layer.update()
            bone.keyframe_insert('rotation_quaternion', frame=frame)
            if role == 'Hips': bone.keyframe_insert('location', frame=frame)
    action = target.animation_data.action
    action.name = clip_name
    for obj in sources:
        bpy.data.objects.remove(obj, do_unlink=True)
    scene.frame_set(start)
    destination = Path(destination); destination.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=str(destination / 'preview.glb'), export_format='GLB', export_skins=True, export_animations=True, export_force_sampling=True)
    bpy.ops.export_scene.fbx(filepath=str(destination / 'character.fbx'), object_types={'MESH', 'ARMATURE', 'EMPTY'}, add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False, bake_anim_simplify_factor=0, path_mode='COPY', embed_textures=True, axis_forward='-Z', axis_up='Y')
    return {'clip': clip_name, 'frames': end-start+1, 'fps': scene.render.fps / scene.render.fps_base, 'mapping': mapping, 'in_place': in_place, 'unity_ready': False, 'requires_visual_review': True}
