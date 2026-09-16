"""Bounded TRELLIS requests with stage timings and full error traces.
CUDA failures return their stage, never a false COMPLETED model.
"""
import base64
import io
import json
import os
import tempfile
import time
import traceback
from pathlib import Path
from urllib.parse import urlparse
import requests
import runpod
import torch
from PIL import Image
from preflight import check

pipeline = None
diagnostics = None


def image_from_input(value):
    if not isinstance(value, str) or not value or len(value) > 28_000_000:
        raise ValueError('Image missing or too large')
    if value.startswith('https://'):
        parsed = urlparse(value)
        origins = {'raw.githubusercontent.com', os.environ.get('IMAGE_STORAGE_HOST', '')}
        if parsed.hostname not in origins or parsed.port not in (None, 443) or parsed.username:
            raise ValueError('Image URL host is not allowed')
        response = requests.get(value, timeout=45, stream=True, allow_redirects=False)
        response.raise_for_status()
        if response.status_code != 200:
            raise ValueError('Image URL must not redirect')
        content = bytearray()
        for part in response.iter_content(65536):
            content.extend(part)
            if len(content) > 20_000_000:
                raise ValueError('Image too large')
        content = bytes(content)
    else:
        content = base64.b64decode(value.split(',', 1)[-1], validate=True)
    image = Image.open(io.BytesIO(content))
    if image.width * image.height > 20_000_000:
        raise ValueError('Image pixel count too large')
    return image.convert('RGBA')


def handler(job):
    global pipeline, diagnostics
    started = time.perf_counter()
    stage = 'preflight'
    timings = {}
    try:
        if diagnostics is None:
            diagnostics = check()
        if job['input'].get('action') == 'diagnose':
            return {'diagnostics': diagnostics}
        data = job['input']
        resolution = data.get('resolution', 512)
        texture = data.get('texture_size', 1024)
        steps = data.get('steps', 20)
        seed = data.get('seed', 42)
        if resolution not in (512, 1024) or texture not in (1024, 2048) or steps not in (12, 20, 30):
            raise ValueError('Unsupported resolution, texture size or steps')
        if not isinstance(seed, int) or not 0 <= seed < 2**32:
            raise ValueError('Invalid seed')
        stage = 'image'
        image = image_from_input(data.get('image') or data.get('input_image'))
        stage = 'model_load'
        runpod.serverless.progress_update(job, stage)
        load_start = time.perf_counter()
        if pipeline is None:
            from background import install
            install()
            from trellis2.pipelines import Trellis2ImageTo3DPipeline
            pipeline = Trellis2ImageTo3DPipeline.from_pretrained('microsoft/TRELLIS.2-4B')
            pipeline.low_vram = False
            pipeline.cuda()
        torch.cuda.synchronize()
        timings[stage] = round((time.perf_counter() - load_start) * 1000)
        # Attribute asynchronous CUDA exceptions to the precise pipeline stage.
        stage = 'inference'
        runpod.serverless.progress_update(job, stage)
        inference_start = time.perf_counter()
        with torch.inference_mode():
            mesh = pipeline.run(image, seed=seed, pipeline_type='512' if resolution == 512 else '1024_cascade',
                sparse_structure_sampler_params={'steps': steps}, shape_slat_sampler_params={'steps': steps},
                tex_slat_sampler_params={'steps': steps})[0]
        torch.cuda.synchronize()
        timings[stage] = round((time.perf_counter() - inference_start) * 1000)
        stage = 'mesh_export'
        runpod.serverless.progress_update(job, stage)
        export_start = time.perf_counter()
        import o_voxel
        mesh.simplify(4194304)
        glb = o_voxel.postprocess.to_glb(vertices=mesh.vertices, faces=mesh.faces,
            attr_volume=mesh.attrs, coords=mesh.coords, attr_layout=mesh.layout, voxel_size=mesh.voxel_size,
            aabb=[[-.5, -.5, -.5], [.5, .5, .5]], decimation_target=100000,
            texture_size=texture, remesh=True, remesh_band=1, remesh_project=0, verbose=True)
        with tempfile.TemporaryDirectory() as folder:
            file = Path(folder) / 'character.glb'
            glb.export(str(file))
            content = file.read_bytes()
        if len(content) > 50 * 1024 * 1024:
            raise ValueError('GLB output too large')
        timings[stage] = round((time.perf_counter() - export_start) * 1000)
        timings['total'] = round((time.perf_counter() - started) * 1000)
        return {'model': base64.b64encode(content).decode('ascii'), 'metadata': {
            'timings_ms': timings, 'diagnostics': diagnostics, 'resolution': resolution,
            'texture_size': texture, 'steps': steps, 'seed': seed, 'unity_ready': False}}
    except Exception as error:
        trace = traceback.format_exc()
        print(json.dumps({'stage': stage, 'traceback': trace}), flush=True)
        return {'error': str(error), 'stage': stage, 'traceback': trace,
                'diagnostics': diagnostics, 'timings_ms': timings}


if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
