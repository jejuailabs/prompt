import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { RunpodJobStatus } from '@/lib/server/runpod';
import { finalizeTrellisProject } from '@/lib/server/trellis-finalize';
import { validTrellisWebhookToken } from '@/lib/server/trellis-webhook';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('project') ?? '';
  const token = req.nextUrl.searchParams.get('token') ?? '';
  if (!/^[a-f0-9-]{36}$/.test(projectId)) return NextResponse.json({ error: 'Invalid project' }, { status: 400 });
  const project = await db.artifact.findUnique({ where: { id: projectId } });
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  const meta = JSON.parse(project.metadata) as { blender?: { engine?: string; jobId?: string; accountingJobId?: string; status?: string } };
  const operationId = meta.blender?.accountingJobId;
  if (!operationId || !validTrellisWebhookToken(projectId, operationId, token)) {
    return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 });
  }
  const job = await req.json() as RunpodJobStatus;
  if (!job?.id || job.id !== meta.blender?.jobId || meta.blender.engine !== 'trellis') {
    return NextResponse.json({ error: 'Job does not match project' }, { status: 409 });
  }
  if (!['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(job.status)) {
    return NextResponse.json({ error: 'Job is not terminal' }, { status: 409 });
  }
  if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(meta.blender.status ?? '')) {
    return NextResponse.json({ ok: true });
  }
  try {
    await finalizeTrellisProject(projectId, project.ownerId, job);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('TRELLIS webhook settlement failed', error);
    return NextResponse.json({ error: 'Settlement failed; retry' }, { status: 500 });
  }
}
