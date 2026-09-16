"""Fail fast on incompatible hosts; supervise ComfyUI and the RunPod handler."""
import signal
import subprocess
import sys
import time
from pathlib import Path


def preflight():
    import torch
    from sageattention import sageattn
    if torch.__version__ != '2.11.0+cu130' or torch.version.cuda != '13.0':
        raise RuntimeError('Unexpected PyTorch/CUDA runtime')
    if torch.cuda.get_device_capability(0) != (12, 0):
        raise RuntimeError('This image is built for Blackwell sm120 only')
    q = torch.randn((1, 4, 128, 128), dtype=torch.bfloat16, device='cuda')
    result = sageattn(q, q, q, tensor_layout='HND', is_causal=False)
    torch.cuda.synchronize()
    if not torch.isfinite(result).all():
        raise RuntimeError('SageAttention GPU smoke test failed')
    print('H3 runtime verified:', torch.__version__, torch.cuda.get_device_name(0), flush=True)


def main():
    preflight()
    processes = []

    def stop(signum=None, frame=None):
        for process in processes:
            if process.poll() is None:
                process.terminate()
        for process in processes:
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill()

    def interrupted(signum, frame):
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    try:
        comfy = subprocess.Popen([
            sys.executable, '-u', '/comfyui/main.py', '--disable-auto-launch',
            '--disable-metadata', '--listen', '127.0.0.1', '--highvram',
            '--use-sage-attention', '--cache-none', '--log-stdout',
        ], cwd='/comfyui')
        processes.append(comfy)
        Path('/tmp/comfyui.pid').write_text(str(comfy.pid))
        processes.append(subprocess.Popen([sys.executable, '-u', '/worker/handler_video.py']))
        while all(p.poll() is None for p in processes):
            time.sleep(1)
        raise SystemExit(next((p.returncode or 1 for p in processes if p.poll() is not None), 1))
    finally:
        stop()


if __name__ == '__main__':
    main()
