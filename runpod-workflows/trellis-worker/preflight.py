"""Run tiny real CUDA operations before downloading/loading any model weights."""
import importlib
import os
import time
import torch


def check():
    started = time.perf_counter()
    result = {'torch': torch.__version__, 'cuda': torch.version.cuda,
              'gpu': torch.cuda.get_device_name(), 'capability': list(torch.cuda.get_device_capability()),
              'torch_arches': torch.cuda.get_arch_list(), 'checks': []}
    expected = [int(part) for part in os.environ.get('EXPECTED_GPU_ARCH', '12.0').split('.')]
    if result['capability'] != expected:
        raise RuntimeError(f"Worker architecture mismatch: expected {expected}, got {result['capability']}")
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
    import cumesh
    mesh = cumesh.CuMesh()
    vertices = torch.tensor([[0., 0., 0.], [1., 0., 0.], [0., 1., 0.], [0., 0., 1.]], device='cuda')
    faces = torch.tensor([[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]], device='cuda', dtype=torch.int32)
    mesh.init(vertices, faces)
    mesh.compute_face_normals()
    assert torch.isfinite(mesh.read()[0]).all().item()
    torch.cuda.synchronize()
    result['checks'].append('cumesh:tetrahedron_normals')
    from flex_gemm.ops.spconv import sparse_submanifold_conv3d
    coords = torch.cartesian_prod(*[torch.arange(4, device='cuda', dtype=torch.int32)] * 3)
    coords = torch.cat([torch.zeros((len(coords), 1), device='cuda', dtype=torch.int32), coords], dim=1).contiguous()
    feats = torch.randn(len(coords), 32, device='cuda', dtype=torch.float16)
    weight = torch.randn(32, 3, 3, 3, 32, device='cuda', dtype=torch.float16) * .01
    bias = torch.zeros(32, device='cuda', dtype=torch.float16)
    output, _ = sparse_submanifold_conv3d(feats, coords, torch.Size([1, 32, 4, 4, 4]), weight, bias)
    assert torch.isfinite(output).all().item()
    torch.cuda.synchronize()
    result['checks'].append('flex_gemm:sparse_convolution')
    result['elapsed_ms'] = round((time.perf_counter() - started) * 1000)
    return result
