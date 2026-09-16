"""One local invocation of the deployed handler; no serverless queue or uploads."""
import base64
import json
import os
import sys
from pathlib import Path
# SSH sessions do not inherit the container's model-token/architecture environment.
# Copy only the explicit runtime settings, without printing credentials.
allowed = {'HF_TOKEN', 'HF_HOME', 'IMAGE_STORAGE_HOST', 'EXPECTED_GPU_ARCH',
           'ATTN_BACKEND', 'SPARSE_ATTN_BACKEND', 'SPARSE_CONV_BACKEND',
           'OPENCV_IO_ENABLE_OPENEXR', 'CUDA_HOME', 'CUDA_LAUNCH_BLOCKING'}
for entry in Path('/proc/1/environ').read_bytes().split(b'\0'):
    key, sep, value = entry.partition(b'=')
    if sep and key.decode() in allowed:
        os.environ[key.decode()] = value.decode()
sys.path.insert(0, '/app')
sys.path.insert(0, '/app/TRELLIS.2')
import handler
out = Path('/tmp/trellis-test')
out.mkdir(exist_ok=True)
handler.runpod.serverless.progress_update = lambda job, stage: print('STAGE', stage, flush=True)
result = handler.handler({'id': 'controlled-pod-test', 'input': {
    'input_image': 'https://raw.githubusercontent.com/microsoft/TRELLIS/main/assets/example_image/typical_humanoid_dwarf.png',
    'resolution': 512, 'texture_size': 1024, 'seed': 42, 'steps': 20,
}})
model = result.pop('model', None)
if model:
    (out / 'original.glb').write_bytes(base64.b64decode(model))
(out / 'result.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2), flush=True)
raise SystemExit(0 if model else 1)
