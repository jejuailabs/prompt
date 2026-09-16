"""Public model downloads for the isolated H3 benchmark; no access token needed."""
from concurrent.futures import ThreadPoolExecutor
from huggingface_hub import hf_hub_download
from pathlib import Path

files = [
    ('Comfy-Org/MiniMax-H3', 'diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors'),
    ('Comfy-Org/MiniMax-H3', 'text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors'),
    ('Comfy-Org/MiniMax-H3', 'vae/minimax_h3_video_vae_fp16.safetensors'),
    ('Comfy-Org/MiniMax-H3', 'vae/minimax_h3_audio_vae_fp32.safetensors'),
    ('lightx2v/Minimax-h3-Turbo', 'minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors'),
]

def download(item):
    repo, filename = item
    base = '/comfyui/models/loras' if repo.startswith('lightx2v/') else '/comfyui/models'
    Path(base).mkdir(parents=True, exist_ok=True)
    result = hf_hub_download(repo_id=repo, filename=filename, local_dir=base, token=False)
    print('READY ' + result, flush=True)

with ThreadPoolExecutor(max_workers=3) as pool:
    list(pool.map(download, files))
