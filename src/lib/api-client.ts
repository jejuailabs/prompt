'use client';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`Invalid server response (${res.status})`, res.status);
  }
  if (!json.ok) throw new ApiError(json.error || `Request failed (${res.status})`, res.status);
  return json.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body ?? {}),
  put: <T>(path: string, body?: unknown) => request<T>(path, 'PUT', body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>(path, 'PATCH', body ?? {}),
  del: <T>(path: string) => request<T>(path, 'DELETE'),
};

export async function uploadFile(file: File): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const json = await res.json();
  if (!json.ok) throw new ApiError(json.error || 'Upload failed');
  return json.data;
}

/**
 * Prompt thumbnails also back a linked gallery artifact. Use the dedicated
 * endpoint instead of generic Storage upload + a separate PATCH so edits and
 * gallery cards cannot drift apart.
 */
export async function uploadPromptThumbnail(promptId: string, file: File): Promise<{ thumbnailUrl: string }> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/prompts/${promptId}/thumbnail`, { method: 'POST', body: fd });
  let json: { ok: boolean; data?: { thumbnailUrl: string }; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiError(`Invalid server response (${res.status})`, res.status);
  }
  if (!json.ok || !json.data?.thumbnailUrl) throw new ApiError(json.error || `Upload failed (${res.status})`, res.status);
  return json.data;
}
