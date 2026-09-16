FROM pytorch/pytorch:2.7.0-cuda12.8-cudnn9-devel
ENV DEBIAN_FRONTEND=noninteractive PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential libgl1 libglib2.0-0 libxrender1 libxi6 libxkbcommon0 && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/SkinTokens
ARG SKINTOKENS_REV=273b691d35989d71cd17ff2895fdc735097b92d1
RUN git init && git remote add origin https://github.com/VAST-AI-Research/SkinTokens.git && git fetch --depth 1 origin ${SKINTOKENS_REV} && git checkout --detach FETCH_HEAD
RUN python -m pip install -r requirements.txt runpod ninja packaging && MAX_JOBS=2 python -m pip install flash-attn --no-build-isolation
RUN python download.py --model
COPY runpod-workflows/character-worker/process.py runpod-workflows/character-worker/policy.py /opt/character/
COPY runpod-workflows/rigging-worker/handler.py runpod-workflows/rigging-worker/retarget.py /opt/worker/
CMD ["python", "-u", "/opt/worker/handler.py"]
