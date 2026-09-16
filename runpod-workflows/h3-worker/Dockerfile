# Build context: runpod-workflows/h3-worker (never the repository root).
# CUDA kernels are compiled at build time, not on paid worker cold starts.
FROM ubuntu:24.04 AS build
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv python3-dev build-essential git curl ca-certificates ffmpeg libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:/usr/local/cuda-13.0/bin:${PATH}"
RUN pip install uv && uv pip install torch==2.11.0+cu130 torchvision==0.26.0+cu130 torchaudio==2.11.0+cu130 --index-url https://download.pytorch.org/whl/cu130
RUN git clone https://github.com/Comfy-Org/ComfyUI.git /comfyui && git -C /comfyui checkout --detach 12d5279438bfefc058a269eae805ceab6047777f
RUN uv pip install -r /comfyui/requirements.txt 'transformers>=4.50.3,<5' 'huggingface-hub<1.0' 'torch==2.11.0+cu130' 'torchvision==0.26.0+cu130' 'torchaudio==2.11.0+cu130' runpod requests websocket-client ninja packaging wheel setuptools --extra-index-url https://download.pytorch.org/whl/cu130
RUN curl -fL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb -o /tmp/cuda-keyring.deb && dpkg -i /tmp/cuda-keyring.deb && apt-get update && apt-get install -y --no-install-recommends cuda-nvcc-13-0 cuda-cudart-dev-13-0 cuda-cccl-13-0 cuda-libraries-dev-13-0 && rm -rf /var/lib/apt/lists/*
ENV CUDA_HOME=/usr/local/cuda-13.0 TORCH_CUDA_ARCH_LIST=12.0 MAX_JOBS=2 EXT_PARALLEL=1 NVCC_APPEND_FLAGS=--threads=2
RUN git clone https://github.com/thu-ml/SageAttention.git /sage && git -C /sage checkout --detach d1a57a546c3d395b1ffcbeecc66d81db76f3b4b5 && uv pip install --no-build-isolation --no-deps /sage
RUN git clone https://github.com/runpod-workers/worker-comfyui.git /upstream && git -C /upstream checkout --detach 724802bf26597b12255dfa8a5bfb4e6fe86bbedd
RUN cd /comfyui && python main.py --quick-test-for-ci --cpu

FROM ubuntu:24.04 AS runtime
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:${PATH}" NVIDIA_VISIBLE_DEVICES=all NVIDIA_DRIVER_CAPABILITIES=compute,utility
RUN apt-get update && apt-get install -y --no-install-recommends python3 ffmpeg ca-certificates libgl1 libglib2.0-0 libgomp1 && rm -rf /var/lib/apt/lists/*
COPY --from=build /opt/venv /opt/venv
COPY --from=build /comfyui /comfyui
COPY --from=build /upstream/handler.py /worker/handler.py
COPY --from=build /upstream/src/network_volume.py /worker/network_volume.py
COPY download_models.py /worker/download_models.py
RUN python /worker/download_models.py
COPY start.py handler_video.py /worker/
WORKDIR /worker
CMD ["python", "-u", "/worker/start.py"]
