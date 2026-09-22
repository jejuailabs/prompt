"""RunPod adapter for Qwen-Image 2.1 text-to-image and reference editing."""
import base64
import io
import os
import threading
import time
from typing import Any

from diffusers import QwenImage21Pipeline
from PIL import Image
import runpod
import torch

MAX_PROMPT_CHARS = 8_000
MAX_IMAGE_BYTES = 15 * 1024 * 1024
MAX_OUTPUT_BYTES = 45 * 1024 * 1024
_pipe: QwenImage21Pipeline | None = None
_model_lock = threading.Lock()
_generation_lock = threading.Lock()


def get_pipe() -> QwenImage21Pipeline:
    global _pipe
    with _model_lock:
        if _pipe is None:
            _pipe = QwenImage21Pipeline.from_pretrained(os.environ["QWEN_IMAGE_MODEL"], torch_dtype=torch.bfloat16).to("cuda")
        return _pipe


def decode_image(value: Any) -> Image.Image:
    if not isinstance(value, str) or not value:
        raise ValueError("reference images must be base64 strings")
    try:
        raw = base64.b64decode(value.split(",", 1)[-1], validate=True)
    except ValueError as error:
        raise ValueError("reference image is not valid base64") from error
    if not raw or len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("reference image is empty or too large")
    with Image.open(io.BytesIO(raw)) as source:
        return source.convert("RGBA" if source.mode == "RGBA" else "RGB")


def positive_int(value: Any, field: str, lower: int, upper: int) -> int:
    if not isinstance(value, int) or isinstance(value, bool) or not lower <= value <= upper:
        raise ValueError(f"{field} must be an integer from {lower} to {upper}")
    return value


def handler(event: dict[str, Any]) -> dict[str, Any]:
    started = time.monotonic()
    payload = event.get("input") or {}
    prompt = payload.get("prompt")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt.strip()) > MAX_PROMPT_CHARS:
        raise ValueError(f"prompt must contain 1 to {MAX_PROMPT_CHARS} characters")
    width = positive_int(payload.get("width", 1024), "width", 256, 3072)
    height = positive_int(payload.get("height", 1024), "height", 256, 3072)
    if width % 16 or height % 16 or width * height > 4_500_000:
        raise ValueError("width/height must be multiples of 16 and no more than 4.5 megapixels")
    steps = positive_int(payload.get("steps", 40), "steps", 1, 60)
    seed = payload.get("seed")
    if seed is not None and (not isinstance(seed, int) or isinstance(seed, bool)):
        raise ValueError("seed must be an integer")
    references = payload.get("reference_images_base64") or []
    if not isinstance(references, list) or len(references) > 10:
        raise ValueError("reference_images_base64 must contain at most 10 images")
    generator = torch.Generator("cuda").manual_seed(seed if seed is not None else torch.seed())
    kwargs: dict[str, Any] = {"prompt": prompt.strip(), "width": width, "height": height, "num_inference_steps": steps, "generator": generator}
    if references:
        kwargs["image"] = [decode_image(item) for item in references]
    with _generation_lock, torch.inference_mode():
        result = get_pipe()(**kwargs).images[0]
    buffer = io.BytesIO()
    result.save(buffer, format="PNG")
    output = buffer.getvalue()
    if not output or len(output) > MAX_OUTPUT_BYTES:
        raise RuntimeError("generated image is empty or exceeds the worker output limit")
    return {"image_base64": base64.b64encode(output).decode("ascii"), "content_type": "image/png",
            "model": os.environ["QWEN_IMAGE_MODEL"], "elapsed_ms": round((time.monotonic() - started) * 1000)}


runpod.serverless.start({"handler": handler})
