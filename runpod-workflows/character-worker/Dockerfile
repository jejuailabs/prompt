FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=4
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates xz-utils libx11-6 libxxf86vm1 libxfixes3 libxrender1 libxi6 libgl1 libegl1 libsm6 libice6 libgomp1 libxkbcommon0 libwayland-client0 libwayland-cursor0 libwayland-egl1 libdecor-0-0 && rm -rf /var/lib/apt/lists/*
# Use Blender's supported process lifecycle, not bpy's Python-wheel teardown.
RUN curl -fSL https://download.blender.org/release/Blender4.2/blender-4.2.23-linux-x64.tar.xz -o /tmp/blender.tar.xz \
    && echo 'bea0eb3146be13eae6225409a117b215184f41b7f79e799f97cb3abb8f6dc404  /tmp/blender.tar.xz' | sha256sum -c - \
    && tar -xJf /tmp/blender.tar.xz -C /opt && rm /tmp/blender.tar.xz \
    && ln -s /opt/blender-4.2.23-linux-x64/blender /usr/local/bin/blender
RUN pip install --no-cache-dir runpod==1.7.13
WORKDIR /app
COPY policy.py process.py handler.py test_policy.py smoke.py ./
RUN python -m unittest test_policy && blender -b --factory-startup --disable-autoexec --python-exit-code 1 --python smoke.py
CMD ["python", "-u", "handler.py"]
