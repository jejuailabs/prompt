// POST /api/game-room/submit — creator submits an externally deployed game for moderation.
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

interface Body { title?: string; url?: string; description?: string; thumbnailUrl?: string; tags?: string[]; controls?: string; }

function publicHttpsUrl(value: string | undefined, label: string) {
  if (!value) throw new HttpError(`${label}을 입력해주세요`);
  try { const url = new URL(value); if (url.protocol !== 'https:') throw new Error(); return url.toString(); } catch { throw new HttpError(`${label}은 HTTPS 공개 URL이어야 합니다`); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(); const body = await readJson<Body>(req);
    if (!body.title?.trim()) throw new HttpError('게임 제목을 입력해주세요');
    const contentUrl = publicHttpsUrl(body.url, '게임 배포 URL');
    const fileUrl = body.thumbnailUrl ? publicHttpsUrl(body.thumbnailUrl, '썸네일 URL') : null;
    const artifact = await db.artifact.create({ data: {
      ownerId: user.id, type: 'game', title: body.title.trim().slice(0, 120), description: (body.description ?? '').slice(0, 2000),
      contentUrl, fileUrl, sourceModule: 'game-room', status: 'draft', visibility: 'public',
      metadata: JSON.stringify({ tags: (body.tags ?? []).filter(Boolean).slice(0, 8), controls: (body.controls ?? '').slice(0, 500), externalGame: true, moderationStatus: 'pending' }),
    } });
    return ok({ id: artifact.id, status: artifact.status }, 201);
  } catch (e) { return fail(e); }
}
