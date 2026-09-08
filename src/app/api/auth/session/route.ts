// GET /api/auth/session — returns SessionUser | null based on Supabase Auth
import { getSessionUser } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return ok(null);
    return ok({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role as 'user' | 'admin',
      credits: user.credits,
      title: user.title,
    });
  } catch (e) {
    return fail(e);
  }
}
