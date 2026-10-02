"""RunPod handler for ACE-Step 1.5 XL-Turbo.

The official ACE-Step REST API is deliberately bound to 127.0.0.1. This
adapter validates the public job input, waits for completion, then returns a
bounded MP3 payload for the PLAYLAB server to persist in Supabase Storage.
"""
import base64
import collections
import contextlib
import traceback
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

import runpod

BASE_URL = 'http://127.0.0.1:8001'
MAX_AUDIO_BYTES = 60 * 1024 * 1024
MAX_DURATION_SECONDS = 240
MAX_WAIT_SECONDS = 25 * 60
server: subprocess.Popen | None = None
server_lock = threading.Lock()
generation_lock = threading.Lock()
# Last lines printed by the ACE-Step server, returned with any failure so the
# cause is visible through the RunPod job API (console logs are not retained).
server_log: collections.deque[str] = collections.deque(maxlen=200)
startup_error: str | None = None


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


def pump_server_output(process: subprocess.Popen) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        line = line.rstrip()
        server_log.append(line)
        print(f'[acestep] {line}', flush=True)


def log_tail(lines: int = 60) -> str:
    return '\n'.join(list(server_log)[-lines:])


def prewarm() -> None:
    """Load models as soon as the worker boots instead of after the first job arrives."""
    global startup_error
    try:
        ensure_server()
        print('[worker] ACE-Step server ready', flush=True)
    except BaseException as error:  # noqa: BLE001 - surfaced to the next job
        startup_error = f'{type(error).__name__}: {error}'
        print(f'[worker] ACE-Step prewarm failed: {startup_error}', flush=True)


def diagnose() -> dict[str, Any]:
    def run(cmd: list[str]) -> str:
        try:
            return subprocess.run(cmd, capture_output=True, text=True, timeout=30).stdout[-3000:]
        except Exception as error:  # noqa: BLE001
            return f'{type(error).__name__}: {error}'
    alive = server is not None and server.poll() is None
    return {
        'diagnose': True,
        'server_alive': alive,
        'server_returncode': None if server is None else server.poll(),
        'startup_error': startup_error,
        'nvidia_smi': run(['nvidia-smi', '--query-gpu=name,memory.used,memory.total', '--format=csv']),
        'log_tail': log_tail(120),
    }


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
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1,
            start_new_session=True,
        )
        threading.Thread(target=pump_server_output, args=(server,), daemon=True).start()
        deadline = time.monotonic() + 8 * 60
        while time.monotonic() < deadline:
            if server.poll() is not None:
                raise RuntimeError(f'ACE-Step API exited during startup ({server.returncode})\n{log_tail(40)}')
            try:
                health = request_json('/health', timeout=5)
                if health.get('data', {}).get('status') == 'ok':
                    return
            except RuntimeError:
                time.sleep(2)
        raise RuntimeError(f'ACE-Step API did not become ready within 8 minutes\n{log_tail(40)}')


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


def download_cover_audio(url: str) -> str:
    """Fetch only a PLAYLAB Supabase public upload into this worker's temp dir.

    ACE-Step's cover API needs a local absolute source path.  The validation
    protects the worker from arbitrary internal URLs when it is invoked outside
    of the PLAYLAB API.
    """
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.supabase.co'):
        raise ValueError('cover_audio_url must be a PLAYLAB Supabase HTTPS URL')
    if not parsed.path.startswith('/storage/v1/object/public/uploads/music-cover/'):
        raise ValueError('cover_audio_url must point to the music-cover upload path')
    suffix = Path(parsed.path).suffix.lower()
    if suffix not in {'.mp3', '.m4a', '.aac', '.wav', '.wave', '.flac', '.ogg'}:
        raise ValueError('unsupported cover audio extension')
    try:
        with urlopen(Request(url), timeout=90) as response:
            length = response.headers.get('Content-Length')
            if length and int(length) > MAX_AUDIO_BYTES:
                raise ValueError('cover audio exceeds 60 MB')
            content = response.read(MAX_AUDIO_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f'could not download cover audio: {error}') from error
    if not content or len(content) > MAX_AUDIO_BYTES:
        raise ValueError('cover audio is empty or exceeds 60 MB')
    handle = tempfile.NamedTemporaryFile(prefix='acestep-cover-', suffix=suffix, delete=False)
    try:
        handle.write(content)
        return handle.name
    finally:
        handle.close()


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


def generate(job: dict[str, Any]) -> dict[str, Any]:
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
    task_type = as_string(payload.get('task_type'), 'task_type', 20) or 'text2music'
    if task_type not in {'text2music', 'cover'}:
        raise ValueError('unsupported task_type')
    cover_audio_url = as_string(payload.get('cover_audio_url'), 'cover_audio_url', 2_000)
    if task_type == 'cover' and not cover_audio_url:
        raise ValueError('cover_audio_url is required for a cover task')

    # One GPU worker processes one song at a time. Serializing here protects
    # VRAM and preserves a truthful queue rather than starting overlapping jobs.
    with generation_lock:
        ensure_server()
        temporary_cover: str | None = download_cover_audio(cover_audio_url) if task_type == 'cover' else None
        try:
            task = request_json('/release_task', timeout=300, payload={
                'prompt': prompt,
                'lyrics': '' if instrumental or task_type == 'cover' else lyrics,
                'thinking': task_type != 'cover' and payload.get('thinking') is not False,
                'use_format': task_type != 'cover',
                'vocal_language': language,
                'audio_duration': duration,
                'audio_format': 'mp3',
                'model': 'acestep-v15-xl-turbo',
                'inference_steps': 8,
                'shift': 3.0,
                'lm_model_path': 'acestep-5Hz-lm-1.7B',
                'lm_backend': 'vllm',
                'bpm': bpm,
                'task_type': task_type,
                **({'src_audio_path': temporary_cover, 'audio_cover_strength': 1.0} if temporary_cover else {}),
            })
            task_id = task.get('data', {}).get('task_id')
            if not isinstance(task_id, str) or not task_id:
                raise RuntimeError('ACE-Step did not return a task ID')
            deadline = time.monotonic() + MAX_WAIT_SECONDS
            while time.monotonic() < deadline:
                try:
                    # The first job can arrive while the 5Hz LM is still initializing;
                    # a slow status reply is not a failure, so keep polling until the deadline.
                    result = request_json('/query_result', {'task_id_list': [task_id]}, timeout=120)
                except RuntimeError as error:
                    if 'timed out' not in str(error):
                        raise
                    time.sleep(3)
                    continue
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
        finally:
            if temporary_cover:
                with contextlib.suppress(OSError):
                    os.unlink(temporary_cover)
    raise TimeoutError(f'ACE-Step generation exceeded {MAX_WAIT_SECONDS // 60} minutes')


def handler(job: dict[str, Any]) -> dict[str, Any]:
    payload = job.get('input') or {}
    if isinstance(payload, dict) and payload.get('diagnose') is True:
        return diagnose()
    try:
        return generate(job)
    except BaseException as error:  # noqa: BLE001 - never let a job crash the worker silently
        traceback.print_exc()
        return {'error': f'{type(error).__name__}: {error}', 'log_tail': log_tail(60)}


if __name__ == '__main__':
    threading.Thread(target=prewarm, daemon=True).start()
    runpod.serverless.start({'handler': handler})
