import type { VideoRenderInput } from './video-workflows';

export function buildLtx2bWorkflow(input: VideoRenderInput): Record<string, unknown> {
  const [width, height] = input.aspectRatio === '9:16' ? [512, 768] : input.aspectRatio === '1:1' ? [640, 640] : [768, 512];
  const length = Math.ceil((Math.max(4, Math.min(8, input.durationSec)) * 24 - 1) / 8) * 8 + 1;
  return {
    '44': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: 'ltxv-2b-0.9.6-distilled-04-25.safetensors' } },
    '38': { class_type: 'CLIPLoader', inputs: { clip_name: 't5xxl_fp16.safetensors', type: 'ltxv', device: 'default' } },
    '6': { class_type: 'CLIPTextEncode', inputs: { clip: ['38', 0], text: input.prompt } },
    '7': { class_type: 'CLIPTextEncode', inputs: { clip: ['38', 0], text: 'low quality, blurry, distorted, watermark' } },
    '69': { class_type: 'LTXVConditioning', inputs: { positive: ['6', 0], negative: ['7', 0], frame_rate: 24 } },
    '95': input.firstFrameName
      ? { class_type: 'LTXVImgToVideo', inputs: { positive: ['69', 0], negative: ['69', 1], vae: ['44', 2], image: ['82', 0], width, height, length, batch_size: 1, strength: 1 } }
      : { class_type: 'EmptyLTXVLatentVideo', inputs: { width, height, length, batch_size: 1 } },
    ...(input.firstFrameName ? {
      '78': { class_type: 'LoadImage', inputs: { image: input.firstFrameName } },
      '82': { class_type: 'LTXVPreprocess', inputs: { image: ['78', 0], img_compression: 38 } },
    } : {}),
    '99': { class_type: 'CFGGuider', inputs: { model: ['44', 0], positive: [input.firstFrameName ? '95' : '69', 0], negative: [input.firstFrameName ? '95' : '69', 1], cfg: 1 } },
    '97': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler_ancestral' } },
    '98': { class_type: 'ManualSigmas', inputs: { sigmas: '1.0000, 0.9937, 0.9875, 0.9812, 0.9750, 0.9094, 0.7250, 0.4219, 0.0' } },
    '102': { class_type: 'RandomNoise', inputs: { noise_seed: Math.floor(Math.random() * 2147483647) } },
    '101': { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['102', 0], guider: ['99', 0], sampler: ['97', 0], sigmas: ['98', 0], latent_image: ['95', input.firstFrameName ? 2 : 0] } },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['101', 0], vae: ['44', 2] } },
    '103': { class_type: 'CreateVideo', inputs: { images: ['8', 0], fps: 24 } },
    '104': { class_type: 'SaveVideo', inputs: { video: ['103', 0], filename_prefix: 'video/PLAYLAB_LTX2B', format: 'auto', 'format.codec': 'auto' } },
  };
}
