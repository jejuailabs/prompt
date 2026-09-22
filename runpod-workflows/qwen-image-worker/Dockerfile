FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-devel

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HF_HOME=/tmp/huggingface \
    TRANSFORMERS_CACHE=/tmp/huggingface \
    QWEN_IMAGE_MODEL=Qwen/Qwen-Image-2.1

RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN python -m pip install --upgrade pip && \
    python -m pip install "transformers>=5.17" accelerate pillow runpod && \
    python -m pip install git+https://github.com/huggingface/diffusers

COPY runpod-workflows/qwen-image-worker/handler.py /opt/worker/handler.py
CMD ["python", "-u", "/opt/worker/handler.py"]
