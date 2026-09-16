import { randomUUID } from 'node:crypto';
import { requireAdmin, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { ok, fail, readJson } from '@/lib/server/handler';
import { isH3Preset } from '@/lib/h3-presets';
import { COMPARISON_MODELS, type ComparisonRow } from '@/lib/video-comparison';
import { getRunpodEndpointId } from '@/lib/server/runpod';
import { compileVideoIntent, buildVideoModelPrompt } from '@/lib/server/video-intent';

const optimizedImage = 'ghcr.io/jejuailabs/playlab-h3-cu130@sha256:50df183567281793c53ecb19b8557f05ea89022bdbba13a2c76376eb1c9cb7c0';
async function environment(engine: 'h3' | 'ltx' | 'wan') {
  const id = getRunpodEndpointId(engine, 'blackwell');
  if (!id) throw new HttpError(`${engine} 엔드포인트 미설정`, 409);
  async function read(path: string) {
    const response = await fetch(`https://rest.runpod.io/v1/${path}`, {
      headers: { Authorization: `Bearer ${process.env.RUNPOD_API_KEY}` },
      cache: 'no-store', signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new HttpError(`${engine} 실행 환경 조회 실패 (${response.status})`, 502);
    return response.json();
  }
  const endpoint = await read(`endpoints/${id}`);
  if (endpoint.gpuCount !== 1 || !Array.isArray(endpoint.gpuTypeIds) || endpoint.gpuTypeIds.length !== 1 || endpoint.gpuTypeIds[0] !== 'NVIDIA RTX PRO 6000 Blackwell Server Edition') {
    throw new HttpError(`${engine}의 GPU가 Blackwell 6000 1장으로 설정되지 않았습니다`, 409);
  }
  const template = await read(`templates/${endpoint.templateId}`);
  return { gpu: endpoint.gpuTypeIds as string[], image: String(template.imageName), optimized: template.imageName === optimizedImage };
}

export async function GET() {
  try {
    const user = await requireAdmin();
    const rows = await db.artifact.findMany({ where: { ownerId: user.id, sourceModule: 'video-studio', metadata: { contains: '"comparison":' } }, orderBy: { createdAt: 'desc' }, take: 90 });
    const results: ComparisonRow[] = rows.flatMap(row => {
      try {
        const meta = JSON.parse(row.metadata);
        if (!meta.comparison?.batchId) return [];
        return [{ projectId: row.id, engine: meta.engine, comparison: meta.comparison, status: meta.render?.status ?? 'READY', videoUrl: meta.render?.videoUrl, executionTime: meta.render?.executionTime, delayTime: meta.render?.delayTime, error: meta.render?.error }];
      } catch { return []; }
    });
    return ok(results);
  } catch (error) { return fail(error); }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin();
    const body = await readJson<{ prompt: string; preset: string }>(req);
    if (typeof body.prompt !== 'string' || body.prompt.trim().length < 3 || body.prompt.length > 3000 || !isH3Preset(body.preset)) throw new HttpError('프롬프트(3~3000자)와 프리셋을 확인해주세요', 400);
    const environments = await Promise.all(COMPARISON_MODELS.map(m => environment(m.engine)));
    if (!environments[0].optimized) throw new HttpError('H3 최적화 이미지가 운영에 연결되지 않았습니다. 검증·배포 후 비교할 수 있습니다.', 409);
    const intent = await compileVideoIntent(body.prompt.trim(), { hasReferenceImage: false, durationSec: 6 });
    // Compile exactly once. All three models receive these identical bytes.
    const compiledPrompt = buildVideoModelPrompt(intent, false).slice(0, 4000);
    const batchId = randomUUID();
    const createdAt = new Date().toISOString();
    const rows = await db.$transaction(COMPARISON_MODELS.map((model, index) => {
      const comparison = { batchId, createdAt, compiledPrompt, preset: body.preset, seed: 12345, environment: environments[index] };
      return db.artifact.create({ data: {
        ownerId: user.id, sourceModule: 'video-studio', type: 'video', visibility: 'private', status: 'draft',
        title: `[비교 ${batchId.slice(0, 8)}] ${model.label}`, description: body.prompt.trim(),
        metadata: JSON.stringify({ studioVersion: 1, kind: 'video-project', prompt: body.prompt.trim(), inputMode: 'text', engine: model.engine, targetDurationSec: 6, aspectRatio: '16:9', quality: 'standard', preview: false, projectStatus: 'editing', comparison }),
      } });
    }));
    return ok(rows.map((row, index) => ({ projectId: row.id, engine: COMPARISON_MODELS[index].engine, comparison: JSON.parse(row.metadata).comparison, status: 'READY' })));
  } catch (error) { return fail(error); }
}
