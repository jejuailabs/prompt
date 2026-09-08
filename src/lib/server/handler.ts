// Shared API handler helpers — response envelope + error conversion
import { NextResponse } from 'next/server';
import { HttpError } from '@/lib/auth';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(error: unknown) {
  if (error instanceof HttpError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }
  // Prisma not-found guard (defensive)
  if (typeof error === 'object' && error !== null && (error as { code?: string }).code === 'P2025') {
    return NextResponse.json({ ok: false, error: '대상을 찾을 수 없습니다' }, { status: 404 });
  }
  console.error('[api] unexpected error:', error);
  return NextResponse.json(
    { ok: false, error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
    { status: 500 },
  );
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError('잘못된 요청 형식입니다', 400);
  }
}

export function getIdParam(params: { id: string }): string {
  const id = params?.id;
  if (!id || typeof id !== 'string') throw new HttpError('잘못된 요청입니다', 400);
  return id;
}
