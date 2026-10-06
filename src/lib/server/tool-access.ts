import { NextResponse } from 'next/server';
import { HttpError, requireUser } from '@/lib/auth';

/** Reject anonymous generation before parsing uploads or contacting providers. */
export async function checkToolAccess(): Promise<NextResponse | null> {
  try {
    await requireUser();
    return null;
  } catch (error) {
    return NextResponse.json({ error: error instanceof HttpError ? error.message : '로그인 연결을 확인하지 못했어요. 잠시 후 다시 시도해주세요.' }, { status: error instanceof HttpError ? error.status : 503 });
  }
}
