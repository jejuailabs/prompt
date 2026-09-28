"""SkinTokens -> rigged GLB -> Blender FBX. One job at a time; no paid APIs."""
import base64
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import urllib.error
import urllib.request

import runpod

ROOT = Path('/opt/SkinTokens')
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)
_demo = None
_server = None


def runtime():
    global _demo, _server
    if _demo is None:
        import demo
        _demo = demo
    if _server is None or _server.poll() is not None:
        _server = _demo.start_bpy_server()
        _demo.wait_for_bpy_server(timeout=90)
    return _demo


def upload_signed(target, source, label):
    """Store a binary through one server-issued, expiring upload URL.

    The worker never receives Supabase credentials.  This avoids returning
    multi-megabyte GLB/FBX blobs through RunPod's limited result channel.
    """
    if not isinstance(target, dict) or not isinstance(target.get('signed_url'), str):
        raise ValueError(f'Missing signed upload target for {label}')
    url = target['signed_url']
    if not url.startswith('https://'):
        raise ValueError(f'Invalid signed upload URL for {label}')
    content_type = target.get('content_type') if isinstance(target.get('content_type'), str) else 'application/octet-stream'
    request = urllib.request.Request(url, data=source.read_bytes(), method='PUT', headers={
        'content-type': content_type,
        'cache-control': 'max-age=3600',
        'x-upsert': 'false',
    })
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f'Storage returned HTTP {response.status} for {label}')
    except urllib.error.HTTPError as error:
        detail = error.read(500).decode('utf-8', errors='replace')
        raise RuntimeError(f'Storage upload failed for {label}: HTTP {error.code} {detail}') from error


