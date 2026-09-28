import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const BUCKET = 'uploads';

export interface SignedWorkerUpload {
  signedUrl: string;
  path: string;
  contentType: string;
}

export async function uploadBuffer(
  pathname: string,
  data: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pathname, data, { contentType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(pathname);
  return urlData.publicUrl;
}

export async function createSignedWorkerUploads(files: Record<string, { path: string; contentType: string }>): Promise<Record<string, SignedWorkerUpload>> {
  const storage = supabase.storage.from(BUCKET);
  const results = await Promise.all(Object.entries(files).map(async ([name, file]) => {
    const { data, error } = await storage.createSignedUploadUrl(file.path, { upsert: false });
    if (error || !data?.signedUrl) throw new Error(`Storage upload destination failed: ${error?.message ?? name}`);
    return [name, { signedUrl: data.signedUrl, path: file.path, contentType: file.contentType }] as const;
  }));
  return Object.fromEntries(results);
}

export async function downloadBuffer(pathname: string): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(BUCKET).download(pathname);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? pathname}`);
  return Buffer.from(await data.arrayBuffer());
}

export function publicStorageUrl(pathname: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(pathname).data.publicUrl;
}
