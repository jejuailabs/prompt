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
# Raw float WAV straight from ACE-Step (4 min stereo 48 kHz ≈ 92 MB) before MP3 encoding.
MAX_SOURCE_BYTES = 256 * 1024 * 1024
MAX_DURATION_SECONDS = 240
MAX_WAIT_SECONDS = 25 * 60
# standard: XL-Turbo 8 steps. The XL-SFT 'high' preset (50 steps) returns once its
# weights fit in the image build (the runner ran out of disk with both XL models).
QUALITY_PRESETS: dict[str, dict[str, Any]] = {
    'standard': {'model': 'acestep-v15-xl-turbo', 'inference_steps': 8},
}
OVERRIDABLE = {
    'model', 'inference_steps', 'guidance_scale', 'shift', 'infer_method', 'use_adg',
    'cfg_interval_start', 'cfg_interval_end', 'thinking', 'use_format', 'use_cot_caption',
    'use_cot_language', 'lm_temperature', 'lm_cfg_scale', 'lm_top_p', 'lm_top_k',
    'lm_repetition_penalty', 'keyscale', 'timesignature', 'seed', 'use_random_seed',
}
server: subprocess.Popen | None = None
server_lock = threading.Lock()
generation_lock = threading.Lock()
# Last lines printed by the ACE-Step server, returned with any failure so the
# cause is visible through the RunPod job API (console logs are not retained).
# Started instead of `python -m acestep.api_server`. torchaudio.save in this
# image routes through torchcodec, whose native library fails to load, so every
# audio export failed. Fall back to soundfile (wav/flac) or soundfile + ffmpeg.
SERVER_LAUNCHER = """
import os, runpy, subprocess, tempfile
import soundfile as sf
import torchaudio

_original_save = torchaudio.save

def _save(uri, src, sample_rate, *args, **kwargs):
    try:
        return _original_save(uri, src, sample_rate, *args, **kwargs)
    except Exception as error:
        print(f'[launcher] torchaudio.save failed, using soundfile/ffmpeg: {error}', flush=True)
    data = src.detach().cpu().float().numpy()
    if kwargs.get('channels_first', True) and data.ndim == 2:
        data = data.T
    path = os.fspath(uri)
    ext = (kwargs.get('format') or os.path.splitext(path)[1].lstrip('.') or 'wav').lower()
    if ext in ('wav', 'flac'):
        sf.write(path, data, sample_rate, format=ext.upper())
        return None
    fd, temporary = tempfile.mkstemp(suffix='.wav')
    os.close(fd)
    try:
        sf.write(temporary, data, sample_rate, subtype='FLOAT')
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', temporary, path], check=True)
    finally:
        os.unlink(temporary)
    return None

torchaudio.save = _save
runpy.run_module('acestep.api_server', run_name='__main__', alter_sys=True)
"""

server_log: collections.deque[str] = collections.deque(maxlen=200)
startup_error: str | None = None
# DiT currently loaded in slot 1; XL-Turbo is preloaded at startup (ACESTEP_CONFIG_PATH).
loaded_model = 'acestep-v15-xl-turbo'


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
            [sys.executable, '-u', '-c', SERVER_LAUNCHER],
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


def ensure_model(name: str) -> None:
    """Swap the slot-1 DiT only when a different quality preset is requested.

    Two XL DiTs plus the LM do not fit in 24 GB together, so one is loaded at a time.
    """
    global loaded_model
    if name == loaded_model:
        return
    request_json('/v1/init', {'model': name, 'slot': 1}, timeout=900)
    loaded_model = name


def get_audio(path: str) -> bytes:
    parsed = urlparse(path)
    if parsed.scheme or parsed.netloc or not path.startswith('/v1/audio?'):
        raise ValueError('ACE-Step returned an unsafe audio path')
    try:
        with urlopen(Request(f'{BASE_URL}{path}'), timeout=180) as response:
            content = response.read(MAX_SOURCE_BYTES + 1)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f'ACE-Step audio download failed: {error}') from error
    if not content or len(content) > MAX_SOURCE_BYTES:
        raise ValueError('ACE-Step audio output is empty or too large')
    return content


