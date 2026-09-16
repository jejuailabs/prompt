"""Dedicated Blender worker. No URLs, arbitrary scripts, or storage secrets."""
import base64
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import runpod
from policy import plan


def handler(job):
    data = job.get("input", {})
    config = plan(data.get("settings"))
    encoded = data.get("model_base64", "")
    if not isinstance(encoded, str) or not 1 <= len(encoded) <= 70_000_000:
        raise ValueError("GLB payload missing or too large")
    model = base64.b64decode(encoded, validate=True)
    if len(model) < 20 or model[:4] != b"glTF" or int.from_bytes(model[4:8], "little") != 2 or int.from_bytes(model[8:12], "little") != len(model):
        raise ValueError("Invalid GLB 2.0")
    with tempfile.TemporaryDirectory(prefix="character-") as folder:
        directory = Path(folder)
        (directory / "input.glb").write_bytes(model)
        (directory / "settings.json").write_text(json.dumps(config), encoding="utf-8")
        subprocess.run([sys.executable, str(Path(__file__).with_name("process.py")),
                        str(directory / "input.glb"), str(directory / "out"), str(directory / "settings.json")],
                       check=True, timeout=240, stdout=subprocess.DEVNULL)
        report = json.loads((directory / "out/report.json").read_text(encoding="utf-8"))
        if report["status"] == "rejected":
            return {"report": report}
        files = {}
        for name in ("prepared.glb", "prepared.fbx"):
            content = (directory / "out" / name).read_bytes()
            if len(content) > 50 * 1024 * 1024:
                raise ValueError("Output exceeds size limit")
            files[name] = base64.b64encode(content).decode("ascii")
        return {"report": report, "files": files}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})
