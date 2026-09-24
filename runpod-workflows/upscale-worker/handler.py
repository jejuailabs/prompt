"""SeedVR2 Serverless adapter for immutable PLAYLAB video upscales.

The input video is fetched only from the project's public Supabase uploads
bucket.  Output moves directly to an expiring signed upload destination so
the RunPod response never carries a multi-megabyte video payload.
"""
from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import runpod

MAX_INPUT_BYTES = 150 * 1024 * 1024
MAX_RUNTIME_SECONDS = 30 * 60
MODEL_DIR = Path('/opt/models/SEEDVR2')
MODEL_NAME = 'seedvr2_ema_3b_fp8_e4m3fn.safetensors'
CLI = Path('/opt/seedvr2/inference_cli.py')


def bounded_integer(value: Any, name: str, low: int, high: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not low <= value <= high:
        raise ValueError(f'{name} must be an integer between {low} and {high}')
    return value


def validate_source_url(value: Any) -> str:
    if not isinstance(value, str):
        raise ValueError('source_url is required')
    url = urlparse(value)
    if url.scheme != 'https' or not url.hostname or not url.hostname.endswith('.supabase.co'):
        raise ValueError('source_url must be a public Supabase URL')
    if not url.path.startswith('/storage/v1/object/public/uploads/'):
        raise ValueError('source_url must be a PLAYLAB uploads object')
    if not url.path.lower().endswith(('.mp4', '.mov', '.webm')):
        raise ValueError('source_url must point to a supported video')
    return value


def validate_upload(value: Any) -> tuple[str, str]:
    if not isinstance(value, dict):
        raise ValueError('output_upload is required')
    url = value.get('signed_url')
    content_type = value.get('content_type', 'video/mp4')
    parsed = urlparse(url) if isinstance(url, str) else None
    if not parsed or parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.supabase.co'):
        raise ValueError('output_upload must be a signed Supabase URL')
    if not parsed.path.startswith('/storage/v1/object/upload/sign/uploads/'):
        raise ValueError('output_upload is not an uploads signed URL')
    if content_type != 'video/mp4':
        raise ValueError('output_upload content_type must be video/mp4')
    return url, content_type


def download_video(url: str, destination: Path) -> None:
    try:
        with urlopen(Request(url, headers={'User-Agent': 'PLAYLAB-SeedVR2/1.0'}), timeout=90) as response:
            content_type = response.headers.get_content_type()
            length = response.headers.get('Content-Length')
            if content_type not in {'video/mp4', 'video/webm', 'video/quicktime', 'application/octet-stream'}:
                raise ValueError('source_url did not return a video')
            if length and int(length) > MAX_INPUT_BYTES:
                raise ValueError('source video exceeds the 150 MB limit')
            total = 0
            with destination.open('wb') as output:
                while chunk := response.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_INPUT_BYTES:
                        raise ValueError('source video exceeds the 150 MB limit')
                    output.write(chunk)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f'could not download source video: {error}') from error
    if destination.stat().st_size < 1024:
        raise ValueError('source video is empty')


def probe_video(path: Path) -> None:
    result = subprocess.run(
        ['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height', '-of', 'json', str(path)],
        check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=30,
    )
    if result.returncode != 0 or '"codec_name"' not in result.stdout:
        raise ValueError('source is not a readable video stream')


def run_upscale(source: Path, restored: Path, target_width: int) -> None:
    if not CLI.is_file() or not (MODEL_DIR / MODEL_NAME).is_file():
        raise RuntimeError('SeedVR2 runtime image is incomplete')
    # Batch 1 is safe on 24 GB cards. The Blackwell endpoint can raise this
    # through an endpoint environment variable after a measured VRAM test.
    batch_size = bounded_integer(int(os.environ.get('SEEDVR2_BATCH_SIZE', '1')), 'SEEDVR2_BATCH_SIZE', 1, 32)
    command = [
        'python3', str(CLI), '--video_path', str(source), '--resolution', str(target_width),
        '--batch_size', str(batch_size), '--model', MODEL_NAME, '--model_dir', str(MODEL_DIR),
        '--output', str(restored), '--output_format', 'video', '--preserve_vram',
    ]
    result = subprocess.run(command, cwd=str(CLI.parent), check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=MAX_RUNTIME_SECONDS)
    if result.returncode != 0:
        raise RuntimeError(f'SeedVR2 inference failed: {result.stdout[-1600:]}')
    if not restored.is_file() or restored.stat().st_size < 1024:
        raise RuntimeError('SeedVR2 did not create an MP4 output')


def remux_with_source_audio(restored: Path, source: Path, destination: Path) -> None:
    # SeedVR2 restores the visual stream. Keep the original optional audio
    # stream exactly, rather than silently stripping narration or music.
    result = subprocess.run(
        ['ffmpeg', '-y', '-i', str(restored), '-i', str(source), '-map', '0:v:0', '-map', '1:a?', '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart', '-shortest', str(destination)],
        check=False, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=180,
    )
    if result.returncode != 0 or not destination.is_file() or destination.stat().st_size < 1024:
        raise RuntimeError(f'could not package upscaled video: {result.stdout[-1000:]}')


def upload_signed(url: str, content_type: str, source: Path) -> None:
    request = Request(url, data=source.read_bytes(), method='PUT', headers={
        'content-type': content_type,
        'cache-control': 'max-age=31536000, immutable',
    })
    try:
        with urlopen(request, timeout=300) as response:
            if response.status not in (200, 201):
                raise RuntimeError(f'Storage returned HTTP {response.status}')
    except HTTPError as error:
        detail = error.read(500).decode('utf-8', errors='replace')
        raise RuntimeError(f'Storage upload failed: HTTP {error.code} {detail}') from error


def handler(job: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    data = job.get('input') or {}
    if not isinstance(data, dict) or data.get('operation') != 'seedvr2_video_upscale':
        raise ValueError('unsupported operation')
    source_url = validate_source_url(data.get('source_url'))
    upload_url, content_type = validate_upload(data.get('output_upload'))
    target_width = bounded_integer(data.get('target_width'), 'target_width', 512, 1920)
    target_height = bounded_integer(data.get('target_height'), 'target_height', 512, 1920)
    if (target_width, target_height) not in {
        (720, 1280), (1080, 1920), (1280, 720), (1920, 1080), (720, 720), (1080, 1080),
    }:
        raise ValueError('unsupported delivery resolution')
    if data.get('model', MODEL_NAME) != MODEL_NAME:
        raise ValueError('unsupported upscale model')
    if shutil.which('ffmpeg') is None or shutil.which('ffprobe') is None:
        raise RuntimeError('ffmpeg runtime is unavailable')

    with tempfile.TemporaryDirectory(prefix='playlab-seedvr2-') as directory:
        work = Path(directory)
        source, restored, output = work / 'source.mp4', work / 'restored.mp4', work / 'output.mp4'
        download_video(source_url, source)
        probe_video(source)
        run_upscale(source, restored, target_width)
        remux_with_source_audio(restored, source, output)
        probe_video(output)
        upload_signed(upload_url, content_type, output)
        return {
            'uploaded': True,
            'model': MODEL_NAME,
            'target_width': target_width,
            'target_height': target_height,
            'bytes': output.stat().st_size,
            'elapsed_ms': round((time.perf_counter() - started) * 1000),
        }


if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
