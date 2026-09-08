// Multi-model image generation adapter gateway
// Each vendor gets its own adapter; the runner dispatches by ModelProvider.adapterType.
import { generateImage } from '@/lib/server/ai';

export interface ImageResult {
  base64: string;
  buffer: Buffer;
}

export interface AdapterConfig {
  apiEndpoint?: string;
  modelId?: string;
  apiKey?: string;
  [key: string]: unknown;
}

export interface IImageAdapter {
  generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult>;
}

// ── Default adapter: uses the project's built-in zai SDK ──
class DefaultAdapter implements IImageAdapter {
  async generate(prompt: string, size: string): Promise<ImageResult> {
    return generateImage(prompt, size as '1024x1024' | '768x1344' | '1344x768');
  }
}

// ── OpenAI-compatible adapter (DALL-E 3, etc.) ──
class OpenAIAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const endpoint = config.apiEndpoint || 'https://api.openai.com/v1/images/generations';
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const model = config.modelId || 'dall-e-3';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt,
        size: normalizeSize(size),
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`);
    }

    const json = await res.json() as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('Empty image response from OpenAI');
    return { base64: b64, buffer: Buffer.from(b64, 'base64') };
  }
}

// ── Stability AI adapter (Stable Diffusion 3.5, etc.) ──
class StabilityAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const endpoint = config.apiEndpoint || 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
    const apiKey = config.apiKey || process.env.STABILITY_API_KEY;
    if (!apiKey) throw new Error('Stability API key not configured');

    const [w, h] = normalizeSize(size).split('x').map(Number);
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');
    if (w) form.append('width', String(w));
    if (h) form.append('height', String(h));
    if (config.modelId) form.append('model', config.modelId);

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

// ── Replicate adapter (Midjourney proxies, Flux, Leonardo, etc.) ──
class ReplicateAdapter implements IImageAdapter {
  async generate(prompt: string, size: string, config: AdapterConfig): Promise<ImageResult> {
    const apiKey = config.apiKey || process.env.REPLICATE_API_TOKEN;
    if (!apiKey) throw new Error('Replicate API token not configured');

    const modelId = config.modelId || 'black-forest-labs/flux-schnell';
    const [w, h] = normalizeSize(size).split('x').map(Number);

    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        input: { prompt, width: w || 1024, height: h || 1024 },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => '');
      throw new Error(`Replicate API error ${createRes.status}: ${err.slice(0, 200)}`);
    }

    const prediction = await createRes.json() as { id: string; status: string; urls?: { get?: string } };
    const pollUrl = prediction.urls?.get;
    if (!pollUrl) throw new Error('No poll URL from Replicate');

    // Poll until completed (max 120s)
    const deadline = Date.now() + 120_000;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 2000));
      const pollRes = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      });
      const state = await pollRes.json() as { status: string; output?: string[] | string; error?: string };
      if (state.status === 'failed') throw new Error(state.error || 'Replicate generation failed');
      if (state.status === 'succeeded') {
        const outputUrl = Array.isArray(state.output) ? state.output[0] : state.output;
        if (!outputUrl) throw new Error('Empty output from Replicate');
        const imgRes = await fetch(outputUrl);
        const buf = Buffer.from(await imgRes.arrayBuffer());
        return { base64: buf.toString('base64'), buffer: buf };
      }
    }
    throw new Error('Replicate generation timed out');
  }
}

// ── Registry ──
const adapters: Record<string, IImageAdapter> = {
  default: new DefaultAdapter(),
  openai: new OpenAIAdapter(),
  stability: new StabilityAdapter(),
  replicate: new ReplicateAdapter(),
};

export function getImageAdapter(adapterType: string): IImageAdapter {
  return adapters[adapterType] || adapters.default;
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
