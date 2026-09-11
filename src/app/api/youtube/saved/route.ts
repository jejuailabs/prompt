import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireUser, HttpError } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { toYoutubeAnalysisDTO } from '@/lib/server/youtube-analysis';

export async function GET() {
  try { const user = await requireUser(); const rows = await db.savedYoutubeAnalysis.findMany({ where: { userId: user.id }, include: { analysis: true }, orderBy: { createdAt: 'desc' } }); return ok(rows.map((r) => toYoutubeAnalysisDTO(r.analysis))); } catch (e) { return fail(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(); const { analysisId } = await readJson<{ analysisId?: string }>(req);
    if (!analysisId) throw new HttpError('저장할 분석 결과가 없습니다');
    const row = await db.savedYoutubeAnalysis.upsert({ where: { userId_analysisId: { userId: user.id, analysisId } }, update: {}, create: { userId: user.id, analysisId }, include: { analysis: true } });
    return ok(toYoutubeAnalysisDTO(row.analysis), 201);
  } catch (e) { return fail(e); }
}
