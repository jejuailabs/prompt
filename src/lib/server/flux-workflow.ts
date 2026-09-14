/** Distilled Klein 4B, using the files bundled by the deployed Wizard image. */
export function buildFluxWorkflow(prompt: string, width = 1024, height = 1024): Record<string, unknown> {
  return {
    '1': { class_type: 'UNETLoader', inputs: { unet_name: 'flux-2-klein-4b.safetensors', weight_dtype: 'default' } },
    '2': { class_type: 'CLIPLoader', inputs: { clip_name: 'qwen_3_4b.safetensors', type: 'flux2', device: 'default' } },
    '3': { class_type: 'VAELoader', inputs: { vae_name: 'flux2-vae.safetensors' } },
    '4': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: prompt } },
    '5': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: '' } },
    '6': { class_type: 'CFGGuider', inputs: { model: ['1', 0], positive: ['4', 0], negative: ['5', 0], cfg: 1 } },
    '7': { class_type: 'RandomNoise', inputs: { noise_seed: Math.floor(Math.random() * 2147483647) } },
    '8': { class_type: 'KSamplerSelect', inputs: { sampler_name: 'euler' } },
    '9': { class_type: 'Flux2Scheduler', inputs: { steps: 4, width, height } },
    '10': { class_type: 'EmptyFlux2LatentImage', inputs: { width, height, batch_size: 1 } },
    '11': { class_type: 'SamplerCustomAdvanced', inputs: { noise: ['7', 0], guider: ['6', 0], sampler: ['8', 0], sigmas: ['9', 0], latent_image: ['10', 0] } },
    '12': { class_type: 'VAEDecode', inputs: { samples: ['11', 0], vae: ['3', 0] } },
    '13': { class_type: 'SaveImage', inputs: { images: ['12', 0], filename_prefix: 'PLAYLAB_Flux' } },
  };
}
