"""Start the pinned TRELLIS worker with the MIT-licensed BiRefNet model.

The upstream pipeline config selects gated BRIA weights. Replace only that
component, not the 3D model or its licensed DINO feature extractor.
"""
import runpy
import sys

sys.path.insert(0, "/app/TRELLIS.2")

from transformers import AutoModelForImageSegmentation
from torchvision import transforms
from trellis2.pipelines import rembg

MODEL = "ZhengPeng7/BiRefNet"
REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"


class PublicBiRefNet(rembg.BiRefNet):
    def __init__(self, model_name=None):
        # Do not load or fall back to the upstream gated BRIA model.
        print(f"PLAYLAB background remover: {MODEL}@{REVISION}", flush=True)
        self.model = AutoModelForImageSegmentation.from_pretrained(
            MODEL, revision=REVISION, code_revision=REVISION,
            trust_remote_code=True, use_safetensors=True,
        ).eval()
        self.transform_image = transforms.Compose([
            transforms.Resize((1024, 1024)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ])


rembg.BiRefNet = PublicBiRefNet
runpy.run_path("/app/handler.py", run_name="__main__")
