"""RunPod adapter for Fun-CosyVoice3 zero-shot Korean voice cloning."""
import base64
import os
from pathlib import Path
import tempfile
import threading
import time
from typing import Any

import runpod
import torch
import torchaudio
from huggingface_hub import snapshot_download
from cosyvoice.cli.cosyvoice import AutoModel
from cosyvoice.utils.file_utils import load_wav

MAX_REFERENCE_BYTES = 25 * 1024 * 1024
MAX_OUTPUT_BYTES = 50 * 1024 * 1024
MAX_TEXT_CHARS = 6_000
_model: AutoModel | None = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()


def required_string(value: Any, field: str, limit: int) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field} is required")
    result = value.strip()
    if len(result) > limit:
        raise ValueError(f"{field} exceeds {limit} characters")
    return result


def decode_b64(value: Any, field: str) -> bytes:
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field} is required")
    try:
        raw = base64.b64decode(value.split(",", 1)[-1], validate=True)
    except ValueError as error:
        raise ValueError(f"{field} must be valid base64") from error
    if not raw or len(raw) > MAX_REFERENCE_BYTES:
        raise ValueError(f"{field} must be between 1 byte and {MAX_REFERENCE_BYTES} bytes")
    return raw


def get_model() -> AutoModel:
    global _model
    with _model_lock:
        if _model is None:
            model_dir = snapshot_download(os.environ["COSYVOICE_MODEL"], local_dir=os.environ["COSYVOICE_MODEL_DIR"])
            _model = AutoModel(model_dir=model_dir)
        return _model


def handler(event: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    payload = event.get("input") or {}
    text = required_string(payload.get("text"), "text", MAX_TEXT_CHARS)
    reference_text = required_string(payload.get("ref_text"), "ref_text", MAX_TEXT_CHARS)
    reference = decode_b64(payload.get("ref_audio_base64"), "ref_audio_base64")
    with tempfile.TemporaryDirectory(prefix="playlab-cosy-") as temp_dir:
        folder = Path(temp_dir)
        source, output = folder / "reference.audio", folder / "output.wav"
        source.write_bytes(reference)
        prompt_speech = load_wav(str(source), 16_000)
        with _generation_lock, torch.inference_mode():
            chunks = list(get_model().inference_zero_shot(text, reference_text, prompt_speech, stream=False))
            if not chunks or "tts_speech" not in chunks[-1]:
                raise RuntimeError("CosyVoice returned no audio")
            speech = torch.cat([chunk["tts_speech"] for chunk in chunks], dim=1)
            torchaudio.save(str(output), speech, get_model().sample_rate)
        audio = output.read_bytes()
    if not audio or len(audio) > MAX_OUTPUT_BYTES:
        raise RuntimeError("generated audio is empty or exceeds the worker output limit")
    return {"audio_base64": base64.b64encode(audio).decode("ascii"), "content_type": "audio/wav",
            "sample_rate": int(get_model().sample_rate), "model": os.environ["COSYVOICE_MODEL"],
            "elapsed_ms": round((time.monotonic() - started) * 1000)}


runpod.serverless.start({"handler": handler})
