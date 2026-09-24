# ACE-Step 1.5 XL-Turbo worker for RunPod Serverless RTX 4090 (24GB).
# The public API is loopback-only; RunPod's authenticated job API is the sole
# external entry point. Model weights are baked into the immutable image so a
# worker never needs a Hugging Face token at runtime.
FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ACESTEP_CHECKPOINTS_DIR=/opt/acestep-checkpoints \
    ACESTEP_CONFIG_PATH=acestep-v15-xl-turbo \
    ACESTEP_INIT_LLM=true \
    ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-1.7B \
    ACESTEP_LM_BACKEND=vllm \
    ACESTEP_USE_FLASH_ATTENTION=true \
    ACESTEP_OFFLOAD_TO_CPU=false \
    ACESTEP_OFFLOAD_DIT_TO_CPU=false \
    ACESTEP_API_HOST=127.0.0.1 \
    ACESTEP_API_PORT=8001 \
    ACESTEP_API_WORKERS=1 \
    ACESTEP_QUEUE_WORKERS=1 \
    ACESTEP_QUEUE_MAXSIZE=1 \
    HF_HUB_DISABLE_TELEMETRY=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-dev git ffmpeg ca-certificates curl \
    build-essential libsndfile1 libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.8.8 /uv /uvx /bin/
WORKDIR /opt
ARG ACE_STEP_REF=v0.1.6
RUN git clone --branch ${ACE_STEP_REF} --depth 1 https://github.com/ACE-Step/ACE-Step-1.5.git ace-step
WORKDIR /opt/ace-step
RUN uv sync --no-dev
# The official ACE-Step project does not ship the RunPod serverless adapter.
# Install it in the same isolated environment used by handler.py, otherwise
# the worker exits before it can accept its first job.
RUN uv pip install --python /opt/ace-step/.venv/bin/python runpod
ENV PATH="/opt/ace-step/.venv/bin:${PATH}"

# Default components supply VAE, embedding model and the 1.7B LM. XL-Turbo is
# added explicitly and selected at startup; no paid or gated model is used.
RUN acestep-download && acestep-download --model acestep-v15-xl-turbo

COPY handler.py /opt/worker/handler.py
WORKDIR /opt/worker
CMD ["python3", "-u", "/opt/worker/handler.py"]
