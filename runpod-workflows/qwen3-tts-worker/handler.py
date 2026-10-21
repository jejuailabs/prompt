"""RunPod adapter for Qwen3-TTS: preset-speaker TTS and voice cloning.

input.mode = "tts"   -> 1.7B CustomVoice, requires text + speaker (instruct optional)
input.mode = "clone" -> 1.7B Base, requires text + ref_text + ref_audio_base64
A payload without mode but with ref_audio_base64 is treated as "clone" so the
existing PLAYLAB voice-clone route keeps working unchanged.
"""
import base64
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import time
from typing import Any

import runpod
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

MAX_REFERENCE_BYTES = 25 * 1024 * 1024
MAX_OUTPUT_BYTES = 50 * 1024 * 1024
MAX_TEXT_CHARS = 6_000
MAX_INSTRUCT_CHARS = 500
LANGUAGES = {"Korean", "Auto", "English", "Japanese", "Chinese"}
MODEL_PATHS = {
    "tts": os.environ.get("QWEN3_TTS_CUSTOM_VOICE_MODEL", "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice"),
    "clone": os.environ.get("QWEN3_TTS_BASE_MODEL", "Qwen/Qwen3-TTS-12Hz-1.7B-Base"),
}
MODEL_NAMES = {"tts": "Qwen3-TTS-12Hz-1.7B-CustomVoice", "clone": "Qwen3-TTS-12Hz-1.7B-Base"}
_models: dict[str, Qwen3TTSModel] = {}
_model_lock = threading.Lock()
_generation_lock = threading.Lock()


def required_string(value: Any, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    result = value.strip()
    if len(result) > limit:
        raise ValueError(f"{field} exceeds {limit} characters")
    return result


def decode_b64(value: Any, field: str, max_bytes: int) -> bytes:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field} is required")
    encoded = value.split(",", 1)[-1]
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except ValueError as error:
        raise ValueError(f"{field} must be valid base64") from error
    if not decoded or len(decoded) > max_bytes:
        raise ValueError(f"{field} must be between 1 byte and {max_bytes} bytes")
    return decoded


def get_model(mode: str) -> Qwen3TTSModel:
    with _model_lock:
        if mode in _models:
            return _models[mode]
        _models[mode] = Qwen3TTSModel.from_pretrained(
            MODEL_PATHS[mode], device_map="cuda:0", dtype=torch.bfloat16, attn_implementation="sdpa",
        )
        return _models[mode]


def resolve_speaker(model: Qwen3TTSModel, requested: str) -> str:
    supported = list(model.get_supported_speakers() or [])
    for name in supported:
        if name.lower() == requested.lower():
            return name
    raise ValueError(f"speaker must be one of: {', '.join(supported)}")


def normalize_reference(source: Path, target: Path) -> None:
    completed = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(source), "-ac", "1", "-ar", "24000", "-t", "45", str(target)],
        capture_output=True, text=True, timeout=90,
    )
    if completed.returncode != 0 or not target.exists():
        raise ValueError("reference audio could not be decoded; upload WAV, MP3, M4A, or FLAC")


def synthesize_tts(payload: dict[str, Any], text: str, language: str, output: Path) -> int:
    model = get_model("tts")
    speaker = resolve_speaker(model, required_string(payload.get("speaker"), "speaker", 64))
    instruct = payload.get("instruct")
    kwargs: dict[str, Any] = {"text": text, "language": language, "speaker": speaker}
    if isinstance(instruct, str) and instruct.strip():
        kwargs["instruct"] = instruct.strip()[:MAX_INSTRUCT_CHARS]
    with _generation_lock, torch.inference_mode():
        wavs, sample_rate = model.generate_custom_voice(**kwargs)
        sf.write(output, wavs[0], sample_rate, subtype="PCM_16")
    return int(sample_rate)


def synthesize_clone(payload: dict[str, Any], text: str, language: str, folder: Path, output: Path) -> int:
    reference_text = required_string(payload.get("ref_text"), "ref_text", MAX_TEXT_CHARS)
    reference = decode_b64(payload.get("ref_audio_base64"), "ref_audio_base64", MAX_REFERENCE_BYTES)
    raw, wav_reference = folder / "reference.bin", folder / "reference.wav"
    raw.write_bytes(reference)
    normalize_reference(raw, wav_reference)
    model = get_model("clone")
    with _generation_lock, torch.inference_mode():
        wavs, sample_rate = model.generate_voice_clone(
            text=text, language=language, ref_audio=str(wav_reference), ref_text=reference_text,
        )
        sf.write(output, wavs[0], sample_rate, subtype="PCM_16")
    return int(sample_rate)


def handler(event: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    payload = event.get("input") or {}
    mode = payload.get("mode") or ("clone" if payload.get("ref_audio_base64") else "tts")
    if mode not in MODEL_PATHS:
        raise ValueError("mode must be tts or clone")
    text = required_string(payload.get("text"), "text", MAX_TEXT_CHARS)
    language = str(payload.get("language") or "Korean").strip()
    if language not in LANGUAGES:
        raise ValueError("language must be Korean, Auto, English, Japanese, or Chinese")
    with tempfile.TemporaryDirectory(prefix="playlab-qwen3-") as temp_dir:
        folder = Path(temp_dir)
        output = folder / "output.wav"
        if mode == "tts":
            sample_rate = synthesize_tts(payload, text, language, output)
        else:
            sample_rate = synthesize_clone(payload, text, language, folder, output)
        audio = output.read_bytes()
    if not audio or len(audio) > MAX_OUTPUT_BYTES:
        raise RuntimeError("generated audio is empty or exceeds the worker output limit")
    return {"audio_base64": base64.b64encode(audio).decode("ascii"), "content_type": "audio/wav",
            "sample_rate": sample_rate, "mode": mode, "model": MODEL_NAMES[mode],
            "elapsed_ms": round((time.monotonic() - started) * 1000)}


runpod.serverless.start({"handler": handler})
