import { NextRequest } from 'next/server';
import { HttpError, requireAdmin } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { importSocialKitPlaylist } from '@/modules/academy/socialkit';

export const maxDuration = 180;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await readJson<{ url?: unknown }>(req);
    if (typeof body.url !== 'string' || body.url.length > 2048) throw new HttpError('재생목록 주소를 입력해주세요.');
    return ok(await importSocialKitPlaylist(body.url));
  } catch (error) { return fail(error); }
}
