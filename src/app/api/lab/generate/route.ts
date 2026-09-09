// POST /api/lab/generate — charge credits upfront, create jobs per provider, process async
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { chargeCredits } from '@/lib/server/credits';
import { processGenerationJobs } from '@/lib/server/runners';
import { serializeJobs } from '@/lib/server/serialize';

interface GenerateBody {
  promptText?: string;
  providerIds?: string[];
  aspect?: string;
  style?: string;
  promptId?: string;
}

const VALID_ASPECTS = ['1:1', '3:4', '4:3', '16:9', '9:16'];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<GenerateBody>(req);

    const promptText = (body.promptText ?? '').trim();
    if (!promptText) throw new HttpError('프롬프트를 입력해주세요', 400);
    const providerIds = [...new Set((body.providerIds ?? []).filter(Boolean))];
    if (!providerIds.length) throw new HttpError('비교할 모델을 1개 이상 선택해주세요', 400);
    const aspect = body.aspect && VALID_ASPECTS.includes(body.aspect) ? body.aspect : '1:1';

    const providers = await db.modelProvider.findMany({
      where: { id: { in: providerIds }, active: true },
    });
    if (providers.length !== providerIds.length) {
      throw new HttpError('사용할 수 없는 모델이 포함되어 있습니다', 400);
    }

    // charge = Σ provider.costPerUnit × marginRate (per-provider, admin-configurable)
    const perJobCharges = providers.map((p) => Math.round(p.costPerUnit * ((p as Record<string, unknown>).marginRate as number ?? 1.4)));
    const charge = perJobCharges.reduce((sum, c) => sum + c, 0);
    const balance = await chargeCredits(user.id, charge, 'generation_job');

    type JobRow = Awaited<ReturnType<typeof db.generationJob.create>>;
    const jobs: JobRow[] = [];
    for (let i = 0; i < providers.length; i++) {
      const job = await db.generationJob.create({
        data: {
          userId: user.id,
          promptText,
          promptId: body.promptId ?? null,
          providerId: providers[i].id,
          aspect,
          style: body.style?.trim() || null,
          status: 'queued',
          creditCharged: perJobCharges[i],
        },
      });
      jobs.push(job);
    }

    // Fire-and-forget async processing (do NOT block the request)
    void processGenerationJobs(jobs.map((j) => j.id));

    const withRelations = await db.generationJob.findMany({
      where: { id: { in: jobs.map((j) => j.id) } },
      include: { provider: true, resultArtifact: { include: { owner: true } } },
    });

    return ok({
      jobs: await serializeJobs(withRelations, user.id),
      charged: charge,
      balance,
    });
  } catch (e) {
    return fail(e);
  }
}
