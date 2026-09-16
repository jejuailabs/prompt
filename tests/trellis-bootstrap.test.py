"""No GPU/download required: the upstream gated argument must be ignored."""
import runpy
import sys
import types
import unittest
from unittest.mock import MagicMock, patch
from pathlib import Path


class BootstrapTest(unittest.TestCase):
    def test_public_weights_are_pinned_and_handler_runs(self):
        loader = MagicMock()
        transforms = MagicMock()
        rembg = types.SimpleNamespace(BiRefNet=type("Original", (), {}))
        modules = {
            "transformers": types.SimpleNamespace(AutoModelForImageSegmentation=loader),
            "torchvision": types.SimpleNamespace(transforms=transforms),
            "trellis2": types.ModuleType("trellis2"),
            "trellis2.pipelines": types.SimpleNamespace(rembg=rembg),
        }
        path = Path(__file__).resolve().parents[1] / "runpod-workflows/trellis-bootstrap.py"
        with patch.dict(sys.modules, modules), patch.object(runpy, "run_path") as handler:
            exec(compile(path.read_text(), str(path), "exec"), {})
            rembg.BiRefNet(model_name="briaai/RMBG-2.0")
        args, kwargs = loader.from_pretrained.call_args
        self.assertEqual(args, ("ZhengPeng7/BiRefNet",))
        self.assertEqual(kwargs["revision"], "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4")
        self.assertEqual(kwargs["code_revision"], kwargs["revision"])
        self.assertTrue(kwargs["use_safetensors"])
        handler.assert_called_once_with("/app/handler.py", run_name="__main__")


if __name__ == "__main__":
    unittest.main()
