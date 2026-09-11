import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

type Params = { params: Promise<{ id: string }> };
export async function POST(_req: NextRequest, { params }: Params) {
  try { const user = await requireUser(); const { id } = await params; const brief = await db.problemBrief.findUnique({ where: { id } }); if (!brief || brief.category !== 'community') throw new HttpError('요청을 찾을 수 없습니다', 404); if (brief.authorId !== user.id) throw new HttpError('작성자만 해결 처리할 수 있습니다', 403); await db.problemBrief.update({ where: { id }, data: { status: 'matched' } }); return ok({ resolved: true }); } catch (e) { return fail(e); }
}
