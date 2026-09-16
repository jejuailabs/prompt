FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv python3-dev build-essential git curl ca-certificates ffmpeg libgl1 libglib2.0-0 libjpeg-dev && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:/usr/local/cuda-13.0/bin:${PATH}"
RUN pip install uv && uv pip install torch==2.11.0+cu130 torchvision==0.26.0+cu130 --index-url https://download.pytorch.org/whl/cu130
RUN curl -fL https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb -o /tmp/cuda-keyring.deb && dpkg -i /tmp/cuda-keyring.deb && apt-get update && apt-get install -y --no-install-recommends cuda-nvcc-13-0 cuda-cudart-dev-13-0 cuda-cccl-13-0 cuda-libraries-dev-13-0 && rm -rf /var/lib/apt/lists/*
ARG GPU_ARCH=12.0
ENV CUDA_HOME=/usr/local/cuda-13.0 TORCH_CUDA_ARCH_LIST=${GPU_ARCH} EXPECTED_GPU_ARCH=${GPU_ARCH} MAX_JOBS=2 NVCC_APPEND_FLAGS=--threads=2
# A100 hosts may run R570. NVIDIA's data-center forward compatibility package
# enables cu130 without changing the provider's host driver.
RUN if [ "$GPU_ARCH" = "8.0" ]; then apt-get update && apt-get install -y --no-install-recommends cuda-compat-13-0 && rm -rf /var/lib/apt/lists/*; fi
ENV LD_LIBRARY_PATH=/usr/local/cuda-13.0/compat
# Link CUDA driver symbols during GPU-less CI builds; never put stubs on LD_LIBRARY_PATH.
ENV LIBRARY_PATH=/usr/local/cuda-13.0/lib64/stubs
RUN uv pip install --no-deps xformers==0.0.35 --index-url https://download.pytorch.org/whl/cu130
RUN pip install runpod==1.7.13 'transformers==4.57.6' 'huggingface-hub<1' 'numpy==1.26.4' 'opencv-python-headless==4.11.0.86' pillow safetensors imageio imageio-ffmpeg trimesh easydict einops kornia timm omegaconf tqdm lpips plyfile pymeshlab open3d zstandard ninja packaging wheel setuptools accelerate 'torch==2.11.0+cu130' 'torchvision==0.26.0+cu130'
RUN uv pip install --no-deps git+https://github.com/EasternJournalist/utils3d.git@9a4eb15e4021b67b12c460c7057d642626897ec8
WORKDIR /app
RUN git clone https://github.com/microsoft/TRELLIS.2.git && git -C TRELLIS.2 checkout --detach 75fbf0183001ed9876c8dbb35de6b68552ee08bd && git -C TRELLIS.2 submodule update --init --recursive
RUN git clone https://github.com/NVlabs/nvdiffrast.git /opt/nvdiffrast && git -C /opt/nvdiffrast checkout --detach 253ac4fcea7de5f396371124af597e6cc957bfae && uv pip install --no-build-isolation --no-deps /opt/nvdiffrast
RUN git clone https://github.com/JeffreyXiang/nvdiffrec.git /opt/nvdiffrec && git -C /opt/nvdiffrec checkout --detach b296927cc7fd01c2ac1087c8065c4d7248f72da4 && uv pip install --no-build-isolation --no-deps /opt/nvdiffrec
RUN git clone https://github.com/JeffreyXiang/CuMesh.git /opt/CuMesh && git -C /opt/CuMesh checkout --detach 12289e1062f0603f2f0d0771b02e1395d247f26f && git -C /opt/CuMesh submodule update --init --recursive && uv pip install --no-build-isolation --no-deps /opt/CuMesh
RUN git clone https://github.com/JeffreyXiang/FlexGEMM.git /opt/FlexGEMM && git -C /opt/FlexGEMM checkout --detach 6dd94a859c26ee8246888502eada3dd8ad85532e && git -C /opt/FlexGEMM submodule update --init --recursive && uv pip install --no-build-isolation --no-deps /opt/FlexGEMM
RUN uv pip install --no-build-isolation --no-deps /app/TRELLIS.2/o-voxel
ENV PYTHONPATH=/app/TRELLIS.2 ATTN_BACKEND=xformers SPARSE_ATTN_BACKEND=xformers SPARSE_CONV_BACKEND=flex_gemm NVIDIA_VISIBLE_DEVICES=all NVIDIA_DRIVER_CAPABILITIES=compute,utility HF_HOME=/runpod-volume/huggingface-cache OPENCV_IO_ENABLE_OPENEXR=1
COPY handler.py preflight.py background.py /app/
RUN uv pip install moderngl
# FlexGEMM queries the physical GPU during import. CI has no GPU; do not import it
# here or fake a device. preflight.py performs real imports/operations on RunPod.
RUN python -m compileall -q /app/handler.py /app/preflight.py /app/background.py && python -c "import torch, xformers, cumesh, importlib.util; assert all(importlib.util.find_spec(n) for n in ['flex_gemm', 'o_voxel', 'nvdiffrast', 'nvdiffrec_render', 'trellis2']); assert torch.version.cuda == '13.0'; print(torch.__version__, torch.version.cuda)"
CMD ["python", "-u", "/app/handler.py"]
