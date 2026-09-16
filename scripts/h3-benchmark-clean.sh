#!/bin/bash
set -euo pipefail
test -d /benchmark
python3 -m venv /opt/venv
export PATH=/opt/venv/bin:$PATH
pip install uv
git clone --depth 1 --branch v0.34.0 https://github.com/Comfy-Org/ComfyUI.git /comfyui
uv pip install torch==2.11.0+cu128 torchvision==0.26.0+cu128 torchaudio==2.11.0+cu128 --index-url https://download.pytorch.org/whl/cu128
uv pip install -r /comfyui/requirements.txt websocket-client 'huggingface-hub<1.0' 'transformers>=4.50.3,<5' 'torch==2.11.0+cu128' 'torchvision==0.26.0+cu128' 'torchaudio==2.11.0+cu128' --extra-index-url https://download.pytorch.org/whl/cu128
python /benchmark/h3-benchmark-models.py
echo CLEAN_BASELINE_READY
