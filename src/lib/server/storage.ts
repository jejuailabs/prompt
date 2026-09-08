// Unified storage helper — uses Vercel Blob in production, local FS as fallback for dev
import { put } from '@vercel/blob';

export async function uploadBuffer(
  pathname: string,
  data: Buffer | string,
  contentType: string,
): Promise<string> {
  const blob = await put(`uploads/${pathname}`, data, {
    access: 'public',
    contentType,
    addRandomSuffix: false,
  });
  return blob.url;
}
