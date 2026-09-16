"""Isolated benchmark only. Do not attach this startup to production endpoints.

Keep the model, ComfyUI, prompt and sampler unchanged; change only the torch
CUDA wheel family. Installation time is not an inference-speed improvement.
"""
import os
import subprocess

subprocess.run([
    'uv', 'pip', 'install', 'torch==2.11.0+cu130', 'torchvision==0.26.0+cu130',
    'torchaudio==2.11.0+cu130', '--index-url', 'https://download.pytorch.org/whl/cu130',
], check=True, timeout=480)
os.execv('/bin/bash', ['/bin/bash', '/start.sh'])
