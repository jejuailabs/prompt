// GET /api/auth/callback — Supabase OAuth callback (Google etc.)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { logEvent } from '@/lib/events';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const supaUser = data.user;
      const email = supaUser.email ?? '';
      const name =
        supaUser.user_metadata?.full_name ??
        supaUser.user_metadata?.name ??
        email.split('@')[0];
      const avatar = supaUser.user_metadata?.avatar_url ?? null;

      // Upsert Profile in our DB keyed by Supabase user id
      const existing = await db.profile.findUnique({ where: { id: supaUser.id } });
      if (!existing) {
        // Ensure username uniqueness
        let username = name.replace(/\s+/g, '').slice(0, 30);
        const taken = await db.profile.findUnique({ where: { username } });
        if (taken) username = `${username}_${Date.now().toString(36)}`;

        await db.profile.create({
          data: {
            id: supaUser.id,
            username,
            avatarUrl: avatar,
            role: 'user',
            title: 'Creator',
            credits: { create: { balance: 1000 } },
            creditTransactions: { create: { amount: 1000, reason: 'signup_bonus' } },
          },
        });
        await logEvent('user.joined', { username, provider: 'google' });
      } else {
        // Update avatar if changed
        if (avatar && avatar !== existing.avatarUrl) {
          await db.profile.update({ where: { id: supaUser.id }, data: { avatarUrl: avatar } });
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to home
  return NextResponse.redirect(`${origin}/?error=auth`);
}