def wav_to_mp3(wav: bytes) -> bytes:
    """Encode with the system ffmpeg.

    ACE-Step's own MP3 export first writes a temp WAV through torchaudio, which
    routes to torchcodec and fails to load in this image. The server is asked
    for WAV (saved by the soundfile fallback in SERVER_LAUNCHER) and encoded here.
    """
    with tempfile.TemporaryDirectory() as tmp:
        source, target = Path(tmp) / 'in.wav', Path(tmp) / 'out.mp3'
        source.write_bytes(wav)
        done = subprocess.run(
            ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
             '-codec:a', 'libmp3lame', '-b:a', '192k', str(target)],
            capture_output=True, text=True, timeout=180,
        )
        if done.returncode != 0 or not target.exists():
            raise RuntimeError(f'MP3 encoding failed: {done.stderr[-500:]}')
        mp3 = target.read_bytes()
    if not mp3 or len(mp3) > MAX_AUDIO_BYTES:
        raise ValueError('Encoded MP3 is empty or exceeds the 60 MB limit')
    return mp3


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
    quality_name = as_string(payload.get('quality'), 'quality', 20) or 'standard'
    if quality_name not in QUALITY_PRESETS:
        raise ValueError('unsupported quality')
    batch_size = as_integer(payload.get('batch_size'), 'batch_size', 2, 1, 4)
    if task_type == 'cover' and not cover_audio_url:
        raise ValueError('cover_audio_url is required for a cover task')

    # One GPU worker processes one song at a time. Serializing here protects
    # VRAM and preserves a truthful queue rather than starting overlapping jobs.
    with generation_lock:
        ensure_server()
        temporary_cover: str | None = download_cover_audio(cover_audio_url) if task_type == 'cover' else None
        try:
            quality = QUALITY_PRESETS[quality_name]
            ensure_model(str(quality['model']))
            request_payload: dict[str, Any] = {
                'prompt': prompt,
                # Official guide: instrumental pieces use the [Instrumental] lyric tag.
                'lyrics': '' if task_type == 'cover' else ('[Instrumental]' if instrumental else lyrics),
                'thinking': task_type != 'cover' and payload.get('thinking') is not False,
                # use_format lets the LM rewrite (and often drop) the user's lyrics, which
                # produced instrumental-only songs. Keep the user's lyrics verbatim.
                'use_format': False,
                'use_cot_language': language == 'unknown',
                'vocal_language': 'unknown' if instrumental else language,
                'audio_duration': duration,
                'audio_format': 'wav',
                'batch_size': batch_size,
                'lm_model_path': 'acestep-5Hz-lm-1.7B',
                'lm_backend': 'vllm',
                'bpm': bpm,
                'task_type': task_type,
                **quality,
                **({'src_audio_path': temporary_cover, 'audio_cover_strength': 1.0} if temporary_cover else {}),
            }
            # Whitelisted tuning knobs so quality can be tuned without rebuilding the image.
            overrides = payload.get('ace_overrides') if isinstance(payload.get('ace_overrides'), dict) else {}
            request_payload.update({key: value for key, value in overrides.items() if key in OVERRIDABLE})
            task = request_json('/release_task', timeout=300, payload=request_payload)
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
                    items = [item for item in files if isinstance(item, dict)] if isinstance(files, list) else []
                    songs = []
                    for item in items:
                        path = item.get('file')
                        if not isinstance(path, str) or not path:
                            continue
                        audio = wav_to_mp3(get_audio(path))
                        songs.append({
                            'audio_base64': base64.b64encode(audio).decode('ascii'),
                            'seed': str(item.get('seed_value', '')),
                            'metadata': item.get('metas') if isinstance(item.get('metas'), dict) else {},
                        })
                    if not songs:
                        raise RuntimeError(f'ACE-Step saved no audio file\n{log_tail(30)}')
                    return {
                        # First song kept at the top level for existing callers.
                        'audio_base64': songs[0]['audio_base64'],
                        'seed': songs[0]['seed'],
                        'metadata': songs[0]['metadata'],
                        'songs': songs,
                        'content_type': 'audio/mpeg',
                        'model': request_payload.get('model'),
                        'quality': quality_name,
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
