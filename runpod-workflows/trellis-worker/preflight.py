"""Run tiny real CUDA operations before downloading/loading any model weights."""
import importlib
import time
import torch


def check():
    started = time.perf_counter()
    result = {'torch': torch.__version__, 'cuda': torch.version.cuda,
              'gpu': torch.cuda.get_device_name(), 'capability': list(torch.cuda.get_device_capability()),
              'torch_arches': torch.cuda.get_arch_list(), 'checks': []}
    if result['capability'] != [12, 0]:
        raise RuntimeError('This worker is built for Blackwell sm_120 only')
    for name in ['cumesh', 'flex_gemm', 'o_voxel', 'nvdiffrast.torch', 'xformers.ops']:
        importlib.import_module(name)
        result['checks'].append(name + ':import')
    x = torch.randn(32, 32, device='cuda', dtype=torch.float16)
    assert torch.isfinite(x @ x).all().item()
    torch.cuda.synchronize()
    result['checks'].append('torch:matmul')
    import xformers.ops as xops
    q = torch.randn(1, 128, 8, 64, device='cuda', dtype=torch.float16)
    output = xops.memory_efficient_attention(q, q, q)
    assert torch.isfinite(output).all().item()
    mask = xops.fmha.BlockDiagonalMask.from_seqlens([64, 64])
    assert torch.isfinite(xops.memory_efficient_attention(q, q, q, mask)).all().item()
    torch.cuda.synchronize()
    result['checks'].append('xformers:dense_and_varlen')
    result['elapsed_ms'] = round((time.perf_counter() - started) * 1000)
    return result
