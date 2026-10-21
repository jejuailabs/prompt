# Qwen3-TTS worker for RunPod Serverless (RTX 4090 / A5000 / L4, 24GB).
# One endpoint serves both preset-speaker TTS (1.7B CustomVoice) and voice
# cloning (1.7B Base). Weights are baked into the immutable image so a worker
# never downloads from Hugging Face at runtime and cold starts stay short.
FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-runtime

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    QWEN3_TTS_CUSTOM_VOICE_MODEL=/opt/models/custom-voice \
    QWEN3_TTS_BASE_MODEL=/opt/models/base

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

# FlashAttention is intentionally omitted: compiling it exceeds the CI budget
# and the handler uses PyTorch SDPA, which is sufficient for 1.7B models.
RUN python -m pip install --upgrade pip && \
    python -m pip install qwen-tts runpod soundfile huggingface_hub

# Full snapshots are required: each model repo ships a nested
# speech_tokenizer/ directory that a root-only fetch would miss.
RUN python -c "from huggingface_hub import snapshot_download as d; \
d('Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice', local_dir='/opt/models/custom-voice'); \
d('Qwen/Qwen3-TTS-12Hz-1.7B-Base', local_dir='/opt/models/base')"

COPY handler.py /opt/worker/handler.py
CMD ["python", "-u", "/opt/worker/handler.py"]
