"""RunPod adapter for Qwen3-TTS 1.7B Base voice cloning."""
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
_model: Qwen3TTSModel | None = None
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


def get_model() -> Qwen3TTSModel:
    global _model
    with _model_lock:
        if _model is not None:
            return _model
        kwargs: dict[str, Any] = {"device_map": "cuda:0", "dtype": torch.bfloat16}
        try:
            import flash_attn  # noqa: F401
            kwargs["attn_implementation"] = "flash_attention_2"
        except ImportError:
            kwargs["attn_implementation"] = "sdpa"
        _model = Qwen3TTSModel.from_pretrained(os.environ["QWEN3_TTS_MODEL"], **kwargs)
        return _model


def normalize_reference(source: Path, target: Path) -> None:
    completed = subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(source), "-ac", "1", "-ar", "24000", "-t", "45", str(target)],
        capture_output=True, text=True, timeout=90,
    )
    if completed.returncode != 0 or not target.exists():
        raise ValueError("reference audio could not be decoded; upload WAV, MP3, M4A, or FLAC")


def handler(event: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    payload = event.get("input") or {}
    text = required_string(payload.get("text"), "text", MAX_TEXT_CHARS)
    reference_text = required_string(payload.get("ref_text"), "ref_text", MAX_TEXT_CHARS)
    language = str(payload.get("language") or "Korean").strip()
    if language not in {"Korean", "Auto", "English", "Japanese", "Chinese"}:
        raise ValueError("language must be Korean, Auto, English, Japanese, or Chinese")
    reference = decode_b64(payload.get("ref_audio_base64"), "ref_audio_base64", MAX_REFERENCE_BYTES)
    with tempfile.TemporaryDirectory(prefix="playlab-qwen3-") as temp_dir:
        folder = Path(temp_dir)
        raw, wav_reference, output = folder / "reference.bin", folder / "reference.wav", folder / "output.wav"
        raw.write_bytes(reference)
        normalize_reference(raw, wav_reference)
        with _generation_lock, torch.inference_mode():
            wavs, sample_rate = get_model().generate_voice_clone(
                text=text, language=language, ref_audio=str(wav_reference), ref_text=reference_text,
            )
            sf.write(output, wavs[0], sample_rate, subtype="PCM_16")
        audio = output.read_bytes()
    if not audio or len(audio) > MAX_OUTPUT_BYTES:
        raise RuntimeError("generated audio is empty or exceeds the worker output limit")
    return {"audio_base64": base64.b64encode(audio).decode("ascii"), "content_type": "audio/wav",
            "sample_rate": int(sample_rate), "model": os.environ["QWEN3_TTS_MODEL"],
            "elapsed_ms": round((time.monotonic() - started) * 1000)}


runpod.serverless.start({"handler": handler})
