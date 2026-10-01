"""RunPod handler for ACE-Step 1.5 XL-Turbo.

The official ACE-Step REST API is deliberately bound to 127.0.0.1. This
adapter validates the public job input, waits for completion, then returns a
bounded MP3 payload for the PLAYLAB server to persist in Supabase Storage.
"""
import base64
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import runpod

BASE_URL = 'http://127.0.0.1:8001'
MAX_AUDIO_BYTES = 60 * 1024 * 1024
MAX_DURATION_SECONDS = 120
MAX_WAIT_SECONDS = 25 * 60
server: subprocess.Popen | None = None
server_lock = threading.Lock()
generation_lock = threading.Lock()


def request_json(path: str, payload: dict[str, Any] | None = None, timeout: int = 30) -> dict[str, Any]:
    body = None if payload is None else json.dumps(payload).encode('utf-8')
    request = Request(
        f'{BASE_URL}{path}', body, method='POST' if body is not None else 'GET',
        headers={'Content-Type': 'application/json'} if body is not None else {},
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            decoded = json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError(f'ACE-Step API request failed ({path}): {error}') from error
    if decoded.get('code') not in (None, 200) or decoded.get('error'):
        raise RuntimeError(f'ACE-Step API error: {decoded.get("error") or decoded}')
    return decoded


def ensure_server() -> None:
    global server
    with server_lock:
        if server is not None and server.poll() is None:
            return
        environment = os.environ.copy()
        environment.update({
            'ACESTEP_API_HOST': '127.0.0.1',
            'ACESTEP_API_PORT': '8001',
            'ACESTEP_API_WORKERS': '1',
            'ACESTEP_QUEUE_WORKERS': '1',
            'ACESTEP_QUEUE_MAXSIZE': '1',
        })
        server = subprocess.Popen(
            [sys.executable, '-u', '-m', 'acestep.api_server'],
            cwd='/opt/ace-step', env=environment,
        )
        deadline = time.monotonic() + 8 * 60
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f'ACE-Step API exited during startup ({server.returncode})')
            try:
                health = request_json('/health', timeout=5)
                if health.get('data', {}).get('status') == 'ok':
                    return
            except RuntimeError:
                time.sleep(2)
        raise RuntimeError('ACE-Step API did not become ready within 8 minutes')


def get_audio(path: str) -> bytes:
    parsed = urlparse(path)
    if parsed.scheme or parsed.netloc or not path.startswith('/v1/audio?'):
        raise ValueError('ACE-Step returned an unsafe audio path')
    try:
        with urlopen(Request(f'{BASE_URL}{path}'), timeout=90) as response:
            content = response.read(MAX_AUDIO_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f'ACE-Step audio download failed: {error}') from error
    if not content or len(content) > MAX_AUDIO_BYTES:
        raise ValueError('ACE-Step MP3 output is empty or exceeds the 60 MB limit')
    return content


def as_string(value: Any, field: str, limit: int, required: bool = False) -> str:
    if value is None:
        if required:
            raise ValueError(f'{field} is required')
        return ''
    if not isinstance(value, str):
        raise ValueError(f'{field} must be a string')
    result = value.strip()
    if required and not result:
        raise ValueError(f'{field} is required')
    if len(result) > limit:
        raise ValueError(f'{field} exceeds {limit} characters')
    return result


def as_integer(value: Any, field: str, default: int, low: int, high: int) -> int:
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, int) or value < low or value > high:
        raise ValueError(f'{field} must be an integer between {low} and {high}')
    return value


def handler(job: dict[str, Any]) -> dict[str, Any]:
    started = time.perf_counter()
    payload = job.get('input') or {}
    if not isinstance(payload, dict):
        raise ValueError('input must be an object')
    prompt = as_string(payload.get('prompt'), 'prompt', 2_000, required=True)
    lyrics = as_string(payload.get('lyrics'), 'lyrics', 8_000)
    instrumental = payload.get('instrumental') is True
    language = as_string(payload.get('vocal_language'), 'vocal_language', 20) or 'ko'
    if language not in {'ko', 'en', 'ja', 'zh', 'unknown'}:
        raise ValueError('unsupported vocal_language')
    duration = as_integer(payload.get('duration_sec'), 'duration_sec', 30, 10, MAX_DURATION_SECONDS)
    bpm = payload.get('bpm')
    if bpm is not None:
        bpm = as_integer(bpm, 'bpm', 120, 30, 300)

    # One GPU worker processes one song at a time. Serializing here protects
    # VRAM and preserves a truthful queue rather than starting overlapping jobs.
    with generation_lock:
        ensure_server()
        task = request_json('/release_task', {
            'prompt': prompt,
            'lyrics': '' if instrumental else lyrics,
            'thinking': payload.get('thinking') is not False,
            'use_format': True,
            'vocal_language': language,
            'audio_duration': duration,
            'audio_format': 'mp3',
            'model': 'acestep-v15-xl-turbo',
            'inference_steps': 8,
            'shift': 3.0,
            'lm_model_path': 'acestep-5Hz-lm-1.7B',
            'lm_backend': 'vllm',
            'bpm': bpm,
        })
        task_id = task.get('data', {}).get('task_id')
        if not isinstance(task_id, str) or not task_id:
            raise RuntimeError('ACE-Step did not return a task ID')
        deadline = time.monotonic() + MAX_WAIT_SECONDS
        while time.monotonic() < deadline:
            result = request_json('/query_result', {'task_id_list': [task_id]})
            entries = result.get('data') or []
            entry = entries[0] if isinstance(entries, list) and entries else {}
            status = entry.get('status') if isinstance(entry, dict) else None
            if status == 1:
                raw = entry.get('result')
                try:
                    files = json.loads(raw) if isinstance(raw, str) else raw
                except json.JSONDecodeError as error:
                    raise RuntimeError('ACE-Step returned invalid result JSON') from error
                item = files[0] if isinstance(files, list) and files else {}
                path = item.get('file') if isinstance(item, dict) else None
                if not isinstance(path, str):
                    raise RuntimeError('ACE-Step result contains no MP3 path')
                audio = get_audio(path)
                metadata = item.get('metas') if isinstance(item, dict) and isinstance(item.get('metas'), dict) else {}
                return {
                    'audio_base64': base64.b64encode(audio).decode('ascii'),
                    'content_type': 'audio/mpeg',
                    'seed': str(item.get('seed_value', '')) if isinstance(item, dict) else '',
                    'metadata': metadata,
                    'model': 'acestep-v15-xl-turbo',
                    'duration_sec': duration,
                    'elapsed_ms': round((time.perf_counter() - started) * 1000),
                }
            if status == 2:
                raise RuntimeError(str(entry.get('error') or 'ACE-Step generation failed'))
            time.sleep(2)
    raise TimeoutError(f'ACE-Step generation exceeded {MAX_WAIT_SECONDS // 60} minutes')


if __name__ == '__main__':
    runpod.serverless.start({'handler': handler})
