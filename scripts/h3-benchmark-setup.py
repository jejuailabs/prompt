"""Explicit setup steps for the disposable H3 benchmark Pod only."""
import argparse
import os
import pathlib
import subprocess
import sys

parser = argparse.ArgumentParser()
parser.add_argument('stage', choices=['cu130', 'sage', 'fp8'])
args = parser.parse_args()
if not pathlib.Path('/benchmark').is_dir():
    raise RuntimeError('Diagnostic workspace /benchmark is missing')

def run(command, timeout=600, env=None):
    subprocess.run(command, check=True, timeout=timeout, env=env)

if args.stage == 'cu130':
    run(['uv', 'pip', 'install', 'torch==2.11.0+cu130', 'torchvision==0.26.0+cu130',
         'torchaudio==2.11.0+cu130', '--index-url', 'https://download.pytorch.org/whl/cu130'])
    import torch
    assert torch.version.cuda == '13.0', torch.__version__
    x = torch.ones((16, 16), device='cuda')
    print({'torch': torch.__version__, 'cuda': torch.version.cuda, 'gpu': torch.cuda.get_device_name(0), 'kernel_check': (x @ x).sum().item()}, flush=True)
elif args.stage == 'sage':
    import torch
    assert torch.version.cuda == '13.0'
    # The minimal diagnostic image has no CUDA development repository yet.
    run(['curl', '-fL', '--retry', '2', '-o', '/benchmark/cuda-keyring.deb',
         'https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2404/x86_64/cuda-keyring_1.1-1_all.deb'])
    run(['dpkg', '-i', '/benchmark/cuda-keyring.deb'])
    run(['apt-get', 'update'])
    run(['apt-get', 'install', '-y', '--no-install-recommends', 'build-essential', 'python3-dev',
         'cuda-nvcc-13-0', 'cuda-cudart-dev-13-0', 'cuda-cccl-13-0', 'cuda-libraries-dev-13-0'])
    run(['uv', 'pip', 'install', 'ninja', 'packaging', 'wheel', 'setuptools'])
    source = pathlib.Path('/benchmark/SageAttention')
    if not source.exists():
        run(['git', 'clone', 'https://github.com/thu-ml/SageAttention.git', str(source)])
    run(['git', '-C', str(source), 'checkout', '--detach', 'd1a57a546c3d395b1ffcbeecc66d81db76f3b4b5'])
    env = dict(os.environ, CUDA_HOME='/usr/local/cuda-13.0', TORCH_CUDA_ARCH_LIST='12.0',
               MAX_JOBS='4', EXT_PARALLEL='1', NVCC_APPEND_FLAGS='--threads=2')
    env['PATH'] = '/usr/local/cuda-13.0/bin:' + env['PATH']
    run(['uv', 'pip', 'install', '--no-build-isolation', '--no-deps', str(source)], timeout=900, env=env)
    # Real GPU call: importing the package alone does not verify sm120 kernels.
    from sageattention import sageattn
    q = torch.randn((1, 4, 1024, 128), dtype=torch.bfloat16, device='cuda')
    result = sageattn(q, q, q, tensor_layout='HND', is_causal=False)
    torch.cuda.synchronize()
    assert torch.isfinite(result).all()
    print('SageAttention sm120 GPU smoke test passed', flush=True)
else:
    from huggingface_hub import hf_hub_download
    filename = 'diffusion_models/minimax_h3_fl2va_pruned_fp8_scaled.safetensors'
    p = hf_hub_download(repo_id='Comfy-Org/MiniMax-H3', filename=filename, local_dir='/benchmark/models', token=False)
    target = pathlib.Path('/comfyui/models') / filename
    if not target.exists():
        target.symlink_to(p)
    print('FP8 checkpoint ready: ' + str(target), flush=True)
