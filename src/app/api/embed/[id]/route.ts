import { NextResponse } from 'next/server';
import { builtinEmbedArtifact, canEmbedArtifact } from '@/lib/artifact-embed';
import { db } from '@/lib/db';
import { serializeArtifact } from '@/lib/server/serialize';

/** Public, read-only embed data. Does not create plays, views, or ad impressions. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const builtin = builtinEmbedArtifact(id);
  if (builtin) return NextResponse.json({ ok: true, data: builtin });
  try {
    const artifact = await db.artifact.findUnique({ where: { id }, include: { owner: true } });
    if (!artifact || !canEmbedArtifact(artifact)) {
      return NextResponse.json({ ok: false, error: '공개된 작품을 찾을 수 없습니다.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: serializeArtifact(artifact) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false, error: '작품을 불러오지 못했어요.' }, { status: 503 });
  }
}
