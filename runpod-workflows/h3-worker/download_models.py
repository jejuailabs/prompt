"""Bake public, revision-pinned H3 models into the image without credentials."""
from concurrent.futures import ThreadPoolExecutor
from huggingface_hub import hf_hub_download

MODELS = [
    ('Comfy-Org/MiniMax-H3', '7e75982b97cd5a41d2dcfa1904ee88d0686d6fd1', name, '/comfyui/models')
    for name in (
        'diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors',
        'text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors',
        'vae/minimax_h3_video_vae_fp16.safetensors',
        'vae/minimax_h3_audio_vae_fp32.safetensors',
    )
] + [(
    'lightx2v/Minimax-h3-Turbo', '3ec17a324ced54151364f24f8b5fb6bf7e26414f',
    'minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors', '/comfyui/models/loras',
)]


def download(item):
    repo, revision, filename, directory = item
    hf_hub_download(repo, filename, revision=revision, local_dir=directory, token=False)
    print('Model ready:', filename, flush=True)


if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(download, MODELS))
