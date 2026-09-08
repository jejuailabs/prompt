// GET  /api/marketplace/listings — active listings (public)
// POST /api/marketplace/listings — list own artifact
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeArtifactSingle, toUserBrief } from '@/lib/server/serialize';
import { logEvent } from '@/lib/events';

const VALID_MODELS = ['ad_share', 'paid', 'freemium'];

export async function GET() {
  try {
    const listings = await db.marketplaceListing.findMany({
      where: { status: 'active' },
      include: { artifact: { include: { owner: true } }, listedBy: true },
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(
      listings.map(async (l) => ({
        id: l.id,
        artifact: await serializeArtifactSingle(l.artifact, null),
        revenueModel: l.revenueModel as 'ad_share' | 'paid' | 'freemium',
        price: l.price,
        status: l.status,
        listedBy: toUserBrief(l.listedBy),
        createdAt: l.createdAt.toISOString(),
      })),
    );
    return ok(items);
  } catch (e) {
    return fail(e);
  }
}

interface CreateBody {
  artifactId?: string;
  revenueModel?: string;
  price?: number;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<CreateBody>(req);
    if (!body.artifactId) throw new HttpError('artifactId가 필요합니다', 400);
    const revenueModel = body.revenueModel ?? 'ad_share';
    if (!VALID_MODELS.includes(revenueModel)) {
      throw new HttpError('지원하지 않는 수익 모델입니다', 400);
    }

    const artifact = await db.artifact.findUnique({
      where: { id: body.artifactId },
      include: { owner: true },
    });
    if (!artifact) throw new HttpError('프로젝트를 찾을 수 없습니다', 404);
    if (artifact.ownerId !== user.id) throw new HttpError('본인 프로젝트만 등록할 수 있습니다', 403);

    const existing = await db.marketplaceListing.findUnique({ where: { artifactId: artifact.id } });
    if (existing) throw new HttpError('이미 마켓플레이스에 등록된 프로젝트입니다', 400);

    const price = body.price !== undefined ? Math.max(0, Number(body.price) || 0) : null;
    if (revenueModel === 'paid' && (!price || price <= 0)) {
      throw new HttpError('유료 등록에는 가격을 입력해주세요', 400);
    }

    const listing = await db.marketplaceListing.create({
      data: {
        artifactId: artifact.id,
        listedById: user.id,
        revenueModel,
        price,
        status: 'active',
      },
    });

    await logEvent('listing.created', {
      listingId: listing.id,
      artifactId: artifact.id,
      revenueModel,
      listedById: user.id,
    });

    return ok({
      id: listing.id,
      artifact: await serializeArtifactSingle(artifact, user.id),
      revenueModel: listing.revenueModel as 'ad_share' | 'paid' | 'freemium',
      price: listing.price,
      status: listing.status,
      listedBy: { id: user.id, username: user.username, avatarUrl: user.avatarUrl, role: user.role },
      createdAt: listing.createdAt.toISOString(),
    });
  } catch (e) {
    return fail(e);
  }
}
