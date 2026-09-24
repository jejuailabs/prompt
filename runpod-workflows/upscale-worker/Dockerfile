# SeedVR2 3B-FP8 video restoration worker. The weights are baked into the
# immutable image, avoiding a second model download on every serverless cold
# start. Use a Blackwell 96 GB endpoint with SEEDVR2_BATCH_SIZE=6 after its
# measured VRAM validation; batch 1 remains safe on a 24 GB fallback card.
FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    HF_HOME=/opt/huggingface

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-dev python3-pip git ffmpeg ca-certificates build-essential libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu126

ARG SEEDVR2_REF=4490bd1f482e026674543386bb2a4d176da245b9
RUN git clone https://github.com/numz/ComfyUI-SeedVR2_VideoUpscaler.git /opt/seedvr2 && \
    git -C /opt/seedvr2 checkout ${SEEDVR2_REF} && \
    python3 -m pip install -r /opt/seedvr2/requirements.txt && \
    python3 -m pip install runpod huggingface_hub && \
    hf download numz/SeedVR2_comfyUI \
      seedvr2_ema_3b_fp8_e4m3fn.safetensors ema_vae_fp16.safetensors pos_emb.pt neg_emb.pt \
      --local-dir /opt/models/SEEDVR2

COPY handler.py /opt/worker/handler.py
WORKDIR /opt/worker
CMD ["python3", "-u", "/opt/worker/handler.py"]
