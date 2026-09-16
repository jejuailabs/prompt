FROM python:3.11-slim-bookworm
ENV PYTHONUNBUFFERED=1 OMP_NUM_THREADS=4
RUN apt-get update && apt-get install -y --no-install-recommends libx11-6 libxxf86vm1 libxfixes3 libxrender1 libxi6 libgl1 libegl1 libsm6 libice6 libgomp1 && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir bpy==4.2.0 runpod==1.7.13
WORKDIR /app
COPY policy.py process.py handler.py test_policy.py smoke.py ./
RUN python -m unittest test_policy && python smoke.py
CMD ["python", "-u", "handler.py"]
