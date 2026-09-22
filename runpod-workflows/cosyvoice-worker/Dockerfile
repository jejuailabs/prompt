# Uses the upstream CosyVoice CUDA 12.4 / Miniforge / Python 3.10 recipe.
# Keeping this aligned with upstream avoids a host-Python dependency conflict
# in the current Fun-CosyVoice3 requirements set.
FROM nvidia/cuda:12.4.1-cudnn-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/opt/CosyVoice:/opt/CosyVoice/third_party/Matcha-TTS \
    COSYVOICE_MODEL=FunAudioLLM/Fun-CosyVoice3-0.5B-2512 \
    COSYVOICE_MODEL_DIR=/tmp/cosyvoice-model \
    PATH=/opt/conda/bin:/opt/conda/envs/cosyvoice/bin:$PATH

RUN apt-get update && apt-get install -y --no-install-recommends \
    git git-lfs build-essential curl wget ffmpeg sox libsox-dev && \
    rm -rf /var/lib/apt/lists/* && git lfs install
RUN wget --quiet https://github.com/conda-forge/miniforge/releases/latest/download/Miniforge3-Linux-x86_64.sh -O /tmp/miniforge.sh && \
    /bin/bash /tmp/miniforge.sh -b -p /opt/conda && rm /tmp/miniforge.sh && \
    conda config --add channels conda-forge && conda config --set channel_priority strict && \
    conda create -y -n cosyvoice python=3.10 pynini==2.1.5
RUN git clone --recursive --depth 1 https://github.com/QwenAudio/CosyVoice.git /opt/CosyVoice && \
    /opt/conda/envs/cosyvoice/bin/pip install --upgrade pip && \
    /opt/conda/envs/cosyvoice/bin/pip install -r /opt/CosyVoice/requirements.txt -i https://mirrors.aliyun.com/pypi/simple/ --trusted-host=mirrors.aliyun.com --no-cache-dir && \
    /opt/conda/envs/cosyvoice/bin/pip install runpod

COPY runpod-workflows/cosyvoice-worker/handler.py /opt/worker/handler.py
CMD ["/opt/conda/envs/cosyvoice/bin/python", "-u", "/opt/worker/handler.py"]
