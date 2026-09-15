import { NextRequest, NextResponse } from 'next/server';
import { getSessionUserFast } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  const user = await getSessionUserFast();
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const { fileName, contentType } = await req.json();
  const ext = (fileName || 'audio.mp3').split('.').pop()?.toLowerCase() ?? 'mp3';
  const path = `whisper-input/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from('uploads')
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: `업로드 URL 생성 실패: ${error.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    publicUrl: urlData.publicUrl,
  });
}