def handler(job):
    start = time.perf_counter()
    data = job.get('input', {})
    encoded = data.get('model_base64')
    if not isinstance(encoded, str) or not 1 <= len(encoded) <= 70_000_000:
        raise ValueError('GLB payload missing or too large')
    model = base64.b64decode(encoded, validate=True)
    if len(model) < 20 or model[:4] != b'glTF' or int.from_bytes(model[4:8], 'little') != 2 or int.from_bytes(model[8:12], 'little') != len(model):
        raise ValueError('Invalid GLB 2.0')
    settings = data.get('settings') or {}
    if not isinstance(settings, dict):
        raise ValueError('settings must be an object')
    diagnostic = data.get('diagnostic') is True
    with tempfile.TemporaryDirectory(prefix='skintokens-') as folder:
        directory = Path(folder)
        source, rigged = directory / 'source.glb', directory / 'rigged.glb'
        source.write_bytes(model)
        if data.get('operation') == 'retarget':
            from retarget import bake
            motion_encoded = data.get('motion_base64')
            if not isinstance(motion_encoded, str) or not 1 <= len(motion_encoded) <= 40_000_000:
                raise ValueError('Motion FBX payload missing or too large')
            motion = directory / 'motion.fbx'
            motion.write_bytes(base64.b64decode(motion_encoded, validate=True))
            output = directory / 'animation'
            report = bake(source, motion, output, data.get('bone_mapping'),
                          str(data.get('clip_name', 'Motion'))[:100], data.get('in_place', True) is True)
            # Check the exported FBX contains skin and an actual action.
            import bpy
            bpy.ops.wm.read_factory_settings(use_empty=True)
            bpy.ops.import_scene.fbx(filepath=str(output / 'character.fbx'))
            if not any(o.type == 'ARMATURE' and o.animation_data and o.animation_data.action for o in bpy.context.scene.objects):
                raise RuntimeError('FBX roundtrip lost animation')
            if not any(o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object for m in o.modifiers) and len(o.vertex_groups) for o in bpy.context.scene.objects):
                raise RuntimeError('FBX roundtrip lost skin')
            files = {}
            for file in output.iterdir():
                if file.stat().st_size > 50 * 1024 * 1024: raise ValueError('Output too large')
                files[file.name] = base64.b64encode(file.read_bytes()).decode('ascii')
            report['total_ms'] = round((time.perf_counter()-start)*1000)
            return {'files': files, 'report': report}
        demo = runtime()
        loaded = time.perf_counter()
        demo.run_rig([source], 5, 0.95, 1.0, 2.0, 10,
                     settings.get('use_skeleton') is True, True, False,
                     [rigged], demo.MODEL_CKPTS[0], None)
        inferred = time.perf_counter()
        if not rigged.is_file():
            raise RuntimeError('SkinTokens did not export a GLB')
        # Reuse Blender preparation only AFTER rigging. It preserves skinned topology.
        spec = importlib.util.spec_from_file_location('character_process', '/opt/character/process.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        output = directory / 'bundle'
        report = module.process(rigged, output, {'height_m': settings.get('height_meters', 1.7)})
        if diagnostic:
            # Keep diagnostics under RunPod's response limit.  The normal
            # pipeline will move binary assets via signed storage uploads,
            # never by putting GLB+FBX base64 in the result body.
            report.update({'provider': 'skintokens', 'diagnostic': True,
                           'artifact_bytes': {file.name: file.stat().st_size for file in output.iterdir() if file.is_file()},
                           'unity_ready': False, 'animation_status': 'not_generated'})
            return {'report': report}
        if report.get('errors'):
            raise RuntimeError('Rig validation failed: ' + ', '.join(report['errors']))
        # Verify the actual exported FBX, rather than trusting pre-export objects.
        import bpy
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.fbx(filepath=str(output / 'prepared.fbx'))
        fbx_rig = module.inspect_rig([o for o in bpy.context.scene.objects if o.type == 'MESH'])
        if module.rig_errors(fbx_rig):
            raise RuntimeError('FBX roundtrip lost skeleton or vertex weights')
        upload_targets = data.get('output_uploads')
        if isinstance(upload_targets, dict):
            artifacts = {'rigged.glb': output / 'prepared.glb', 'rigged.fbx': output / 'prepared.fbx'}
            if any(not artifact.is_file() for artifact in artifacts.values()):
                raise RuntimeError('Rigging export did not produce both GLB and FBX')
            uploaded = {}
            for name, artifact in artifacts.items():
                try:
                    upload_signed(upload_targets.get(name), artifact, name)
                except Exception as error:
                    # RunPod can discard exception payloads when its job-done
                    # callback rejects them. A compact result preserves the
                    # storage failure so the API can show the real cause.
                    return {'upload_error': str(error)[:500], 'artifact': name,
                            'artifact_bytes': artifact.stat().st_size,
                            'uploaded': uploaded}
                uploaded[name] = {'bytes': artifact.stat().st_size}
            report.update({'provider': 'skintokens', 'fbx_roundtrip': fbx_rig,
                           'animation_status': 'not_generated', 'unity_ready': False,
                           'timings_ms': {'startup': round((loaded-start)*1000),
                                          'rigging': round((inferred-loaded)*1000),
                                          'export_and_validation': round((time.perf_counter()-inferred)*1000),
                                          'total': round((time.perf_counter()-start)*1000)}})
            return {'uploads': uploaded, 'report': report}
        files = {}
        for file in output.rglob('*'):
            if not file.is_file() or file.name == 'report.json':
                continue
            name = file.relative_to(output).as_posix()
            name = {'prepared.glb': 'rigged.glb', 'prepared.fbx': 'rigged.fbx'}.get(name, name)
            content = file.read_bytes()
            if len(content) > 50 * 1024 * 1024:
                raise ValueError('Output file exceeds size limit')
            files[name] = base64.b64encode(content).decode('ascii')
        report.update({'provider': 'skintokens', 'fbx_roundtrip': fbx_rig,
                       'animation_status': 'not_generated', 'unity_ready': False,
                       'timings_ms': {'startup': round((loaded-start)*1000),
                                      'rigging': round((inferred-loaded)*1000),
                                      'export_and_validation': round((time.perf_counter()-inferred)*1000),
                                      'total': round((time.perf_counter()-start)*1000)}})
        return {'files': files, 'report': report}


if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
