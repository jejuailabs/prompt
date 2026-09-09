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
// Uses the gpt-image-1 endpoint. GPT Image 2+ models do NOT support response_format;
// use output_format instead and read b64_json from the response.
class OpenAIAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const model = config.model || 'gpt-image-1';
    const body: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      size: normalizeSize(size),
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

// ── Google Imagen adapter (via Gemini generateContent API) ──
// Uses responseModalities: ["IMAGE"] to get image output from Gemini models.
class ImagenAdapter implements IImageAdapter {
  async generate(prompt: string, _size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

    const model = config.model || 'nano-banana-pro-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`Imagen API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const json = await res.json() as {
      candidates?: { content?: { parts?: { inlineData?: { data: string; mimeType: string } }[] } }[];
    };
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p) => p.inlineData?.data);
    if (!imgPart?.inlineData) throw new Error('Empty image response from Imagen');
    const b64 = imgPart.inlineData.data;
    return { base64: b64, buffer: Buffer.from(b64, 'base64') };
  }
}

// ── Stability AI adapter (Ultra / Core endpoints) ──
class StabilityAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.STABILITY_API_KEY;
    if (!apiKey) throw new Error('Stability API key not configured');

    const tier = config.endpoint || 'core';
    const endpoint = `https://api.stability.ai/v2beta/stable-image/generate/${tier}`;

    const [w, h] = normalizeSize(size).split('x').map(Number);
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    if (w) form.append('width', String(w));
    if (h) form.append('height', String(h));

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

    const modelId = config.modelId || 'black-forest-labs/flux-schnell';
    const nSize = normalizeSize(size);
    const [w, h] = nSize.split('x').map(Number);
    const aspectMap: Record<string, string> = {
      '1024x1024': '1:1', '768x1344': '9:16', '1344x768': '16:9',
    };
    const aspect = aspectMap[nSize] || '1:1';

    const endpoint = `https://api.replicate.com/v1/models/${modelId}/predictions`;
    const createRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Prefer': 'wait=55',
      },
      body: JSON.stringify({
        input: { prompt, aspect_ratio: aspect, width: w || 1024, height: h || 1024 },
      }),
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
  imagen: new ImagenAdapter(),
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
    '1344x768': '1344x768',
    '768x1344': '768x1344',
  };
  return map[size] || '1024x1024';
}

export function parseAdapterConfig(raw: string): AdapterConfig {
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as AdapterConfig : {};
  } catch {
    return {};
  }
}
