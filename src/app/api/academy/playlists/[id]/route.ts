import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await readJson<{ title?: string; description?: string; sortOrder?: number; published?: boolean }>(req);
    if (body.title !== undefined && !body.title.trim()) throw new HttpError('과정 이름을 입력해주세요');
    const playlist = await db.academyPlaylist.update({ where: { id }, data: {
      ...(body.title !== undefined ? { title: body.title.trim().slice(0, 120) } : {}),
      ...(body.description !== undefined ? { description: body.description.slice(0, 1000) } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.published !== undefined ? { published: body.published } : {}),
    } });
    return ok(playlist);
  } catch (e) { return fail(e); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const { id } = await params; await db.academyPlaylist.delete({ where: { id } }); return ok(null); } catch (e) { return fail(e); }
}
