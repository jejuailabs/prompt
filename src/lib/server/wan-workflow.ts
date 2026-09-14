import type { VideoRenderInput } from './video-workflows';

/** Matches the deployed Wan 2.2 TI2V 5B model, for text or a first frame. */
export function buildWanWorkflow(input: VideoRenderInput): Record<string, unknown> {
  const [width, height] = input.aspectRatio === '9:16' ? [480, 832] : input.aspectRatio === '1:1' ? [640, 640] : [832, 480];
  const length = Math.ceil((Math.max(4, Math.min(8, input.durationSec)) * 24 - 1) / 4) * 4 + 1;
  return {
    '37': { class_type: 'UNETLoader', inputs: { unet_name: 'wan2.2_ti2v_5B_fp16.safetensors', weight_dtype: 'default' } },
    '38': { class_type: 'CLIPLoader', inputs: { clip_name: 'umt5_xxl_fp8_e4m3fn_scaled.safetensors', type: 'wan', device: 'default' } },
    '39': { class_type: 'VAELoader', inputs: { vae_name: 'wan2.2_vae.safetensors' } },
    '48': { class_type: 'ModelSamplingSD3', inputs: { model: ['37', 0], shift: 8 } },
    '6': { class_type: 'CLIPTextEncode', inputs: { clip: ['38', 0], text: input.prompt } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['38', 0], text: 'blurry, distorted, watermark, low quality' } },
    '55': { class_type: 'Wan22ImageToVideoLatent', inputs: { vae: ['39', 0], width, height, length, batch_size: 1, ...(input.firstFrameName ? { start_image: ['56', 0] } : {}) } },
    ...(input.firstFrameName ? { '56': { class_type: 'LoadImage', inputs: { image: input.firstFrameName } } } : {}),
    '3': { class_type: 'KSampler', inputs: { model: ['48', 0], positive: ['6', 0], negative: ['7', 0], latent_image: ['55', 0], seed: Math.floor(Math.random() * 2147483647), steps: 20, cfg: 5, sampler_name: 'uni_pc', scheduler: 'simple', denoise: 1 } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['3', 0], vae: ['39', 0] } },
    '57': { class_type: 'CreateVideo', inputs: { images: ['8', 0], fps: 24 } },
    '58': { class_type: 'SaveVideo', inputs: { video: ['57', 0], filename_prefix: 'video/PLAYLAB_Wan', format: 'auto', 'format.codec': 'auto' } },
  };
}
