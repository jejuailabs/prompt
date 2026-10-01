import { HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { createVoiceReferenceUpload } from '@/lib/server/voice-reference-storage';

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await readJson<{ fileName?: unknown }>(req);
    if (typeof body.fileName !== 'string' || !body.fileName.trim() || body.fileName.length > 180) throw new HttpError('음성 파일명을 확인해주세요.', 400);
    return ok(await createVoiceReferenceUpload({ userId: user.id, fileName: body.fileName.trim() }));
  } catch (error) {
    return fail(error);
  }
}
