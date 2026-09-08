// POST /api/auth/logout — clears the demo session cookie
import { SESSION_COOKIE } from '@/lib/auth';
import { fail, ok } from '@/lib/server/handler';

export async function POST() {
  try {
    const res = ok(null);
    res.cookies.set(SESSION_COOKIE, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });
    return res;
  } catch (e) {
    return fail(e);
  }
}
