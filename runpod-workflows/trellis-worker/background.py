from transformers import AutoModelForImageSegmentation
from torchvision import transforms
from trellis2.pipelines import rembg


def install():
    class PublicBiRefNet(rembg.BiRefNet):
        def __init__(self, model_name=None):
            revision = 'e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4'
            self.model = AutoModelForImageSegmentation.from_pretrained(
                'ZhengPeng7/BiRefNet', revision=revision, code_revision=revision,
                trust_remote_code=True, use_safetensors=True).eval()
            self.transform_image = transforms.Compose([
                transforms.Resize((1024, 1024)), transforms.ToTensor(),
                transforms.Normalize([.485, .456, .406], [.229, .224, .225])])
    rembg.BiRefNet = PublicBiRefNet
