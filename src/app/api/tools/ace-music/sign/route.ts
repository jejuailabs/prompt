import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFast } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const AUDIO_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', wave: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg',
};

export async function POST(req: NextRequest) {
  const user = await getSessionUserFast();
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  const { fileName } = await req.json() as { fileName?: unknown };
  const ext = String(fileName || 'cover.mp3').split('.').pop()?.toLowerCase() ?? 'mp3';
  const contentType = AUDIO_TYPES[ext];
  if (!contentType) return NextResponse.json({ error: 'MP3, M4A, WAV, FLAC, OGG, AAC 파일만 업로드할 수 있습니다.' }, { status: 400 });
  const path = `music-cover/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { data, error } = await supabase.storage.from('uploads').createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl) return NextResponse.json({ error: `업로드 URL 생성 실패: ${error?.message ?? 'unknown error'}` }, { status: 500 });
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);
  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl: urlData.publicUrl, contentType, path });
}
