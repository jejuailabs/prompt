// GET/POST /api/admin/class-sessions — list and open login-free class rooms (admin only)
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { CLASS_PROVIDER_ID, createUniqueCode } from '@/modules/class-studio/server';
import { toAdminDTO } from '@/modules/class-studio/admin-server';

interface CreateBody {
  title?: string;
  startsAt?: string;
  endsAt?: string;
  maxParticipants?: number;
  perUserLimit?: number;
  budgetKrw?: number;
}

const clampInt = (value: unknown, min: number, max: number, fallback: number) =>
  Number.isFinite(Number(value)) ? Math.min(max, Math.max(min, Math.round(Number(value)))) : fallback;

export async function GET() {
  try {
    await requireAdmin();
    const sessions = await db.classSession.findMany({ include: { provider: true }, orderBy: { createdAt: 'desc' }, take: 30 });
    return ok(await Promise.all(sessions.map(toAdminDTO)));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await readJson<CreateBody>(req);
    const title = (body.title ?? '').trim().slice(0, 60);
    if (!title) throw new HttpError('수업 이름을 입력해주세요', 400);
    const startsAt = new Date(body.startsAt ?? '');
    const endsAt = new Date(body.endsAt ?? '');
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) throw new HttpError('시작·종료 시간을 확인해주세요', 400);
    if (endsAt <= startsAt) throw new HttpError('종료 시간은 시작 시간보다 늦어야 합니다', 400);
    if (endsAt.getTime() - startsAt.getTime() > 12 * 60 * 60 * 1000) throw new HttpError('한 세션은 12시간까지 열 수 있습니다', 400);
    if (endsAt <= new Date()) throw new HttpError('이미 지난 시간입니다', 400);

    const provider = await db.modelProvider.findUnique({ where: { id: CLASS_PROVIDER_ID } });
    if (!provider?.active) throw new HttpError('수업용 이미지 모델이 비활성 상태입니다', 409);

    const maxParticipants = clampInt(body.maxParticipants, 1, 40, 15);
    const perUserLimit = clampInt(body.perUserLimit, 1, 30, 10);
    const defaultBudget = Math.ceil(maxParticipants * perUserLimit * provider.costPerUnit);
    const budgetKrw = clampInt(body.budgetKrw, provider.costPerUnit, 200_000, defaultBudget);

    const session = await db.classSession.create({
      data: {
        id: randomUUID(),
        code: await createUniqueCode(),
        title,
        hostId: admin.id,
        providerId: provider.id,
        startsAt,
        endsAt,
        maxParticipants,
        perUserLimit,
        budgetKrw,
      },
      include: { provider: true },
    });
    return ok(await toAdminDTO(session));
  } catch (e) {
    return fail(e);
  }
}
