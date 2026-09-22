# Based on CosyVoice's official CUDA 12.4 / Python 3.10 deployment image.
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/opt/CosyVoice:/opt/CosyVoice/third_party/Matcha-TTS \
    COSYVOICE_MODEL=FunAudioLLM/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_DIR=/tmp/cosyvoice-model

RUN apt-get update && apt-get install -y --no-install-recommends \
    git git-lfs build-essential curl wget ffmpeg sox libsox-dev python3.10 python3.10-venv python3-pip && \
    rm -rf /var/lib/apt/lists/* && git lfs install
RUN python3.10 -m pip install --upgrade pip && \
    git clone --recursive --depth 1 https://github.com/QwenAudio/CosyVoice.git /opt/CosyVoice && \
    python3.10 -m pip install -r /opt/CosyVoice/requirements.txt && \
    python3.10 -m pip install runpod

COPY runpod-workflows/cosyvoice-worker/handler.py /opt/worker/handler.py
CMD ["python3.10", "-u", "/opt/worker/handler.py"]
