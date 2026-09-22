FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-devel

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/tmp/huggingface \
    TRANSFORMERS_CACHE=/tmp/huggingface \
    QWEN3_TTS_MODEL=Qwen/Qwen3-TTS-12Hz-1.7B-Base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 git build-essential && \
    rm -rf /var/lib/apt/lists/*

# The official package owns the model API. FlashAttention is optional at
# runtime; the handler falls back to PyTorch SDPA if the GPU build cannot load it.
RUN python -m pip install --upgrade pip && \
    MAX_JOBS=2 python -m pip install --no-build-isolation flash-attn && \
    python -m pip install qwen-tts runpod soundfile

COPY runpod-workflows/qwen3-tts-worker/handler.py /opt/worker/handler.py
CMD ["python", "-u", "/opt/worker/handler.py"]
