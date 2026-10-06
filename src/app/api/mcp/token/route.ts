import { createHash, randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { HttpError } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

function sameOrigin(req: Request) {
  const source = req.headers.get('origin');
  if (!source || source !== new URL(req.url).origin) throw new HttpError('같은 사이트에서만 연결 키를 관리할 수 있습니다', 403);
}

async function browserUserId(): Promise<string> {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new HttpError('로그인이 필요합니다', 401);
  const profile = await db.profile.findUnique({ where: { id: user.id }, select: { id: true, banned: true } });
  if (!profile || profile.banned) throw new HttpError('사용할 수 없는 계정입니다', 403);
  return profile.id;
}

// The plaintext credential is returned once. Creating a new token immediately revokes the old one.
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const id = await browserUserId();
    const token = `pl_mcp_${randomBytes(32).toString('hex')}`;
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.mcpToken.upsert({ where: { ownerId: id }, create: { ownerId: id, tokenHash }, update: { tokenHash, createdAt: new Date() } });
    return ok({ token });
  } catch (error) { return fail(error); }
}

export async function DELETE(req: Request) {
  try {
    sameOrigin(req);
    const id = await browserUserId();
    await db.mcpToken.deleteMany({ where: { ownerId: id } });
    return ok({ revoked: true });
  } catch (error) { return fail(error); }
}
