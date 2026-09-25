import { supaAdmin } from '@/lib/supabase/admin';

export const VOICE_REFERENCE_BUCKET = 'voice-references';

const MIME_TYPES: Record<string, string> = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', wave: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg',
};

export function voiceReferenceContentType(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return MIME_TYPES[extension] || null;
}

export async function ensureVoiceReferenceBucket() {
  const existing = await supaAdmin.storage.getBucket(VOICE_REFERENCE_BUCKET);
  if (existing.data) {
    if (existing.data.public) throw new Error('voice-references 버킷은 비공개여야 합니다.');
    return;
  }
  const created = await supaAdmin.storage.createBucket(VOICE_REFERENCE_BUCKET, { public: false, fileSizeLimit: '25MB', allowedMimeTypes: Object.values(MIME_TYPES) });
  if (created.error && !/already exists/i.test(created.error.message)) throw new Error(`음성 보관함 생성 실패: ${created.error.message}`);
}

export function isOwnedVoiceReference(path: string, userId: string) {
  return path.startsWith(`references/${userId}/`) && !path.includes('..');
}

export async function createVoiceReferenceUpload(input: { userId: string; fileName: string }) {
  const contentType = voiceReferenceContentType(input.fileName);
  if (!contentType) throw new Error('MP3, M4A, AAC, WAV, FLAC, OGG 파일만 사용할 수 있습니다.');
  await ensureVoiceReferenceBucket();
  const extension = input.fileName.split('.').pop()!.toLowerCase();
  const path = `references/${input.userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const result = await supaAdmin.storage.from(VOICE_REFERENCE_BUCKET).createSignedUploadUrl(path, { upsert: false });
  if (result.error || !result.data) throw new Error(`음성 업로드 권한 발급 실패: ${result.error?.message || ''}`);
  return { bucket: VOICE_REFERENCE_BUCKET, path, token: result.data.token, contentType };
}

export async function downloadVoiceReference(path: string) {
  await ensureVoiceReferenceBucket();
  const result = await supaAdmin.storage.from(VOICE_REFERENCE_BUCKET).download(path);
  if (result.error || !result.data) throw new Error(`참조 음성을 불러오지 못했습니다: ${result.error?.message || ''}`);
  return Buffer.from(await result.data.arrayBuffer());
}

export async function saveVoiceOutput(input: { userId: string; artifactId: string; bytes: Buffer }) {
  await ensureVoiceReferenceBucket();
  const path = `generated/${input.userId}/${input.artifactId}.wav`;
  const uploaded = await supaAdmin.storage.from(VOICE_REFERENCE_BUCKET).upload(path, input.bytes, { contentType: 'audio/wav', upsert: true });
  if (uploaded.error) throw new Error(`생성 음성 저장 실패: ${uploaded.error.message}`);
  return path;
}

export async function signedVoiceOutputUrl(path: string) {
  const signed = await supaAdmin.storage.from(VOICE_REFERENCE_BUCKET).createSignedUrl(path, 60 * 60);
  if (signed.error || !signed.data?.signedUrl) throw new Error(`생성 음성 URL 발급 실패: ${signed.error?.message || ''}`);
  return signed.data.signedUrl;
}
