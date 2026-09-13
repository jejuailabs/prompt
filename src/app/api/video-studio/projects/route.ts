import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUserFast, HttpError, requireUser } from '@/lib/auth';
import { fail, ok, readJson } from '@/lib/server/handler';
import { serializeArtifactSingle } from '@/lib/server/serialize';

type InputMode = 'text' | 'image' | 'frames' | 'reference' | 'blender';

interface CreateVideoProjectBody {
  prompt?: string;
  script?: string;
  title?: string;
  style?: string;
  targetDurationSec?: number;
  inputMode?: InputMode;
  inputImageUrl?: string | null;
  aspectRatio?: string;
  quality?: 'draft' | 'standard' | 'hero';
  engine?: 'h3' | 'wan' | 'ltx';
}

function parseMetadata(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function titleFromPrompt(prompt: string) {
  const compact = prompt.replace(/\s+/g, ' ').trim();
  return compact.length > 34 ? `${compact.slice(0, 34)}…` : compact;
}

export async function GET() {
  try {
    const user = await getSessionUserFast();
    if (!user) throw new HttpError('로그인이 필요합니다', 401);

    const rows = await db.artifact.findMany({
      where: { ownerId: user.id, sourceModule: 'video-studio' },
      include: { owner: true },
      orderBy: { createdAt: 'desc' },
    });

    return ok(await Promise.all(rows.map((row) => serializeArtifactSingle(row, user.id))));
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await readJson<CreateVideoProjectBody>(req);
    const prompt = (body.prompt ?? body.script ?? '').trim();
    if (prompt.length < 3) throw new HttpError('영상 설명을 3자 이상 입력해주세요', 400);

    const inputMode = body.inputMode ?? (body.inputImageUrl ? 'image' : 'text');
    const duration = Math.min(Math.max(Math.round(body.targetDurationSec ?? 6), 4), 15);
    const title = (body.title?.trim() || titleFromPrompt(prompt)).slice(0, 120);
    const metadata = {
      studioVersion: 1,
      kind: 'video-project',
      prompt,
      style: body.style ?? 'cinematic',
      targetDurationSec: duration,
      inputMode,
      inputImageUrl: body.inputImageUrl ?? null,
      aspectRatio: body.aspectRatio ?? '9:16',
      quality: body.quality ?? 'draft',
      engine: body.engine ?? 'h3',
      projectStatus: 'editing',
      shots: [{
        id: 'shot-1',
        index: 0,
        title: '첫 샷',
        prompt,
        duration,
        inputMode,
        status: 'ready',
      }],
      bible: { characters: [], locations: [], props: [], styles: [] },
    };

    const project = await db.artifact.create({
      data: {
        ownerId: user.id,
        type: 'video',
        title,
        description: prompt,
        sourceModule: 'video-studio',
        fileUrl: body.inputImageUrl ?? null,
        metadata: JSON.stringify(metadata),
        status: 'draft',
        visibility: 'private',
      },
      include: { owner: true },
    });

    return ok(await serializeArtifactSingle(project, user.id));
  } catch (e) {
    return fail(e);
  }
}

export { parseMetadata };
