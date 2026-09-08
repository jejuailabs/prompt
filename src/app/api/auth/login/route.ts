// Legacy demo login — disabled. Use Google OAuth via /api/auth/callback
import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Demo login disabled. Use Google sign-in.' },
    { status: 410 },
  );
}
