import { createClient } from '@supabase/supabase-js';

const BUCKET = 'uploads';

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server storage is not configured');
  return createClient(url, key).storage.from(BUCKET);
}

export interface VideoUpscaleUploadTarget {
  signedUrl: string;
  path: string;
  contentType: 'video/mp4';
}

/** A worker gets only a two-hour write URL, never a Supabase credential. */
export async function createVideoUpscaleUpload(path: string): Promise<VideoUpscaleUploadTarget> {
  const { data, error } = await storage().createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.signedUrl) throw new Error(`Storage upload destination failed: ${error?.message ?? 'unknown error'}`);
  return { signedUrl: data.signedUrl, path, contentType: 'video/mp4' };
}

export function videoUpscalePublicUrl(path: string): string {
  return storage().getPublicUrl(path).data.publicUrl;
}

/** Verify metadata rather than a CDN response immediately after upload. */
export async function videoUpscaleObjectExists(path: string): Promise<boolean> {
  const slash = path.lastIndexOf('/');
  const prefix = slash < 0 ? '' : path.slice(0, slash);
  const filename = slash < 0 ? path : path.slice(slash + 1);
  const { data, error } = await storage().list(prefix, { limit: 20, search: filename });
  if (error) throw new Error(`Storage object check failed: ${error.message}`);
  return Boolean(data?.some((item) => item.name === filename));
}
