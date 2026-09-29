"""Bake one Mixamo FBX onto a mapped character. No fabricated bone matching.

Mapping uses standard Humanoid roles -> target bone names. Both imports use
Blender's coordinate system. Rotation deltas are transferred in armature space,
not by copying local Euler channels between incompatible rest poses.
"""
from pathlib import Path
from math import degrees, radians

ROLES = {
    'Hips': 'Hips', 'Spine': 'Spine', 'Head': 'Head',
    'LeftUpperArm': 'LeftArm', 'LeftLowerArm': 'LeftForeArm', 'LeftHand': 'LeftHand',
    'RightUpperArm': 'RightArm', 'RightLowerArm': 'RightForeArm', 'RightHand': 'RightHand',
    'LeftUpperLeg': 'LeftUpLeg', 'LeftLowerLeg': 'LeftLeg', 'LeftFoot': 'LeftFoot',
    'RightUpperLeg': 'RightUpLeg', 'RightLowerLeg': 'RightLeg', 'RightFoot': 'RightFoot',
}
REQUIRED = {'Hips', 'Spine', 'Head', 'LeftUpperArm', 'LeftLowerArm',
            'RightUpperArm', 'RightLowerArm', 'LeftUpperLeg',
            'LeftLowerLeg', 'RightUpperLeg', 'RightLowerLeg'}


def validate_mapping(mapping, target_names):
    if not isinstance(mapping, dict) or not REQUIRED.issubset(mapping) or not set(mapping).issubset(ROLES):
        raise ValueError('Humanoid mapping requires the 11 core body roles')
    if any(not isinstance(name, str) or name not in target_names for name in mapping.values()):
        raise ValueError('Mapping contains a missing target bone')
    if len(set(mapping.values())) != len(mapping):
        raise ValueError('Each Humanoid role must map to a different bone')


def neutral_leg_rotations(target, target_rest, mapping):
    """Straighten a strongly bent generated rest leg before applying grounded motion.

    SkinTokens can rig a character from a flying reference pose. Copying gait
    deltas onto that bent rest pose leaves one foot permanently airborne.
    Keep the skinned mesh and bone lengths; rotate only the leg joints.
    """
    from mathutils import Vector

    down = Vector((0, 0, -1))
    rotations = {}
    diagnostics = {}
    for side in ('Left', 'Right'):
        upper, lower, foot = (f'{side}{part}' for part in ('UpperLeg', 'LowerLeg', 'Foot'))
        hip = target_rest[upper].translation
        knee = target_rest[lower].translation
        ankle = (target_rest[foot].translation if foot in mapping else
                 target.matrix_world @ target.data.bones[mapping[lower]].tail_local)
        thigh, shin = knee - hip, ankle - knee
        if thigh.length < 0.03 or shin.length < 0.03:
            raise ValueError(f'{side} leg bones are too short for gait retargeting')
        bend = thigh.angle(shin)
        diagnostics[side] = round(degrees(bend), 1)
        if bend < radians(35):
            continue
        if bend > radians(145):
            raise ValueError(f'{side} knee is reversed; check the Humanoid bone mapping')
        upper_adjust = thigh.rotation_difference(down)
        lower_adjust = shin.rotation_difference(down)
        rotations[upper] = upper_adjust @ target_rest[upper].to_quaternion()
        rotations[lower] = lower_adjust @ target_rest[lower].to_quaternion()
        if foot in mapping:
            rotations[foot] = lower_adjust @ target_rest[foot].to_quaternion()
    return rotations, diagnostics


def bake(character, motion, destination, mapping, clip_name='Motion', in_place=True, grounded=False, reference_pose='rest'):
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
    if reference_pose not in ('rest', 'first_frame'):
        raise ValueError('Unsupported motion reference pose')
    scene.frame_set(start)
    bpy.context.view_layer.update()
    source_rest = {role: source.matrix_world @ source.data.bones[lookup[ROLES[role]]].matrix_local for role in mapping}
    # Idle clips start in an already relaxed pose. Their T-pose-to-relaxed
    # rotation is not breathing motion: applying it again to a generated
    # character with relaxed arms stretches the torso and held props.
    source_reference = ({role: (source.matrix_world @ source.pose.bones[lookup[ROLES[role]]].matrix).copy()
                         for role in mapping} if reference_pose == 'first_frame' else source_rest)
    target_rest = {role: target.matrix_world @ target.data.bones[name].matrix_local for role, name in mapping.items()}
    neutral_rotations, rest_knee_bend = neutral_leg_rotations(target, target_rest, mapping) if grounded and reference_pose == 'rest' else ({}, {})
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
            rotation = source_pose.to_quaternion() @ source_reference[role].to_quaternion().inverted() @ neutral_rotations.get(role, target_rest[role].to_quaternion())
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
    # The source FBX action must not be exported against unrelated target bones.
    for unused_action in list(bpy.data.actions):
        if unused_action != action:
            bpy.data.actions.remove(unused_action)
    scene.frame_set(start)
    destination = Path(destination); destination.mkdir(parents=True, exist_ok=True)
    # glTF imports can create hidden Icosphere bone-display helpers. FBX exports
    # hidden objects too, so explicitly select only the character and ancestors.
    export_objects = {target} | {obj for obj in targets if obj.type == 'MESH' and
                      any(mod.type == 'ARMATURE' and mod.object == target for mod in obj.modifiers)}
    for obj in list(export_objects):
        parent = obj.parent
        while parent:
            export_objects.add(parent)
            parent = parent.parent
    bpy.ops.object.select_all(action='DESELECT')
    for obj in export_objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(destination / 'preview.glb'), use_selection=True, export_format='GLB', export_skins=True, export_animations=True, export_force_sampling=True)
    bpy.ops.export_scene.fbx(filepath=str(destination / 'character.fbx'), use_selection=True, object_types={'MESH', 'ARMATURE', 'EMPTY'}, add_leaf_bones=False, bake_anim=True, bake_anim_use_all_actions=False, bake_anim_use_nla_strips=False, bake_anim_simplify_factor=0, path_mode='COPY', embed_textures=True, axis_forward='-Z', axis_up='Y')
    return {'clip': clip_name, 'frames': end-start+1, 'fps': scene.render.fps / scene.render.fps_base,
            'mapping': mapping, 'in_place': in_place, 'grounded': grounded, 'reference_pose': reference_pose,
            'rest_knee_bend_degrees': rest_knee_bend, 'neutralized_roles': sorted(neutral_rotations),
            'unity_ready': False, 'requires_visual_review': True}
