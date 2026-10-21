"""RunPod adapter for Qwen3-TTS: preset-speaker TTS and voice cloning.

input.mode = "tts"   -> 1.7B CustomVoice, requires text + speaker (instruct optional)
input.mode = "clone" -> 1.7B Base, requires text + ref_text + ref_audio_base64
A payload without mode but with ref_audio_base64 is treated as "clone" so the
existing PLAYLAB voice-clone route keeps working unchanged.
"""
import base64
import os
from pathlib import Path
import re
import subprocess
import tempfile
import threading
import time
from typing import Any

import numpy as np
import runpod
import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

MAX_REFERENCE_BYTES = 25 * 1024 * 1024
MAX_OUTPUT_BYTES = 50 * 1024 * 1024
MAX_TEXT_CHARS = 10_000
MAX_INSTRUCT_CHARS = 500
# One generate call is bounded by the model's token budget (~2-3 minutes of
# speech). Long scripts are split at sentence boundaries, generated in small
# batches and joined with a short pause so a 10,000-character script works.
CHUNK_CHARS = 220
BATCH_SIZE = 4
PAUSE_SECONDS = 0.25
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


def split_text(text: str) -> list[str]:
    sentences = [part.strip() for part in re.split(r"(?<=[.!?。！？…])\s+|\n+", text) if part.strip()]
    pieces: list[str] = []
    for sentence in sentences:
        while len(sentence) > CHUNK_CHARS:
            cut = max(sentence.rfind(mark, 0, CHUNK_CHARS) for mark in (",", "，", "、", " "))
            cut = cut + 1 if cut > CHUNK_CHARS // 3 else CHUNK_CHARS
            pieces.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()
        if sentence:
            pieces.append(sentence)
    chunks: list[str] = []
    for piece in pieces:
        if chunks and len(chunks[-1]) + 1 + len(piece) <= CHUNK_CHARS:
            chunks[-1] = f"{chunks[-1]} {piece}"
        else:
            chunks.append(piece)
    return chunks


def generate_chunked(generate, chunks: list[str], output: Path, **common: Any) -> int:
    """Run generate() over batches of chunks and write one joined PCM_16 WAV."""
    parts: list[np.ndarray] = []
    sample_rate = 24000
    with _generation_lock, torch.inference_mode():
        for start in range(0, len(chunks), BATCH_SIZE):
            batch = chunks[start:start + BATCH_SIZE]
            extra = {key: [value] * len(batch) for key, value in common.items() if not key.startswith("_")}
            extra.update({key[1:]: value for key, value in common.items() if key.startswith("_")})
            wavs, sample_rate = generate(text=batch, **extra)
            parts.extend(np.asarray(wav, dtype=np.float32).reshape(-1) for wav in wavs)
    pause = np.zeros(int(sample_rate * PAUSE_SECONDS), dtype=np.float32)
    joined = np.concatenate([segment for part in parts for segment in (part, pause)][:-1])
    sf.write(output, joined, sample_rate, subtype="PCM_16")
    return int(sample_rate)


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
    common: dict[str, Any] = {"language": language, "speaker": speaker}
    if isinstance(instruct, str) and instruct.strip():
        common["instruct"] = instruct.strip()[:MAX_INSTRUCT_CHARS]
    return generate_chunked(model.generate_custom_voice, split_text(text), output, **common)


def synthesize_clone(payload: dict[str, Any], text: str, language: str, folder: Path, output: Path) -> int:
    reference_text = required_string(payload.get("ref_text"), "ref_text", MAX_TEXT_CHARS)
    reference = decode_b64(payload.get("ref_audio_base64"), "ref_audio_base64", MAX_REFERENCE_BYTES)
    raw, wav_reference = folder / "reference.bin", folder / "reference.wav"
    raw.write_bytes(reference)
    normalize_reference(raw, wav_reference)
    model = get_model("clone")
    # Build the speaker prompt once; every chunk reuses it ("_" = not per-item).
    prompt = model.create_voice_clone_prompt(ref_audio=str(wav_reference), ref_text=reference_text, x_vector_only_mode=False)
    return generate_chunked(model.generate_voice_clone, split_text(text), output, language=language, _voice_clone_prompt=prompt)


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
