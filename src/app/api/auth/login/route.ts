// POST /api/auth/login — demo username login; creates profile on first visit (credits 1000)
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { logEvent } from '@/lib/events';

const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<{ username?: string }>(req);
    const username = (body.username ?? '').trim();
    if (!username) throw new HttpError('사용자 이름을 입력해주세요', 400);
    if (username.length > 30) throw new HttpError('사용자 이름은 30자 이하로 입력해주세요', 400);

    let user = await db.profile.findUnique({ where: { username }, include: { credits: true } });
    if (!user) {
      user = await db.profile.create({
        data: {
          username,
          role: username === 'admin' ? 'admin' : 'user',
          title: username === 'admin' ? 'Admin' : 'Creator',
          credits: {
            create: { balance: 1000 },
          },
          creditTransactions: {
            create: { amount: 1000, reason: 'signup_bonus' },
          },
        },
        include: { credits: true },
      });
      await logEvent('user.joined', { username: user.username });
    }

    const res = ok({
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      role: user.role as 'user' | 'admin',
      credits: user.credits?.balance ?? 0,
      title: user.title,
    });
    res.cookies.set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e) {
    return fail(e);
  }
}
