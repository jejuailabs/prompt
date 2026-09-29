// Multi-model image generation adapter gateway
// Each vendor gets its own adapter; the runner dispatches by ModelProvider.adapterType.

export interface ImageResult {
  base64: string;
  buffer: Buffer;
}

export interface AdapterConfig {
  model?: string;
  quality?: string;
  endpoint?: string;
  modelId?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export interface IImageAdapter {
  generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult>;
}

// ── OpenAI adapter (GPT Image 2 / 2.5) ──
class OpenAIAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const model = config.model;
    if (!model) throw new Error('OpenAI image model is not configured');
    const body: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      size: normalizeSize(size),
      output_format: 'png',
    };
    if (config.quality) body.quality = config.quality;

    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const json = await res.json() as { data?: { b64_json?: string; url?: string }[] };
    const item = json.data?.[0];
    if (item?.b64_json) {
      return { base64: item.b64_json, buffer: Buffer.from(item.b64_json, 'base64') };
    }
    if (item?.url) {
      const imgRes = await fetch(item.url);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      return { base64: buf.toString('base64'), buffer: buf };
    }
    throw new Error('Empty image response from OpenAI');
  }
}

// ── Google Gemini image adapter ──
class GeminiImageAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const model = config.model;
    if (!model) throw new Error('Gemini image model is not configured');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: aspectFromSize(size) },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Gemini image API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const json = await res.json() as {
      candidates?: { content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] } }[];
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    if (!imgPart?.inlineData) throw new Error('Empty image response from Gemini image');
    const b64 = imgPart.inlineData.data;
    return { base64: b64, buffer: Buffer.from(b64, 'base64') };
  }
}

// ── Stability AI adapter (Ultra / Core endpoints) ──
class StabilityAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.STABILITY_API_KEY;
    if (!apiKey) throw new Error('Stability API key not configured');

    const tier = config.endpoint;
    if (tier !== 'core' && tier !== 'ultra') throw new Error('Stability image endpoint is not configured');
    const endpoint = `https://api.stability.ai/v2beta/stable-image/generate/${tier}`;

    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    const requestedAspect = aspectFromSize(size);
    form.append('aspect_ratio', requestedAspect === '4:3' ? '5:4' : requestedAspect === '3:4' ? '4:5' : requestedAspect);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      body: form,
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Stability API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const json = await res.json() as { image?: string };
    const b64 = json.image;
    if (!b64) throw new Error('Empty image response from Stability');
    return { base64: b64, buffer: Buffer.from(b64, 'base64') };
  }
}

// ── Replicate adapter (FLUX, Seedream, etc.) ──
// Uses the model-specific predictions endpoint: /v1/models/{owner}/{name}/predictions
// This avoids the "version is required" error on official models.
class ReplicateAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.REPLICATE_API_TOKEN;
    if (!apiKey) throw new Error('Replicate API token not configured');

    const modelId = config.modelId;
    if (!modelId) throw new Error('Replicate image model is not configured');
    const aspect = aspectFromSize(size);
    let input: Record<string, unknown>;
    if (modelId === 'black-forest-labs/flux-2-pro') {
      input = { prompt, aspect_ratio: aspect, resolution: '1 MP', output_format: 'png' };
    } else if (modelId === 'bytedance/seedream-5-pro') {
      input = { prompt, aspect_ratio: aspect, size: '1K', output_format: 'png' };
    } else if (modelId === 'bytedance/seedream-5-lite') {
      input = { prompt, aspect_ratio: aspect, size: '2K', output_format: 'png' };
    } else {
      throw new Error(`Unsupported Replicate image model: ${modelId}`);
    }

    const endpoint = `https://api.replicate.com/v1/models/${modelId}/predictions`;
    const createRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'wait=55',
      },
      body: JSON.stringify({ input }),
    });

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => '');
      throw new Error(`Replicate API error ${createRes.status}: ${err.slice(0, 200)}`);
    }

    const prediction = await createRes.json() as {
      id: string; status: string; output?: string[] | string; error?: string;
      urls?: { get?: string };
    };

    if (prediction.status === 'succeeded') {
      return this.downloadOutput(prediction.output);
    }
    if (prediction.status === 'failed') {
      throw new Error(prediction.error || 'Replicate generation failed');
    }

    const pollUrl = prediction.urls?.get;
    if (!pollUrl) throw new Error('No poll URL from Replicate');

    const deadline = Date.now() + 55_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const state = await pollRes.json() as { status: string; output?: string[] | string; error?: string };
      if (state.status === 'failed') throw new Error(state.error || 'Replicate generation failed');
      if (state.status === 'succeeded') {
        return this.downloadOutput(state.output);
      }
    }
    throw new Error('Replicate generation timed out');
  }

  private async downloadOutput(output: string[] | string | undefined): Promise<ImageResult> {
    const outputUrl = Array.isArray(output) ? output[0] : output;
    if (!outputUrl) throw new Error('Empty output from Replicate');
    const imgRes = await fetch(outputUrl);
    const buf = Buffer.from(await imgRes.arrayBuffer());
    return { base64: buf.toString('base64'), buffer: buf };
  }
}

// ── Registry ──
const adapters: Record<string, IImageAdapter> = {
  openai: new OpenAIAdapter(),
  gemini: new GeminiImageAdapter(),
  imagen: new GeminiImageAdapter(),
  stability: new StabilityAdapter(),
  replicate: new ReplicateAdapter(),
};

export function getImageAdapter(adapterType: string): IImageAdapter {
  const adapter = adapters[adapterType];
  if (!adapter) throw new Error(`Unknown image adapter: ${adapterType}`);
  return adapter;
}

function normalizeSize(size: string): string {
  const map: Record<string, string> = {
    '1024x1024': '1024x1024',
    '960x1280': '960x1280',
    '1280x960': '1280x960',
    '1536x864': '1536x864',
    '864x1536': '864x1536',
  };
  if (!map[size]) throw new Error(`Unsupported image size: ${size}`);
  return map[size];
}

function aspectFromSize(size: string): string {
  const aspect: Record<string, string> = {
    '1024x1024': '1:1',
    '960x1280': '3:4',
    '1280x960': '4:3',
    '1536x864': '16:9',
    '864x1536': '9:16',
  };
  if (!aspect[size]) throw new Error(`Unsupported image size: ${size}`);
  return aspect[size];
}

export function parseAdapterConfig(raw: string): AdapterConfig {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as AdapterConfig : {};
  } catch {
    return {};
  }
}
